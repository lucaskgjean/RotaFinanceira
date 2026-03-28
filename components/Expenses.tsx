
import React from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklyGroupedSummaries, getLocalDateStr, getWeeklySummary } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDateRangePicker from './CustomDateRangePicker';
import CustomSelect from './CustomSelect';
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
  MoreHorizontal,
  History as HistoryIcon,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Filter,
  Layers,
  X
} from 'lucide-react';
import QuickExpense from './QuickExpense';

interface ExpensesProps {
  entries: DailyEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onAdd: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
  onUpdate: (entry: DailyEntry) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ entries, config, onEdit, onAdd, onDelete, onUpdate }) => {
  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);
  const [showFullWeeklyHistory, setShowFullWeeklyHistory] = React.useState(false);
  const [historyFilterStartDate, setHistoryFilterStartDate] = React.useState(todayStr);
  const [historyFilterEndDate, setHistoryFilterEndDate] = React.useState(todayStr);
  const [historyFilterCategory, setHistoryFilterCategory] = React.useState<string>('');
  const [showRangePicker, setShowRangePicker] = React.useState(false);
  const [showCategorySelect, setShowCategorySelect] = React.useState(false);
  
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
  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));

  const todaySpent = getWeeklySummary(todayEntries).totalFees;
  const weekSummary = getWeeklySummary(weekEntries);
  const weekSpent = weekSummary.totalFees;
  const monthSpent = getWeeklySummary(monthEntries).totalFees;

  const incomeEntries = entries.filter(e => e.grossAmount > 0);
  const manualExpenseEntries = entries.filter(e => e.grossAmount === 0 && e.storeName !== 'Fechamento de KM').sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  
  const filteredManualExpenses = manualExpenseEntries.filter(e => {
    const matchStart = !historyFilterStartDate || e.date >= historyFilterStartDate;
    const matchEnd = !historyFilterEndDate || e.date <= historyFilterEndDate;
    const matchCategory = !historyFilterCategory || e.category === historyFilterCategory;
    return matchStart && matchEnd && matchCategory;
  });

  const totalFilteredExpenses = filteredManualExpenses.reduce((acc, curr) => 
    acc + (curr.fuel + curr.food + curr.maintenance + (curr.others || 0)), 0
  );

  const filteredSummary = React.useMemo(() => {
    return filteredManualExpenses.reduce((acc, curr) => {
      acc.fuel += curr.fuel;
      acc.food += curr.food;
      acc.maintenance += curr.maintenance;
      acc.others += (curr.others || 0);
      return acc;
    }, { fuel: 0, food: 0, maintenance: 0, others: 0 });
  }, [filteredManualExpenses]);

  const weeklyExpenseGroups = getWeeklyGroupedSummaries(entries);
  const filteredWeeklyGroups = showFullWeeklyHistory ? weeklyExpenseGroups : weeklyExpenseGroups.slice(0, 1);

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
      className="space-y-6 pb-24"
    >
      {/* Lançamento Rápido de Gastos */}
      <motion.div variants={itemVariants}>
        <QuickExpense onAdd={onAdd} />
      </motion.div>

      {/* Resumo de Gastos - Design Sincronizado com Manutenção */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Wallet size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resumo de Gastos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Hoje</span>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tighter font-mono-num">{formatCurrency(todaySpent)}</div>
            </div>
            
            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Esta Semana</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{formatCurrency(weekSpent)}</div>
            </div>

            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Este Mês</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{formatCurrency(monthSpent)}</div>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-6 -bottom-6 opacity-[0.02] dark:opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
          <Wallet size={150} />
        </div>
      </motion.div>

      {/* Fechamento Semanal */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-widest">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
            Balanço Semanal
          </h3>
          <button 
            onClick={() => setShowFullWeeklyHistory(!showFullWeeklyHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            <Filter size={14} />
            {showFullWeeklyHistory ? 'Ver Atual' : 'Ver Histórico'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWeeklyGroups.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Aguardando dados para fechamento...</p>
            </div>
          ) : (
            filteredWeeklyGroups.map((week, idx) => (
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

      {/* Histórico de Lançamentos de Gastos */}
      <motion.div variants={itemVariants} className="space-y-6 pt-8">
        {/* Filtros do Histórico */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
              <Filter size={16} />
            </div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Filtro de Histórico</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Período</label>
              
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { label: 'Hoje', start: todayStr, end: todayStr },
                  { label: '7 dias', days: 7 },
                  { label: '30 dias', days: 30 }
                ].map((p, i) => {
                  let pStart = p.start;
                  let pEnd = p.end;
                  
                  if (p.days) {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - p.days + 1);
                    pStart = start.toISOString().split('T')[0];
                    pEnd = end.toISOString().split('T')[0];
                  }

                  const isSelected = pStart === historyFilterStartDate && pEnd === historyFilterEndDate;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setHistoryFilterStartDate(pStart!);
                        setHistoryFilterEndDate(pEnd!);
                      }}
                      className={`whitespace-nowrap px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        isSelected 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-100 dark:shadow-none' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <button 
                type="button"
                onClick={() => setShowRangePicker(true)}
                className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-rose-200 dark:hover:border-rose-500/30"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
                  <span>{new Date(historyFilterStartDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
                <div className="flex items-center gap-3">
                  <span>{new Date(historyFilterEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
              <CustomSelect
                label=""
                value={historyFilterCategory}
                options={[
                  { id: '', label: 'Todas Categorias', icon: <Layers size={14} /> },
                  { id: 'fuel', label: 'Combustível', icon: <Fuel size={14} className="text-rose-500" /> },
                  { id: 'food', label: 'Alimentação', icon: <Utensils size={14} className="text-amber-500" /> },
                  { id: 'maintenance', label: 'Manutenção', icon: <Wrench size={14} className="text-blue-500" /> },
                  { id: 'others', label: 'Outros', icon: <MoreHorizontal size={14} className="text-slate-500" /> }
                ]}
                onChange={setHistoryFilterCategory}
                isOpen={showCategorySelect}
                onOpen={() => setShowCategorySelect(true)}
                onClose={() => setShowCategorySelect(false)}
              />
            </div>
            <button 
              onClick={() => {
                setHistoryFilterStartDate(todayStr);
                setHistoryFilterEndDate(todayStr);
                setHistoryFilterCategory('');
              }}
              className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2"
            >
              <X size={14} /> Limpar Filtro
            </button>
          </div>
        </motion.div>

        {/* Card Único de Gastos por Categoria (Período Selecionado) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <PieChartIcon size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Gasto do Período</h3>
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                  Total: {formatCurrency(totalFilteredExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between w-full">
                <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Resumo por Categoria</p>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                  {filteredManualExpenses.length} Itens
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-rose-500">
                <Fuel size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Combustível</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(filteredSummary.fuel)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-500">
                <Utensils size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Alimentação</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(filteredSummary.food)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-500">
                <Wrench size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Manutenção</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(filteredSummary.maintenance)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <MoreHorizontal size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Outros</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(filteredSummary.others)}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 px-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-widest">
              <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
              Histórico de Gastos
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredManualExpenses.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhum gasto encontrado para este filtro...</p>
               <button 
                onClick={() => { setHistoryFilterStartDate(''); setHistoryFilterEndDate(''); setHistoryFilterCategory(''); }}
                className="mt-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
               >
                 Limpar Filtros
               </button>
            </div>
          ) : (
            filteredManualExpenses.map((entry) => {
              const getCategoryInfo = (cat?: string) => {
                switch(cat) {
                  case 'fuel': return { icon: <Fuel size={24} />, label: 'Combustível', color: 'rose' };
                  case 'food': return { icon: <Utensils size={24} />, label: 'Alimentação', color: 'amber' };
                  case 'maintenance': return { icon: <Wrench size={24} />, label: 'Manutenção', color: 'blue' };
                  default: return { icon: <MoreHorizontal size={24} />, label: 'Outros', color: 'slate' };
                }
              };
              const catInfo = getCategoryInfo(entry.category);
              const displayTitle = entry.storeName.replace('[GASTO]', '').trim() || catInfo.label;

              return (
                <motion.div 
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-2 transition-all group relative overflow-hidden ${
                    catInfo.color === 'rose' ? 'border-rose-500/40 dark:border-rose-500/20' :
                    catInfo.color === 'amber' ? 'border-amber-500/40 dark:border-amber-500/20' :
                    catInfo.color === 'blue' ? 'border-blue-500/40 dark:border-blue-500/20' :
                    'border-slate-100 dark:border-slate-800'
                  } hover:border-rose-100 dark:hover:border-rose-500/20`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${catInfo.color}-50 dark:bg-${catInfo.color}-500/10 text-${catInfo.color}-600 dark:text-${catInfo.color}-400`}>
                        {catInfo.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white leading-tight text-lg">{displayTitle}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight flex items-center gap-1">
                            <Calendar size={10} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight flex items-center gap-1">
                            <Clock size={10} /> {entry.time}
                          </span>
                          {entry.paymentMethod && (
                            <span className="text-[10px] text-indigo-400 dark:text-indigo-500 font-semibold uppercase tracking-tight flex items-center gap-1">
                              <CreditCard size={10} /> {entry.paymentMethod.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono-num text-rose-600 dark:text-rose-400">
                        -{formatCurrency(entry.fuel + entry.food + entry.maintenance + (entry.others || 0)).replace('R$', '')}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-widest">{catInfo.label}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEdit(entry)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Edit3 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Editar</span>
                    </button>
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Excluir</span>
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showRangePicker && (
          <CustomDateRangePicker 
            startDate={historyFilterStartDate} 
            endDate={historyFilterEndDate} 
            onChange={(start, end) => {
              setHistoryFilterStartDate(start);
              setHistoryFilterEndDate(end);
            }} 
            onClose={() => setShowRangePicker(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Expenses;
