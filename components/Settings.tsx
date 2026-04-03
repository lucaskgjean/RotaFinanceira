
import React, { useState, useRef } from 'react';
import { AppConfig, DEFAULT_CONFIG, DailyEntry, TimeEntry } from '../types';
import { formatCurrency, entriesToCSV } from '../utils/calculations';
import CustomDialog from './CustomDialog';
import CustomDateRangePicker from './CustomDateRangePicker';
import { Sun, Moon, Monitor, Settings as SettingsIcon, Bell, Plus, Trash2, Clock, LogOut, User, Camera, Phone, Mail, Lock, ChevronRight, Sparkles, ShieldCheck, RefreshCw, AlertTriangle, Calendar, Wallet, ArrowUpRight, CreditCard, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import { isUserAdmin } from '../constants';
import { storageService } from '../services/storageService';

interface SettingsProps {
  config: AppConfig;
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  onChange: (newConfig: AppConfig) => void;
  onImport: (entries: DailyEntry[], config?: AppConfig, timeEntries?: TimeEntry[]) => void;
  onOpenSubscription: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onResetData: (type: 'total' | 'period', start?: string, end?: string) => Promise<void>;
  onDeleteAccount: (password?: string) => Promise<void>;
  onForceSync: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ config, entries, timeEntries, onChange, onImport, onOpenSubscription, showToast, onResetData, onDeleteAccount, onForceSync }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'sistema' | 'aparencia'>('perfil');
  const [resetPeriod, setResetPeriod] = useState({ start: '', end: '' });
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
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
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSliderChange = (key: keyof AppConfig, value: string) => {
    const num = parseFloat(value);
    if (key === 'dailyGoal') {
      setLocalConfig({ ...localConfig, [key]: num });
    } else {
      setLocalConfig({ ...localConfig, [key]: num / 100 });
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setLocalConfig({ ...localConfig, themeMode: mode });
  };

  const handleProfileChange = (field: string, value: string) => {
    setLocalConfig(prev => {
      const newProfile = {
        ...(prev.profile || {}),
        [field]: value
      };
      
      // Se mudou nome ou sobrenome, atualiza o displayName automaticamente
      if (field === 'firstName' || field === 'lastName') {
        const first = field === 'firstName' ? value : (newProfile.firstName || '');
        const last = field === 'lastName' ? value : (newProfile.lastName || '');
        newProfile.displayName = `${first} ${last}`.trim();
      }
      
      return {
        ...prev,
        profile: newProfile
      };
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Redimensionar imagem para evitar limites do Firestore (1MB)
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Comprimir como JPEG com qualidade 0.7
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        handleProfileChange('photoURL', compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onChange(localConfig);
    showToast("Configurações salvas com sucesso!");
  };

  const handleLogout = async () => {
    setDialog({
      isOpen: true,
      title: 'Sair da Conta',
      message: 'Deseja realmente sair da sua conta?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await authService.logout();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Erro ao sair:", error);
          showToast("Erro ao sair da conta.", "error");
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      setDialog({
        isOpen: true,
        title: 'Sem Dados',
        message: 'Nenhum dado para exportar.',
        type: 'info',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    const csvContent = entriesToCSV(entries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ROTA_PLANILHA_${todayStr}.csv`);
    link.click();
  };

  const handleFullBackup = () => {
    // Backup completo: Dados + Configurações + Ponto
    const snapshot = {
      entries,
      timeEntries,
      config: localConfig,
      version: "3.0",
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ROTA_BACKUP_COMPLETO.json`);
    link.click();
  };

  const handleResetTotal = async () => {
    setDialog({
      isOpen: true,
      title: 'Apagar Tudo',
      message: 'ATENÇÃO: Isso apagará TODOS os seus lançamentos e registros de ponto permanentemente. Deseja continuar?',
      type: 'danger',
      showInput: true,
      inputValidation: 'APAGAR TUDO',
      onConfirm: async () => {
        try {
          await onResetData('total');
          setDialog({
            isOpen: true,
            title: 'Dados Apagados',
            message: 'Todos os seus lançamentos e registros foram removidos com sucesso.',
            type: 'success',
            confirmText: 'Entendido',
            cancelText: '',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error) {
          console.error("Erro ao resetar dados:", error);
          showToast("Erro ao apagar dados. Tente novamente.", "error");
        }
      }
    });
  };

  const handleResetPeriod = async () => {
    if (!resetPeriod.start || !resetPeriod.end) {
      return showToast("Selecione as datas de início e fim.", "error");
    }
    setDialog({
      isOpen: true,
      title: 'Apagar Período',
      message: `Isso apagará todos os dados entre ${resetPeriod.start} e ${resetPeriod.end}. Confirmar?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await onResetData('period', resetPeriod.start, resetPeriod.end);
          setResetPeriod({ start: '', end: '' });
          setDialog({
            isOpen: true,
            title: 'Período Limpo',
            message: 'Os dados do período selecionado foram removidos com sucesso.',
            type: 'success',
            confirmText: 'Entendido',
            cancelText: '',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } catch (error) {
          console.error("Erro ao resetar período:", error);
          showToast("Erro ao apagar período.", "error");
        }
      }
    });
  };

  const handleDeleteAccount = async () => {
    const userEmail = authService.auth?.currentUser?.email || '';
    
    const showPasswordPrompt = () => {
      setDialog({
        isOpen: true,
        title: 'Confirme sua Senha',
        message: 'Por segurança, digite sua senha para confirmar a exclusão da conta.',
        type: 'warning',
        showInput: true,
        inputType: 'password',
        inputPlaceholder: 'Sua senha atual',
        confirmText: 'Confirmar Exclusão',
        onConfirm: async (password) => {
          if (!password) return;
          try {
            await onDeleteAccount(password);
            setDialog(prev => ({ ...prev, isOpen: false }));
          } catch (error: any) {
            console.error("Erro ao excluir conta com senha:", error);
            // O erro já é tratado no App.tsx com toast
          }
        }
      });
    };

    setDialog({
      isOpen: true,
      title: 'Excluir Conta',
      message: '⚠️ PERIGO: Isso excluirá sua conta e todos os seus dados definitivamente. Esta ação NÃO pode ser desfeita. Deseja continuar?',
      type: 'danger',
      showInput: true,
      inputValidation: userEmail,
      inputPlaceholder: 'Digite seu e-mail para confirmar',
      onConfirm: async () => {
        try {
          await onDeleteAccount();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          const errorCode = error.code || (error.message?.includes('auth/requires-recent-login') ? 'auth/requires-recent-login' : '');
          if (errorCode === 'auth/requires-recent-login') {
            showPasswordPrompt();
          } else {
            console.error("Erro ao excluir conta:", error);
          }
        }
      }
    });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);
        
        // Verifica se é o novo formato (Snapshot) ou o antigo (Array)
        if (data.entries && Array.isArray(data.entries)) {
          // Formato Novo
          setDialog({
            isOpen: true,
            title: 'Restaurar Backup',
            message: `Detectado backup completo com ${data.entries.length} registros. Restaurar histórico e configurações?`,
            type: 'info',
            onConfirm: () => {
              onImport(data.entries, data.config, data.timeEntries);
              setDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        } else if (Array.isArray(data)) {
          // Formato Antigo (Apenas Array)
          setDialog({
            isOpen: true,
            title: 'Restaurar Backup',
            message: `Detectado backup simples com ${data.length} registros. Restaurar histórico?`,
            type: 'info',
            onConfirm: () => {
              onImport(data);
              setDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        } else {
          setDialog({
            isOpen: true,
            title: 'Erro de Backup',
            message: 'Arquivo inválido ou corrompido.',
            type: 'danger',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        }
      } catch (err) {
        setDialog({
          isOpen: true,
          title: 'Erro Crítico',
          message: 'Erro crítico ao ler backup. O arquivo pode estar mal formatado.',
          type: 'danger',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeepScan = async () => {
    setIsScanning(true);
    try {
      const results = await storageService.scanLocalMemory();
      
      if (results.length === 0) {
        setDialog({
          isOpen: true,
          title: 'Nenhum dado encontrado',
          message: 'Não encontramos nenhum rastro de dados antigos na memória deste dispositivo.',
          type: 'info',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      // Agrupa por userId para facilitar a escolha
      const groups: Record<string, any> = {};
      results.forEach(r => {
        if (!groups[r.userId]) groups[r.userId] = { entries: [], timeEntries: [], config: null, count: 0 };
        if (r.type === 'entries') groups[r.userId].entries = r.data;
        else if (r.type === 'timeEntries') groups[r.userId].timeEntries = r.data;
        else if (r.type === 'config') groups[r.userId].config = r.data;
        groups[r.userId].count++;
      });

      const userIds = Object.keys(groups);
      
      setDialog({
        isOpen: true,
        title: 'Dados Encontrados',
        message: `Encontramos dados de ${userIds.length} sessões diferentes. Deseja tentar restaurar os dados da sessão mais completa?`,
        type: 'success',
        confirmText: 'Restaurar Agora',
        cancelText: 'Cancelar',
        onConfirm: () => {
          // Pega o grupo com mais entradas
          const bestGroup = Object.values(groups).sort((a, b) => b.entries.length - a.entries.length)[0];
          onImport(bestGroup.entries, bestGroup.config, bestGroup.timeEntries);
          setDialog(prev => ({ ...prev, isOpen: false }));
          showToast("Dados restaurados com sucesso!");
        }
      });

    } catch (error) {
      console.error("Erro no escaneamento:", error);
      showToast("Erro ao escanear memória.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleMaintenanceAlertChange = (id: string, field: 'description' | 'kmInterval', value: string) => {
    const alerts = (localConfig.maintenanceAlerts || []).map(alert => {
      if (alert.id === id) {
        return { 
          ...alert, 
          [field]: field === 'kmInterval' ? parseInt(value) || 0 : value 
        };
      }
      return alert;
    });
    setLocalConfig({ ...localConfig, maintenanceAlerts: alerts });
  };

  const addMaintenanceAlert = () => {
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      description: 'Novo Alerta',
      kmInterval: 1000,
      lastKm: config.lastTotalKm || 0
    };
    setLocalConfig({ ...localConfig, maintenanceAlerts: [...(localConfig.maintenanceAlerts || []), newAlert] });
  };

  const removeMaintenanceAlert = (id: string) => {
    setLocalConfig({ ...localConfig, maintenanceAlerts: (localConfig.maintenanceAlerts || []).filter(a => a.id !== id) });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-32 relative">
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
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />

      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Configurações</h2>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gerencie sua conta e preferências</p>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
        {[
          { id: 'perfil', label: 'Perfil', icon: <User size={16} /> },
          { id: 'aparencia', label: 'Aparência', icon: <Sun size={16} /> },
          { id: 'sistema', label: 'Sistema', icon: <SettingsIcon size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="settings-tab-bg"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* CONTEÚDO: PERFIL */}
      {activeTab === 'perfil' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* FOTO DE PERFIL */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                {localConfig.profile?.photoURL ? (
                  <img src={localConfig.profile.photoURL} alt="Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={48} className="text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 hover:bg-indigo-700 transition-all active:scale-90"
              >
                <Camera size={18} />
              </button>
              <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">{localConfig.profile?.displayName || 'Seu Nome'}</h3>
              {localConfig.profile?.isPro && (
                <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 text-[8px] font-black rounded uppercase tracking-widest">PRO</span>
              )}
              {isUserAdmin(authService.auth?.currentUser?.email) && (
                <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded uppercase tracking-widest">ADMIN</span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">@{localConfig.profile?.nickname || 'apelido'}</p>
          </div>

          {/* CAMPOS DE PERFIL */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <User size={12} /> Nome
                </label>
                <input 
                  type="text" 
                  value={localConfig.profile?.firstName || ''}
                  onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  placeholder="Ex: João"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 ring-indigo-500/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <User size={12} /> Sobrenome
                </label>
                <input 
                  type="text" 
                  value={localConfig.profile?.lastName || ''}
                  onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  placeholder="Ex: Silva"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <Plus size={12} /> Apelido
              </label>
              <input 
                type="text" 
                value={localConfig.profile?.nickname || ''}
                onChange={(e) => handleProfileChange('nickname', e.target.value)}
                placeholder="Ex: joao_rota"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 ring-indigo-500/20 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <Phone size={12} /> Celular
              </label>
              <input 
                type="tel" 
                value={localConfig.profile?.phone || ''}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {/* SEGURANÇA */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">Segurança</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail de Login</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{authService.auth?.currentUser?.email || 'Não logado'}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">••••••••••••</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>

          {/* FERRAMENTAS DE ADMIN */}
          {isUserAdmin(authService.auth?.currentUser?.email) && (
            <div className="bg-indigo-600/10 p-6 rounded-3xl border border-indigo-600/20 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Ferramentas de Administrador</h4>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${localConfig.profile?.isPro ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Conta</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {localConfig.profile?.isPro ? 'Plano PRO Ativo' : 'Plano Standard'}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setLocalConfig({
                      ...localConfig,
                      profile: {
                        ...(localConfig.profile || {}),
                        isPro: !localConfig.profile?.isPro
                      }
                    });
                    showToast(`Status alterado para ${!localConfig.profile?.isPro ? 'PRO' : 'Standard'}`);
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localConfig.profile?.isPro ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200' : 'bg-amber-400 text-amber-950 hover:bg-amber-500'}`}
                >
                  {localConfig.profile?.isPro ? 'Mudar para Standard' : 'Mudar para PRO'}
                </button>
              </div>
              <p className="text-[9px] text-indigo-600/60 font-bold uppercase tracking-tight text-center italic">
                Apenas administradores podem ver esta seção e alterar o status manualmente para testes.
              </p>
            </div>
          )}

          {/* CARD: CONTA (LOGOUT) */}
          <div className="bg-rose-500/10 p-6 rounded-3xl border border-rose-500/20">
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mb-2">Sua Conta</h3>
            <p className="text-xs text-rose-500/60 font-bold uppercase tracking-widest mb-6">Gerenciamento de acesso</p>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-200 dark:shadow-none"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO: APARÊNCIA */}
      {activeTab === 'aparencia' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">Aparência</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Diurno', icon: <Sun size={18} /> },
                { id: 'dark', label: 'Noturno', icon: <Moon size={18} /> },
                { id: 'auto', label: 'Auto', icon: <Monitor size={18} /> }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => handleThemeChange(mode.id as any)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${localConfig.themeMode === mode.id ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                >
                  {mode.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CARD: META */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Meta diária</h3>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(localConfig.dailyGoal)}</span>
            </div>
            <input 
              type="range" min="50" max="1000" step="10"
              value={localConfig.dailyGoal}
              onChange={(e) => handleSliderChange('dailyGoal', e.target.value)}
              className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
            />
          </div>

          {/* CARD: RESERVAS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">Taxas de reserva</h3>
            <div className="space-y-6">
              {[
                { id: 'percFuel', label: 'Gasolina', color: 'rose', val: localConfig.percFuel },
                { id: 'percFood', label: 'Comida', color: 'amber', val: localConfig.percFood },
                { id: 'percMaintenance', label: 'Manutenção', color: 'blue', val: localConfig.percMaintenance },
                { id: 'percOthers', label: 'Outros', color: 'slate', val: localConfig.percOthers }
              ].map(item => (
                <div key={item.id} className="space-y-2">
                  <div className="flex justify-between font-black text-[10px] uppercase text-slate-400 dark:text-slate-500">
                    <span>{item.label}</span>
                    <span className={`text-sm text-${item.color}-600 dark:text-${item.color}-400`}>{(item.val * 100).toFixed(1)}%</span>
                  </div>
                  <input type="range" min="0" max="40" step="0.5" value={item.val * 100} onChange={(e) => handleSliderChange(item.id as any, e.target.value)} className={`w-full accent-${item.color}-500 dark:accent-${item.color}-400`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO: SISTEMA */}
      {activeTab === 'sistema' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* CARD: SEJA PRO */}
          {!config.profile?.isPro && (
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-[2.5rem] text-amber-950 shadow-xl relative overflow-hidden border-4 border-amber-300/30">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={20} fill="currentColor" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Rota PRO</h3>
                </div>
                <p className="text-sm font-bold opacity-90 mb-6 leading-relaxed">
                  Desbloqueie backup em nuvem real, relatórios avançados e IA ilimitada.
                </p>
                <button 
                  onClick={onOpenSubscription}
                  className="w-full py-4 bg-amber-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-black active:scale-95 flex items-center justify-center gap-2"
                >
                  Conhecer o Plano PRO
                  <ChevronRight size={16} />
                </button>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-amber-300/20 rotate-12" fill="currentColor" />
            </div>
          )}

          {/* CARD: SOBRE O APP E TUTORIAL */}
          <div className="bg-indigo-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border-4 border-indigo-500/30">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-1">Sobre o RotaFinanceira</h3>
              <p className="text-sm opacity-80 mb-6 leading-relaxed">
                O RotaFinanceira é sua ferramenta definitiva para gestão de ganhos e gastos em rotas. 
                Controle seu faturamento, monitore manutenções e gerencie seu tempo de trabalho em um só lugar.
              </p>
              {!showTutorial ? (
                <button 
                  onClick={() => setShowTutorial(true)} 
                  className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-50 active:scale-95"
                >
                  Ver tutorial de uso
                </button>
              ) : (
                <div className="bg-indigo-950/50 p-6 rounded-2xl border border-indigo-400/20 text-xs space-y-4 animate-in fade-in zoom-in-95">
                  <div className="space-y-2">
                    <p className="font-black text-indigo-300 uppercase tracking-wider">1. Lançamentos Inteligentes</p>
                    <p>No "Lançamento Rápido", use o <b>carrossel de lojas</b> para selecionar estabelecimentos frequentes deslizando para os lados. Digite o valor e escolha o método de pagamento (PIX, Dinheiro ou Caderno).</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-indigo-300 uppercase tracking-wider">2. Gestão de Status</p>
                    <p>No histórico, identifique dívidas rapidamente pela <b>barra lateral vermelha</b> (Pendente) ou <b>verde</b> (Pago). Clique no botão de status para alternar sem precisar editar.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-indigo-300 uppercase tracking-wider">3. Relatórios e IA (Em Breve)</p>
                    <p>Na aba de Relatórios, motoristas <b>PRO</b> têm acesso a análises profundas de lucro. No botão flutuante, converse com o <b>Mestre das Rotas</b> para obter insights sobre seu desempenho (Disponível em breve para todos).</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-indigo-300 uppercase tracking-wider">4. Manutenção e Alertas</p>
                    <p>Configure seus alertas de KM aqui nas configurações. Acompanhe o progresso na aba "Manutenção" para saber exatamente quando revisar seu veículo.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-indigo-300 uppercase tracking-wider">5. Backup e Segurança (Em Breve na Nuvem)</p>
                    <p>Seus dados ficam no seu celular. Use o <b>"Criar Backup"</b> regularmente para salvar um arquivo com tudo. O backup automático na nuvem estará disponível em breve!</p>
                  </div>
                  <button onClick={() => setShowTutorial(false)} className="w-full pt-2 font-black text-indigo-300 uppercase tracking-widest hover:text-white transition-colors">Entendi, fechar tutorial</button>
                </div>
              )}
            </div>
          </div>

          {/* CARD: PERSONALIZAÇÃO DE CATEGORIAS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">Nomes das Categorias</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight mb-6">Personalize os nomes dos métodos de pagamento</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'money', label: 'Dinheiro', icon: <Wallet size={14} /> },
                { id: 'pix', label: 'PIX', icon: <ArrowUpRight size={14} /> },
                { id: 'caderno', label: 'Caderno', icon: <MoreHorizontal size={14} /> }
              ].map(method => (
                <div key={method.id} className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {method.icon} {method.label} (Original)
                  </label>
                  <input 
                    type="text" 
                    value={localConfig.paymentMethodLabels?.[method.id as keyof typeof localConfig.paymentMethodLabels] || ''}
                    onChange={(e) => {
                      setLocalConfig({
                        ...localConfig,
                        paymentMethodLabels: {
                          ...(localConfig.paymentMethodLabels || DEFAULT_CONFIG.paymentMethodLabels!),
                          [method.id]: e.target.value
                        }
                      });
                    }}
                    placeholder={`Ex: ${method.label}`}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CARD: ALERTAS DE MANUTENÇÃO */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Alertas de manutenção</h3>
              <button onClick={addMaintenanceAlert} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5">
                + Adicionar
              </button>
            </div>
            <div className="space-y-4">
              {(localConfig.maintenanceAlerts || []).map(alert => (
                <div key={alert.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Descrição</label>
                    <input 
                      type="text" 
                      value={alert.description} 
                      onChange={(e) => handleMaintenanceAlertChange(alert.id, 'description', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Intervalo (KM)</label>
                    <input 
                      type="number" 
                      value={alert.kmInterval} 
                      onChange={(e) => handleMaintenanceAlertChange(alert.id, 'kmInterval', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button onClick={() => removeMaintenanceAlert(alert.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CARD: BACKUP E RESTAURAÇÃO */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" /></svg>
              Snapshot do sistema
            </h3>
            <p className="text-xs opacity-50 mb-8 uppercase font-bold tracking-widest">Sincronização e Restauração</p>
            
            <div className="space-y-3">
              <button 
                onClick={handleDeepScan}
                disabled={isScanning}
                className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase transition-all active:scale-95 shadow-lg relative overflow-hidden group disabled:opacity-50"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
                  </div>
                  <div className="text-left">
                    <p className="font-black">Recuperar Dados da Memória</p>
                    <p className="text-[8px] opacity-60">Busca profunda no armazenamento local</p>
                  </div>
                </div>
                <ChevronRight size={16} className="relative z-10" />
              </button>

              <button onClick={handleExportCSV} className="w-full flex items-center justify-between p-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 shadow-lg relative overflow-hidden group">
                <span>Exportar Excel (CSV)</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    if (isUserAdmin(authService.auth?.currentUser?.email)) {
                      onForceSync();
                    } else {
                      showToast("Backup em nuvem em breve! ☁️", "success");
                    }
                  }}
                  className="flex flex-col items-center justify-center p-5 bg-amber-600/30 rounded-2xl border border-white/10 hover:bg-amber-600/50 transition-all"
                >
                  <RefreshCw size={24} className="mb-2 text-amber-400" />
                  <span className="text-[10px] font-black uppercase">Sincronizar Agora</span>
                  {!isUserAdmin(authService.auth?.currentUser?.email) && (
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-1">Em Breve</span>
                  )}
                </button>
                <button onClick={handleFullBackup} className="flex flex-col items-center justify-center p-5 bg-indigo-600/30 rounded-2xl border border-white/10 hover:bg-indigo-600/50 transition-all relative overflow-hidden">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="text-[10px] font-black uppercase">Criar Backup</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-5 bg-emerald-600/30 rounded-2xl border border-white/10 hover:bg-emerald-600/50 transition-all">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span className="text-[10px] font-black uppercase">Restaurar</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
              </div>
            </div>
          </div>

          {/* CARD: GERENCIAMENTO DE DADOS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1">Gerenciamento de Dados</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Cuidado: Estas ações são permanentes</p>
            </div>

            <div className="space-y-4">
              {/* Reset por Período */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Limpar por Período</p>
                <button 
                  type="button"
                  onClick={() => setShowRangePicker(true)}
                  className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all hover:border-rose-200 dark:hover:border-rose-500/30 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{new Date(resetPeriod.start + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <ChevronRight size={12} className="text-slate-300" />
                  <div className="flex items-center gap-3">
                    <span>{new Date(resetPeriod.end + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
                <button 
                  onClick={handleResetPeriod}
                  className="w-full py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                >
                  Apagar Período Selecionado
                </button>
              </div>

              <AnimatePresence>
                {showRangePicker && (
                  <CustomDateRangePicker 
                    startDate={resetPeriod.start} 
                    endDate={resetPeriod.end} 
                    onChange={(start, end) => setResetPeriod({ start, end })} 
                    onClose={() => setShowRangePicker(false)} 
                  />
                )}
              </AnimatePresence>

              {/* Reset Total */}
              <button 
                onClick={handleResetTotal}
                className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest">Resetar Conta</p>
                    <p className="text-[9px] font-bold opacity-70 uppercase">Apagar todos os lançamentos</p>
                  </div>
                </div>
                <ChevronRight size={16} />
              </button>

              {/* Excluir Conta */}
              <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={18} className="text-rose-500" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest">Excluir Conta Definitivamente</p>
                    <p className="text-[9px] font-bold opacity-50 uppercase">Apagar perfil e todos os dados</p>
                  </div>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO SALVAR CENTRALIZADO NO RODAPÉ - APENAS SE HOUVER ALTERAÇÕES */}
      {JSON.stringify(localConfig) !== JSON.stringify(config) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
            Salvar Configurações
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
