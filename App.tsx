
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
  Lock,
  AlertTriangle,
  Download,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, generateId, getLocalDateStr, getWeeklySummary } from './utils/calculations';

import { storageService } from './services/storageService';
import { notificationService } from './services/notificationService';
import { authService } from './services/authService';
import Login from './components/Login';
import VerificationBanner from './components/VerificationBanner';
import { User as FirebaseUser } from 'firebase/auth';
import { isUserAdmin } from './constants';
import { db, auth } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'history' | 'reports' | 'settings'>('dashboard');
  const [draggedTab, setDraggedTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'reports' | 'history' | null>(null);
  const [isNavTouched, setIsNavTouched] = useState(false);
  const [touchPercent, setTouchPercent] = useState<number | null>(null);
  const navTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setNavTouchedWithDelay = (value: boolean, delay: number = 0) => {
    if (navTouchTimeoutRef.current) {
      clearTimeout(navTouchTimeoutRef.current);
      navTouchTimeoutRef.current = null;
    }
    
    if (delay > 0) {
      navTouchTimeoutRef.current = setTimeout(() => {
        setIsNavTouched(value);
      }, delay);
    } else {
      setIsNavTouched(value);
    }
  };
  const [prevTab, setPrevTab] = useState<'dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'history' | 'reports' | 'settings'>('dashboard');
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [globalStoreFilter, setGlobalStoreFilter] = useState<string>('all');
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

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Global keyboard visibility handler for mobile
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

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
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    
    if (mediaQuery) {
      const handleChange = () => {
        if (config.themeMode === 'auto') {
          applyTheme();
        }
      };
      
      // Fallback para navegadores mais antigos (comum em WebViews de APKs)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
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

  // Estado de recolher/expandir a barra
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  const setNavbarCollapsedWithDelay = (value: boolean) => {
    setIsNavbarCollapsed(value);
  };

  useEffect(() => {
    let lastTouchY = 0;
    
    // Captura a posição inicial do toque físico (celular)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        lastTouchY = e.touches[0].clientY;
      }
    };

    // Detecta direção física do dedo instantaneamente
    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const currentTouchY = e.touches[0].clientY;
      const diffY = lastTouchY - currentTouchY; // Positivo = rolou para baixo | Negativo = rolou para cima
      
      const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      // Se arrastou para cima (rolou a página para baixo)
      if (diffY > 10 && currentScrollY > 15) {
        setNavbarCollapsedWithDelay(true);
      }
      // Se arrastou para baixo (rolou a página para cima) ou chegou próximo ao topo
      else if (diffY < -10 || currentScrollY < 12) {
        setNavbarCollapsedWithDelay(false);
      }
      
      lastTouchY = currentTouchY;
    };

    // Fallback excelente para o scroll tradicional de mouse/desktop
    const handleScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      if (currentScrollY > lastScrollY.current + 5 && currentScrollY > 20) {
        setNavbarCollapsedWithDelay(true);
      } else if (currentScrollY < lastScrollY.current - 5 || currentScrollY < 12) {
        setNavbarCollapsedWithDelay(false);
      }
      
      lastScrollY.current = Math.max(0, currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Sempre expanda a barra automaticamente se o usuário trocar de página/aba
  useEffect(() => {
    setNavbarCollapsedWithDelay(false);
  }, [activeTab]);

  // Ref da barra de navegação para tracking preciso dos gestos horizontais
  const bottomNavRef = useRef<HTMLDivElement | null>(null);

  // Monitora a movimentação física do dedo e move o seletor em tempo real para a aba correspondente
  const handleNavTouch = (e: any) => {
    if (!bottomNavRef.current) return;
    setNavTouchedWithDelay(true);
    
    // Calcula as dimensões físicas da barra no momento do toque
    const rect = bottomNavRef.current.getBoundingClientRect();
    
    let clientX = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    // Obtém a posição X do toque relativa à largura total da barra
    const relativeX = clientX - rect.left;
    const percentage = relativeX / rect.width;
    const clampedPercent = Math.max(-0.01, Math.min(1.01, percentage));
    setTouchPercent(clampedPercent);
    
    // Divide a barra nas 6 zonas de abas correspondentes
    const itemsCount = 6;
    const index = Math.max(0, Math.min(itemsCount - 1, Math.floor(clampedPercent * itemsCount)));
    
    const targetTabs: ('dashboard' | 'expenses' | 'maintenance' | 'ponto' | 'reports' | 'history')[] = [
      'dashboard', 
      'expenses', 
      'maintenance', 
      'ponto', 
      'reports', 
      'history'
    ];
    
    const targetTab = targetTabs[index];
    if (targetTab && draggedTab !== targetTab) {
      setDraggedTab(targetTab);
      
      // Delicado haptic feedback nativo para simular as marcas físicas do celular
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch (err) {}
      }
    }
  };

  // Efetiva a mudança de aba quando o usuário levanta o dedo da tela
  const handleNavTouchEnd = () => {
    setNavTouchedWithDelay(false, 300); // 300ms delay to expand/collapse smoothly
    setTouchPercent(null);
    if (draggedTab) {
      handleTabChange(draggedTab);
      setDraggedTab(null);
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
      
      let shouldNotify = false;
      if (alert.kmInterval >= 1000 && alert.kmInterval <= 3000) {
        shouldNotify = remaining <= 200;
      } else if (alert.kmInterval >= 4000 && alert.kmInterval <= 10000) {
        shouldNotify = remaining <= 700;
      } else if (alert.kmInterval >= 11000) {
        shouldNotify = remaining <= 1000;
      } else {
        shouldNotify = remaining <= 200;
      }

      if (shouldNotify && remaining > 0) {
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

  // 3. Garantir createdAt e inicializar perfil do Firebase Auth se estiver vazio
  useEffect(() => {
    if (!authChecked || !user || isInitialLoading) return;

    let hasChanges = false;
    const newProfile = { ...(config.profile || {}) };

    // 1. Garante createdAt
    if (!newProfile.createdAt) {
      newProfile.createdAt = new Date().toISOString();
      hasChanges = true;
    }

    // 2. Inicializa nome se estiver vazio
    if (!newProfile.displayName && user.displayName) {
      newProfile.displayName = user.displayName;
      const names = user.displayName.split(' ');
      if (!newProfile.firstName) newProfile.firstName = names[0] || '';
      if (!newProfile.lastName) newProfile.lastName = names.slice(1).join(' ') || '';
      hasChanges = true;
    }

    if (hasChanges) {
      setConfig(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...newProfile
        }
      }));
    }
  }, [authChecked, user, isInitialLoading, config.profile?.displayName, config.profile?.photoURL, config.profile?.createdAt]);

  // Carregamento Inicial Otimizado (Local Primeiro -> Nuvem depois)
  useEffect(() => {
    if (!authChecked || !user) return;

    const initApp = async () => {
      console.log(`Inicializando app para o usuário: ${user.uid} (${user.email})`);
      try {
        // 0. Migra se necessário (agora isolado por usuário)
        await storageService.migrateFromLocalStorage(user.uid);

        // 1. Carregamento Ultra Rápido (Local - Criptografado e Isolado)
        const [localData, localTimeData, localConfig, lastBackup] = await Promise.all([
          storageService.getLocalEntriesWithMetadata(user.uid),
          storageService.getLocalTimeEntriesWithMetadata(user.uid),
          storageService.getLocalConfig(user.uid),
          storageService.getLastBackupTime(user.uid)
        ]);

        const localEntries = localData.entries;
        const localUpdatedAt = localData.updatedAt;
        const localTimeEntries = localTimeData.timeEntries;

        if (localEntries.length > 0) setEntries(recalculateKmDeltas(localEntries));
        if (localTimeEntries.length > 0) setTimeEntries(localTimeEntries);
        if (localUpdatedAt) setLastSyncTime(localUpdatedAt);
        
        if (lastBackup) {
          setLastBackupTime(lastBackup);
          const diffHours = (new Date().getTime() - new Date(lastBackup).getTime()) / (1000 * 60 * 60);
          if (diffHours > 24) setShowBackupReminder(true);
        } else if (localEntries.length > 0) {
          setShowBackupReminder(true);
        }

        if (localConfig) {
          setConfig({ 
            ...DEFAULT_CONFIG, 
            ...localConfig,
            profile: {
              ...(localConfig.profile || {}),
              isPro: true, // Força Pro no modo local para melhor experiência
              subscriptionStatus: 'active'
            }
          });
        } else {
          // Garante Pro para novos usuários locais
          setConfig(prev => ({
            ...prev,
            profile: { ...prev.profile, isPro: true, subscriptionStatus: 'active' }
          }));
        }

        // Libera a tela imediatamente após carregar o local
        setIsInitialLoading(false);
        setIsRefreshing(false);
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initApp();
  }, [authChecked, user]);

  const refreshData = async () => {
    // No modo local, o refresh apenas recarrega do localforage
    if (isRefreshing || !user) return;
    setIsRefreshing(true);
    try {
      const [localData, localTimeData, localConfig] = await Promise.all([
        storageService.getLocalEntriesWithMetadata(user.uid),
        storageService.getLocalTimeEntriesWithMetadata(user.uid),
        storageService.getLocalConfig(user.uid)
      ]);

      setEntries(recalculateKmDeltas(localData.entries));
      setTimeEntries(localTimeData.timeEntries);
      if (localConfig) setConfig(localConfig);
      
      showToast("Dados locais atualizados!");
    } catch (e) {
      showToast("Erro ao carregar dados.", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setIsRefreshing(true); // Reutiliza o estado de loading para feedback visual
    try {
      await storageService.exportBackup(user.uid);
      showToast("Backup gerado com sucesso!", "success");
      setShowBackupReminder(false);
      setLastBackupTime(new Date().toISOString());
    } catch (e) {
      showToast("Erro ao gerar backup.", "error");
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

  // Test Firestore connection on boot
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection test successful.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
        // Skip logging for other errors, as this is simply a connection test.
      }
    };
    testConnection();
  }, []);

  // Monitor isSaving state changes
  useEffect(() => {
    console.log(`[Persistence] isSaving state changed: ${isSaving}`);
  }, [isSaving]);

  // 1. Persistência Local Imediata (Fast Save)
  useEffect(() => {
    if (isInitialLoading || !user) return;
    
    const timeout = setTimeout(async () => {
      try {
        await Promise.all([
          storageService.saveEntries(entries, user.uid, config, false),
          storageService.saveTimeEntries(timeEntries, user.uid, false)
        ]);
      } catch (e) {
        console.error("[App] Erro ao salvar localmente", e);
      }
    }, 200); // 200ms para agrupar mudanças mas salvar quase na hora
    
    return () => clearTimeout(timeout);
  }, [entries, timeEntries, isInitialLoading, user, config]);

  // 2. Sincronização com a Nuvem (DESATIVADA)
  useEffect(() => {
    // Sincronização automática com a nuvem removida para usar apenas modo Local.
    /*
    if (isInitialLoading || isRefreshing || !user) return;
    ...
    */
  }, [entries, timeEntries, isInitialLoading, isRefreshing, user, config]);

  // config save local
  useEffect(() => {
    if (isInitialLoading || isRefreshing || !user) return;
    
    const timeout = setTimeout(() => {
      storageService.saveConfig(config, user.uid, false).catch(console.error);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [config, isInitialLoading, isRefreshing, user]);

  const handleForceSync = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await storageService.syncAll(user.uid, entries, timeEntries, config, true);
      setLastSyncTime(new Date().toISOString());
      setSyncError(null);
      showToast("Sincronização concluída com sucesso!", "success");
    } catch (e: any) {
      console.error("[App] Erro na sincronização forçada", e);
      setSyncError(e.message || String(e));
      showToast("Erro ao sincronizar. Tente novamente.", "error");
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const recalculateKmDeltas = useCallback((allEntries: DailyEntry[]) => {
    // Ordena por data e depois pelo valor do odômetro para garantir a sequência lógica correta
    const sorted = [...allEntries].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      // Se ambos tiverem odômetro, usa o valor do odômetro como critério de ordem
      if (a.kmAtMaintenance && b.kmAtMaintenance) {
        return a.kmAtMaintenance - b.kmAtMaintenance;
      }
      
      return a.time.localeCompare(b.time);
    });
    
    let lastKm = 0;
    return sorted.map(entry => {
      if (entry.kmAtMaintenance && entry.kmAtMaintenance > 0) {
        const currentKm = entry.kmAtMaintenance;
        
        // Se for manutenção, o KM é apenas informativo ("conhecimento")
        // Mas ainda atualizamos o lastKm para que o próximo fechamento use este ponto como base
        if (entry.category === 'maintenance') {
          lastKm = currentKm;
          return { ...entry, kmDriven: 0 };
        }

        // O delta é a diferença para o último odômetro conhecido
        // Se for o primeiro registro ou o KM atual for menor que o anterior (reset de odômetro), delta é 0
        const delta = (lastKm > 0 && currentKm >= lastKm) ? currentKm - lastKm : 0;
        lastKm = currentKm;
        
        return { ...entry, kmDriven: delta };
      }
      return entry;
    });
  }, []);

  const addEntry = (entry: DailyEntry) => {
    const isPro = config.profile?.isPro;
    const monthlyCount = getMonthlyEntriesCount();

    const todayStr = getLocalDateStr();
    
    setEntries(prev => {
      let updatedEntries = [...prev, entry];
      
      // Recalcula todos os deltas para manter a consistência com o odômetro total
      updatedEntries = recalculateKmDeltas(updatedEntries);

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
        showToast("Lançamento salvo com sucesso!");
      }

      return updatedEntries;
    });

    if (entry.fuelPrice) {
      setConfig(prev => ({ ...prev, lastFuelPrice: entry.fuelPrice }));
    }

    // Atualiza o último KM global baseado no maior valor encontrado (exceto manutenções)
    if (entry.kmAtMaintenance && entry.category !== 'maintenance') {
      setConfig(prev => ({ 
        ...prev, 
        lastTotalKm: Math.max(prev.lastTotalKm || 0, entry.kmAtMaintenance || 0) 
      }));
    }
  };
  
  const updateEntry = (updated: DailyEntry) => {
    setEntries(prev => {
      const mapped = prev.map(e => e.id === updated.id ? updated : e);
      const recalculated = recalculateKmDeltas(mapped);
      
      const kmEntries = recalculated
        .filter(e => (e.kmAtMaintenance || 0) > 0 && e.category !== 'maintenance')
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      
      const newLastKm = kmEntries.length > 0 ? kmEntries[0].kmAtMaintenance : 0;
      setConfig(prevConfig => ({ ...prevConfig, lastTotalKm: newLastKm }));
      
      return recalculated;
    });
    setEditingEntry(null);
    showToast("Registro atualizado com sucesso!");
  };

  const bulkUpdateStoreName = (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;

    setEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.storeName === oldName) {
          return { ...entry, storeName: newName };
        }
        return entry;
      });
      return updated;
    });
    showToast(`Loja "${oldName}" renomeada para "${newName}" em todos os registros!`);
  };

  const bulkUpdatePaidStatus = (ids: string[], isPaid: boolean) => {
    if (!ids || ids.length === 0) return;
    setEntries(prev => {
      return prev.map(entry => {
        if (ids.includes(entry.id)) {
          return { ...entry, isPaid };
        }
        return entry;
      });
    });
    showToast(`Registros marcados como ${isPaid ? 'pagos' : 'pendentes'}!`);
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
          const filtered = prev.filter(e => e.id !== id);
          const recalculated = recalculateKmDeltas(filtered);
          
          const kmEntries = recalculated
            .filter(e => (e.kmAtMaintenance || 0) > 0 && e.category !== 'maintenance')
            .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
          
          const newLastKm = kmEntries.length > 0 ? kmEntries[0].kmAtMaintenance : 0;
          setConfig(c => ({ ...c, lastTotalKm: newLastKm }));
          
          return recalculated;
        });
        showToast("Registro removido.", "error");
        setDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [recalculateKmDeltas]);

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
      const now = new Date().toTimeString().slice(0, 8);
      updateTimeEntry({ ...activeShift, endTime: now });
    } else {
      const now = new Date().toTimeString().slice(0, 8);
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

    // Se admin, força sync imedato após importação
    if (user && isUserAdmin(user.email)) {
      storageService.saveEntries(sanitizedEntries, user.uid, newConfig || config, true, true);
    }

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
        const result = await storageService.deleteDataByPeriod(start, end, user.uid, config);
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

      {user && !user.emailVerified && !isUserAdmin(user.email) && (
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
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${syncError ? 'text-rose-500' : 'text-slate-400'}`}>
                  {isSaving ? 'Salvando...' : (
                    syncError ? (
                      <><AlertTriangle size={8} className="animate-pulse" /> Erro de Sync</>
                    ) : (
                      isUserAdmin(user?.email) ? <><Cloud size={8} /> Backup Ativo</> : <><Cloud size={8} /> Nuvem Local</>
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackup}
              className={`p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-all ${isRefreshing ? 'animate-pulse text-indigo-600' : ''}`}
              title="Salvar Backup no Dispositivo"
            >
              <Download size={20} />
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
            {user && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <div className="w-9 h-9 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                  {config.profile?.photoURL ? (
                    <img 
                      key={config.profile.photoURL}
                      src={config.profile.photoURL} 
                      alt="Profile" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showBackupReminder && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 overflow-hidden"
          >
            <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Download size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Sugestão de Backup Manual</p>
                  <p className="text-[10px] opacity-80 leading-tight">Faz mais de 24h que você não salva uma cópia dos seus dados.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleBackup}
                  className="px-3 py-1 bg-white text-indigo-600 text-[10px] font-black rounded-lg hover:bg-indigo-50 transition-colors uppercase"
                >
                  Salvar Agora
                </button>
                <button 
                  onClick={() => setShowBackupReminder(false)}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onUpdate={updateEntry}
              />
            )}
            {activeTab === 'expenses' && <Expenses entries={entries} config={config} onEdit={setEditingEntry} onAdd={addEntry} onDelete={deleteEntry} onUpdate={updateEntry} />}
            {activeTab === 'maintenance' && (
              <Maintenance 
                entries={entries} 
                config={config} 
                onEdit={setEditingEntry} 
                onAdd={addEntry} 
                onDelete={deleteEntry} 
                onChangeConfig={setConfig}
                showToast={showToast}
              />
            )}
            {activeTab === 'ponto' && <TimeTracking timeEntries={timeEntries} onAdd={addTimeEntry} onUpdate={updateTimeEntry} onDelete={deleteTimeEntry} />}
            {activeTab === 'reports' && (
              <Reports 
                entries={entries} 
                timeEntries={timeEntries} 
                config={config} 
                onAddEntry={addEntry} 
                selectedStore={globalStoreFilter}
                onStoreChange={setGlobalStoreFilter}
              />
            )}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <QuickLaunch onAdd={addEntry} existingEntries={entries} config={config} />
                <History 
                  entries={entries} 
                  timeEntries={timeEntries} 
                  config={config} 
                  onDelete={deleteEntry} 
                  onEdit={setEditingEntry} 
                  onUpdate={updateEntry}
                  onBulkUpdateStoreName={bulkUpdateStoreName}
                  onBulkUpdatePaidStatus={bulkUpdatePaidStatus}
                  filterStore={globalStoreFilter === 'all' ? '' : globalStoreFilter}
                  onFilterStoreChange={(val) => setGlobalStoreFilter(val === '' ? 'all' : val)}
                />
              </div>
            )}
            {activeTab === 'settings' && <Settings config={config} entries={entries} timeEntries={timeEntries} onChange={setConfig} onImport={importData} showToast={showToast} onResetData={resetData} onDeleteAccount={deleteAccount} onForceSync={handleForceSync} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeTab !== 'settings' && !isKeyboardOpen && (() => {
        const tabIndexes: Record<string, number> = {
          'dashboard': 0,
          'expenses': 1,
          'maintenance': 2,
          'ponto': 3,
          'reports': 4,
          'history': 5,
        };
        const activeIndex = tabIndexes[draggedTab || activeTab] ?? 0;
        const isSmallState = isNavbarCollapsed && !isNavTouched;
        const currentWidth = isNavTouched ? 19.8 : 14.5;
        const targetLeft = touchPercent !== null 
          ? Math.max(-2, Math.min(102 - currentWidth, touchPercent * 100 - (currentWidth / 2)))
          : (activeIndex * 16.666 + 8.333) - (currentWidth / 2);

        // Height, top offset and border-radius dynamic properties
        const dropletHeight = isNavTouched 
          ? '115%' 
          : (isSmallState ? '82%' : '84%');
        const dropletTop = isNavTouched 
          ? '-7.5%' 
          : (isSmallState ? '9%' : '8%');
        const dropletRadius = isNavTouched 
          ? '1.05rem' 
          : '0.85rem';

        return (
          <nav 
            onTouchStart={handleNavTouch}
            onTouchMove={handleNavTouch}
            onTouchEnd={handleNavTouchEnd}
            onTouchCancel={() => { setDraggedTab(null); setTouchPercent(null); setNavTouchedWithDelay(false, 300); }}
            onMouseDown={(e) => {
              handleNavTouch(e);
              
              const handleMouseMove = (en: MouseEvent) => {
                handleNavTouch(en);
              };
              const handleMouseUp = () => {
                handleNavTouchEnd();
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
              };
              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp);
            }}
            className={`liquid-glass-bar md:hidden ${
              isSmallState
                ? 'glass-collapsed' 
                : 'glass-expanded'
            } ${
              isNavTouched 
                ? '!scale-[1.04] -translate-y-1.5' 
                : ''
            }`}
          >
            {/* Reflexo de Vidro Líquido Realista 3D de Curvatura (Glass Lens Curvature Reflection) */}
            <div className="glass-specular-reflection" />

            <div 
              ref={bottomNavRef}
              className="flex justify-around items-center h-full w-full relative z-10"
            >
              {/* Gota de Vidro Líquido Flutuante (Fluid Glass Droplet Selector) - Placed inside the inner padded boundary for perfect pixel alignment */}
              <motion.div
                className="absolute glass-droplet z-0 pointer-events-none"
                animate={{
                  left: `${targetLeft}%`,
                  width: `${currentWidth}%`,
                  height: dropletHeight,
                  top: dropletTop,
                  borderRadius: dropletRadius,
                  scale: isNavTouched ? 1.05 : 1,
                }}
                transition={{
                  left: touchPercent !== null 
                    ? { type: 'tween', duration: 0 } 
                    : { type: 'spring', stiffness: 380, damping: 24 },
                  default: {
                    type: 'spring',
                    stiffness: touchPercent !== null ? 650 : 380,
                    damping: touchPercent !== null ? 36 : 24,
                    mass: 0.8
                  }
                }}
              />

              {[
                { id: 'dashboard', label: 'Início', icon: <Home size={18} /> },
                { id: 'expenses', label: 'Gastos', icon: <ArrowUpRight size={18} /> },
                { id: 'maintenance', label: 'Manut.', icon: <Wrench size={18} /> },
                { id: 'ponto', label: 'Ponto', icon: <Clock size={18} /> },
                { id: 'reports', label: 'Relat.', icon: <BarChart3 size={18} /> },
                { id: 'history', label: 'Histórico', icon: <HistoryIcon size={18} /> }
              ].map((item) => {
                const isVisualActive = (draggedTab || activeTab) === item.id;
                
                return (
                  <button 
                    key={item.id} 
                    onClick={() => handleTabChange(item.id as any)} 
                    className={`flex flex-col items-center justify-center flex-1 group relative z-10 transition-all duration-500 px-1 ${
                      isSmallState ? 'py-0 h-10' : 'py-1.5 h-14'
                    }`}
                  >
                    {/* Ícone com toque orgânico de luz sutil - Aumenta de tamanho com efeito elástico apenas quando o seletor está ativo/sendo tocado e a gota aumenta */}
                    <motion.div 
                      animate={{
                        scale: (isVisualActive && isNavTouched) ? (isSmallState ? 1.25 : 1.3) : (isSmallState ? 0.95 : 1),
                        y: (isVisualActive && isNavTouched) ? -3 : 0
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`flex items-center justify-center ${
                        isSmallState ? 'w-8 h-8' : 'w-10 h-6'
                      } ${isVisualActive ? 'text-indigo-600 dark:text-indigo-400 drop-shadow-[0_2px_8px_rgba(99,102,241,0.3)]' : 'text-slate-400 hover:text-indigo-500'}`}
                    >
                      {item.icon}
                    </motion.div>

                    {/* Texto que some suavemente com escala e transição de tamanho, acompanhando o movimento do ícone */}
                    <motion.span 
                      animate={{
                        scale: (isVisualActive && isNavTouched) ? 1.15 : 1,
                        y: (isVisualActive && isNavTouched) ? -2 : 0
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`text-[9px] font-black uppercase tracking-tighter block origin-top ${
                        isSmallState 
                          ? 'opacity-0 max-h-0 h-0 mt-0 pointer-events-none scale-0 transition-all duration-500' 
                          : 'opacity-100 max-h-4 mt-0.5 scale-100'
                      } ${isVisualActive ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400'}`}
                    >
                      {item.label}
                    </motion.span>
                  </button>
                );
              })}
            </div>
          </nav>
        );
      })()}
    </div>
  );
};

export default App;
