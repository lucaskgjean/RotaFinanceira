
import React, { useState, useMemo } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, getDailyStats, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDateRangePicker from './CustomDateRangePicker';
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
  Activity,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';
import PerformanceCalendar from './PerformanceCalendar';

interface HistoryProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onDelete: (id: string) => void;
  onEdit: (entry: DailyEntry) => void;
  onUpdate: (entry: DailyEntry) => void;
  onBulkUpdateStoreName: (oldName: string, newName: string) => void;
  filterStore: string;
  onFilterStoreChange: (val: string) => void;
}

const History: React.FC<HistoryProps> = ({ entries, timeEntries, config, onDelete, onEdit, onUpdate, onBulkUpdateStoreName, filterStore, onFilterStoreChange }) => {
  const todayStr = getLocalDateStr();
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [filterPayment, setFilterPayment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showStoreSelect, setShowStoreSelect] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const uniqueStores = useMemo(() => {
    return Array.from(new Set(entries.filter(e => e.grossAmount > 0).map(e => e.storeName))).sort();
  }, [entries]);

  const todayEntries = entries.filter(e => e.date === todayStr);

  const filteredEntries = useMemo(() => {
    return entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
      // Excluir gastos manuais (grossAmount === 0) e Fechamento de KM (que agora fica na Manutenção)
      if (entry.grossAmount === 0 || entry.storeName === 'Fechamento de KM') return false;

      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || entry.date >= filterStartDate) &&
        (!filterEndDate || entry.date <= filterEndDate)
      ) : true;
      
      const matchPayment = filterPayment ? entry.paymentMethod === filterPayment : true;
      
      const matchStatus = filterStatus ? (
        filterStatus === 'paid' ? entry.isPaid === true : entry.isPaid === false
      ) : true;

      const matchStore = filterStore ? entry.storeName.toLowerCase().includes(filterStore.toLowerCase()) : true;
      
      return matchRange && matchPayment && matchStatus && matchStore;
    }).sort((a, b) => b.index - a.index)
      .map(item => item.entry);
  }, [entries, filterStartDate, filterEndDate, filterPayment, filterStatus, filterStore]);

  const stats = useMemo(() => getWeeklySummary(filteredEntries), [filteredEntries]);
  const dailyBreakdown = useMemo(() => getDailyStats(entries, timeEntries, config), [entries, timeEntries, config]);

  const clearFilters = () => {
    setFilterStartDate(todayStr);
    setFilterEndDate(todayStr);
    setFilterPayment('');
    setFilterStatus('');
    onFilterStoreChange('');
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
      {/* Filtros Inteligentes */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Filter size={16} />
          </div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Filtros de Busca</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 lg:col-span-2">
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

                const isSelected = pStart === filterStartDate && pEnd === filterEndDate;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setFilterStartDate(pStart!);
                      setFilterEndDate(pEnd!);
                    }}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSelected 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
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
              className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500/30"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
                <span>{new Date(filterStartDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
              <div className="flex items-center gap-3">
                <span>{new Date(filterEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
            </button>
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Pagamento"
              value={filterPayment}
              options={[
                { id: '', label: 'Todos', icon: <Banknote size={14} /> },
                { id: 'pix', label: config.paymentMethodLabels?.pix || 'PIX', icon: <CreditCard size={14} className="text-indigo-500" /> },
                { id: 'money', label: config.paymentMethodLabels?.money || 'Dinheiro', icon: <Wallet size={14} className="text-emerald-500" /> },
                { id: 'caderno', label: config.paymentMethodLabels?.caderno || 'Caderno', icon: <Tag size={14} className="text-amber-500" /> }
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
                { id: 'paid', label: 'Pago', icon: <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> },
                { id: 'pending', label: 'Pendente', icon: <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" /> }
              ]}
              onChange={setFilterStatus}
              isOpen={showStatusSelect}
              onOpen={() => setShowStatusSelect(true)}
              onClose={() => setShowStatusSelect(false)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomSelect
                  label="Filtrar por Loja"
                  value={filterStore}
                  options={[
                    { id: '', label: 'Todas as Lojas', icon: <HistoryIcon size={14} /> },
                    ...uniqueStores.map(store => ({
                      id: store,
                      label: store,
                      icon: <Tag size={14} />
                    }))
                  ]}
                  onChange={onFilterStoreChange}
                  isOpen={showStoreSelect}
                  onOpen={() => setShowStoreSelect(true)}
                  onClose={() => setShowStoreSelect(false)}
                />
              </div>
              {filterStore && (
                <button
                  onClick={() => {
                    setNewStoreName(filterStore);
                    setIsEditingStoreName(true);
                  }}
                  className="mt-6 p-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm border border-indigo-100 dark:border-indigo-500/20"
                  title="Editar nome desta loja em todos os registros"
                >
                  <Edit3 size={18} />
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={clearFilters}
            className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2"
          >
            <X size={14} /> Limpar
          </button>
        </div>
      </motion.div>

      {/* Card Único de Resumo Financeiro (Período Selecionado) */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resumo Financeiro</h3>
              <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-0.5">Desempenho no Período</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
              Bruto: {formatCurrency(stats.totalGross)}
            </span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-700">
              {filteredEntries.length} Itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Bruto</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(stats.totalGross)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <ArrowUpRight size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Líquido</span>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(stats.totalNet)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Recebido</span>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(stats.totalPaid)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertCircle size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(stats.totalPending)}</p>
          </div>
        </div>
      </motion.div>

      {/* Lista de Movimentações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            Histórico Completo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEntries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
                  <Search size={32} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Nenhum registro encontrado</p>
              </motion.div>
            ) : (
              filteredEntries.slice(0, visibleCount).map((entry) => (
                <motion.div 
                  layout
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-2 transition-all group relative overflow-hidden ${
                    entry.paymentMethod === 'money' 
                      ? 'border-slate-100 dark:border-slate-800' 
                      : entry.isPaid 
                        ? 'border-emerald-500 dark:border-emerald-400' 
                        : 'border-rose-500 dark:border-rose-400'
                  } hover:shadow-md`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.grossAmount > 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {entry.grossAmount > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 dark:text-white leading-tight text-lg">{entry.storeName.replace('[GASTO]', '').trim()}</h4>
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
                              <CreditCard size={10} /> {config.paymentMethodLabels?.[entry.paymentMethod as keyof typeof config.paymentMethodLabels] || entry.paymentMethod}
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

                  {/* Removido a parte de projeção conforme solicitado */}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Excluir</span>
                    </button>
                    <button 
                      onClick={() => onEdit(entry)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-all active:scale-95"
                    >
                      <Edit3 size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Editar</span>
                    </button>
                    {entry.paymentMethod !== 'money' && (
                      <button 
                        onClick={() => onUpdate({ ...entry, isPaid: !entry.isPaid })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95 border-2 ${
                          entry.isPaid 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-400/10 dark:border-emerald-400/40 dark:text-emerald-400' 
                            : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-400/10 dark:border-rose-400/40 dark:text-rose-400'
                        }`}
                      >
                        {entry.isPaid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span className="text-[10px] font-semibold uppercase tracking-widest">
                          {entry.isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {filteredEntries.length > visibleCount && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setVisibleCount(prev => prev + 40)}
              className="w-full mt-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
            >
              Ver Mais <ChevronRight size={14} />
            </motion.button>
          )}

          {visibleCount > 3 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setVisibleCount(3)}
              className="w-full mt-2 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
            >
              Recolher <X size={12} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Calendário de Performance */}
      <PerformanceCalendar dailyStats={dailyBreakdown} />

      <AnimatePresence>
        {showRangePicker && (
          <CustomDateRangePicker 
            startDate={filterStartDate} 
            endDate={filterEndDate} 
            onChange={(start, end) => {
              setFilterStartDate(start);
              setFilterEndDate(end);
            }} 
            onClose={() => setShowRangePicker(false)} 
          />
        )}
        {isEditingStoreName && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">Renomear Loja</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atualização em massa</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Isso alterará o nome <span className="font-black text-indigo-500">"{filterStore}"</span> para o novo nome em <span className="font-black text-slate-800 dark:text-white">TODOS</span> os registros do seu histórico.
                </p>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Novo Nome da Loja</label>
                  <input 
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-800 dark:text-white font-bold focus:border-indigo-500 outline-none transition-all"
                    placeholder="Ex: Novo Nome da Loja"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingStoreName(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onBulkUpdateStoreName(filterStore, newStoreName);
                    onFilterStoreChange(newStoreName);
                    setIsEditingStoreName(false);
                  }}
                  disabled={!newStoreName || newStoreName === filterStore}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default History;
