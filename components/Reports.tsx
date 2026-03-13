
import React, { useState, useMemo, useEffect } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, calculateDuration, formatDuration, getLocalDateStr, calculateFuelMetrics } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import CustomDialog from './CustomDialog';
import CustomSelect from './CustomSelect';
import { 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
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
  MoreHorizontal,
  Lock,
  Sparkles,
  Gauge
} from 'lucide-react';
interface ReportsProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onAddEntry: (entry: DailyEntry) => void;
  onOpenSubscription: () => void;
}

const Reports: React.FC<ReportsProps> = ({ entries, timeEntries, config, onAddEntry, onOpenSubscription }) => {
  const today = getLocalDateStr();
  const [now, setNow] = useState(new Date());

  if (!config.profile?.isPro) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto pt-10 pb-32"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <BarChart3 size={32} className="text-amber-300" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Relatórios <span className="text-amber-300">Avançados</span></h2>
              <p className="text-indigo-100 font-medium leading-relaxed text-lg">
                Tome decisões baseadas em dados reais e maximize seu lucro mensal.
              </p>
            </div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-6">
              <div className="flex gap-5">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-1">Análise de Lucro Real</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Visualize seu lucro líquido descontando automaticamente combustível, comida e manutenção em tempo real.</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                  <Filter size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-1">Filtros por Período e Loja</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Saiba exatamente quanto você ganhou em cada restaurante ou aplicativo em qualquer data específica.</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-1">Métricas de Performance</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Descubra seu Ticket Médio, Ganho por Hora e KM Médio por entrega para otimizar suas rotas.</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-1">Exportação Completa</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Gere planilhas em Excel (CSV) de todos os seus dados para contabilidade ou controle pessoal externo.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={onOpenSubscription}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 group"
            >
              <Sparkles size={20} className="text-amber-300 group-hover:rotate-12 transition-transform" fill="currentColor" />
              Desbloquear Relatórios PRO
            </button>
            
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Junte-se a centenas de motoristas que já são <span className="text-indigo-600">PRO</span>
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const currentTime = now.toTimeString().slice(0, 5);

  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [showStoreSelect, setShowStoreSelect] = useState(false);
  const [showStoreFilter, setShowStoreFilter] = useState(false);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

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
    
    const totalSeconds = filteredTime.reduce((acc, curr) => {
      if (curr.startTime && curr.endTime) {
        return acc + calculateDuration(curr.startTime, curr.endTime, curr.breakDuration || 0);
      } else if (curr.startTime && !curr.endTime && curr.date === today) {
        // Se o turno está ativo e é hoje, conta o tempo até agora
        return acc + calculateDuration(curr.startTime, currentTime, 0);
      }
      return acc;
    }, 0);

    const totalHoursDecimal = totalSeconds / 3600;
    const avgGrossPerHour = totalHoursDecimal > 0 ? summary.totalGross / totalHoursDecimal : 0;

    const totalFuelSpent = expenseEntries.reduce((acc, curr) => acc + curr.fuel, 0);
    const totalFoodSpent = expenseEntries.reduce((acc, curr) => acc + curr.food, 0);
    const totalMaintenanceSpent = expenseEntries.reduce((acc, curr) => acc + curr.maintenance, 0);
    const totalOthersSpent = expenseEntries.reduce((acc, curr) => acc + (curr.others || 0), 0);
    const totalExpenses = totalFuelSpent + totalFoodSpent + totalMaintenanceSpent + totalOthersSpent;

    const avgValuePerLaunch = quickLaunchesCount > 0 ? summary.totalGross / quickLaunchesCount : 0;
    const avgKmPerLaunch = quickLaunchesCount > 0 ? summary.totalKm / quickLaunchesCount : 0;
    
    const totalFuelReserved = incomeEntries.reduce((acc, curr) => acc + curr.fuel, 0);
    const avgFuelPerLaunch = quickLaunchesCount > 0 ? totalFuelReserved / quickLaunchesCount : 0;

    const totalFuelLiters = filteredEntries.reduce((acc, curr) => acc + (curr.liters || 0), 0);
    const earningsPerKm = summary.totalKm && summary.totalKm > 0 ? summary.totalGross / summary.totalKm : 0;
    const expensePerKm = summary.totalKm && summary.totalKm > 0 ? totalExpenses / summary.totalKm : 0;
    const avgKmPerLiter = totalFuelLiters > 0 ? summary.totalKm / totalFuelLiters : 0;

    const fuelMetrics = calculateFuelMetrics(filteredEntries);
    
    // Mapa de Calor: Ganhos por Dia da Semana e Hora
    const heatMapData: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    filteredEntries.forEach(e => {
      if (e.grossAmount > 0) {
        const dateObj = new Date(e.date + 'T12:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 (Dom) a 6 (Sab)
        // Ajustar para iniciar na Segunda (Seg=0, Ter=1, ..., Dom=6)
        const adjustedDay = (dayOfWeek + 6) % 7;
        const hour = parseInt(e.time.split(':')[0]);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          heatMapData[adjustedDay][hour] += e.grossAmount;
        }
      }
    });

    const maxHeatValue = Math.max(...heatMapData.flat(), 1);

    // Odômetro Total (último valor lançado em km total do veículo)
    const allKmEntries = entries.filter(e => e.kmAtMaintenance !== undefined && e.kmAtMaintenance > 0);
    const totalOdometer = allKmEntries.length > 0 
      ? Math.max(...allKmEntries.map(e => e.kmAtMaintenance || 0))
      : config.lastTotalKm || 0;

    // Dados para o gráfico de barras (Ganhos por dia)
    const dailyEarningsMap: Record<string, number> = {};
    filteredEntries.forEach(e => {
      if (e.grossAmount > 0) {
        dailyEarningsMap[e.date] = (dailyEarningsMap[e.date] || 0) + e.grossAmount;
      }
    });
    
    const chartData = Object.entries(dailyEarningsMap)
      .map(([date, amount]) => ({
        date: date.split('-').reverse().slice(0, 2).join('/'), // DD/MM
        amount,
        fullDate: date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    return {
      summary,
      quickLaunchesCount,
      totalHours: totalSeconds,
      totalExpenses,
      totalKm: summary.totalKm,
      totalFuelLiters,
      earningsPerKm,
      expensePerKm,
      avgKmPerLiter,
      chartData,
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
      expenseTotalsByCategory,
      fuelMetrics,
      totalOdometer,
      heatMapData,
      maxHeatValue
    };
  }, [entries, timeEntries, startDate, endDate, selectedStore, currentTime]);

  const exportToCSV = () => {
    if (!config.profile?.isPro) {
      setDialog({
        isOpen: true,
        title: 'Recurso PRO',
        message: 'A exportação de relatórios é exclusiva para membros PRO! 💎',
        type: 'info',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          onOpenSubscription();
        }
      });
      return;
    }
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
      <CustomDialog 
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.title === 'Recurso PRO' ? 'Ver Planos' : 'OK'}
      />
      {/* Filtros Premium */}
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
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
              className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none relative overflow-hidden"
            >
              {!config.profile?.isPro && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                  <Lock size={12} className="text-amber-400" />
                </div>
              )}
              <Download size={14} /> Exportar CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Início</label>
              <button 
                type="button"
                onClick={() => setShowStartDatePicker(true)}
                className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-black text-slate-700 dark:text-slate-200 text-sm"
              >
                <Calendar className="text-slate-300 dark:text-slate-600" size={18} />
                <span>{startDate ? new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'}</span>
              </button>
            </div>
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Fim</label>
              <button 
                type="button"
                onClick={() => setShowEndDatePicker(true)}
                className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-black text-slate-700 dark:text-slate-200 text-sm"
              >
                <Calendar className="text-slate-300 dark:text-slate-600" size={18} />
                <span>{endDate ? new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}</span>
              </button>
            </div>
            <div className="relative">
              <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Filtrar por Loja</label>
              <CustomSelect
                value={selectedStore}
                options={[
                  { id: 'all', label: 'Todas as Lojas', icon: <Store size={14} /> },
                  ...reportData.uniqueStores.map(store => ({
                    id: store,
                    label: store,
                    icon: <Package size={14} />
                  }))
                ]}
                onChange={setSelectedStore}
                isOpen={showStoreSelect}
                onOpen={() => setShowStoreSelect(true)}
                onClose={() => setShowStoreSelect(false)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Relatório por Loja Selecionada */}
      {selectedStore !== 'all' && (
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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

      {/* Gráfico de Ganhos */}
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
          Relatório de Ganhos Diários
        </h4>
        <div className="h-64 w-full">
          {reportData.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ganho']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {reportData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
              Sem dados para o gráfico
            </div>
          )}
        </div>
      </motion.div>

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

      {/* Novas Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ganhos por Hora */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
              <Clock size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Ganhos por Hora</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">{formatCurrency(reportData.avgGrossPerHour)}</div>
          </div>
        </motion.div>

        {/* Ganhos por KM */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
              <Navigation size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Ganhos por KM</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">{formatCurrency(reportData.earningsPerKm)}</div>
          </div>
        </motion.div>

        {/* Gasto por KM */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 text-rose-600">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gasto por KM</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num tracking-tighter">{formatCurrency(reportData.expensePerKm)}</div>
          </div>
        </motion.div>

        {/* Litros de Combustível */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
              <Fuel size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Litros Abastecidos</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalFuelLiters.toFixed(1)} <small className="text-xs opacity-40">L</small></div>
          </div>
        </motion.div>

        {/* Média por KM */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Navigation size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Média (KM/L)</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.avgKmPerLiter.toFixed(1)} <small className="text-xs opacity-40">km/l</small></div>
          </div>
        </motion.div>

        {/* Custo por KM */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 text-rose-600">
              <Navigation size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Custo/KM</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.fuelMetrics.costPerKm)}</div>
          </div>
        </motion.div>

        {/* Custo por Entrega */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
              <Package size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Custo/Entrega</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.fuelMetrics.costPerDelivery)}</div>
          </div>
        </motion.div>

        {/* Preço Médio Litro */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Preço Médio/L</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.fuelMetrics.avgPricePerLiter)}</div>
          </div>
        </motion.div>

        {/* Odômetro Total */}
        <motion.div variants={itemVariants} className="bg-slate-100 dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-slate-600 dark:text-slate-400">
              <Gauge size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Odômetro Total</span>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalOdometer.toLocaleString('pt-BR')} <small className="text-xs opacity-40">km</small></div>
          </div>
        </motion.div>
      </div>

      {/* Relatório de Métodos de Pagamento e Gastos Detalhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Faturamento por Método */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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
                <TrendingUp size={12} className="text-indigo-500" /> Ganho/Hora Trab.
              </span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">{formatCurrency(reportData.avgGrossPerHour)}</p>
            </div>
          </div>
        </motion.div>

        {/* Médias de Lançamento */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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

      {/* Mapa de Calor de Ganhos */}
      <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="mb-8">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
            Mapa de Calor: Melhores Horários
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight mt-1">Quanto mais verde, maior o faturamento no período</p>
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="min-w-[800px]">
            <div className="flex mb-2">
              <div className="w-16 shrink-0 sticky left-0 bg-white dark:bg-slate-900 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"></div>
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = (i + 8) % 24;
                return (
                  <div key={hour} className="flex-1 text-center text-[8px] font-black text-slate-400 uppercase">
                    {hour}h
                  </div>
                );
              })}
            </div>

            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, dIdx) => (
              <div key={day} className="flex items-stretch mb-1">
                <div className="w-16 shrink-0 text-[10px] font-black text-slate-500 uppercase sticky left-0 bg-white dark:bg-slate-900 z-20 pr-4 flex items-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                  {day}
                </div>
                <div className="flex-1 flex gap-1 py-1">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hIdx = (i + 8) % 24;
                    const value = reportData.heatMapData[dIdx][hIdx];
                    const intensity = value > 0 ? Math.max(0.1, value / reportData.maxHeatValue) : 0;
                    return (
                      <div 
                        key={hIdx} 
                        className="flex-1 h-8 rounded-md transition-all group relative"
                        style={{ 
                          backgroundColor: value > 0 ? `rgba(16, 185, 129, ${intensity})` : 'rgba(241, 245, 249, 0.5)',
                          border: value > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent'
                        }}
                      >
                        {value > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                            {day}, {hIdx}h: {formatCurrency(value)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-end gap-4">
          <span className="text-[9px] font-black text-slate-400 uppercase">Menos</span>
          <div className="flex gap-1">
            {[0.1, 0.3, 0.6, 0.9].map(i => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(16, 185, 129, ${i})` }}></div>
            ))}
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase">Mais</span>
        </div>
      </motion.div>

      {/* Distribuição por Faturamento do Período */}
      <motion.div 
        variants={itemVariants}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8"
      >
        <div className="flex-1 w-full">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Distribuição do Período</h3>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight ml-4">Onde seu dinheiro foi parar no período selecionado</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             {[
               { name: `Combustível`, value: reportData.totalFuelSpent, color: '#f43f5e' },
               { name: `Alimentação`, value: reportData.totalFoodSpent, color: '#f59e0b' },
               { name: `Manutenção`, value: reportData.totalMaintenanceSpent, color: '#3b82f6' },
               { name: `Outros`, value: reportData.totalOthersSpent, color: '#64748b' },
               { name: `Lucro Líquido`, value: reportData.summary.totalNet, color: '#10b981' },
             ].map(item => (
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
                data={[
                  { name: `Combustível`, value: reportData.totalFuelSpent, color: '#f43f5e' },
                  { name: `Alimentação`, value: reportData.totalFoodSpent, color: '#f59e0b' },
                  { name: `Manutenção`, value: reportData.totalMaintenanceSpent, color: '#3b82f6' },
                  { name: `Outros`, value: reportData.totalOthersSpent, color: '#64748b' },
                  { name: `Lucro Líquido`, value: reportData.summary.totalNet, color: '#10b981' },
                ]} 
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
                {[
                  { color: '#f43f5e' },
                  { color: '#f59e0b' },
                  { color: '#3b82f6' },
                  { color: '#64748b' },
                  { color: '#10b981' },
                ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip 
                 contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px', backgroundColor: '#1e293b', color: '#fff' }}
                 itemStyle={{ fontWeight: '900', fontSize: '12px', color: '#fff' }}
                 formatter={(value: number) => formatCurrency(value)} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Período</span>
            <span className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.summary.totalGross).replace('R$', '')}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showStartDatePicker && (
          <CustomDatePicker 
            value={startDate} 
            onChange={setStartDate} 
            onClose={() => setShowStartDatePicker(false)} 
          />
        )}
        {showEndDatePicker && (
          <CustomDatePicker 
            value={endDate} 
            onChange={setEndDate} 
            onClose={() => setShowEndDatePicker(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Reports;
