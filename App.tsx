
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import SubscriptionModal from './components/SubscriptionModal';
import { motion, AnimatePresence } from 'motion/react';
import CustomDialog from './components/CustomDialog';
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
  ArrowLeft,
  Moon,
  Sun,
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, generateId, getLocalDateStr, getWeeklySummary } from './utils/calculations';

import { storageService } from './services/storageService';
import AIReportAssistant from './components/AIReportAssistant';
import { notificationService } from './services/notificationService';
import { authService } from './services/authService';
import Login from './components/Login';
import VerificationBanner from './components/VerificationBanner';
import { User as FirebaseUser } from 'firebase/auth';
import { isUserAdmin } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'history' | 'reports' | 'settings'>('dashboard');
  const [prevTab, setPrevTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'history' | 'reports' | 'settings'>('dashboard');
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: (val?: string) => void;
    showInput?: boolean;
    inputType?: string;
    inputPlaceholder?: string;
    inputValidation?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Auth subscription
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) {
        // Limpa o estado ao deslogar para evitar vazamento em memória
        setEntries([]);
        setTimeEntries([]);
        setConfig(DEFAULT_CONFIG);
        setIsInitialLoading(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Stripe Success Callback (Message based for Popups)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validação básica de origem
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;

      if (event.data?.type === 'STRIPE_CHECKOUT_COMPLETED' || event.data?.type === 'MP_PAYMENT_COMPLETED') {
        const { status, sessionId, userId: mpUserId } = event.data;

        if ((status === 'success' || status === 'approved') && (sessionId || mpUserId)) {
          const verifyPayment = async () => {
            try {
              // Se for Stripe, verifica via API. Se for Mercado Pago, o Webhook já deve ter atualizado, 
              // mas forçamos uma atualização local para feedback imediato.
              if (sessionId) {
                const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
                const data = await response.json();
                if (!data.success || data.userId !== user?.uid) return;
              }

              setConfig(prev => ({
                ...prev,
                profile: {
                  ...prev.profile,
                  isPro: true,
                  subscriptionStatus: 'active'
                }
              }));
              
              confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 }
              });
              showToast("Parabéns! Você agora é PRO! 💎");
              setIsSubModalOpen(false);
            } catch (error) {
              console.error("Erro ao verificar pagamento:", error);
            }
          };
          verifyPayment();
        } else if (status === 'cancel' || status === 'failure') {
          showToast("Pagamento não concluído.", "error");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  // Scroll to top on tab change
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    };

    scrollToTop();
    const timer = setTimeout(scrollToTop, 100);
    const timer2 = setTimeout(scrollToTop, 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
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
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
        localStorage.setItem('theme_hint', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
        localStorage.setItem('theme_hint', 'light');
      }
    };

    applyTheme();

    // Listen for system theme changes if in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (config.themeMode === 'auto') {
        applyTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config.themeMode]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setPrevTab(activeTab);
      setActiveTab(tab);
    }
  };

  const handleSettingsClick = () => {
    if (activeTab === 'settings') {
      setActiveTab(prevTab);
    } else {
      setPrevTab(activeTab);
      setActiveTab('settings');
    }
  };

  const handleSubscribe = async (planType: 'monthly' | 'yearly' = 'monthly') => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Usando Mercado Pago como padrão para CPF/Pessoa Física
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, 
          planType,
          email: user.email 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.init_point) {
        // Abre o checkout do Mercado Pago em uma nova janela (Popup)
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        window.open(
          data.init_point, 
          'mercadopago_checkout', 
          `width=${width},height=${height},top=${top},left=${left}`
        );
      } else {
        showToast(data.error || "Erro ao iniciar pagamento.", "error");
      }
    } catch (error) {
      console.error("Erro ao assinar:", error);
      showToast("Erro de conexão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Notificações Personalizadas (Timer de 1 minuto)
  useEffect(() => {
    if (!config.notificationsEnabled || !config.customNotifications) return;

    const interval = setInterval(() => {
      notificationService.checkAndTriggerCustomNotifications(config.customNotifications || []);
    }, 60000);

    return () => clearInterval(interval);
  }, [config.notificationsEnabled, config.customNotifications]);

  // 2. Alertas de Manutenção via Notificação
  useEffect(() => {
    if (!config.notificationsEnabled || !config.maintenanceAlerts) return;
    
    const lastKm = config.lastTotalKm || 0;
    const today = getLocalDateStr();

    config.maintenanceAlerts.forEach(alert => {
      const remaining = alert.kmInterval - (lastKm - alert.lastKm);
      // Alerta quando faltar menos de 500km
      if (remaining <= 500 && remaining > 0) {
        const lastAlertNotif = localStorage.getItem(`last_maint_notif_${user.uid}_${alert.id}`);
        if (lastAlertNotif !== today) {
          notificationService.sendNotification("Manutenção Próxima! ⚠️", {
            body: `O item "${alert.description}" precisa de atenção em ${remaining}km.`
          });
          localStorage.setItem(`last_maint_notif_${user.uid}_${alert.id}`, today);
        }
      }
    });
  }, [config.notificationsEnabled, config.lastTotalKm, config.maintenanceAlerts]);

  // Auto-close shifts from previous days at midnight
  useEffect(() => {
    if (isInitialLoading || timeEntries.length === 0 || !user) return;
    
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
      storageService.saveTimeEntries(updatedTimeEntries, user.uid);
    }
  }, [isInitialLoading, timeEntries, user]);

  // 3. Garantir createdAt para usuários existentes/novos
  useEffect(() => {
    if (authChecked && user && !user.emailVerified && config.profile && !config.profile.createdAt) {
      const now = new Date().toISOString();
      setConfig(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          createdAt: now
        }
      }));
      // Salva para persistir
      storageService.saveConfig({
        ...config,
        profile: {
          ...(config.profile || {}),
          createdAt: now
        }
      }, user.uid, config.profile?.isPro);
    }
  }, [authChecked, user, config.profile?.createdAt]);

  // Carregamento Inicial Otimizado (Local Primeiro -> Nuvem depois)
  useEffect(() => {
    if (!authChecked || !user) return;

    const initApp = async () => {
      try {
        // 0. Migra se necessário (agora isolado por usuário)
        await storageService.migrateFromLocalStorage(user.uid);

        // 1. Carregamento Ultra Rápido (Local - Criptografado e Isolado)
        const [localEntries, localTimeEntries, localConfig] = await Promise.all([
          storageService.getLocalEntries(user.uid),
          storageService.getLocalTimeEntries(user.uid),
          storageService.getLocalConfig(user.uid)
        ]);

        if (localEntries.length > 0) setEntries(localEntries);
        if (localTimeEntries.length > 0) setTimeEntries(localTimeEntries);
        if (localConfig) {
          setConfig({ ...DEFAULT_CONFIG, ...localConfig });
        }

        // Libera a tela imediatamente após carregar o local
        setIsInitialLoading(false);

        // 2. Sincronização em Segundo Plano (Nuvem)
        setIsRefreshing(true);
        const [cloudEntries, cloudTimeEntries, cloudConfig] = await Promise.all([
          storageService.getEntries(user.uid),
          storageService.getTimeEntries(user.uid),
          storageService.getConfig(user.uid)
        ]);

        if (cloudEntries.length > 0) setEntries(cloudEntries);
        if (cloudTimeEntries.length > 0) setTimeEntries(cloudTimeEntries);
        if (cloudConfig) {
          setConfig(prev => ({ ...DEFAULT_CONFIG, ...prev, ...cloudConfig }));
        } else if (user && isUserAdmin(user.email)) {
          // Fallback para novos admins sem config na nuvem
          setConfig(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              isPro: true,
              subscriptionStatus: 'active'
            }
          }));
        }
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    };

    initApp();
  }, [authChecked, user]);

  const refreshData = async () => {
    if (isRefreshing || !user) return;
    setIsRefreshing(true);
    try {
      const [savedEntries, savedTimeEntries, savedConfig] = await Promise.all([
        storageService.getEntries(user.uid),
        storageService.getTimeEntries(user.uid),
        storageService.getConfig(user.uid)
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

  // Helper para contar lançamentos do mês atual
  const getMonthlyEntriesCount = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return entries.filter(e => {
      const entryDate = new Date(e.date + 'T12:00:00');
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    }).length;
  }, [entries]);

  // Persistência Assíncrona com Feedback
  useEffect(() => {
    if (isInitialLoading || isRefreshing || !user) return; // Evita salvar durante o carregamento inicial ou atualização manual

    const saveData = async () => {
      setIsSaving(true);
      try {
        await Promise.all([
          storageService.saveEntries(entries, user.uid, config.profile?.isPro),
          storageService.saveTimeEntries(timeEntries, user.uid, config.profile?.isPro)
        ]);
      } catch (e) {
        console.error("Erro ao salvar dados", e);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    };

    saveData();
  }, [entries, timeEntries, isInitialLoading, isRefreshing, user, config.profile?.isPro]);

  useEffect(() => {
    if (isInitialLoading || isRefreshing || !user) return;
    storageService.saveConfig(config, user.uid, config.profile?.isPro).catch(console.error);
  }, [config, isInitialLoading, isRefreshing, user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addEntry = (entry: DailyEntry) => {
    const isPro = config.profile?.isPro;
    const monthlyCount = getMonthlyEntriesCount();

    // Trava de 30 lançamentos para usuários grátis
    if (!isPro && monthlyCount >= 30) {
      setIsSubModalOpen(true);
      showToast("Limite de 30 lançamentos mensais atingido. Seja PRO!", "error");
      return;
    }

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

        // Notificação de Meta
        if (config.notificationsEnabled) {
          const lastGoalNotif = localStorage.getItem(`last_goal_notif_${user.uid}`);
          if (lastGoalNotif !== todayStr) {
            notificationService.sendNotification("Meta Batida! 🎉", {
              body: `Parabéns! Você atingiu sua meta de ${formatCurrency(config.dailyGoal)} hoje.`
            });
            localStorage.setItem(`last_goal_notif_${user.uid}`, todayStr);
          }
        }
      } else {
        // Aviso de limite próximo (faltando 5)
        if (!isPro && monthlyCount >= 25) {
          showToast(`Atenção: Você tem apenas ${30 - (monthlyCount + 1)} lançamentos restantes este mês! 💎`, "error");
        } else {
          showToast("Lançamento salvo com sucesso!");
        }
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
    setEntries(prev => {
      const newEntries = prev.map(e => e.id === updated.id ? updated : e);
      
      if (updated.storeName === 'Fechamento de KM') {
        const kmEntries = newEntries
          .filter(e => e.storeName === 'Fechamento de KM')
          .sort((a, b) => b.date.localeCompare(a.date));
        
        const newLastKm = kmEntries.length > 0 ? kmEntries[0].kmAtMaintenance : 0;
        setConfig(prevConfig => ({ ...prevConfig, lastTotalKm: newLastKm }));
      }
      return newEntries;
    });
    setEditingEntry(null);
    showToast("Registro atualizado com sucesso!");
  };

  const deleteEntry = useCallback((id: string) => {
    if (!id) return;
    
    setDialog({
      isOpen: true,
      title: 'Excluir Registro',
      message: 'Deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: () => {
        setEntries(prev => {
          const deletedEntry = prev.find(e => e.id === id);
          const filtered = prev.filter(e => e.id !== id);
          
          if (deletedEntry?.storeName === 'Fechamento de KM') {
            const kmEntries = filtered
              .filter(e => e.storeName === 'Fechamento de KM')
              .sort((a, b) => b.date.localeCompare(a.date));
            
            const newLastKm = kmEntries.length > 0 ? kmEntries[0].kmAtMaintenance : 0;
            setConfig(c => ({ ...c, lastTotalKm: newLastKm }));
          }
          
          return filtered;
        });
        showToast("Registro removido.", "error");
        setDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
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
    setDialog({
      isOpen: true,
      title: 'Excluir Ponto',
      message: 'Deseja excluir este registro de ponto permanentemente?',
      type: 'danger',
      onConfirm: () => {
        setTimeEntries(prev => prev.filter(e => e.id !== id));
        showToast("Ponto removido.", "error");
        setDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleShift = () => {
    const today = getLocalDateStr();
    const activeShift = timeEntries.find(t => t.date === today && !t.endTime);
    
    if (activeShift) {
      const now = new Date().toTimeString().slice(0, 5);
      updateTimeEntry({ ...activeShift, endTime: now });
    } else {
      const now = new Date().toTimeString().slice(0, 5);
      addTimeEntry({
        id: generateId(),
        date: today,
        startTime: now,
        breakDuration: 0
      });
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

  const resetData = async (type: 'total' | 'period', start?: string, end?: string) => {
    if (!user) return;
    
    try {
      if (type === 'total') {
        await storageService.resetData(user.uid);
        setEntries([]);
        setTimeEntries([]);
        showToast("Todos os dados foram resetados.");
      } else if (type === 'period' && start && end) {
        const result = await storageService.deleteDataByPeriod(start, end, user.uid);
        setEntries(result.entries);
        setTimeEntries(result.timeEntries);
        showToast("Dados do período removidos.");
      }
    } catch (error) {
      showToast("Erro ao resetar dados.", "error");
    }
  };

  const deleteAccount = async (password?: string) => {
    if (!user) return;
    
    try {
      // Se a senha foi fornecida, reautentica primeiro
      if (password) {
        await authService.reauthenticate(password);
      }

      // 1. Limpar dados no Firestore
      await storageService.resetData(user.uid);
      // 2. Limpar dados locais
      await storageService.clearAll();
      // 3. Deletar conta no Auth
      await authService.deleteAccount();
      showToast("Conta excluída permanentemente.");
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      const errorCode = error.code || (error.message?.includes('auth/requires-recent-login') ? 'auth/requires-recent-login' : '');
      
      if (errorCode === 'auth/requires-recent-login') {
        throw error; // Repassa para o componente Settings tratar
      } else if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        showToast("Senha incorreta ou inválida.", "error");
        throw error;
      } else {
        showToast("Erro ao excluir conta.", "error");
        throw error;
      }
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none mb-6 animate-pulse">
          <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
            <circle cx="75" cy="78" r="10" stroke="currentColor" strokeWidth="6" />
            <path d="M28 78 C28 60 35 45 45 45 H70 L75 78" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="22" y="22" width="30" height="24" rx="6" fill="#10b981" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">RotaFinanceira</h2>
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
          Iniciando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-500/30 relative">
      <div ref={topRef} className="absolute top-0 left-0 w-0 h-0 pointer-events-none opacity-0" aria-hidden="true" />
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[150] px-6 py-3 rounded-2xl shadow-2xl text-white font-black text-sm ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-600'}`}
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

      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        showInput={dialog.showInput}
        inputType={dialog.inputType}
        inputPlaceholder={dialog.inputPlaceholder}
        inputValidation={dialog.inputValidation}
      />

      {user && !user.emailVerified && (
        <VerificationBanner 
          createdAt={(config.profile?.createdAt && config.profile.createdAt !== '') ? config.profile.createdAt : new Date().toISOString()} 
          onLogout={() => authService.logout()} 
          showToast={showToast}
        />
      )}

      <header id="app-top" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Rota<span className="text-indigo-600">Financeira</span></h1>
                {config.profile?.isPro && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 text-[8px] font-black rounded uppercase tracking-widest">PRO</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                  {isSaving ? 'Salvando...' : <><Cloud size={8} /> Nuvem Local Ativa</>}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!config.profile?.isPro && (
              <button 
                onClick={() => setIsSubModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-200 dark:shadow-none"
              >
                <Sparkles size={14} fill="currentColor" />
                Seja PRO
              </button>
            )}
            <button 
              onClick={refreshData}
              className={`p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-all ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
              title="Atualizar dados"
            >
              <RefreshCw size={20} />
            </button>
            <button onClick={handleSettingsClick} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors" title={activeTab === 'settings' ? "Voltar" : "Configurações"}>
              <motion.div
                key={activeTab === 'settings' ? 'back' : 'settings'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'settings' ? <ArrowLeft size={20} /> : <SettingsIcon size={20} />}
              </motion.div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <AnimatePresence initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              type: 'spring',
              stiffness: 1000,
              damping: 60,
              mass: 0.2
            }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                entries={entries} 
                timeEntries={timeEntries} 
                config={config} 
                onEdit={setEditingEntry} 
                onDelete={deleteEntry} 
                onNavigate={setActiveTab} 
                onAdd={addEntry} 
                onToggleShift={toggleShift}
              />
            )}
            {activeTab === 'expenses' && <Expenses entries={entries} config={config} onEdit={setEditingEntry} onAdd={addEntry} onDelete={deleteEntry} onUpdate={updateEntry} />}
            {activeTab === 'maintenance' && <Maintenance entries={entries} config={config} onEdit={setEditingEntry} onAdd={addEntry} onDelete={deleteEntry} />}
            {activeTab === 'ponto' && <TimeTracking timeEntries={timeEntries} onAdd={addTimeEntry} onUpdate={updateTimeEntry} onDelete={deleteTimeEntry} />}
            {activeTab === 'reports' && <Reports entries={entries} timeEntries={timeEntries} config={config} onAddEntry={addEntry} onOpenSubscription={() => setIsSubModalOpen(true)} />}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <QuickLaunch onAdd={addEntry} existingEntries={entries} config={config} />
                <History entries={entries} config={config} onDelete={deleteEntry} onEdit={setEditingEntry} onUpdate={updateEntry} />
              </div>
            )}
            {activeTab === 'settings' && <Settings config={config} entries={entries} timeEntries={timeEntries} onChange={setConfig} onImport={importData} onOpenSubscription={() => setIsSubModalOpen(true)} showToast={showToast} onResetData={resetData} onDeleteAccount={deleteAccount} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeTab !== 'settings' && (
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
              <button key={item.id} onClick={() => handleTabChange(item.id as any)} className="flex flex-col items-center flex-1 py-1 group relative">
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
      )}

      {/* Floating AI Button */}
      {activeTab !== 'settings' && (
        <div className="fixed bottom-24 right-6 z-40">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (config.profile?.isPro) {
                setIsAIChatOpen(true);
              } else {
                setIsSubModalOpen(true);
                showToast("IA Analista é exclusiva para membros PRO! 💎", "error");
              }
            }}
            className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none relative group"
          >
            <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none">
              {config.profile?.isPro ? 'Falar com IA' : 'IA (Apenas PRO)'}
            </div>
            <Sparkles size={24} fill="currentColor" />
            {!config.profile?.isPro && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center">
                <Lock size={10} className="text-amber-950" />
              </div>
            )}
            {config.profile?.isPro && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></div>
            )}
          </motion.button>
        </div>
      )}

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
              })),
              last7Days: entries
                .filter(e => {
                  const date = new Date(e.date + 'T12:00:00');
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  return date >= sevenDaysAgo;
                })
                .reduce((acc, curr) => {
                  acc[curr.date] = (acc[curr.date] || 0) + curr.grossAmount;
                  return acc;
                }, {} as Record<string, number>)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSubModalOpen && (
          <SubscriptionModal 
            onClose={() => setIsSubModalOpen(false)}
            onSubscribe={handleSubscribe}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
