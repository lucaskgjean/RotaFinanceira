
import React from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklyGroupedSummaries, getLocalDateStr, getWeeklySummary } from '../utils/calculations';
import { motion } from 'motion/react';
import { 
  Fuel, 
  Utensils, 
  Wrench, 
  Wallet, 
  ArrowDownRight, 
  Calendar, 
  ChevronRight,
  PieChart as PieChartIcon,
  TrendingDown,
  MoreHorizontal
} from 'lucide-react';
import QuickExpense from './QuickExpense';

interface ExpensesProps {
  entries: DailyEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onAdd: (entry: DailyEntry) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ entries, config, onEdit, onAdd }) => {
  const todayStr = getLocalDateStr();
  
  const getStartOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const startOfWeek = getStartOfWeek(new Date());
  startOfWeek.setHours(0, 0, 0, 0);

  const todayEntries = entries.filter(e => e.date === todayStr);
  const weekEntries = entries.filter(e => {
    const entryDate = new Date(e.date + 'T12:00:00');
    return entryDate >= startOfWeek;
  });

  const todaySpent = getWeeklySummary(todayEntries).totalFees;
  const weekSpent = getWeeklySummary(weekEntries).totalFees;

  const incomeEntries = entries.filter(e => e.grossAmount > 0);
  const manualExpenseEntries = entries.filter(e => e.grossAmount === 0);
  const weeklyExpenseGroups = getWeeklyGroupedSummaries(entries);

  const reserves = {
    fuel: incomeEntries.reduce((acc, curr) => acc + curr.fuel, 0),
    food: incomeEntries.reduce((acc, curr) => acc + curr.food, 0),
    maintenance: incomeEntries.reduce((acc, curr) => acc + curr.maintenance, 0),
    others: incomeEntries.reduce((acc, curr) => acc + (curr.others || 0), 0),
  };

  const actualSpent = {
    fuel: manualExpenseEntries.reduce((acc, curr) => acc + curr.fuel, 0),
    food: manualExpenseEntries.reduce((acc, curr) => acc + curr.food, 0),
    maintenance: manualExpenseEntries.reduce((acc, curr) => acc + curr.maintenance, 0),
    others: manualExpenseEntries.reduce((acc, curr) => acc + (curr.others || 0), 0),
  };

  const balances = {
    fuel: reserves.fuel - actualSpent.fuel,
    food: reserves.food - actualSpent.food,
    maintenance: reserves.maintenance - actualSpent.maintenance,
    others: reserves.others - actualSpent.others,
    total: (reserves.fuel + reserves.food + reserves.maintenance + reserves.others) - (actualSpent.fuel + actualSpent.food + actualSpent.maintenance + actualSpent.others)
  };

  const totalReservedPerc = (config.percFuel + config.percFood + config.percMaintenance) * 100;

  const categories = [
    { 
      name: 'Combustível', 
      key: 'fuel', 
      color: '#f43f5e', // Rose 500
      allocated: reserves.fuel, 
      spent: actualSpent.fuel, 
      bal: balances.fuel,
      icon: <Fuel size={20} />
    },
    { 
      name: 'Alimentação', 
      key: 'food', 
      color: '#f59e0b', // Amber 500
      allocated: reserves.food, 
      spent: actualSpent.food, 
      bal: balances.food,
      icon: <Utensils size={20} />
    },
    { 
      name: 'Manutenção', 
      key: 'maintenance', 
      color: '#3b82f6', // Blue 500
      allocated: reserves.maintenance, 
      spent: actualSpent.maintenance, 
      bal: balances.maintenance,
      icon: <Wrench size={20} />
    },
    { 
      name: 'Outros', 
      key: 'others', 
      color: '#64748b', // Slate 500
      allocated: reserves.others, 
      spent: actualSpent.others, 
      bal: balances.others,
      icon: <MoreHorizontal size={20} />
    },
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
      className="space-y-6 pb-24"
    >
      {/* Lançamento Rápido de Gastos */}
      <motion.div variants={itemVariants}>
        <QuickExpense onAdd={onAdd} />
      </motion.div>

      {/* Saldo das Reservas - Simplificado para Gastos Hoje/Semana */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group border border-white/5"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md">
                <TrendingDown size={18} className="text-rose-400" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Resumo de Gastos Extras</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block">Total Gasto Hoje</span>
              <p className="text-4xl font-black font-mono-num text-rose-400">{formatCurrency(todaySpent)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block">Total Gasto na Semana</span>
              <p className="text-4xl font-black text-white/90 font-mono-num">{formatCurrency(weekSpent)}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
           <TrendingDown size={240} />
        </div>
      </motion.div>

      {/* Cards de Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map(cat => {
          const usagePercent = cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0;
          return (
            <motion.div 
              key={cat.name} 
              variants={itemVariants}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                   {cat.icon}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{cat.name}</span>
                  <p className={`text-2xl font-black tracking-tighter mt-1 font-mono-num ${cat.bal >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500'}`}>{formatCurrency(cat.bal)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-slate-400 dark:text-slate-500">Gasto: {formatCurrency(cat.spent)}</span>
                  <span className={`${usagePercent > 80 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{usagePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full" 
                    style={{ backgroundColor: cat.color }} 
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fechamento Semanal */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2 flex items-center gap-3 uppercase tracking-widest">
          <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
          Balanço Semanal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weeklyExpenseGroups.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Aguardando dados para fechamento...</p>
            </div>
          ) : (
            weeklyExpenseGroups.map((week, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:border-indigo-100 dark:hover:border-indigo-500 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Período</span>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                           {week.startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {week.endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest block">Custo Total</span>
                      <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(week.spentFuel + week.spentFood + week.spentMaintenance + (week.spentOthers || 0))}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                     <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 flex flex-col items-center">
                        <Fuel size={14} className="text-rose-400 dark:text-rose-500 mb-1" />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 font-mono-num">{formatCurrency(week.spentFuel).replace('R$', '')}</span>
                     </div>
                     <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 flex flex-col items-center">
                        <Utensils size={14} className="text-amber-400 dark:text-amber-500 mb-1" />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 font-mono-num">{formatCurrency(week.spentFood).replace('R$', '')}</span>
                     </div>
                     <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 flex flex-col items-center">
                        <Wrench size={14} className="text-blue-400 dark:text-blue-500 mb-1" />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 font-mono-num">{formatCurrency(week.spentMaintenance).replace('R$', '')}</span>
                     </div>
                     <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 flex flex-col items-center">
                        <MoreHorizontal size={14} className="text-slate-400 dark:text-slate-500 mb-1" />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 font-mono-num">{formatCurrency(week.spentOthers || 0).replace('R$', '')}</span>
                     </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Expenses;
