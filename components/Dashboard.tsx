
import React from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklySummary, calculateFuelMetrics, getLocalDateStr } from '../utils/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
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
  ChevronRight
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';

interface DashboardProps {
  entries: DailyEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
  onNavigate: (tab: any) => void;
  onAdd: (entry: DailyEntry) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, config, onEdit, onDelete, onNavigate, onAdd }) => {
  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);

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

  const fuelMetrics = calculateFuelMetrics(entries);

  const goalPercent = Math.min(100, (todaySum.totalGross / config.dailyGoal) * 100);
  const isGoalReached = todaySum.totalGross >= config.dailyGoal;

  const pieData = [
    { name: `Gasto Comb.`, value: generalSum.totalSpentFuel, color: '#f43f5e' },
    { name: `Gasto Alim.`, value: generalSum.totalSpentFood, color: '#f59e0b' },
    { name: `Gasto Manut.`, value: generalSum.totalSpentMaintenance, color: '#3b82f6' },
    { name: `Gasto Outros`, value: generalSum.totalSpentOthers || 0, color: '#64748b' },
    { name: `Lucro Líquido`, value: generalSum.totalNet, color: '#10b981' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      {/* 1. Lançamento Rápido */}
      <motion.div variants={itemVariants}>
        <QuickLaunch onAdd={onAdd} existingEntries={entries} config={config} />
      </motion.div>

      {/* 2. Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card de Progresso (Destaque - 2 colunas) */}
        <motion.div 
          variants={itemVariants}
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

        {/* Card Hoje (1 coluna) */}
        <motion.div 
          variants={itemVariants}
          className="bg-indigo-600 dark:bg-indigo-700 p-6 rounded-[2.5rem] text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between group hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
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
            <div className="text-2xl font-black font-mono-num tracking-tighter">{formatCurrency(todaySum.totalGross)}</div>
          </div>
        </motion.div>

        {/* Card Semana (1 coluna) */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-900 dark:bg-slate-800 p-6 rounded-[2.5rem] text-white shadow-lg shadow-slate-200 dark:shadow-none flex flex-col justify-between group hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
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
            <div className="text-2xl font-black font-mono-num tracking-tighter">{formatCurrency(weekSum.totalGross)}</div>
          </div>
        </motion.div>

      </div>

      {/* 3. Métricas Rápidas (Grid 4 colunas) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Custo/KM', value: formatCurrency(fuelMetrics.costPerKm), icon: <Navigation size={16} />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { label: 'Custo/Entrega', value: formatCurrency(fuelMetrics.costPerDelivery), icon: <Package size={16} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Média KM/L', value: `${fuelMetrics.kmPerLiter.toFixed(1)} km/l`, icon: <Fuel size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Preço Médio/L', value: formatCurrency(fuelMetrics.avgPricePerLiter), icon: <Wallet size={16} />, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        ].map((metric, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3"
          >
            <div className={`w-10 h-10 ${metric.bg} ${metric.color} rounded-xl flex items-center justify-center shrink-0`}>
              {metric.icon}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight block">{metric.label}</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono-num">{metric.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. Divisão de Reservas & Saldo Líquido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card de Reservas (2 colunas em LG) */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="flex-1 w-full">
            <div className="mb-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1">Distribuição do Faturamento</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Onde seu dinheiro foi parar (Acumulado)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               {pieData.map(item => (
                 <div key={item.name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
                   <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                   <div className="text-left">
                      <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">{item.name}</span>
                      <span className="block text-sm font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(item.value)}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="w-full md:w-56 h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={65} 
                  outerRadius={85} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
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
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Total</span>
              <span className="text-lg font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(generalSum.totalGross).replace('R$', '')}</span>
            </div>
          </div>
        </motion.div>

        {/* Card Saldo Líquido Mês (1 coluna) */}
        <motion.div 
          variants={itemVariants}
          className="bg-emerald-600 dark:bg-emerald-700 p-8 rounded-[2.5rem] text-white shadow-lg shadow-emerald-100 dark:shadow-none flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Saldo Líquido Mês</span>
            <div className="text-4xl font-black font-mono-num tracking-tighter mb-8">{formatCurrency(monthSum.totalNet)}</div>
            
            <button 
              onClick={() => onNavigate('reports')}
              className="w-full py-3 bg-white dark:bg-slate-100 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-white transition-colors"
            >
              Ver Relatórios <ChevronRight size={14} />
            </button>
          </div>
          <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wallet size={200} />
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Dashboard;
