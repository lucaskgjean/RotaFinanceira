
import { DailyEntry, AppConfig, WeeklySummary } from '../types';

/**
 * Gerador de ID robusto com fallback para ambientes sem suporte a crypto.randomUUID
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback simples e eficiente
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Retorna a data atual no formato YYYY-MM-DD respeitando o fuso horário local
 */
export const getLocalDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Lógica de processamento de entrada diária:
 * Usa a configuração dinâmica enviada pelo App.
 */
export const calculateDailyEntry = (
  gross: number, 
  date: string, 
  time: string, 
  storeName: string,
  config: AppConfig,
  kmDriven?: number,
  fuelPrice?: number,
  paymentMethod?: 'money' | 'pix' | 'debito' | 'caderno'
): DailyEntry => {
  const fuel = gross * config.percFuel;
  const food = gross * config.percFood;
  const maintenance = gross * config.percMaintenance;
  const net = gross; // O líquido da entrada individual agora é o bruto, as reservas são apenas referência

  return {
    id: generateId(),
    date,
    time,
    storeName: storeName || 'Geral',
    grossAmount: gross,
    fuel,
    food,
    maintenance,
    others: 0,
    netAmount: net,
    kmDriven,
    fuelPrice,
    paymentMethod,
    isPaid: paymentMethod === 'money',
    category: 'income'
  };
};

/**
 * Cria um registro de gasto manual.
 */
export const calculateManualExpense = (
  amount: number,
  category: 'fuel' | 'food' | 'maintenance' | 'others',
  date: string,
  time: string,
  description: string,
  kmAtMaintenance?: number,
  paymentMethod?: 'money' | 'pix' | 'debito' | 'caderno',
  liters?: number
): DailyEntry => {
  return {
    id: generateId(),
    date,
    time,
    storeName: `[GASTO] ${description || 'Despesa Extra'}`,
    grossAmount: 0,
    fuel: category === 'fuel' ? amount : 0,
    food: category === 'food' ? amount : 0,
    maintenance: category === 'maintenance' ? amount : 0,
    others: category === 'others' ? amount : 0,
    netAmount: -amount,
    kmAtMaintenance,
    paymentMethod,
    isPaid: paymentMethod === 'money',
    category,
    liters: category === 'fuel' ? liters : undefined
  };
};

/**
 * Sumário Financeiro:
 * Calcula reservas vs gastos reais.
 */
export const getWeeklySummary = (entries: DailyEntry[]): WeeklySummary => {
  const incomeEntries = entries.filter(e => e.grossAmount > 0);
  const expenseEntries = entries.filter(e => e.grossAmount === 0);

  const totalGross = incomeEntries.reduce((acc, curr) => acc + curr.grossAmount, 0);
  
  // Reservas Acumuladas
  const reservedFuel = incomeEntries.reduce((acc, curr) => acc + curr.fuel, 0);
  const reservedFood = incomeEntries.reduce((acc, curr) => acc + curr.food, 0);
  const reservedMaintenance = incomeEntries.reduce((acc, curr) => acc + curr.maintenance, 0);
  const reservedOthers = incomeEntries.reduce((acc, curr) => acc + (curr.others || 0), 0);
  const totalFees = reservedFuel + reservedFood + reservedMaintenance + reservedOthers;

  // Gastos Reais
  const spentFuel = expenseEntries.reduce((acc, curr) => acc + curr.fuel, 0);
  const spentFood = expenseEntries.reduce((acc, curr) => acc + curr.food, 0);
  const spentMaintenance = expenseEntries.reduce((acc, curr) => acc + curr.maintenance, 0);
  const spentOthers = expenseEntries.reduce((acc, curr) => acc + (curr.others || 0), 0);
  const totalKm = entries.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  const totalLiters = expenseEntries.reduce((acc, curr) => acc + (curr.liters || 0), 0);

  const totalSpent = spentFuel + spentFood + spentMaintenance + spentOthers;
  const totalNet = totalGross - totalSpent;

  return {
    totalGross,
    totalNet,
    totalFuel: reservedFuel,
    totalFood: reservedFood,
    totalMaintenance: reservedMaintenance,
    totalOthers: reservedOthers,
    totalSpentFuel: spentFuel,
    totalSpentFood: spentFood,
    totalSpentMaintenance: spentMaintenance,
    totalSpentOthers: spentOthers,
    totalFees: totalSpent,
    totalKm,
    totalLiters
  };
};

export const getWeeklyGroupedSummaries = (entries: DailyEntry[]) => {
  const groups: { [key: string]: DailyEntry[] } = {};

  entries.forEach(entry => {
    const date = new Date(entry.date + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(date.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const key = startOfWeek.toISOString().split('T')[0];

    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  return Object.keys(groups).map(key => {
    const weekEntries = groups[key];
    const summary = getWeeklySummary(weekEntries);
    const firstDate = new Date(key + 'T12:00:00');
    const lastDate = new Date(firstDate);
    lastDate.setDate(firstDate.getDate() + 6);

    return {
      gross: summary.totalGross,
      net: summary.totalNet,
      spentFuel: summary.totalSpentFuel,
      spentFood: summary.totalSpentFood,
      spentMaintenance: summary.totalSpentMaintenance,
      spentOthers: summary.totalSpentOthers,
      entries: weekEntries.length,
      startDate: firstDate,
      endDate: lastDate
    };
  }).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
};

export const getDailyStats = (entries: DailyEntry[], config: AppConfig) => {
  const groups: { [key: string]: DailyEntry[] } = {};
  
  entries.forEach(entry => {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  });

  return Object.keys(groups).map(date => {
    const dayEntries = groups[date];
    const summary = getWeeklySummary(dayEntries);
    return {
      gross: summary.totalGross,
      net: summary.totalNet,
      date: date,
      goalMet: summary.totalGross >= config.dailyGoal
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const calculateFuelMetrics = (entries: DailyEntry[]) => {
  const totalKm = entries.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  const incomeEntries = entries.filter(e => e.grossAmount > 0);
  const expenseEntries = entries.filter(e => e.grossAmount === 0 && e.category === 'fuel');
  const totalFuelReserved = incomeEntries.reduce((acc, curr) => acc + curr.fuel, 0);
  const totalFuelSpent = expenseEntries.reduce((acc, curr) => acc + curr.fuel, 0);
  const totalLiters = expenseEntries.reduce((acc, curr) => acc + (curr.liters || 0), 0);
  const totalDeliveries = incomeEntries.length;

  return {
    costPerKm: totalKm > 0 ? totalFuelSpent / totalKm : 0,
    costPerDelivery: totalDeliveries > 0 ? totalFuelSpent / totalDeliveries : 0,
    kmPerLiter: totalLiters > 0 ? totalKm / totalLiters : 0,
    avgPricePerLiter: totalLiters > 0 ? totalFuelSpent / totalLiters : 0,
    totalLiters
  };
};

/**
 * Gera um arquivo CSV com todos os lançamentos
 */
export const entriesToCSV = (entries: DailyEntry[]): string => {
  const headers = ['Data', 'Hora', 'Estabelecimento', 'Valor Bruto', 'Reserva Combustível', 'Reserva Alimentação', 'Reserva Manutenção', 'Outros', 'Valor Líquido', 'KM Rodado', 'Preço Gasolina'];
  const rows = entries.map(e => [
    e.date,
    e.time,
    e.storeName,
    e.grossAmount.toFixed(2),
    e.fuel.toFixed(2),
    e.food.toFixed(2),
    e.maintenance.toFixed(2),
    (e.others || 0).toFixed(2),
    e.netAmount.toFixed(2),
    (e.kmDriven || 0).toString(),
    (e.fuelPrice || 0).toString()
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

/**
 * Calcula a duração em minutos entre dois horários HH:mm
 */
export const calculateDuration = (start: string, end: string, breakMinutes: number = 0): number => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Lida com virada de dia
  
  return Math.max(0, totalMinutes - breakMinutes);
};

/**
 * Formata minutos em string Xh Ym
 */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};
