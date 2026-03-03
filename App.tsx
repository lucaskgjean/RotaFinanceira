
import React, { useState, useEffect, useCallback } from 'react';
import { DailyEntry, AppConfig, DEFAULT_CONFIG, TimeEntry } from './types';
import QuickLaunch from './components/QuickLaunch';
import QuickExpense from './components/QuickExpense';
import QuickKM from './components/QuickKM';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Expenses from './components/Expenses';
import Maintenance from './components/Maintenance';
import TimeTracking from './components/TimeTracking';
import Reports from './components/Reports';
import Settings from './components/Settings';
import EditModal from './components/EditModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  ArrowUpRight, 
  Wrench, 
  Clock, 
  BarChart3, 
  History as HistoryIcon, 
  User,
  ShieldCheck,
  Cloud,
  Settings as SettingsIcon,
  ChevronRight,
  Moon,
  Sun,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateId, getLocalDateStr, getWeeklySummary } from './utils/calculations';

import { storageService } from './services/storageService';
import AIReportAssistant from './components/AIReportAssistant';

const App: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'history' | 'reports' | 'settings'>('dashboard');
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Theme application
  useEffect(() => {
    const applyTheme = () => {
      const mode = config.themeMode || 'auto';
      let isDark = false;

      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'light') {
        isDark = false;
      } else {
        // Auto mode
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for system theme changes if in auto mode
    if (config.themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [config.themeMode]);

  // Auto-close shifts from previous days at midnight
  useEffect(() => {
    if (isLoading || timeEntries.length === 0) return;
    
    const today = getLocalDateStr();
    let hasChanges = false;
    
    const updatedTimeEntries = timeEntries.map(entry => {
      // Se não tem hora de término e a data é anterior a hoje
      if (!entry.endTime && entry.date < today) {
        hasChanges = true;
        return { ...entry, endTime: '23:59' };
      }
      return entry;
    });
    
    if (hasChanges) {
      setTimeEntries(updatedTimeEntries);
      storageService.saveTimeEntries(updatedTimeEntries);
    }
  }, [isLoading, timeEntries, timeEntries.length]);

  // Carregamento Inicial Assíncrono (IndexedDB)
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        
        // 1. Migra se necessário
        await storageService.migrateFromLocalStorage();

        // 2. Carrega dados
        const [savedEntries, savedTimeEntries, savedConfig] = await Promise.all([
          storageService.getEntries(),
          storageService.getTimeEntries(),
          storageService.getConfig()
        ]);

        // Sanitização de entradas
        const sanitizedEntries = savedEntries.map(entry => ({
          ...entry,
          id: entry.id || generateId()
        }));
        setEntries(sanitizedEntries);
        setTimeEntries(savedTimeEntries);

        if (savedConfig) {
          // Mescla com o padrão para garantir novos campos (como themeMode)
          const mergedConfig = {
            ...DEFAULT_CONFIG,
            ...savedConfig
          };
          
          // Garante que os alertas de manutenção existam
          if (!mergedConfig.maintenanceAlerts) {
            mergedConfig.maintenanceAlerts = DEFAULT_CONFIG.maintenanceAlerts;
          }
          
          setConfig(mergedConfig);
        }
      } catch (e) {
        console.error("Erro ao inicializar banco de dados", e);
        showToast("Erro ao carregar dados do banco local.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const refreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [savedEntries, savedTimeEntries, savedConfig] = await Promise.all([
        storageService.getEntries(),
        storageService.getTimeEntries(),
        storageService.getConfig()
      ]);

      setEntries(savedEntries.map(entry => ({ ...entry, id: entry.id || generateId() })));
      setTimeEntries(savedTimeEntries);
      if (savedConfig) setConfig(savedConfig);
      
      showToast("Dados atualizados!");
    } catch (e) {
      showToast("Erro ao atualizar dados.", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Persistência Assíncrona com Feedback
  useEffect(() => {
    if (isLoading || isRefreshing) return; // Evita salvar durante o carregamento inicial ou atualização manual

    const saveData = async () => {
      setIsSaving(true);
      try {
        await Promise.all([
          storageService.saveEntries(entries),
          storageService.saveTimeEntries(timeEntries)
        ]);
      } catch (e) {
        console.error("Erro ao salvar dados", e);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    };

    saveData();
  }, [entries, timeEntries, isLoading, isRefreshing]);

  useEffect(() => {
    if (isLoading || isRefreshing) return;
    storageService.saveConfig(config).catch(console.error);
  }, [config, isLoading, isRefreshing]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addEntry = (entry: DailyEntry) => {
    const todayStr = getLocalDateStr();
    
    setEntries(prev => {
      const newEntries = [...prev, entry];
      
      const todayGrossBefore = prev
        .filter(e => e.date === todayStr)
        .reduce((acc, curr) => acc + curr.grossAmount, 0);
      
      const todayGrossAfter = todayGrossBefore + entry.grossAmount;

      if (todayGrossBefore < config.dailyGoal && todayGrossAfter >= config.dailyGoal) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b']
        });
        showToast("Meta diária batida! Parabéns! 🎉");
      } else {
        showToast("Lançamento salvo com sucesso!");
      }

      return newEntries;
    });

    if (entry.fuelPrice) {
      setConfig(prev => ({ ...prev, lastFuelPrice: entry.fuelPrice }));
    }
    if (entry.storeName === 'Fechamento de KM' && entry.kmAtMaintenance) {
      setConfig(prev => ({ ...prev, lastTotalKm: entry.kmAtMaintenance }));
    }
  };
  
  const updateEntry = (updated: DailyEntry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingEntry(null);
    showToast("Registro atualizado com sucesso!");
  };

  const deleteEntry = useCallback((id: string) => {
    if (!id) return;
    
    if (window.confirm("Deseja excluir este registro permanentemente?")) {
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("Registro removido.", "error");
    }
  }, []);

  // Handlers de Ponto
  const addTimeEntry = (entry: TimeEntry) => {
    setTimeEntries(prev => [...prev, entry]);
    showToast("Ponto batido!");
  };

  const updateTimeEntry = (updated: TimeEntry) => {
    setTimeEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    showToast("Ponto finalizado!");
  };

  const deleteTimeEntry = (id: string) => {
    if (window.confirm("Excluir este registro de ponto?")) {
      setTimeEntries(prev => prev.filter(e => e.id !== id));
      showToast("Ponto removido.", "error");
    }
  };

  const importData = async (newEntries: DailyEntry[], newConfig?: AppConfig, newTimeEntries?: TimeEntry[]) => {
    // Sanitização profunda na importação: garante que todos tenham IDs
    const sanitizedEntries = newEntries.map(entry => ({
      ...entry,
      id: entry.id || generateId()
    }));

    // Limpeza preventiva no IndexedDB
    await storageService.clearAll();

    setEntries(sanitizedEntries);
    if (newTimeEntries) setTimeEntries(newTimeEntries);
    if (newConfig) setConfig(newConfig);

    showToast(`Restauração concluída!`);
    setActiveTab('history'); 
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none mb-6 animate-bounce">
          <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
            <circle cx="75" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
            <path d="M28 78 C28 60 35 45 45 45 H70 L75 78" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="22" y="22" width="30" height="24" rx="6" fill="#10b981" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">RotaFinanceira</h2>
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Sincronizando banco de dados...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-500/30">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl text-white font-black text-sm ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-600'}`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} />
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingEntry && (
        <EditModal 
          entry={editingEntry} 
          config={config} 
          onSave={updateEntry} 
          onClose={() => setEditingEntry(null)} 
        />
      )}

      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <svg className="w-7 h-7 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
                <circle cx="75" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
                <path d="M28 78 C28 60 35 45 45 45 H70 L75 78" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="22" y="22" width="30" height="24" rx="6" fill="#10b981" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Rota<span className="text-indigo-600">Financeira</span></h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                  {isSaving ? 'Salvando...' : <><Cloud size={8} /> Nuvem Local Ativa</>}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={refreshData}
              className={`p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-all ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
              title="Atualizar dados"
            >
              <RefreshCw size={20} />
            </button>
            <button onClick={() => setActiveTab('settings')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors" title="Configurações">
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard entries={entries} config={config} onEdit={setEditingEntry} onDelete={deleteEntry} onNavigate={setActiveTab} onAdd={addEntry} />}
            {activeTab === 'expenses' && <Expenses entries={entries} config={config} onEdit={setEditingEntry} onAdd={addEntry} />}
            {activeTab === 'maintenance' && <Maintenance entries={entries} config={config} onEdit={setEditingEntry} onAdd={addEntry} />}
            {activeTab === 'ponto' && <TimeTracking timeEntries={timeEntries} onAdd={addTimeEntry} onUpdate={updateTimeEntry} onDelete={deleteTimeEntry} />}
            {activeTab === 'reports' && <Reports entries={entries} timeEntries={timeEntries} config={config} onAddEntry={addEntry} />}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <QuickLaunch onAdd={addEntry} existingEntries={entries} config={config} />
                <History entries={entries} config={config} onDelete={deleteEntry} onEdit={setEditingEntry} onUpdate={updateEntry} />
              </div>
            )}
            {activeTab === 'settings' && <Settings config={config} entries={entries} timeEntries={timeEntries} onChange={setConfig} onImport={importData} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 md:hidden pb-safe z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center h-20 px-2">
          {[
            { id: 'dashboard', label: 'Início', icon: <Home size={22} /> },
            { id: 'expenses', label: 'Gastos', icon: <ArrowUpRight size={22} /> },
            { id: 'maintenance', label: 'Manut.', icon: <Wrench size={22} /> },
            { id: 'ponto', label: 'Ponto', icon: <Clock size={22} /> },
            { id: 'reports', label: 'Relat.', icon: <BarChart3 size={22} /> },
            { id: 'history', label: 'Histórico', icon: <HistoryIcon size={22} /> }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className="flex flex-col items-center flex-1 py-1 group relative">
              <div className={`w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === item.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400'}`}>{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute -top-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Floating AI Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAIChatOpen(true)}
          className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none relative group"
        >
          <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none">
            Falar com IA
          </div>
          <Sparkles size={24} fill="currentColor" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></div>
        </motion.button>
      </div>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {isAIChatOpen && (
          <AIReportAssistant 
            onClose={() => setIsAIChatOpen(false)}
            onAddEntries={(newEntries) => newEntries.forEach(addEntry)}
            config={config}
            reportData={{
              startDate: 'Últimos 30 dias',
              endDate: getLocalDateStr(),
              summary: getWeeklySummary(entries.filter(e => {
                const date = new Date(e.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date >= thirtyDaysAgo;
              }))
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
