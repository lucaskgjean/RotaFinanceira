
import React, { useState, useMemo, useEffect } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, calculateDuration, formatDuration, getLocalDateStr } from '../utils/calculations';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Navigation, 
  Package, 
  TrendingUp, 
  Fuel, 
  Utensils, 
  Wrench, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ChevronRight,
  Download,
  Store,
  CreditCard,
  MoreHorizontal
} from 'lucide-react';
interface ReportsProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onAddEntry: (entry: DailyEntry) => void;
}

const Reports: React.FC<ReportsProps> = ({ entries, timeEntries, config, onAddEntry }) => {
  const today = getLocalDateStr();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const currentTime = now.toTimeString().slice(0, 5);

  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedStore, setSelectedStore] = useState<string>('all');

  const reportData = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date >= startDate && e.date <= endDate);
    const filteredTime = timeEntries.filter(t => t.date >= startDate && t.date <= endDate);

    const summary = getWeeklySummary(filteredEntries);
    const incomeEntries = filteredEntries.filter(e => e.grossAmount > 0);
    const expenseEntries = filteredEntries.filter(e => e.grossAmount === 0);
    const maintenanceEntries = expenseEntries.filter(e => e.maintenance > 0);

    const uniqueStores = Array.from(new Set(entries.filter(e => e.grossAmount > 0).map(e => e.storeName))).sort();
    
    const storeDeliveries = selectedStore === 'all' 
      ? [] 
      : incomeEntries.filter(e => e.storeName === selectedStore);

    const totalsByPayment = incomeEntries.reduce((acc, curr) => {
      const method = curr.paymentMethod || 'pix';
      acc[method] = (acc[method] || 0) + curr.grossAmount;
      return acc;
    }, {} as Record<string, number>);

    const expenseTotalsByMethod = expenseEntries.reduce((acc, curr) => {
      const method = curr.paymentMethod || 'pix';
      const total = curr.fuel + curr.food + curr.maintenance + (curr.others || 0);
      acc[method] = (acc[method] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    const expenseTotalsByCategory = expenseEntries.reduce((acc, curr) => {
      acc.fuel = (acc.fuel || 0) + curr.fuel;
      acc.food = (acc.food || 0) + curr.food;
      acc.maintenance = (acc.maintenance || 0) + curr.maintenance;
      acc.others = (acc.others || 0) + (curr.others || 0);
      return acc;
    }, { fuel: 0, food: 0, maintenance: 0, others: 0 });

    const quickLaunchesCount = incomeEntries.length;
    
    const totalMinutes = filteredTime.reduce((acc, curr) => {
      if (curr.startTime && curr.endTime) {
        return acc + calculateDuration(curr.startTime, curr.endTime, curr.breakDuration || 0);
      } else if (curr.startTime && !curr.endTime && curr.date === today) {
        // Se o turno está ativo e é hoje, conta o tempo até agora
        return acc + calculateDuration(curr.startTime, currentTime, 0);
      }
      return acc;
    }, 0);

    const totalFuelSpent = expenseEntries.reduce((acc, curr) => acc + curr.fuel, 0);
    const totalFoodSpent = expenseEntries.reduce((acc, curr) => acc + curr.food, 0);
    const totalMaintenanceSpent = expenseEntries.reduce((acc, curr) => acc + curr.maintenance, 0);
    const totalOthersSpent = expenseEntries.reduce((acc, curr) => acc + (curr.others || 0), 0);
    const totalExpenses = totalFuelSpent + totalFoodSpent + totalMaintenanceSpent + totalOthersSpent;

    const avgValuePerLaunch = quickLaunchesCount > 0 ? summary.totalGross / quickLaunchesCount : 0;
    const avgKmPerLaunch = quickLaunchesCount > 0 ? summary.totalKm / quickLaunchesCount : 0;
    
    const totalFuelReserved = incomeEntries.reduce((acc, curr) => acc + curr.fuel, 0);
    const avgFuelPerLaunch = quickLaunchesCount > 0 ? totalFuelReserved / quickLaunchesCount : 0;

    const totalHoursDecimal = totalMinutes / 60;
    const avgGrossPerHour = totalHoursDecimal > 0 ? summary.totalGross / totalHoursDecimal : 0;

    return {
      summary,
      quickLaunchesCount,
      totalHours: totalMinutes,
      totalExpenses,
      totalKm: summary.totalKm,
      avgValuePerLaunch,
      avgKmPerLaunch,
      avgFuelPerLaunch,
      avgGrossPerHour,
      maintenanceEntries,
      totalFuelSpent,
      totalFoodSpent,
      totalMaintenanceSpent,
      totalOthersSpent,
      filteredEntries,
      uniqueStores,
      storeDeliveries,
      totalsByPayment,
      expenseTotalsByMethod,
      expenseTotalsByCategory
    };
  }, [entries, timeEntries, startDate, endDate, selectedStore, currentTime]);

  const exportToCSV = () => {
    const headers = ['Data', 'Hora', 'Loja/Descrição', 'Bruto', 'Combustível', 'Alimentação', 'Manutenção', 'Outros', 'Líquido', 'KM Rodados', 'Pagamento'];
    const rows = reportData.filteredEntries.map(e => [
      e.date,
      e.time,
      e.storeName,
      e.grossAmount,
      e.fuel,
      e.food,
      e.maintenance,
      e.others || 0,
      e.netAmount,
      e.kmDriven || '',
      e.paymentMethod || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_rota_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      {/* Filtros Premium */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Filter size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Análise de Período</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Selecione o intervalo para o relatório</p>
              </div>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Início</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-black text-slate-700 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Fim</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-black text-slate-700 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Filtrar por Loja</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                <select 
                  value={selectedStore} 
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-black text-slate-700 dark:text-slate-200 text-sm appearance-none"
                >
                  <option value="all">Todas as Lojas</option>
                  {reportData.uniqueStores.map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Relatório por Loja Selecionada */}
      {selectedStore !== 'all' && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
              Entregas: {selectedStore}
            </h4>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Total na Loja</span>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">
                {formatCurrency(reportData.storeDeliveries.reduce((acc, curr) => acc + curr.grossAmount, 0))}
              </p>
            </div>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
            {reportData.storeDeliveries.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs font-bold uppercase">Nenhuma entrega no período</p>
            ) : (
              reportData.storeDeliveries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-indigo-500 shadow-sm">
                      <Package size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-white block">{entry.time}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(entry.grossAmount)}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Grid Bento de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Bruto Total */}
        <motion.div variants={itemVariants} className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Faturamento Bruto</span>
            <div className="text-4xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.summary.totalGross)}</div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <TrendingUp size={180} />
          </div>
        </motion.div>

        {/* Líquido Total */}
        <motion.div variants={itemVariants} className="bg-emerald-600 dark:bg-emerald-700 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Lucro Líquido Real</span>
            <div className="text-4xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.summary.totalNet)}</div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wallet size={180} />
          </div>
        </motion.div>

        {/* Gastos Totais */}
        <motion.div variants={itemVariants} className="bg-rose-600 dark:bg-rose-700 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">Total de Despesas</span>
            <div className="text-4xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.totalExpenses)}</div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <ArrowDownRight size={180} />
          </div>
        </motion.div>

      </div>

      {/* Relatório de Métodos de Pagamento e Gastos Detalhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Faturamento por Método */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
            Faturamento por Método
          </h4>
          <div className="space-y-4">
            {['pix', 'money', 'caderno'].map(method => (
              <div key={method} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <CreditCard size={18} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">{method === 'money' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Caderno'}</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.totalsByPayment[method] || 0)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Gastos por Método */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
            Gastos por Método
          </h4>
          <div className="space-y-4">
            {['pix', 'money', 'caderno'].map(method => (
              <div key={method} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                    <ArrowDownRight size={18} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">{method === 'money' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Caderno'}</span>
                </div>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(reportData.expenseTotalsByMethod[method] || 0)}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Médias e Volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Volume de Trabalho */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            Performance Operacional
          </h4>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                <Package size={12} className="text-indigo-500" /> Entregas
              </span>
              <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.quickLaunchesCount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                <Clock size={12} className="text-indigo-500" /> Tempo Total
              </span>
              <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatDuration(reportData.totalHours)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                <Navigation size={12} className="text-indigo-500" /> KM Rodados
              </span>
              <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalKm.toFixed(0)} <small className="text-xs opacity-40">km</small></p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                <TrendingUp size={12} className="text-indigo-500" /> Ticket/Hora
              </span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">{formatCurrency(reportData.avgGrossPerHour)}</p>
            </div>
          </div>
        </motion.div>

        {/* Médias de Lançamento */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
            Médias por Lançamento
          </h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
                  <ArrowUpRight size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Ticket Médio</span>
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgValuePerLaunch)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-rose-400 shadow-sm">
                  <Fuel size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Combustível/Lanç.</span>
              </div>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(reportData.avgFuelPerLaunch)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm">
                  <Navigation size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase">KM Médio/Lanç.</span>
              </div>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">{reportData.avgKmPerLaunch.toFixed(1)} <small className="text-xs opacity-40">km</small></span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Detalhamento de Gastos Reais */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8">Fluxo de Despesas Reais</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] border border-rose-100 dark:border-rose-500/20 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <Fuel size={20} className="text-rose-500 dark:text-rose-400" />
              <span className="text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase">Combustível</span>
            </div>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono-num">{formatCurrency(reportData.totalFuelSpent)}</p>
          </div>
          <div className="p-6 bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] border border-amber-100 dark:border-amber-500/20 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <Utensils size={20} className="text-amber-500 dark:text-amber-400" />
              <span className="text-[10px] font-black text-amber-400 dark:text-amber-500 uppercase">Alimentação</span>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono-num">{formatCurrency(reportData.totalFoodSpent)}</p>
          </div>
          <div className="p-6 bg-blue-50 dark:bg-blue-500/10 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <Wrench size={20} className="text-blue-500 dark:text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 dark:text-blue-500 uppercase">Manutenção</span>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono-num">{formatCurrency(reportData.totalMaintenanceSpent)}</p>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-500/10 rounded-[2rem] border border-slate-100 dark:border-slate-500/20 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <MoreHorizontal size={20} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Outros</span>
            </div>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono-num">{formatCurrency(reportData.totalOthersSpent)}</p>
          </div>
        </div>
      </motion.div>

      {/* Manutenções Realizadas */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-8">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Manutenções no Período</h4>
          <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {reportData.maintenanceEntries.length} itens
          </span>
        </div>
        
        {reportData.maintenanceEntries.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Nenhuma manutenção registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reportData.maintenanceEntries.map(entry => (
              <div key={entry.id} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800 dark:text-white block leading-tight">{entry.storeName.replace('[GASTO] ', '')}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(entry.maintenance)}</span>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Reports;
