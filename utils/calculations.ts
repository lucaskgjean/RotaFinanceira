
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
 * Cria um registro de fechamento de KM.
 */
export const calculateKmClosing = (
  totalKm: number,
  lastTotalKm: number,
  fuelPrice: number,
  date: string,
  time: string,
  kmType: 'work' | 'personal' = 'work'
): DailyEntry => {
  const kmDriven = (kmType === 'work' && lastTotalKm > 0) ? totalKm - lastTotalKm : 0;
  
  return {
    id: generateId(),
    date,
    time,
    storeName: 'Fechamento de KM',
    grossAmount: 0,
    fuel: 0,
    food: 0,
    maintenance: 0,
    others: 0,
    netAmount: 0,
    kmDriven: kmDriven,
    kmAtMaintenance: totalKm, 
    fuelPrice: fuelPrice,
    category: 'others',
    kmType
  };
};

/**
 * Sumário Financeiro:
 * Calcula reservas vs gastos reais.
 */
export const getWeeklySummary = (entries: DailyEntry[]): WeeklySummary => {
  const incomeEntries = entries.filter(e => e.grossAmount > 0);
  const expenseEntries = entries.filter(e => e.grossAmount === 0);
  
  // Filtra entradas que possuem registro de odômetro
  const kmEntries = entries
    .filter(e => (e.kmAtMaintenance || 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

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
  
  // Cálculo de KM Consistente:
  // Se houver registros de odômetro, o KM Total é a variação entre o primeiro e o último do período.
  // Caso contrário, usa a soma dos deltas (fallback).
  let totalKm = 0;
  if (kmEntries.length >= 2) {
    totalKm = (kmEntries[kmEntries.length - 1].kmAtMaintenance || 0) - (kmEntries[0].kmAtMaintenance || 0);
  } else {
    totalKm = entries.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  }

  const workKm = entries.filter(e => !e.kmType || e.kmType === 'work').reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  const personalKm = entries.filter(e => e.kmType === 'personal').reduce((acc, curr) => acc + (curr.kmDriven || 0), 0);
  
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
    workKm,
    personalKm,
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
 * Calcula a duração em segundos entre dois horários HH:mm ou HH:mm:ss
 */
export const calculateDuration = (start: string, end: string, breakMinutes: number = 0): number => {
  const [startH, startM, startS = 0] = start.split(':').map(Number);
  const [endH, endM, endS = 0] = end.split(':').map(Number);
  
  let totalSeconds = (endH * 3600 + endM * 60 + endS) - (startH * 3600 + startM * 60 + startS);
  if (totalSeconds < 0) totalSeconds += 24 * 3600; // Lida com virada de dia
  
  return Math.max(0, totalSeconds - (breakMinutes * 60));
};

/**
 * Formata segundos em string Xh Ym (sem segundos)
 * Se horas for 0, mostra apenas minutos.
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (h === 0) {
    return `${m}m`;
  }
  
  return `${h}h ${m}m`;
};
