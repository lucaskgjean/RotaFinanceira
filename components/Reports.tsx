
import React, { useState, useMemo, useEffect } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, calculateDuration, formatDuration, getLocalDateStr, calculateFuelMetrics } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDateRangePicker from './CustomDateRangePicker';
import CustomDialog from './CustomDialog';
import CustomSelect from './CustomSelect';
import { 
  BarChart, 
  Bar, 
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
  selectedStore: string;
  onStoreChange: (store: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ entries, timeEntries, config, onAddEntry, onOpenSubscription, selectedStore, onStoreChange }) => {
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
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
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
  const [showRangePicker, setShowRangePicker] = useState(false);
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

    const allUniqueStores = Array.from(new Set(entries.filter(e => e.grossAmount > 0).map(e => e.storeName))).sort();
    const periodUniqueStores = Array.from(new Set(incomeEntries.map(e => e.storeName))).sort();
    
    const storeDeliveries = selectedStore === 'all' 
      ? [] 
      : incomeEntries.filter(e => e.storeName === selectedStore);

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
    const earningsPerKm = summary.workKm && summary.workKm > 0 ? summary.totalGross / summary.workKm : 0;
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

    // Dias trabalhados (dias com pelo menos um lançamento de ganho ou tempo)
    const daysWithEarnings = new Set(incomeEntries.map(e => e.date));
    const daysWithTime = new Set(filteredTime.map(t => t.date));
    const daysWorked = new Set([...daysWithEarnings, ...daysWithTime]).size;

    // Metas alcançadas
    const dailyGoal = config.dailyGoal || 0;
    const goalsReached = Object.values(dailyEarningsMap).filter(amount => amount >= dailyGoal).length;

    const profitPercentage = summary.totalGross > 0 ? (summary.totalNet / summary.totalGross) * 100 : 0;
    const expensePercentage = summary.totalGross > 0 ? (totalExpenses / summary.totalGross) * 100 : 0;

    // Faturamento por Método de Pagamento
    const paymentMethodsMap: Record<string, number> = {
      'money': 0,
      'pix': 0,
      'debito': 0,
      'caderno': 0
    };

    incomeEntries.forEach(e => {
      const method = e.paymentMethod || 'pix';
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + e.grossAmount;
    });

    const paymentMethodData = [
      { name: config.paymentMethodLabels?.money || 'Dinheiro', value: paymentMethodsMap['money'], color: '#10b981' },
      { name: config.paymentMethodLabels?.pix || 'PIX', value: paymentMethodsMap['pix'], color: '#06b6d4' },
      { name: config.paymentMethodLabels?.debito || 'Débito', value: paymentMethodsMap['debito'], color: '#3b82f6' },
      { name: config.paymentMethodLabels?.caderno || 'Caderno', value: paymentMethodsMap['caderno'], color: '#f59e0b' },
    ].filter(item => item.value > 0);

    // Gastos por Método de Pagamento
    const expenseMethodsMap: Record<string, number> = {
      'money': 0,
      'pix': 0,
      'debito': 0,
      'caderno': 0
    };

    expenseEntries.forEach(e => {
      const method = e.paymentMethod || 'money';
      const totalEntryExpense = e.fuel + e.food + e.maintenance + (e.others || 0);
      expenseMethodsMap[method] = (expenseMethodsMap[method] || 0) + totalEntryExpense;
    });

    const expenseMethodData = [
      { name: config.paymentMethodLabels?.money || 'Dinheiro', value: expenseMethodsMap['money'], color: '#ef4444' },
      { name: config.paymentMethodLabels?.pix || 'PIX', value: expenseMethodsMap['pix'], color: '#f97316' },
      { name: config.paymentMethodLabels?.debito || 'Débito', value: expenseMethodsMap['debito'], color: '#3b82f6' },
      { name: config.paymentMethodLabels?.caderno || 'Caderno', value: expenseMethodsMap['caderno'], color: '#7c3aed' },
    ].filter(item => item.value > 0);

    const avgGrossPerDay = daysWorked > 0 ? summary.totalGross / daysWorked : 0;
    const avgGrossPerDelivery = quickLaunchesCount > 0 ? summary.totalGross / quickLaunchesCount : 0;
    const avgGrossPerKm = summary.totalKm && summary.totalKm > 0 ? summary.totalGross / summary.totalKm : 0;

    const avgExpensePerDay = daysWorked > 0 ? totalExpenses / daysWorked : 0;
    const avgExpensePerDelivery = quickLaunchesCount > 0 ? totalExpenses / quickLaunchesCount : 0;
    const avgExpensePerHour = totalHoursDecimal > 0 ? totalExpenses / totalHoursDecimal : 0;
    const avgExpensePerKm = summary.totalKm && summary.totalKm > 0 ? totalExpenses / summary.totalKm : 0;

    const avgKmPerDay = daysWorked > 0 ? summary.totalKm / daysWorked : 0;
    const avgKmPerHour = totalHoursDecimal > 0 ? summary.totalKm / totalHoursDecimal : 0;
    const avgKmPerDelivery = quickLaunchesCount > 0 ? summary.totalKm / quickLaunchesCount : 0;
    const avgLitersPerKm = summary.totalKm && summary.totalKm > 0 ? totalFuelLiters / summary.totalKm : 0;

    const avgHoursPerDay = daysWorked > 0 ? totalHoursDecimal / daysWorked : 0;
    const avgHoursPerDelivery = quickLaunchesCount > 0 ? totalHoursDecimal / quickLaunchesCount : 0;
    const avgHoursPerKm = summary.totalKm && summary.totalKm > 0 ? totalHoursDecimal / summary.totalKm : 0;

    // 1. Ranking de Categorias (Lojas/Apps)
    const storeRanking = Object.entries(
      incomeEntries.reduce((acc, curr) => {
        acc[curr.storeName] = (acc[curr.storeName] || 0) + curr.grossAmount;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 2. Score de Eficiência (0-100)
    const efficiencyScore = (() => {
      if (summary.totalGross === 0) return 0;
      const marginWeight = Math.min((summary.totalNet / summary.totalGross) * 100, 100) * 0.4;
      const hourlyWeight = Math.min((avgGrossPerHour / 25) * 100, 100) * 0.3;
      const kmWeight = Math.min((earningsPerKm / 2.5) * 100, 100) * 0.3;
      return Math.round(marginWeight + hourlyWeight + kmWeight);
    })();

    // 3. Comparativo de Performance
    const diffDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevStartDate = new Date(new Date(startDate).getTime() - (diffDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const prevEndDate = new Date(new Date(startDate).getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const prevEntries = entries.filter(e => e.date >= prevStartDate && e.date <= prevEndDate);
    const prevGross = prevEntries.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const performanceDiff = prevGross > 0 ? ((summary.totalGross - prevGross) / prevGross) * 100 : 0;

    // 4. Meta do Mês
    const monthlyGoal = config.dailyGoal * 22; 
    const monthlyProgress = Math.min((summary.totalGross / monthlyGoal) * 100, 100);

    // 5. Projeção de Reservas (Baseada no faturamento do período e porcentagens do usuário)
    const projectedFuel = summary.totalGross * config.percFuel;
    const projectedFood = summary.totalGross * config.percFood;
    const projectedMaintenance = summary.totalGross * config.percMaintenance;
    const projectedOthers = summary.totalGross * (config.percOthers || 0);
    const projectedTotal = projectedFuel + projectedFood + projectedMaintenance + projectedOthers;

    const totalReceived = summary.totalGross - paymentMethodsMap['caderno'];
    const totalPending = paymentMethodsMap['caderno'];

    return {
      summary,
      quickLaunchesCount,
      totalHours: totalSeconds,
      totalExpenses,
      totalReceived,
      totalPending,
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
      avgGrossPerDay,
      avgGrossPerDelivery,
      avgGrossPerKm,
      avgExpensePerDay,
      avgExpensePerDelivery,
      avgExpensePerHour,
      avgExpensePerKm,
      avgKmPerDay,
      avgKmPerHour,
      avgKmPerDelivery,
      avgLitersPerKm,
      avgHoursPerDay,
      avgHoursPerDelivery,
      avgHoursPerKm,
      maintenanceEntries,
      totalFuelSpent,
      totalFoodSpent,
      totalMaintenanceSpent,
      totalOthersSpent,
      filteredEntries,
      uniqueStores: allUniqueStores,
      periodUniqueStoresCount: periodUniqueStores.length,
      storeDeliveries,
      expenseTotalsByCategory,
      fuelMetrics,
      totalOdometer,
      heatMapData,
      maxHeatValue,
      daysWorked,
      goalsReached,
      profitPercentage,
      expensePercentage,
      paymentMethodData,
      expenseMethodData,
      storeRanking,
      efficiencyScore,
      performanceDiff,
      monthlyGoal,
      monthlyProgress,
      projectedFuel,
      projectedFood,
      projectedMaintenance,
      projectedOthers,
      projectedTotal
    };
  }, [entries, timeEntries, startDate, endDate, selectedStore, currentTime, config.dailyGoal]);

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
    const headers = ['Data', 'Hora', 'Loja/Descrição', 'Bruto', 'Combustível', 'Alimentação', 'Manutenção', 'Outros', 'Líquido', 'KM Rodados', 'Tipo KM', 'Pagamento'];
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
      e.kmDriven || 0,
      e.kmType || 'work',
      e.paymentMethod || ''
    ]);

    const formatCSVValue = (val: any) => {
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(formatCSVValue).join(','))
    ];

    // Adicionar Resumo ao CSV
    csvRows.push('');
    csvRows.push('RESUMO DO PERÍODO');
    csvRows.push(`Total Bruto,${reportData.summary.totalGross.toFixed(2)}`);
    csvRows.push(`Total Despesas,${reportData.totalExpenses.toFixed(2)}`);
    csvRows.push(`Lucro Líquido,${(reportData.summary.totalGross - reportData.totalExpenses).toFixed(2)}`);
    csvRows.push(`KM Total,${reportData.totalKm.toFixed(1)}`);
    csvRows.push(`Ganhos por Hora,${reportData.avgGrossPerHour.toFixed(2)}`);
    csvRows.push(`Gasto por KM,${reportData.expensePerKm.toFixed(2)}`);
    csvRows.push(`Ganhos por KM,${reportData.earningsPerKm.toFixed(2)}`);

    const csvContent = csvRows.join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
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
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Filter size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Análise de Período</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight">Selecione o intervalo para o relatório</p>
              </div>
            </div>
            <button 
              onClick={exportToCSV}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg relative overflow-hidden ${
                config.profile?.isPro 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-black dark:hover:bg-indigo-700 shadow-slate-200 dark:shadow-none' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {!config.profile?.isPro && (
                <Lock size={12} className="text-slate-400" />
              )}
              <Download size={14} /> Exportar CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Período</label>
              
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { label: 'Hoje', start: today, end: today },
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

                  const isSelected = pStart === startDate && pEnd === endDate;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setStartDate(pStart!);
                        setEndDate(pEnd!);
                      }}
                      className={`whitespace-nowrap px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
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
                className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 transition outline-none font-bold text-slate-700 dark:text-slate-200 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-300 dark:text-slate-600" size={18} />
                  <span>{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
                <div className="flex items-center gap-3">
                  <span>{new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </button>
            </div>
            <div className="relative">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Filtrar por Loja</label>
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
                onChange={onStoreChange}
                isOpen={showStoreSelect}
                onOpen={() => setShowStoreSelect(true)}
                onClose={() => setShowStoreSelect(false)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Relatório por Loja Selecionada */}
      <AnimatePresence mode="wait">
        {selectedStore !== 'all' ? (
          <motion.div 
            key="store-report"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Store size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Entregas: {selectedStore}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Faturado</span>
                  <span className="text-lg font-black text-emerald-500 font-mono-num">
                    {formatCurrency(reportData.storeDeliveries.reduce((acc, curr) => acc + curr.grossAmount, 0))}
                  </span>
                </div>
              </div>

              {/* Lista de Entregas Detalhada */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registros do Período</h4>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                    {reportData.storeDeliveries.length} entregas
                  </span>
                </div>

                {reportData.storeDeliveries.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)).map((delivery) => (
                  <div key={delivery.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                        <Package size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-800 dark:text-white block leading-tight">
                          {new Date(delivery.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                          {delivery.time} • {delivery.kmDriven || 0} km
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-500 font-mono-num">{formatCurrency(delivery.grossAmount)}</span>
                      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{delivery.paymentMethod || 'PIX'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="all-stores-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-indigo-50/50 dark:bg-indigo-500/5 p-6 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-500/10 mb-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Visão Geral Ativada</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mostrando dados consolidados de todos os parceiros e aplicativos.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gráfico de Ganhos */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
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

      {/* Meta do Mês */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Meta do Mês</h3>
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Progresso Mensal</span>
              <span className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.summary.totalGross)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Objetivo</span>
              <span className="text-sm font-black text-slate-500 dark:text-slate-400 font-mono-num">{formatCurrency(reportData.monthlyGoal)}</span>
            </div>
          </div>
          <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${reportData.monthlyProgress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              {reportData.monthlyProgress.toFixed(1)}% Concluído
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Faltam {formatCurrency(Math.max(0, reportData.monthlyGoal - reportData.summary.totalGross))}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Resumo Geral do Período */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Bruto Total */}
        <motion.div variants={itemVariants} className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block mb-1">Faturamento Bruto</span>
            <div className="text-3xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.summary.totalGross)}</div>
          </div>
          <TrendingUp size={120} className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 transition-transform" />
        </motion.div>

        {/* Líquido Total */}
        <motion.div variants={itemVariants} className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block mb-1">Lucro Líquido Real</span>
            <div className="text-3xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.summary.totalNet)}</div>
          </div>
          <Wallet size={120} className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 transition-transform" />
        </motion.div>

        {/* Gastos Totais */}
        <motion.div variants={itemVariants} className="bg-rose-600 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <ArrowDownRight size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block mb-1">Total de Despesas</span>
            <div className="text-3xl font-black font-mono-num tracking-tighter">{formatCurrency(reportData.totalExpenses)}</div>
          </div>
          <ArrowDownRight size={120} className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 transition-transform" />
        </motion.div>

        {/* Recebido e Pendente */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                <CreditCard size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status de Pagamento</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Recebido</span>
                <div className="text-xl font-black font-mono-num text-emerald-600 dark:text-emerald-400">{formatCurrency(reportData.totalReceived)}</div>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Pendente</span>
                <div className="text-xl font-black font-mono-num text-rose-600 dark:text-rose-400">{formatCurrency(reportData.totalPending)}</div>
              </div>
            </div>
          </div>
          <CreditCard size={100} className="absolute -right-6 -bottom-6 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110" />
        </motion.div>

        {/* Porcentagens */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Margem de Lucro</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{reportData.profitPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min(reportData.profitPercentage, 100)}%` }}></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Peso Gastos</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">{reportData.expensePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-rose-600 dark:bg-rose-400 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)]" style={{ width: `${Math.min(reportData.expensePercentage, 100)}%` }}></div>
          </div>
        </motion.div>
      </div>

      {/* Grid Secundário de Métricas - Movido para cima para melhor organização */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Horas */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tempo Total</span>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatDuration(reportData.totalHours)}</p>
          </div>
        </motion.div>

        {/* Quilometragem */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Quilometragem</span>
          <div className="flex items-center gap-2">
            <Navigation size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalKm.toFixed(1)} <small className="text-[10px] opacity-40">km</small></p>
          </div>
        </motion.div>

        {/* Entregas */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Entregas</span>
          <div className="flex items-center gap-2">
            <Package size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.quickLaunchesCount}</p>
          </div>
        </motion.div>

        {/* Total de Lojas */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total de Lojas</span>
          <div className="flex items-center gap-2">
            <Store size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.periodUniqueStoresCount}</p>
          </div>
        </motion.div>

        {/* Dias Trabalhados */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dias Trabalhados</span>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.daysWorked}</p>
          </div>
        </motion.div>

        {/* Metas Alcançadas */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Metas Alcançadas</span>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.goalsReached}</p>
          </div>
        </motion.div>

        {/* Litros */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Combustível</span>
          <div className="flex items-center gap-2">
            <Fuel size={16} className="text-rose-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalFuelLiters.toFixed(1)} <small className="text-[10px] opacity-40">L</small></p>
          </div>
        </motion.div>

        {/* Odômetro Total */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Odômetro Total</span>
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-indigo-500" />
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.totalOdometer.toLocaleString('pt-BR')} <small className="text-[10px] opacity-40">km</small></p>
          </div>
        </motion.div>
      </div>


      {/* Resumos de Ganhos Médios */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Resumo de Ganhos Médios</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Calendar size={12} className="text-amber-500" /> Ganhos por Dia
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgGrossPerDay)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Clock size={12} className="text-amber-500" /> Ganhos por Hora
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgGrossPerHour)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Package size={12} className="text-amber-500" /> Ganhos por Entrega
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgGrossPerDelivery)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Navigation size={12} className="text-amber-500" /> Ganhos por KM
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgGrossPerKm)}</p>
          </div>
        </div>
      </motion.div>

      {/* Resumos de Gastos Médios */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Resumo de Gastos Médios</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Calendar size={12} className="text-rose-500" /> Gasto por Dia
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgExpensePerDay)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Clock size={12} className="text-rose-500" /> Gasto por Hora
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgExpensePerHour)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Package size={12} className="text-rose-500" /> Gasto por Entrega
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgExpensePerDelivery)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Navigation size={12} className="text-rose-500" /> Gasto por KM
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.avgExpensePerKm)}</p>
          </div>
        </div>
      </motion.div>

      {/* Resumo de Quilometragem */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Resumo de Quilometragem</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Calendar size={12} className="text-blue-500" /> KM por Dia
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.avgKmPerDay.toFixed(1)} <small className="text-xs opacity-40">km</small></p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Clock size={12} className="text-blue-500" /> KM por Hora
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.avgKmPerHour.toFixed(1)} <small className="text-xs opacity-40">km</small></p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Package size={12} className="text-blue-500" /> KM por Entrega
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.avgKmPerDelivery.toFixed(1)} <small className="text-xs opacity-40">km</small></p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Fuel size={12} className="text-blue-500" /> KM por Litro
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{reportData.avgKmPerLiter.toFixed(2)} <small className="text-xs opacity-40">km/L</small></p>
          </div>
        </div>
      </motion.div>

      {/* Resumo de Horas */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Resumo de Horas</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Calendar size={12} className="text-emerald-500" /> Horas por Dia
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatDuration(Math.round(reportData.avgHoursPerDay * 3600))}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Package size={12} className="text-emerald-500" /> Horas por Entrega
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatDuration(Math.round(reportData.avgHoursPerDelivery * 3600))}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <Navigation size={12} className="text-emerald-500" /> Horas por KM
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white font-mono-num">{formatDuration(Math.round(reportData.avgHoursPerKm * 3600))}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
              <TrendingUp size={12} className="text-emerald-500" /> Real por Hora
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(reportData.avgGrossPerHour)}</p>
          </div>
        </div>
      </motion.div>

      {/* Faturamento por Método de Pagamento */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Faturamento por Método</h3>
          </div>
          <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Recebimentos</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportData.paymentMethodData.length > 0 ? (
            reportData.paymentMethodData.map((item, idx) => (
              <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  {(item.name === (config.paymentMethodLabels?.money || 'Dinheiro')) && <Wallet size={20} />}
                  {(item.name === (config.paymentMethodLabels?.pix || 'PIX')) && <ArrowUpRight size={20} />}
                  {(item.name === (config.paymentMethodLabels?.debito || 'Débito')) && <CreditCard size={20} />}
                  {(item.name === (config.paymentMethodLabels?.caderno || 'Caderno')) && <MoreHorizontal size={20} />}
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mb-0.5">{item.name}</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-white font-mono-num leading-none">{formatCurrency(item.value)}</span>
                  <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / reportData.summary.totalGross) * 100}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Nenhum faturamento registrado no período</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Ranking de Categorias (Lojas) */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Ranking de Categorias</h3>
        </div>
        <div className="space-y-4">
          {reportData.storeRanking.length > 0 ? (
            reportData.storeRanking.map((store, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                    {idx + 1}º
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{store.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(store.value)}</span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase">Sem dados suficientes</div>
          )}
        </div>
      </motion.div>



      {/* Métricas de Performance e Operação (Original, mantido para detalhes extras se necessário, ou podemos remover se estiver redundante) */}
      {/* Vou remover as seções antigas para evitar redundância e seguir o pedido de "organizar da melhor forma" */}






      {/* Gasto por Método de Pagamento */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Gasto por Método</h3>
          </div>
          <div className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 rounded-full">
            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Despesas</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportData.expenseMethodData.length > 0 ? (
            reportData.expenseMethodData.map((item, idx) => (
              <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  {(item.name === (config.paymentMethodLabels?.money || 'Dinheiro')) && <Wallet size={20} />}
                  {(item.name === (config.paymentMethodLabels?.pix || 'PIX')) && <ArrowUpRight size={20} />}
                  {(item.name === (config.paymentMethodLabels?.debito || 'Débito')) && <CreditCard size={20} />}
                  {(item.name === (config.paymentMethodLabels?.caderno || 'Caderno')) && <MoreHorizontal size={20} />}
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mb-0.5">{item.name}</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-white font-mono-num leading-none">{formatCurrency(item.value)}</span>
                  <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / reportData.totalExpenses) * 100}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Nenhum gasto registrado no período</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Detalhamento de Gastos Reais - Redesenhado */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Fluxo de Despesas Reais</h4>
          </div>
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-right">
            <span className="text-[9px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest block leading-none mb-1">Total do Período</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono-num leading-none">{formatCurrency(reportData.totalExpenses)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'Combustível', value: reportData.totalFuelSpent, icon: <Fuel size={18} />, colorClass: 'text-rose-500', bgClass: 'bg-rose-50 dark:bg-rose-500/10', barClass: 'bg-rose-500' },
            { label: 'Alimentação', value: reportData.totalFoodSpent, icon: <Utensils size={18} />, colorClass: 'text-amber-500', bgClass: 'bg-amber-50 dark:bg-amber-500/10', barClass: 'bg-amber-500' },
            { label: 'Manutenção', value: reportData.totalMaintenanceSpent, icon: <Wrench size={18} />, colorClass: 'text-blue-500', bgClass: 'bg-blue-50 dark:bg-blue-500/10', barClass: 'bg-blue-500' },
            { label: 'Outros Gastos', value: reportData.totalOthersSpent, icon: <MoreHorizontal size={18} />, colorClass: 'text-slate-500', bgClass: 'bg-slate-100 dark:bg-slate-700/50', barClass: 'bg-slate-500' },
          ].map((item, idx) => {
            const percentage = reportData.totalExpenses > 0 ? (item.value / reportData.totalExpenses) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-4 p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm group">
                <div className={`w-12 h-12 ${item.bgClass} ${item.colorClass} rounded-2xl flex items-center justify-center shadow-sm shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">{percentage.toFixed(1)}%</span>
                      <span className="text-base font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full ${item.barClass} rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
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
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Nenhuma manutenção registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reportData.maintenanceEntries.map(entry => (
              <div key={entry.id} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100/50 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
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
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="mb-8">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            Intensidade de Ganhos
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight mt-1">Quanto mais escuro, maior o faturamento no período</p>
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="min-w-[800px]">
            <div className="flex mb-2">
              <div className="w-16 shrink-0 sticky left-0 bg-white dark:bg-slate-900 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"></div>
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = (i + 8) % 24;
                return (
                  <div key={hour} className="flex-1 text-center text-[8px] font-bold text-slate-400 uppercase">
                    {hour}h
                  </div>
                );
              })}
            </div>

            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, dIdx) => (
              <div key={day} className="flex items-stretch mb-1">
                <div className="w-16 shrink-0 text-[10px] font-bold text-slate-500 uppercase sticky left-0 bg-white dark:bg-slate-900 z-20 pr-4 flex items-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
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
                          backgroundColor: value > 0 ? `rgba(79, 70, 229, ${0.1 + intensity * 0.9})` : 'rgba(241, 245, 249, 0.5)',
                          border: value > 0 ? '1px solid rgba(79, 70, 229, 0.1)' : '1px solid transparent'
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
          <span className="text-[9px] font-bold text-slate-400 uppercase">Menos</span>
          <div className="flex gap-1">
            {[0.1, 0.3, 0.6, 0.9].map(i => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(79, 70, 229, ${i})` }}></div>
            ))}
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase">Mais</span>
        </div>
      </motion.div>

      {/* Distribuição do Faturamento Simplificada */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Distribuição do Período</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Bruto</span>
            <span className="text-lg font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.summary.totalGross)}</span>
          </div>
        </div>

        {/* Barra de Distribuição Horizontal */}
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-8">
          {[
            { value: reportData.totalFuelSpent, color: '#f43f5e' },
            { value: reportData.totalFoodSpent, color: '#f59e0b' },
            { value: reportData.totalMaintenanceSpent, color: '#3b82f6' },
            { value: reportData.totalOthersSpent, color: '#64748b' },
            { value: reportData.summary.totalNet, color: '#10b981' },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ width: 0 }}
              animate={{ width: reportData.summary.totalGross > 0 ? `${(item.value / reportData.summary.totalGross) * 100}%` : '0%' }}
              transition={{ duration: 1, delay: index * 0.1 }}
              style={{ backgroundColor: item.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { name: `Combustível`, value: reportData.totalFuelSpent, color: '#f43f5e' },
            { name: `Alimentação`, value: reportData.totalFoodSpent, color: '#f59e0b' },
            { name: `Manutenção`, value: reportData.totalMaintenanceSpent, color: '#3b82f6' },
            { name: `Outros`, value: reportData.totalOthersSpent, color: '#64748b' },
            { name: `Lucro Líquido`, value: reportData.summary.totalNet, color: '#10b981' },
          ].map((item) => (
            <div key={item.name} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">{item.name}</span>
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono-num">
                {formatCurrency(item.value)}
              </span>
              <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                {reportData.summary.totalGross > 0 ? ((item.value / reportData.summary.totalGross) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* NOVAS MÉTRICAS SOLICITADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score de Eficiência & Comparativo de Performance */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Eficiência & Performance</h3>
            </div>
            <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${reportData.performanceDiff >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'}`}>
              {reportData.performanceDiff >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{reportData.performanceDiff >= 0 ? '+' : ''}{reportData.performanceDiff.toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={352}
                  initial={{ strokeDashoffset: 352 }}
                  animate={{ strokeDashoffset: 352 - (352 * reportData.efficiencyScore) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-emerald-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800 dark:text-white">{reportData.efficiencyScore}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Sua eficiência operacional é calculada com base no lucro líquido, ganho por hora e ganho por KM.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium italic leading-snug">
                  "{reportData.performanceDiff >= 0 ? 'Excelente! Você está performando melhor do que no período anterior. Mantenha o ritmo.' : 'Atenção: sua performance caiu em relação ao período anterior. Revise suas rotas e gastos.'}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Projeção de Reservas */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Reserva Ideal do Período</h3>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total a Reservar</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(reportData.projectedTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Base: Faturamento Bruto</span>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Cálculo por %</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Reserva Combustível', value: reportData.projectedFuel, color: 'bg-rose-500', perc: config.percFuel },
                { label: 'Reserva Alimentação', value: reportData.projectedFood, color: 'bg-amber-500', perc: config.percFood },
                { label: 'Reserva Manutenção', value: reportData.projectedMaintenance, color: 'bg-blue-500', perc: config.percMaintenance },
                { label: 'Outras Reservas', value: reportData.projectedOthers, color: 'bg-slate-500', perc: config.percOthers },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">{item.label} ({(item.perc * 100).toFixed(1)}%)</span>
                    <span className="text-slate-800 dark:text-white">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${reportData.projectedTotal > 0 ? (item.value / reportData.projectedTotal) * 100 : 0}%` }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic text-center mt-4">
              * Valores ideais que deveriam ter sido reservados com base no faturamento bruto do período selecionado e nas taxas configuradas.
            </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showRangePicker && (
          <CustomDateRangePicker 
            startDate={startDate} 
            endDate={endDate} 
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }} 
            onClose={() => setShowRangePicker(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Reports;
