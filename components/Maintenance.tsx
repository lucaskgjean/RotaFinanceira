
import React, { useMemo, useState } from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklySummary, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Navigation, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  History as HistoryIcon,
  Trash2,
  ShieldCheck,
  Clock,
  Filter,
  X
} from 'lucide-react';
import QuickKM from './QuickKM';
import CustomDatePicker from './CustomDatePicker';

interface MaintenanceProps {
  entries: DailyEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onAdd: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ entries, config, onEdit, onAdd, onDelete }) => {
  const todayStr = getLocalDateStr();
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const currentMonthStr = todayStr.substring(0, 7);

  const todayEntries = entries.filter(e => e.date === todayStr);
  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));
  
  const todaySum = getWeeklySummary(todayEntries);
  const monthSum = getWeeklySummary(monthEntries);

  const maintenanceEntries = useMemo(() => {
    return entries.filter(e => {
      const isMaintenance = e.maintenance > 0 && e.grossAmount === 0;
      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || e.date >= filterStartDate) &&
        (!filterEndDate || e.date <= filterEndDate)
      ) : true;
      return isMaintenance && matchRange;
    });
  }, [entries, filterStartDate, filterEndDate]);

  const kmHistoryEntries = useMemo(() => {
    return entries.filter(e => {
      const isKm = e.storeName === 'Fechamento de KM';
      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || e.date >= filterStartDate) &&
        (!filterEndDate || e.date <= filterEndDate)
      ) : true;
      return isKm && matchRange;
    });
  }, [entries, filterStartDate, filterEndDate]);
  
  const lastKmEntry = entries.reduce((max, curr) => {
    const km = curr.kmDriven || curr.kmAtMaintenance || 0;
    return km > max ? km : max;
  }, 0);

  const alerts = config.maintenanceAlerts || [];

  // Calculate average daily KM
  const avgDailyKm = useMemo(() => {
    const kmEntries = entries
      .filter(e => e.kmDriven && e.kmDriven > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (kmEntries.length === 0) return 0;
    
    // Take last 10 entries or last 30 days
    const recentEntries = kmEntries.slice(0, 10);
    const totalKm = recentEntries.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
    return totalKm / recentEntries.length;
  }, [entries]);

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
      className="space-y-6 pb-24"
    >
      {/* Fechamento de KM */}
      <motion.div variants={itemVariants}>
        <QuickKM onAdd={onAdd} config={config} entries={entries} />
      </motion.div>

      {/* Resumo de Manutenções e Quilometragem */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wrench size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resumo Manutenção & KM</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Manutenção (Mês)</span>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter font-mono-num">{formatCurrency(monthSum.totalSpentMaintenance)}</div>
            </div>
            
            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">KM Trabalho (Hoje)</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{todaySum.totalKm.toFixed(1)} <span className="text-xs opacity-50">KM</span></div>
            </div>

            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Odômetro Total</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{lastKmEntry.toLocaleString()} <span className="text-xs opacity-50">KM</span></div>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-6 -bottom-6 opacity-[0.02] dark:opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
          <Navigation size={150} />
        </div>
      </motion.div>

      {/* Alertas de Manutenção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alerts.map(alert => {
          const maintenanceForThis = maintenanceEntries.filter(e => e.storeName.toLowerCase().includes(alert.description.toLowerCase()));
          const lastMaintenanceKm = maintenanceForThis.length > 0 
            ? Math.max(...maintenanceForThis.map(e => e.kmAtMaintenance || 0))
            : alert.lastKm;
          
          const nextMaintenanceKm = lastMaintenanceKm + alert.kmInterval;
          const kmRemaining = nextMaintenanceKm - lastKmEntry;
          const progress = Math.min(100, Math.max(0, ((lastKmEntry - lastMaintenanceKm) / alert.kmInterval) * 100));
          
          const isUrgent = kmRemaining < 1000;

          const estimatedDays = avgDailyKm > 0 ? Math.ceil(kmRemaining / avgDailyKm) : null;
          const estimatedDate = estimatedDays !== null ? new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000) : null;

          return (
            <motion.div 
              key={alert.id} 
              variants={itemVariants}
              className={`bg-white dark:bg-slate-900 p-5 rounded-[2rem] border transition-all ${isUrgent ? 'border-rose-100 dark:border-rose-500/20 shadow-lg shadow-rose-50/50 dark:shadow-none' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                  {isUrgent ? <AlertTriangle size={20} /> : <Wrench size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-slate-800 dark:text-white text-sm truncate">{alert.description}</h4>
                    {isUrgent && (
                      <span className="bg-rose-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse shrink-0">Urgente</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Intervalo: {alert.kmInterval.toLocaleString()} KM</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
                  <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Restam</span>
                  <p className={`text-xs font-black font-mono-num ${isUrgent ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {kmRemaining.toLocaleString()} <span className="text-[8px] opacity-50">KM</span>
                  </p>
                </div>
                {estimatedDate && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Previsão</span>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">
                      {estimatedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                  <span>Progresso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full ${isUrgent ? 'bg-rose-500' : 'bg-blue-500'}`} 
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filtros de Período */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Filter size={16} />
          </div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Filtro de Histórico</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Início</label>
            <button 
              type="button"
              onClick={() => setShowStartDatePicker(true)}
              className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-blue-200 dark:hover:border-blue-500/30"
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
              className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-blue-200 dark:hover:border-blue-500/30"
            >
              <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
              <span>{filterEndDate ? new Date(filterEndDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}</span>
            </button>
          </div>
          <button 
            onClick={() => {
              setFilterStartDate(todayStr);
              setFilterEndDate(todayStr);
            }}
            className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2"
          >
            <X size={14} /> Limpar Filtro
          </button>
        </div>
      </motion.div>

      {/* Histórico de KM */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2 flex items-center gap-3 uppercase tracking-widest">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
          Histórico de KM
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kmHistoryEntries.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhum fechamento de KM no período</p>
            </div>
          ) : (
            kmHistoryEntries
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-100 dark:hover:border-blue-500 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                      <Navigation size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-black text-slate-800 dark:text-white leading-tight">{entry.kmAtMaintenance?.toLocaleString()} KM</h5>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${entry.kmType === 'personal' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-500 text-white'}`}>
                          {entry.kmType === 'personal' ? '-' : '+'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')} • <span className={entry.kmType === 'personal' ? 'text-slate-400' : 'text-emerald-500'}>{entry.kmType === 'personal' ? 'Pessoal' : `+${entry.kmDriven?.toFixed(1)} KM`}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gasolina</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono-num">R$ {entry.fuelPrice?.toFixed(3)}/L</p>
                    <div className="flex flex-col gap-2 mt-1">
                      <button 
                        onClick={() => onEdit(entry)}
                        className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 ml-auto hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Editar <ChevronRight size={10} />
                      </button>
                      <button 
                        onClick={() => onDelete(entry.id)}
                        className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 ml-auto hover:text-blue-500 transition-colors"
                      >
                        Excluir <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </motion.div>

      {/* Histórico de Manutenção */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2 flex items-center gap-3 uppercase tracking-widest">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
          Histórico de Serviços
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {maintenanceEntries.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhuma manutenção no período</p>
            </div>
          ) : (
            maintenanceEntries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-100 dark:hover:border-blue-500 transition-all">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800 dark:text-white leading-tight">{entry.storeName.replace('[GASTO] ', '')}</h5>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')} • <span className="font-mono-num">{entry.kmAtMaintenance?.toLocaleString()} KM</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(entry.maintenance)}</p>
                  <div className="flex flex-col gap-2 mt-1">
                    <button 
                      onClick={() => onEdit(entry)}
                      className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 ml-auto hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Editar <ChevronRight size={10} />
                    </button>
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 ml-auto hover:text-rose-500 transition-colors"
                    >
                      Excluir <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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

export default Maintenance;
