
import React, { useState, useMemo } from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklySummary, getDailyStats, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import { 
  Search, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  Trash2,
  Edit3,
  Check,
  Info,
  ChevronRight,
  History as HistoryIcon,
  Layers,
  Banknote,
  Activity
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';

interface HistoryProps {
  entries: DailyEntry[];
  config: AppConfig;
  onDelete: (id: string) => void;
  onEdit: (entry: DailyEntry) => void;
  onUpdate: (entry: DailyEntry) => void;
}

const History: React.FC<HistoryProps> = ({ entries, config, onDelete, onEdit, onUpdate }) => {
  const todayStr = getLocalDateStr();
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPayment, setFilterPayment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStore, setFilterStore] = useState<string>('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const todayEntries = entries.filter(e => e.date === todayStr);

  const filteredEntries = useMemo(() => {
    return entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
      // Excluir gastos manuais (grossAmount === 0) e Fechamento de KM (que agora fica na Manutenção)
      if (entry.grossAmount === 0 || entry.storeName === 'Fechamento de KM') return false;

      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || entry.date >= filterStartDate) &&
        (!filterEndDate || entry.date <= filterEndDate)
      ) : true;
      
      const entryCategory = entry.category || (entry.grossAmount > 0 ? 'income' : (entry.fuel > 0 ? 'fuel' : entry.food > 0 ? 'food' : 'maintenance'));
      const matchCategory = filterCategory ? entryCategory === filterCategory : true;
      
      const matchPayment = filterPayment ? entry.paymentMethod === filterPayment : true;
      
      const matchStatus = filterStatus ? (
        filterStatus === 'paid' ? entry.isPaid === true : entry.isPaid === false
      ) : true;

      const matchStore = filterStore ? entry.storeName.toLowerCase().includes(filterStore.toLowerCase()) : true;
      
      return matchRange && matchCategory && matchPayment && matchStatus && matchStore;
    }).sort((a, b) => b.index - a.index)
      .map(item => item.entry);
  }, [entries, filterStartDate, filterEndDate, filterCategory, filterPayment, filterStatus, filterStore]);

  const stats = useMemo(() => getWeeklySummary(filteredEntries), [filteredEntries]);
  const dailyBreakdown = useMemo(() => getDailyStats(filteredEntries, config), [filteredEntries, config]);

  const goalSummary = useMemo(() => {
    const days = dailyBreakdown.length;
    const met = dailyBreakdown.filter(d => d.goalMet).length;
    const notMet = days - met;
    return { days, met, notMet };
  }, [dailyBreakdown]);

  const clearFilters = () => {
    setFilterStartDate(todayStr);
    setFilterEndDate(todayStr);
    setFilterCategory('');
    setFilterPayment('');
    setFilterStatus('');
    setFilterStore('');
  };

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
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      {/* Alerta de Histórico */}
      {todayEntries.length === 0 && entries.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-indigo-600 p-6 rounded-[2.5rem] flex items-center justify-between gap-4 shadow-lg shadow-indigo-100 relative overflow-hidden group"
        >
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 backdrop-blur-md">
                 <Info size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Backup detectado!</p>
                <p className="text-xs text-white/70 font-bold uppercase tracking-tight">Seu histórico completo está disponível abaixo.</p>
              </div>
           </div>
           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
             <HistoryIcon size={120} />
           </div>
        </motion.div>
      )}

      {/* Filtros Inteligentes */}
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Filter size={16} />
          </div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Filtros de Busca</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Início</label>
            <button 
              type="button"
              onClick={() => setShowStartDatePicker(true)}
              className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500/30"
            >
              <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
              <span>{filterStartDate ? new Date(filterStartDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'}</span>
            </button>
          </div>
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fim</label>
            <button 
              type="button"
              onClick={() => setShowEndDatePicker(true)}
              className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500/30"
            >
              <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
              <span>{filterEndDate ? new Date(filterEndDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}</span>
            </button>
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Categoria"
              value={filterCategory}
              options={[
                { id: '', label: 'Todas', icon: <Layers size={14} /> },
                { id: 'income', label: 'Lucros', icon: <TrendingUp size={14} className="text-emerald-500" /> },
                { id: 'fuel', label: 'Combustível', icon: <TrendingDown size={14} className="text-rose-500" /> },
                { id: 'food', label: 'Alimentação', icon: <TrendingDown size={14} className="text-orange-500" /> },
                { id: 'maintenance', label: 'Manutenção', icon: <TrendingDown size={14} className="text-blue-500" /> },
                { id: 'others', label: 'Outros', icon: <TrendingDown size={14} className="text-slate-500" /> }
              ]}
              onChange={setFilterCategory}
              isOpen={showCategorySelect}
              onOpen={() => setShowCategorySelect(true)}
              onClose={() => setShowCategorySelect(false)}
            />
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Pagamento"
              value={filterPayment}
              options={[
                { id: '', label: 'Todos', icon: <Banknote size={14} /> },
                { id: 'pix', label: 'PIX', icon: <CreditCard size={14} className="text-indigo-500" /> },
                { id: 'money', label: 'Dinheiro', icon: <Wallet size={14} className="text-emerald-500" /> },
                { id: 'caderno', label: 'Caderno', icon: <Tag size={14} className="text-amber-500" /> },
                { id: 'debito', label: 'Débito', icon: <CreditCard size={14} className="text-blue-500" /> }
              ]}
              onChange={setFilterPayment}
              isOpen={showPaymentSelect}
              onOpen={() => setShowPaymentSelect(true)}
              onClose={() => setShowPaymentSelect(false)}
            />
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Status"
              value={filterStatus}
              options={[
                { id: '', label: 'Todos', icon: <Activity size={14} /> },
                { id: 'paid', label: 'Pago', icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
                { id: 'pending', label: 'Pendente', icon: <AlertCircle size={14} className="text-rose-500" /> }
              ]}
              onChange={setFilterStatus}
              isOpen={showStatusSelect}
              onOpen={() => setShowStatusSelect(true)}
              onClose={() => setShowStatusSelect(false)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Loja</label>
            <input 
              type="text" 
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              placeholder="Nome da loja..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition outline-none text-sm font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
          <button 
            onClick={clearFilters}
            className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2"
          >
            <X size={14} /> Limpar
          </button>
        </div>
      </motion.div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bruto Total', value: formatCurrency(stats.totalGross), color: 'text-slate-800 dark:text-white', bg: 'bg-white dark:bg-slate-900' },
          { label: 'Líquido Total', value: formatCurrency(stats.totalNet), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-white dark:bg-slate-900' },
          { label: 'Metas Batidas', value: `${goalSummary.met} ✓`, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Metas Falhas', value: `${goalSummary.notMet} ✗`, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className={`${stat.bg}/70 backdrop-blur-md p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm`}
          >
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-widest">{stat.label}</span>
            <p className={`text-xl font-black font-mono-num ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Lista de Movimentações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            Histórico Completo
          </h3>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">
            {filteredEntries.length} Itens
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEntries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
                  <Search size={32} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Nenhum registro encontrado</p>
              </motion.div>
            ) : (
              filteredEntries.map((entry) => (
                <motion.div 
                  layout
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] p-6 border-2 transition-all group relative overflow-hidden ${entry.grossAmount > 0 ? 'border-indigo-50 dark:border-indigo-500/10 hover:border-indigo-100 dark:hover:border-indigo-500/20' : 'border-rose-50 dark:border-rose-500/10 hover:border-rose-100 dark:hover:border-rose-500/20'}`}
                >
                  {/* Barra de Status Lateral */}
                  {entry.paymentMethod !== 'money' && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${entry.isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.grossAmount > 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {entry.grossAmount > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 dark:text-white leading-tight text-lg">{entry.storeName.replace('[GASTO] ', '')}</h4>
                          {entry.paymentMethod !== 'money' && (
                            <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-widest border ${entry.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                              {entry.isPaid ? 'Pago' : 'Pendente'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight flex items-center gap-1">
                            <Calendar size={10} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight flex items-center gap-1">
                            <Clock size={10} /> {entry.time}
                          </span>
                          {entry.paymentMethod && (
                            <span className="text-[10px] text-indigo-400 dark:text-indigo-500 font-semibold uppercase tracking-tight flex items-center gap-1">
                              <CreditCard size={10} /> {entry.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold font-mono-num ${entry.grossAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {entry.grossAmount > 0 ? `+${formatCurrency(entry.grossAmount).replace('R$', '')}` : `-${formatCurrency(entry.fuel + entry.food + entry.maintenance).replace('R$', '')}`}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                        {entry.grossAmount > 0 ? 'Lucro' : 'Gasto'}
                      </span>
                    </div>
                  </div>

                  {entry.grossAmount > 0 && (
                    <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Comb.</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono-num">{formatCurrency(entry.fuel).replace('R$', '')}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Alim.</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono-num">{formatCurrency(entry.food).replace('R$', '')}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Líquido</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(entry.netAmount).replace('R$', '')}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {entry.paymentMethod !== 'money' && (
                      <button 
                        onClick={() => onUpdate({ ...entry, isPaid: !entry.isPaid })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95 border-2 ${entry.isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'}`}
                      >
                        {entry.isPaid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span className="text-[10px] font-semibold uppercase tracking-widest">
                          {entry.isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </button>
                    )}
                    <button 
                      onClick={() => onEdit(entry)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Edit3 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Editar</span>
                    </button>
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Excluir</span>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Timeline de Performance */}
      <motion.div variants={itemVariants} className="bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] p-8 text-white overflow-hidden relative shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
              <TrendingUp size={18} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Performance Diária</h4>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
             {dailyBreakdown.slice(0, 14).map((day, i) => (
               <div key={i} className={`flex-shrink-0 w-16 p-3 rounded-[1.5rem] border text-center transition-all ${day.goalMet ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
                  <span className="text-[8px] font-black opacity-40 block mb-2 uppercase tracking-tighter">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${day.goalMet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {day.goalMet ? <Check size={20} strokeWidth={3} /> : <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />}
                  </div>
                  <span className="text-xs font-black font-mono-num">{day.date.split('-')[2]}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] -mr-20 -mt-20 rounded-full"></div>
      </motion.div>

      <AnimatePresence>
        {showStartDatePicker && (
          <CustomDatePicker 
            value={filterStartDate} 
            onChange={setFilterStartDate} 
            onClose={() => setShowStartDatePicker(false)} 
          />
        )}
        {showEndDatePicker && (
          <CustomDatePicker 
            value={filterEndDate} 
            onChange={setFilterEndDate} 
            onClose={() => setShowEndDatePicker(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default History;
