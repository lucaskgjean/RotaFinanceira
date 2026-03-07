
import React, { useMemo } from 'react';
import { DailyEntry, AppConfig } from '../types';
import { formatCurrency, getWeeklySummary, getLocalDateStr } from '../utils/calculations';
import { motion } from 'motion/react';
import { 
  Wrench, 
  Navigation, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  History as HistoryIcon,
  ShieldCheck,
  Clock,
  Wallet
} from 'lucide-react';
import QuickKM from './QuickKM';

interface MaintenanceProps {
  entries: DailyEntry[];
  config: AppConfig;
  onEdit: (entry: DailyEntry) => void;
  onAdd: (entry: DailyEntry) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ entries, config, onEdit, onAdd }) => {
  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);

  const todayEntries = entries.filter(e => e.date === todayStr);
  const monthEntries = entries.filter(e => e.date.startsWith(currentMonthStr));
  
  const todaySum = getWeeklySummary(todayEntries);
  const monthSum = getWeeklySummary(monthEntries);
  const generalSum = getWeeklySummary(entries);

  const todaySpent = todaySum.totalSpentFuel + todaySum.totalSpentFood + todaySum.totalSpentMaintenance + todaySum.totalSpentOthers;
  const monthSpent = monthSum.totalSpentFuel + monthSum.totalSpentFood + monthSum.totalSpentMaintenance + monthSum.totalSpentOthers;
  const totalReservedAll = generalSum.totalFuel + generalSum.totalFood + generalSum.totalMaintenance + generalSum.totalOthers;

  const maintenanceEntries = entries.filter(e => e.maintenance > 0 && e.grossAmount === 0);
  
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
      {/* Fechamento de KM */}
      <motion.div variants={itemVariants}>
        <QuickKM onAdd={onAdd} config={config} entries={entries} />
      </motion.div>

      {/* Header de Saldo */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group"
      >
        <div className="relative z-10 flex-1 w-full">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-2">Gasto Real (Hoje)</h2>
          <div className="text-5xl font-black text-rose-600 dark:text-rose-400 tracking-tighter font-mono-num">{formatCurrency(todaySpent)}</div>
          <div className="mt-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total Mensal</span>
            <p className="text-lg font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(monthSpent)}</p>
          </div>
        </div>
        
        <div className="text-center md:text-right relative z-10">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-widest">Reservas Projetadas</span>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter font-mono-num flex items-center gap-2 justify-center md:justify-end">
            {formatCurrency(totalReservedAll)}
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-tight">Saldo Acumulado</p>
        </div>
        
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
          <Wallet size={200} />
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
              className={`bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 transition-all ${isUrgent ? 'border-rose-100 dark:border-rose-500/20 shadow-lg shadow-rose-50 dark:shadow-none' : 'border-slate-50 dark:border-slate-800 shadow-sm'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isUrgent ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                  {isUrgent ? <AlertTriangle size={24} /> : <Clock size={24} />}
                </div>
                {isUrgent && (
                  <span className="bg-rose-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Urgente</span>
                )}
              </div>
              
              <h4 className="font-black text-slate-800 dark:text-white mb-1 text-lg">{alert.description}</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4 tracking-tight">A cada {alert.kmInterval.toLocaleString()} KM</p>
              
              {estimatedDate && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Previsão Estimada</span>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {estimatedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="text-blue-500 dark:text-blue-400 ml-1">({estimatedDays} dias)</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 dark:text-slate-500">Restam</span>
                  <span className={`font-mono-num ${isUrgent ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{kmRemaining.toLocaleString()} KM</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
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

      {/* Histórico de KM */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2 flex items-center gap-3 uppercase tracking-widest">
          <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
          Histórico de KM
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.filter(e => e.storeName === 'Fechamento de KM').length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhum fechamento de KM registrado</p>
            </div>
          ) : (
            entries
              .filter(e => e.storeName === 'Fechamento de KM')
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-rose-100 dark:hover:border-rose-500 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-rose-500 rounded-2xl flex items-center justify-center group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 transition-colors">
                      <Navigation size={20} />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-800 dark:text-white leading-tight">{entry.kmAtMaintenance?.toLocaleString()} KM</h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')} • <span className="text-emerald-500">+{entry.kmDriven?.toFixed(1)} KM</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gasolina</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono-num">R$ {entry.fuelPrice?.toFixed(3)}/L</p>
                    <button 
                      onClick={() => onEdit(entry)}
                      className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1 ml-auto mt-1 hover:text-rose-700 dark:hover:text-rose-300"
                    >
                      Editar <ChevronRight size={10} />
                    </button>
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
              <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhuma manutenção registrada</p>
            </div>
          ) : (
            maintenanceEntries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-100 dark:hover:border-blue-500 transition-all">
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
                  <button 
                    onClick={() => onEdit(entry)}
                    className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 ml-auto mt-1 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Editar <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Maintenance;
