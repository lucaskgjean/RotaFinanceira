
export interface DailyEntry {
  id: string;
  date: string;
  time: string;
  storeName: string;
  grossAmount: number;
  fuel: number;        
  food: number;        
  maintenance: number; 
  others: number;
  netAmount: number;   
  kmDriven?: number;
  fuelPrice?: number;
  liters?: number;
  kmAtMaintenance?: number; // KM no momento da manutenção
  kmType?: 'work' | 'personal'; // Tipo de KM (trabalho ou pessoal)
  paymentMethod?: 'money' | 'pix' | 'debito' | 'caderno';
  isPaid?: boolean;
  category?: 'income' | 'fuel' | 'food' | 'maintenance' | 'others';
}

export interface WeeklySummary {
  totalGross: number;
  totalNet: number;
  totalFuel: number;
  totalFood: number;
  totalMaintenance: number;
  totalOthers: number;
  totalSpentFuel: number;
  totalSpentFood: number;
  totalSpentMaintenance: number;
  totalSpentOthers: number;
  totalFees: number;
  totalKm?: number;
  workKm?: number;
  personalKm?: number;
  totalLiters?: number;
}

export interface MaintenanceAlert {
  id: string;
  description: string;
  kmInterval: number;
  lastKm: number;
}

export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  breakDuration?: number; // em minutos
  notes?: string;
}

export interface CustomNotification {
  id: string;
  title: string;
  message: string;
  time: string; // HH:mm
  days: number[]; // 0-6 (Sun-Sat)
  enabled: boolean;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  nickname?: string;
  phone?: string;
  photoURL?: string;
  isPro?: boolean;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'none';
  acceptedMarketing?: boolean;
  createdAt?: string;
}

export interface AppConfig {
  percFuel: number;
  percFood: number;
  percMaintenance: number;
  percOthers: number;
  dailyGoal: number; 
  lastFuelPrice?: number;
  lastTotalKm?: number;
  maintenanceAlerts?: MaintenanceAlert[];
  themeMode?: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
  customNotifications?: CustomNotification[];
  profile?: UserProfile;
  paymentMethodLabels?: {
    money: string;
    pix: string;
    caderno: string;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  percFuel: 0.14,      // 14%
  percFood: 0.08,      // 8%
  percMaintenance: 0.08, // 8%
  percOthers: 0.05,    // 5%
  dailyGoal: 250,       // Meta padrão de R$ 250
  lastFuelPrice: 5.50,   // Valor base sugerido
  lastTotalKm: 0,
  themeMode: 'auto',
  notificationsEnabled: false,
  customNotifications: [],
  paymentMethodLabels: {
    money: 'Dinheiro',
    pix: 'PIX',
    caderno: 'Caderno'
  },
  profile: {
    firstName: '',
    lastName: '',
    displayName: '',
    nickname: '',
    phone: '',
    photoURL: '',
    acceptedMarketing: false,
    createdAt: ''
  },
  maintenanceAlerts: [
    { id: '1', description: 'Troca de Óleo', kmInterval: 10000, lastKm: 0 },
    { id: '2', description: 'Pneus', kmInterval: 40000, lastKm: 0 },
    { id: '3', description: 'Freios', kmInterval: 20000, lastKm: 0 }
  ]
};

export const CONSTANTS = {
  REF_FUEL_DAILY: 35,
  REF_FOOD_DAILY: 20,
  REF_MAINTENANCE_DAILY: 20
};
