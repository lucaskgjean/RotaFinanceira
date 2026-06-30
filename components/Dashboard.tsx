
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, calculateFuelMetrics, getLocalDateStr, calculateDuration, formatDuration, getDailyStats } from '../utils/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Fuel, 
  Utensils, 
  Wrench, 
  Wallet, 
  Navigation,
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Eye,
  EyeOff,
  Smartphone,
  Banknote,
  CreditCard,
  BookOpen,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';
import PerformanceCalendar from './PerformanceCalendar';

interface DashboardProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
  onNavigate: (tab: any) => void;
  onAdd: (entry: DailyEntry) => void;
  onToggleShift: () => void;
  onUpdate?: (entry: DailyEntry) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, timeEntries, config, onEdit, onDelete, onNavigate, onAdd, onToggleShift, onUpdate }) => {
  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);
  const [now, setNow] = useState(new Date());

  // Encontra o ponto ativo de hoje
  const activeShift = useMemo(() => {
    return timeEntries.find(t => t.date === todayStr && !t.endTime);
  }, [timeEntries, todayStr]);

  // Atualiza a hora 'now' a cada segundo se houver um ponto ativo
  useEffect(() => {
    if (!activeShift) return;

    // Sincroniza imediatamente o estado de "now"
    setNow(new Date());

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeShift]);

  // Calcula a duração do ponto ativo em tempo real no formato HH:MM:SS
  const activeShiftDuration = useMemo(() => {
    if (!activeShift) return '';

    try {
      const [year, month, day] = activeShift.date.split('-').map(Number);
      const [hour, minute, second = 0] = activeShift.startTime.split(':').map(Number);
      const startDateTime = new Date(year, month - 1, day, hour, minute, second);

      const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startDateTime.getTime()) / 1000));

      const hrs = Math.floor(elapsedSeconds / 3600);
      const mins = Math.floor((elapsedSeconds % 3600) / 60);
      const secs = elapsedSeconds % 60;

      const formatNum = (num: number) => String(num).padStart(2, '0');
      return `${formatNum(hrs)}:${formatNum(mins)}:${formatNum(secs)}`;
    } catch (e) {
      console.error(e);
      return '00:00:00';
    }
  }, [activeShift, now]);

  const [hideNumbers, setHideNumbers] = useState(() => localStorage.getItem('rota_hide_numbers') === 'true');

  const toggleHideNumbers = () => {
    setHideNumbers(prev => {
      const next = !prev;
      localStorage.setItem('rota_hide_numbers', String(next));
      return next;
    });
  };

  const [viewedEntryId, setViewedEntryId] = useState<string | null>(null);
  const [navDirection, setNavDirection] = useState<-1 | 1>(1);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const lastScrollY = useRef(0);

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
        setIsButtonVisible(false);
      }
      // Se arrastou para baixo (rolou a página para cima) ou chegou próximo ao topo
      else if (diffY < -10 || currentScrollY < 12) {
        setIsButtonVisible(true);
      }
      
      lastTouchY = currentTouchY;
    };

    // Fallback excelente para o scroll tradicional de mouse/desktop
    const handleScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      if (currentScrollY > lastScrollY.current + 5 && currentScrollY > 20) {
        setIsButtonVisible(false);
      } else if (currentScrollY < lastScrollY.current - 5 || currentScrollY < 12) {
        setIsButtonVisible(true);
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

  // Redireciona para o último lançamento automaticamente quando um novo lançamento é feito
  const prevEntriesLength = useRef(entries.length);
  useEffect(() => {
    if (entries.length > prevEntriesLength.current) {
      setViewedEntryId(null);
    }
    prevEntriesLength.current = entries.length;
  }, [entries.length]);

  // Ordena todos os lançamentos cronologicamente (do mais novo para o mais antigo)
  const allEntriesSorted = useMemo(() => {
    if (entries.length === 0) return [];
    return [...entries].sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time || '00:00'}`;
      const dateTimeB = `${b.date}T${b.time || '00:00'}`;
      return dateTimeB.localeCompare(dateTimeA);
    });
  }, [entries]);

  // Lançamentos de hoje ordenados (do mais novo para o mais antigo)
  const todayEntriesSorted = useMemo(() => {
    return allEntriesSorted.filter(e => e.date === todayStr);
  }, [allEntriesSorted, todayStr]);

  // Lançamento atualmente exibido
  const displayedEntry = useMemo(() => {
    if (viewedEntryId) {
      const entry = allEntriesSorted.find(e => e.id === viewedEntryId);
      if (entry) return entry;
    }
    // Mostra por padrão o último lançamento de hoje
    return todayEntriesSorted[0] || null;
  }, [viewedEntryId, allEntriesSorted, todayEntriesSorted]);

  // Índice do lançamento exibido na lista completa de lançamentos
  const displayedIndex = useMemo(() => {
    if (!displayedEntry) return -1;
    return allEntriesSorted.findIndex(e => e.id === displayedEntry.id);
  }, [displayedEntry, allEntriesSorted]);

  // Vai para um lançamento anterior (mais antigo no tempo -> índice aumenta na lista ordenada)
  const handleOlder = () => {
    if (allEntriesSorted.length === 0) return;
    setNavDirection(-1);
    if (displayedIndex === -1) {
      // Se não havia lançamento no dia, puxa o último lançamento geral feito
      setViewedEntryId(allEntriesSorted[0].id);
    } else if (displayedIndex < allEntriesSorted.length - 1) {
      setViewedEntryId(allEntriesSorted[displayedIndex + 1].id);
    }
  };

  // Vai para um lançamento mais recente (mais novo no tempo -> índice diminui)
  const handleNewer = () => {
    setNavDirection(1);
    if (displayedIndex > 0) {
      setViewedEntryId(allEntriesSorted[displayedIndex - 1].id);
    } else if (displayedIndex === 0) {
      // Se já está no mais novo, volta a mostrar o estado de hoje (padrão)
      setViewedEntryId(null);
    }
  };

  // Dia em questão (se estiver visualizando um lançamento antigo, pega a data dele)
  const activeDate = useMemo(() => {
    return displayedEntry ? displayedEntry.date : todayStr;
  }, [displayedEntry, todayStr]);

  // Filtra as corridas (ganhos) do dia em questão
  const activeDayIncomeEntries = useMemo(() => {
    return entries
      .filter(e => e.date === activeDate && e.grossAmount > 0)
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [entries, activeDate]);

  // Índice do ganho em exibição nas corridas do dia em questão
  const activeDayIncomeIndex = useMemo(() => {
    if (!displayedEntry || displayedEntry.grossAmount <= 0) return -1;
    return activeDayIncomeEntries.findIndex(e => e.id === displayedEntry.id);
  }, [displayedEntry, activeDayIncomeEntries]);

  // Todos os lançamentos do dia em questão
  const activeDayAllEntries = useMemo(() => {
    return entries
      .filter(e => e.date === activeDate)
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [entries, activeDate]);

  // Índice de todos os lançamentos do dia em questão
  const activeDayAllIndex = useMemo(() => {
    if (!displayedEntry) return -1;
    return activeDayAllEntries.findIndex(e => e.id === displayedEntry.id);
  }, [displayedEntry, activeDayAllEntries]);

  // Detalhes estilizados do lançamento exibido
  const displayedEntryDetails = useMemo(() => {
    if (!displayedEntry) return null;
    
    const isIncome = displayedEntry.grossAmount > 0;
    let category: 'income' | 'fuel' | 'food' | 'maintenance' | 'others' = 'income';
    let amount = displayedEntry.grossAmount;
    let label = 'Ganho';
    let colorClass = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
    let icon = <TrendingUp size={20} />;

    if (!isIncome) {
      if (displayedEntry.fuel > 0) {
        category = 'fuel';
        amount = displayedEntry.fuel;
        label = 'Combustível';
        colorClass = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
        icon = <Fuel size={20} />;
      } else if (displayedEntry.food > 0) {
        category = 'food';
        amount = displayedEntry.food;
        label = 'Alimentação';
        colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
        icon = <Utensils size={20} />;
      } else if (displayedEntry.maintenance > 0) {
        category = 'maintenance';
        amount = displayedEntry.maintenance;
        label = 'Manutenção';
        colorClass = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20';
        icon = <Wrench size={20} />;
      } else {
        category = 'others';
        amount = displayedEntry.others;
        label = 'Outros';
        colorClass = 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20';
        icon = <Wallet size={20} />;
      }
    }

    return {
      category,
      amount,
      label,
      colorClass,
      icon,
      isIncome
    };
  }, [displayedEntry]);

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'pix': return <Smartphone size={12} className="text-slate-400" />;
      case 'money': return <Banknote size={12} className="text-slate-400" />;
      case 'debito': return <CreditCard size={12} className="text-slate-400" />;
      case 'caderno': return <BookOpen size={12} className="text-slate-400" />;
      default: return <Wallet size={12} className="text-slate-400" />;
    }
  };

  const todayEntries = entries.filter(e => e.date === activeDate);
  const todaySum = { ...getWeeklySummary(todayEntries), count: todayEntries.filter(e => e.grossAmount > 0).length };
  const isGoalReached = todaySum.totalGross >= config.dailyGoal;

  const goalCardRef = useRef<HTMLDivElement>(null);
  const prevIsGoalReached = useRef(isGoalReached);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 10000); // Atualiza a cada 10 segundos para o cronômetro
    return () => clearInterval(interval);
  }, []);

  const currentTime = now.toTimeString().slice(0, 5);

  const getStartOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const startOfWeek = getStartOfWeek(new Date());
  startOfWeek.setHours(0, 0, 0, 0);

  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));
  const weekEntries = entries.filter(e => {
    const entryDate = new Date(e.date + 'T12:00:00');
    return entryDate >= startOfWeek;
  });

  const monthSum = { ...getWeeklySummary(monthEntries), count: monthEntries.filter(e => e.grossAmount > 0).length };
  const weekSum = { ...getWeeklySummary(weekEntries), count: weekEntries.filter(e => e.grossAmount > 0).length };
  const generalSum = getWeeklySummary(entries);

  // Cálculo de Horas Trabalhadas Hoje em Tempo Real
  const todayTimeEntries = timeEntries.filter(t => t.date === activeDate);
  const todayWorkedSeconds = todayTimeEntries.reduce((acc, curr) => {
    if (curr.startTime && curr.endTime) {
      return acc + calculateDuration(curr.startTime, curr.endTime, curr.breakDuration || 0);
    } else if (curr.startTime && !curr.endTime) {
      return acc + calculateDuration(curr.startTime, currentTime, 0);
    }
    return acc;
  }, 0);

  const todayHoursDecimal = todayWorkedSeconds / 3600;
  const todayGrossPerHour = todayHoursDecimal > 0 ? todaySum.totalGross / todayHoursDecimal : 0;
  const todayEarningsPerKm = todaySum.workKm && todaySum.workKm > 0 ? todaySum.totalGross / todaySum.workKm : 0;
  const todayTotalSpent = todaySum.totalSpentFuel + todaySum.totalSpentFood + todaySum.totalSpentMaintenance + (todaySum.totalSpentOthers || 0);

  const fuelMetrics = calculateFuelMetrics(entries);
  const dailyBreakdown = useMemo(() => getDailyStats(entries, timeEntries, config), [entries, timeEntries, config]);

  const goalPercent = Math.min(100, (todaySum.totalGross / config.dailyGoal) * 100);

  // Efeito de scroll e celebração quando a meta é batida
  useEffect(() => {
    // Só faz o scroll se a meta ACABOU de ser batida (transição de false para true)
    // E não faz no primeiro mount
    if (isGoalReached && !prevIsGoalReached.current && !isFirstMount.current) {
      // Pequeno delay para garantir que o usuário veja o lançamento sendo processado
      setTimeout(() => {
        if (goalCardRef.current) {
          goalCardRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 500);
    }
    
    // Atualiza o ref para a próxima mudança
    prevIsGoalReached.current = isGoalReached;
    isFirstMount.current = false;
  }, [isGoalReached]);

  const pieData = [
    { name: `Combustível`, value: todaySum.totalSpentFuel, color: '#f43f5e' },
    { name: `Alimentação`, value: todaySum.totalSpentFood, color: '#f59e0b' },
    { name: `Manutenção`, value: todaySum.totalSpentMaintenance, color: '#3b82f6' },
    { name: `Outros`, value: todaySum.totalSpentOthers || 0, color: '#64748b' },
    { name: `Lucro Líquido`, value: todaySum.totalNet, color: '#10b981' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  } as const;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotate: direction > 0 ? 5 : -5,
      zIndex: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      zIndex: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 26
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      rotate: direction > 0 ? -5 : 5,
      zIndex: 0,
      transition: {
        duration: 0.25,
        ease: "easeInOut" as const
      }
    })
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-20"
    >
      {/* 0. Botão de Ponto Rápido */}
      <motion.div 
        animate={{
          opacity: isButtonVisible ? 1 : 0,
          scale: isButtonVisible ? 1 : 0.85,
          y: isButtonVisible ? 0 : -80,
        }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="sticky top-[72px] z-30 flex justify-center pointer-events-none"
        style={{
          pointerEvents: isButtonVisible ? 'auto' : 'none'
        }}
      >
        <button 
          onClick={onToggleShift}
          className={`pointer-events-auto relative overflow-hidden flex items-center gap-2.5 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-md border-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(100,116,139,0.1)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_10px_25px_-5px_rgba(0,0,0,0.5)] hover:scale-[1.04] active:scale-[0.96] cursor-pointer ${
            activeShift
              ? 'bg-white/80 dark:bg-slate-900/80 text-rose-500 dark:text-rose-400 hover:bg-white/90 dark:hover:bg-slate-900/90' 
              : 'bg-white/80 dark:bg-slate-900/80 text-emerald-500 dark:text-emerald-400 hover:bg-white/90 dark:hover:bg-slate-900/90'
          }`}
        >
          {/* Reflexo de Vidro Líquido Realista 3D de Curvatura (Glass Lens Curvature Reflection) */}
          <div className="glass-specular-reflection" />
          
          <div className={`relative z-10 flex items-center gap-2.5 ${
            activeShift 
              ? 'drop-shadow-[0_0_2px_rgba(244,63,94,0.6)] dark:drop-shadow-[0_0_4px_rgba(244,63,94,0.8)]' 
              : 'drop-shadow-[0_0_2px_rgba(16,185,129,0.6)] dark:drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]'
          }`}>
            <Clock size={14} className={`${activeShift ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
            <span>{activeShift ? `Encerrar Ponto • ${activeShiftDuration}` : 'Iniciar Ponto'}</span>
          </div>
        </button>
      </motion.div>

      {/* 1. Lançamento Rápido */}
      <motion.div variants={itemVariants}>
        <QuickLaunch onAdd={onAdd} existingEntries={entries} config={config} />
      </motion.div>

      {/* 2. Bento Grid Section - Reverted and Adjusted */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card de Progresso (Revertido para o design anterior) */}
        <motion.div 
          ref={goalCardRef}
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          animate={isGoalReached ? {
            backgroundColor: '#f59e0b',
            backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%)',
            borderColor: '#fcd34d',
            boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.3), 0 10px 10px -5px rgba(245, 158, 11, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.3)',
          } : {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className={`md:col-span-2 p-6 rounded-[2.5rem] border flex flex-col justify-between relative overflow-hidden group transition-colors duration-500 ${!isGoalReached ? 'bg-indigo-50/40 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/20 shadow-sm' : 'border-amber-300 dark:border-amber-500/50'}`}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500 ${isGoalReached ? 'bg-white/30 text-white shadow-inner' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                  <Target size={18} strokeWidth={2.5} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isGoalReached ? 'text-amber-950/80' : 'text-slate-400 dark:text-slate-500'}`}>Meta Diária</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleHideNumbers(); }}
                  className={`p-1 rounded-lg transition-colors relative z-20 ${
                    isGoalReached 
                      ? 'hover:bg-white/20 text-amber-950/75 hover:text-amber-950' 
                      : 'hover:bg-indigo-100 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-650'
                  }`}
                  title={hideNumbers ? "Mostrar valores" : "Esconder valores"}
                >
                  {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all duration-500 ${isGoalReached ? 'bg-white/40 text-white shadow-sm backdrop-blur-sm' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                {isGoalReached ? '🏆 Meta Batida!' : 'Em progresso'}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black font-mono-num tracking-tighter transition-colors duration-500 ${isGoalReached ? 'text-amber-950 drop-shadow-sm' : 'text-slate-800 dark:text-white'}`}>
                  {hideNumbers ? '••••' : formatCurrency(todaySum.totalGross).replace('R$', '')}
                </span>
                <span className={`text-lg font-bold transition-colors duration-500 ${isGoalReached ? 'text-amber-900/50' : 'text-slate-300 dark:text-slate-600'}`}>
                  {hideNumbers ? ' / R$ ••••' : `/ ${formatCurrency(config.dailyGoal)}`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`h-3 w-full rounded-full overflow-hidden transition-colors duration-500 ${isGoalReached ? 'bg-black/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full transition-colors duration-500 ${isGoalReached ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,1)]' : 'bg-indigo-500'}`}
                />
              </div>
              <div className={`flex justify-between text-[10px] font-black uppercase transition-colors duration-500 ${isGoalReached ? 'text-amber-900/70' : 'text-slate-400'}`}>
                <span>{hideNumbers ? '••%' : `${goalPercent.toFixed(0)}%`} concluído</span>
                <span>{isGoalReached ? 'Objetivo Alcançado!' : `Faltam ${hideNumbers ? 'R$ ••••' : formatCurrency(Math.max(0, config.dailyGoal - todaySum.totalGross))}`}</span>
              </div>
            </div>
          </div>
          <div className={`absolute -right-4 -bottom-4 opacity-[0.1] group-hover:opacity-[0.15] transition-all duration-700 ${isGoalReached ? 'text-amber-950 scale-110 rotate-12' : 'text-red-500'}`}>
            <Target size={180} />
          </div>
          {isGoalReached && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-100%] animate-[shimmer_4s_infinite]"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </motion.div>

        {/* Card do Último Lançamento feito */}
        <div className="md:col-span-2 h-[255px] relative">
          <AnimatePresence mode="popLayout" custom={navDirection}>
            <motion.div 
              key={displayedEntry ? displayedEntry.id : 'empty'}
              custom={navDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
              onDragEnd={(event, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  handleNewer();
                } else if (info.offset.x > swipeThreshold) {
                  handleOlder();
                }
              }}
              whileTap={{ cursor: "grabbing" }}
              whileHover={{ 
                y: -4, 
                transition: { duration: 0.2 } 
              }}
              className="absolute inset-0 w-full h-full p-5 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden group select-none touch-pan-y cursor-grab active:cursor-grabbing"
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex flex-col h-[155px] justify-between">
                  <div className="flex justify-between items-center h-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Clock size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 truncate leading-none">
                          {!displayedEntry 
                            ? 'Último Lançamento' 
                            : (displayedEntry.date === todayStr ? 'Lançamento de Hoje' : 'Lançamento Anterior')}
                        </h3>
                        {displayedEntry && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-tight leading-none">
                              {new Date(displayedEntry.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(/^\w/, c => c.toUpperCase())}
                            </span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
                              • Arraste para navegar
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Setas de navegação sutis */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {allEntriesSorted.length > 0 && (
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          {viewedEntryId !== null && (
                            <button
                              onClick={() => setViewedEntryId(null)}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer mr-0.5"
                              title="Voltar para o último lançamento"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                          
                          <button
                            onClick={handleOlder}
                            disabled={displayedIndex >= allEntriesSorted.length - 1}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title="Lançamento anterior"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          
                          {displayedIndex !== -1 && (
                            <span className="text-[9px] font-mono-num font-bold px-1 text-slate-400" title={`Lançamento ${displayedIndex + 1} de ${allEntriesSorted.length} geral`}>
                              {displayedEntry && displayedEntry.grossAmount > 0 && activeDayIncomeIndex !== -1
                                ? `${activeDayIncomeIndex + 1}/${activeDayIncomeEntries.length}`
                                : `${activeDayAllIndex + 1}/${activeDayAllEntries.length}`
                              }
                            </span>
                          )}

                          <button
                            onClick={handleNewer}
                            disabled={displayedIndex <= 0 && viewedEntryId === null}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title="Lançamento mais recente"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}

                      {displayedEntry && (
                        <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${
                          displayedEntry.isPaid 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
                        }`}>
                          {displayedEntry.isPaid ? 'Pago' : 'Pend'}
                        </div>
                      )}
                    </div>
                  </div>

                  {!displayedEntry ? (
                    <div className="flex flex-col items-center justify-center text-center h-[110px]">
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold max-w-[200px] leading-relaxed mb-2">
                        Nenhum lançamento hoje.
                      </span>
                      {allEntriesSorted.length > 0 && (
                        <button
                          onClick={handleOlder}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <ChevronLeft size={12} />
                          Ver último anterior
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-[110px] flex flex-col justify-between pt-1">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2.5 items-center min-w-0">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${displayedEntryDetails?.colorClass}`}>
                            {displayedEntryDetails?.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 dark:text-white leading-tight text-sm truncate">
                              {displayedEntry.storeName.replace('[GASTO]', '').trim()}
                            </h4>
                            <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5 block">
                              {displayedEntryDetails?.label}
                              {displayedEntry.grossAmount > 0 && activeDayIncomeIndex !== -1 && (
                                <span className="text-indigo-500 dark:text-indigo-400 ml-1.5 bg-indigo-50 dark:bg-indigo-500/10 px-1 py-0.5 rounded text-[8px] font-black">
                                  {activeDayIncomeIndex + 1}ª Corrida
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xl font-black font-mono-num tracking-tighter ${
                            displayedEntryDetails?.isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}>
                            {hideNumbers ? 'R$ ••••' : formatCurrency(displayedEntryDetails?.amount || 0)}
                          </div>
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                            Valor
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-b border-slate-50 dark:border-slate-800/60 py-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" /> 
                          {new Date(displayedEntry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" /> {displayedEntry.time}
                        </span>
                        {displayedEntry.paymentMethod && (
                          <>
                            <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                            <span className="flex items-center gap-1 uppercase tracking-tight">
                              {getPaymentIcon(displayedEntry.paymentMethod)} 
                              {config.paymentMethodLabels?.[displayedEntry.paymentMethod as keyof typeof config.paymentMethodLabels] || displayedEntry.paymentMethod}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="h-6 flex items-center">
                        {displayedEntry.description ? (
                          <p className="text-[9px] text-slate-450 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50 w-full truncate" title={displayedEntry.description}>
                            &ldquo;{displayedEntry.description}&rdquo;
                          </p>
                        ) : (
                          <p className="text-[9px] text-slate-350 dark:text-slate-650 italic px-1">
                            Sem descrição adicional
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => displayedEntry && onDelete(displayedEntry.id)}
                    disabled={!displayedEntry}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800/50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 rounded-xl transition-all ${
                      displayedEntry ? 'active:scale-95 text-slate-500 dark:text-slate-400 cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-400'
                    }`}
                  >
                    <Trash2 size={12} className="text-rose-500 shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Excluir</span>
                  </button>
                  <button 
                    onClick={() => displayedEntry && onEdit(displayedEntry)}
                    disabled={!displayedEntry}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/50 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-400 rounded-xl transition-all ${
                      displayedEntry ? 'active:scale-95 text-slate-500 dark:text-slate-400 cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-400'
                    }`}
                  >
                    <Edit3 size={12} className="text-indigo-500 shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Editar</span>
                  </button>
                  {onUpdate && (
                    <button 
                      onClick={() => displayedEntry && onUpdate({ ...displayedEntry, isPaid: !displayedEntry.isPaid })}
                      disabled={!displayedEntry}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800/50 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 rounded-xl transition-all ${
                        displayedEntry ? 'active:scale-95 text-slate-500 dark:text-slate-400 cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <div className={displayedEntry ? (displayedEntry.isPaid ? 'text-emerald-500 shrink-0' : 'text-rose-500 shrink-0') : 'text-slate-400 shrink-0'}>
                        {displayedEntry && displayedEntry.isPaid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {displayedEntry ? (displayedEntry.isPaid ? 'Pago' : 'Pendente') : 'Status'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:scale-110 group-hover:opacity-[0.04] transition-all duration-700 pointer-events-none">
                <Clock size={160} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Card Unificado: Hoje, Semana, Mês */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ 
            y: -6, 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
            transition: { duration: 0.2 } 
          }}
          className="md:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group/resumos"
        >
          {/* Eye Toggle for Resumos Card */}
          <button 
            onClick={(e) => { e.stopPropagation(); toggleHideNumbers(); }}
            className="absolute top-6 right-6 z-20 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-800/50 transition-colors"
            title={hideNumbers ? "Mostrar valores" : "Esconder valores"}
          >
            {hideNumbers ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Hoje Section */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Calendar size={16} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hoje</h3>
                </div>
                <div className="mb-1">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight">Lucro Líquido</span>
                  <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">
                    {hideNumbers ? 'R$ ••••' : formatCurrency(todaySum.totalNet)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Bruto: {hideNumbers ? 'R$ ••••' : formatCurrency(todaySum.totalGross)}
                </div>
                <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase">
                  {hideNumbers ? '••' : todaySum.count} Entregas
                </span>
              </div>
            </div>

            {/* Semana Section */}
            <div className="md:pl-8 pt-6 md:pt-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-lg flex items-center justify-center text-white">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Semana</h3>
                </div>
                <div className="mb-1">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tight">Faturamento Bruto</span>
                  <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">
                    {hideNumbers ? 'R$ ••••' : formatCurrency(weekSum.totalGross)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Líquido: {hideNumbers ? 'R$ ••••' : formatCurrency(weekSum.totalNet)}
                </div>
                <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md uppercase">
                  {hideNumbers ? '••' : weekSum.count} Entregas
                </span>
              </div>
            </div>

            {/* Mês Section */}
            <div className="md:pl-8 pt-6 md:pt-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                    <Wallet size={16} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mês</h3>
                </div>
                <div className="mb-1">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight">Faturamento Bruto</span>
                  <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">
                    {hideNumbers ? 'R$ ••••' : formatCurrency(monthSum.totalGross)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Líquido: {hideNumbers ? 'R$ ••••' : formatCurrency(monthSum.totalNet)}
                </div>
                <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase">
                  {hideNumbers ? '••' : monthSum.count} Entregas
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02] group-hover/resumos:scale-110 transition-transform duration-700 pointer-events-none">
            <TrendingUp size={240} />
          </div>
        </motion.div>

      </div>
      
      {/* 3. Métricas de Hoje - Improved Visuals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'KM Hoje', value: `${todaySum.totalKm?.toFixed(0)} km`, icon: <Navigation size={16} />, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Horas Trab.', value: formatDuration(todayWorkedSeconds), icon: <Clock size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Litros Hoje', value: `${todaySum.totalLiters?.toFixed(1)} L`, icon: <Fuel size={16} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Gasto Hoje', value: formatCurrency(todayTotalSpent), icon: <Wallet size={16} />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { label: 'Ganho/Hora', value: formatCurrency(todayGrossPerHour), icon: <TrendingUp size={16} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Ganho/KM', value: formatCurrency(todayEarningsPerKm), icon: <Navigation size={16} />, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
        ].map((metric, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            whileHover={{ 
              y: -5,
              borderColor: 'rgba(99, 102, 241, 0.5)',
              boxShadow: '0 15px 30px -10px rgba(99, 102, 241, 0.15)',
              transition: { duration: 0.2 }
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 group transition-all"
          >
            <div className={`w-10 h-10 ${metric.bg} ${metric.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              {metric.icon}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">{metric.label}</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono-num">{metric.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. Distribuição do Faturamento Simplificada */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Distribuição (Hoje)</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Bruto</span>
            <span className="text-sm font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(todaySum.totalGross)}</span>
          </div>
        </div>

        {/* Barra de Distribuição Horizontal */}
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6">
          {pieData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ width: 0 }}
              animate={{ width: todaySum.totalGross > 0 ? `${(item.value / todaySum.totalGross) * 100}%` : '0%' }}
              transition={{ duration: 1, delay: index * 0.1 }}
              style={{ backgroundColor: item.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {pieData.map((item) => (
            <div key={item.name} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">{item.name}</span>
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-white font-mono-num">
                {formatCurrency(item.value)}
              </span>
              <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                {todaySum.totalGross > 0 ? ((item.value / todaySum.totalGross) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 5. Calendário de Performance */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1 ml-4">
          <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Calendário de Performance</h3>
        </div>
        <PerformanceCalendar dailyStats={dailyBreakdown} />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
