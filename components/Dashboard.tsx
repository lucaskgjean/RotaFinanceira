
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, calculateFuelMetrics, getLocalDateStr, calculateDuration, formatDuration } from '../utils/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';
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
  ChevronRight,
  Gauge
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';

interface DashboardProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
  onNavigate: (tab: any) => void;
  onAdd: (entry: DailyEntry) => void;
  onToggleShift: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, timeEntries, config, onEdit, onDelete, onNavigate, onAdd, onToggleShift }) => {
  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);
  const [now, setNow] = useState(new Date());

  const todayEntries = entries.filter(e => e.date === todayStr);
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
  const todayTimeEntries = timeEntries.filter(t => t.date === todayStr);
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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-20"
    >
      {/* 0. Botão de Ponto Rápido */}
      <motion.div variants={itemVariants} className="sticky top-[72px] z-30 flex justify-center pointer-events-none">
        <button 
          onClick={onToggleShift}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border backdrop-blur-md ${
            todayTimeEntries.find(t => !t.endTime)
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400' 
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <Clock size={14} className={`${todayTimeEntries.find(t => !t.endTime) ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
          {todayTimeEntries.find(t => !t.endTime) ? 'Encerrar Ponto' : 'Iniciar Ponto'}
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
              </div>
              <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all duration-500 ${isGoalReached ? 'bg-white/40 text-white shadow-sm backdrop-blur-sm' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                {isGoalReached ? '🏆 Meta Batida!' : 'Em progresso'}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black font-mono-num tracking-tighter transition-colors duration-500 ${isGoalReached ? 'text-amber-950 drop-shadow-sm' : 'text-slate-800 dark:text-white'}`}>
                  {formatCurrency(todaySum.totalGross).replace('R$', '')}
                </span>
                <span className={`text-lg font-bold transition-colors duration-500 ${isGoalReached ? 'text-amber-900/50' : 'text-slate-300 dark:text-slate-600'}`}>/ {formatCurrency(config.dailyGoal)}</span>
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
                <span>{goalPercent.toFixed(0)}% concluído</span>
                <span>{isGoalReached ? 'Objetivo Alcançado!' : `Faltam ${formatCurrency(Math.max(0, config.dailyGoal - todaySum.totalGross))}`}</span>
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

        {/* Card Unificado: Hoje, Semana, Mês */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="md:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
        >
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
                    {formatCurrency(todaySum.totalNet)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Bruto: {formatCurrency(todaySum.totalGross)}
                </div>
                <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase">
                  {todaySum.count} Entregas
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
                    {formatCurrency(weekSum.totalGross)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Líquido: {formatCurrency(weekSum.totalNet)}
                </div>
                <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md uppercase">
                  {weekSum.count} Entregas
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
                    {formatCurrency(monthSum.totalGross)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Líquido: {formatCurrency(monthSum.totalNet)}
                </div>
                <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase">
                  {monthSum.count} Entregas
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
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
            className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-indigo-100 dark:hover:border-indigo-500 transition-colors"
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

      {/* 4. Divisão de Reservas - Today Only */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Card de Reservas */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="flex-1 w-full">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Distribuição do Faturamento</h3>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight ml-4">Onde seu dinheiro foi parar (Hoje)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               {pieData.map(item => (
                 <div key={item.name} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
                   <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                   <div className="text-left">
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">{item.name}</span>
                      <span className="block text-sm font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(item.value)}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="w-full md:w-64 h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={75} 
                  outerRadius={95} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={1000}
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px', backgroundColor: '#1e293b', color: '#fff' }}
                   itemStyle={{ fontWeight: '900', fontSize: '12px', color: '#fff' }}
                   formatter={(value: number) => formatCurrency(value)} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Hoje</span>
              <span className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(todaySum.totalGross).replace('R$', '')}</span>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Dashboard;
