
import React, { useState, useEffect, useMemo } from 'react';
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

  const todayEntries = entries.filter(e => e.date === todayStr);
  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));
  const weekEntries = entries.filter(e => {
    const entryDate = new Date(e.date + 'T12:00:00');
    return entryDate >= startOfWeek;
  });

  const todaySum = { ...getWeeklySummary(todayEntries), count: todayEntries.filter(e => e.grossAmount > 0).length };
  const weekSum = { ...getWeeklySummary(weekEntries), count: weekEntries.filter(e => e.grossAmount > 0).length };
  const monthSum = { ...getWeeklySummary(monthEntries), count: monthEntries.filter(e => e.grossAmount > 0).length };
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
  const todayEarningsPerKm = todaySum.totalKm && todaySum.totalKm > 0 ? todaySum.totalGross / todaySum.totalKm : 0;
  const todayTotalSpent = todaySum.totalSpentFuel + todaySum.totalSpentFood + todaySum.totalSpentMaintenance + (todaySum.totalSpentOthers || 0);

  const fuelMetrics = calculateFuelMetrics(entries);

  const goalPercent = Math.min(100, (todaySum.totalGross / config.dailyGoal) * 100);
  const isGoalReached = todaySum.totalGross >= config.dailyGoal;

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
  };

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
  };

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
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border backdrop-blur-md ${
            todayTimeEntries.find(t => !t.endTime)
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 shadow-rose-500/5' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 shadow-emerald-500/5'
          }`}
        >
          <Clock size={14} className={todayTimeEntries.find(t => !t.endTime) ? 'animate-pulse' : ''} />
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
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Target size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Meta Diária</h3>
              </div>
              <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isGoalReached ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                {isGoalReached ? 'Meta Batida!' : 'Em progresso'}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">
                  {formatCurrency(todaySum.totalGross).replace('R$', '')}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-lg font-bold">/ {formatCurrency(config.dailyGoal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full ${isGoalReached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                <span>{goalPercent.toFixed(0)}% concluído</span>
                <span>Faltam {formatCurrency(Math.max(0, config.dailyGoal - todaySum.totalGross))}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Target size={180} />
          </div>
        </motion.div>

        {/* Card Hoje (Menor - 1 coluna) */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="md:col-span-1 bg-indigo-600 dark:bg-indigo-700 p-6 rounded-[2.5rem] text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between group hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider">
              {todaySum.count} Entregas
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Hoje</span>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl font-black font-mono-num tracking-tighter">{formatCurrency(todaySum.totalNet)}</div>
              <div className="text-[10px] font-black opacity-80 bg-white/10 px-2 py-0.5 rounded-md">Bruto: {formatCurrency(todaySum.totalGross)}</div>
            </div>
          </div>
        </motion.div>

        {/* Card Semana (Menor - 1 coluna) */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="md:col-span-1 bg-slate-900 dark:bg-slate-800 p-6 rounded-[2.5rem] text-white shadow-lg shadow-slate-200 dark:shadow-none flex flex-col justify-between group hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-lg uppercase tracking-wider">
              {weekSum.count} Entregas
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Semana</span>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl font-black font-mono-num tracking-tighter">{formatCurrency(weekSum.totalGross)}</div>
              <div className="text-[10px] font-black opacity-80 bg-white/10 px-2 py-0.5 rounded-md">Líq: {formatCurrency(weekSum.totalNet)}</div>
            </div>
          </div>
        </motion.div>

        {/* Card Mês (Maior - 4 colunas) */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="md:col-span-4 bg-emerald-600 dark:bg-emerald-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Wallet size={24} />
              </div>
              <span className="text-[10px] font-black bg-white/20 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                {monthSum.count} Entregas no Mês
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 block mb-2">Faturamento Mensal</span>
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-4xl font-black font-mono-num tracking-tighter">{formatCurrency(monthSum.totalGross)}</div>
                <div className="text-xs font-black opacity-90 bg-white/20 px-4 py-1.5 rounded-xl">Líquido: {formatCurrency(monthSum.totalNet)}</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wallet size={220} />
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
                 <div key={item.name} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
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
