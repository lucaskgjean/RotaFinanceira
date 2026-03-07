
import localforage from 'localforage';
import { DailyEntry, TimeEntry, AppConfig } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Configuração do localforage
localforage.config({
  name: 'RotaFinanceira',
  storeName: 'app_data',
  description: 'Armazenamento persistente para o RotaFinanceira'
});

const KEYS = {
  ENTRIES: 'rota_financeira_data',
  TIME_ENTRIES: 'rota_financeira_time',
  CONFIG: 'rota_financeira_config',
  MIGRATED: 'rota_financeira_migrated_v2'
};

// Função auxiliar para remover valores 'undefined' antes de salvar no Firestore
const sanitizeForFirestore = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const storageService = {
  /**
   * Migra dados do localStorage para o IndexedDB se necessário
   */
  async migrateFromLocalStorage() {
    const isMigrated = await localforage.getItem(KEYS.MIGRATED);
    if (isMigrated) return;

    console.log('Iniciando migração de dados do localStorage para IndexedDB...');

    const savedEntries = localStorage.getItem(KEYS.ENTRIES);
    const savedTimeEntries = localStorage.getItem(KEYS.TIME_ENTRIES);
    const savedConfig = localStorage.getItem(KEYS.CONFIG);

    if (savedEntries) {
      await localforage.setItem(KEYS.ENTRIES, JSON.parse(savedEntries));
    }
    if (savedTimeEntries) {
      await localforage.setItem(KEYS.TIME_ENTRIES, JSON.parse(savedTimeEntries));
    }
    if (savedConfig) {
      await localforage.setItem(KEYS.CONFIG, JSON.parse(savedConfig));
    }

    await localforage.setItem(KEYS.MIGRATED, true);
    console.log('Migração concluída com sucesso!');
  },

  async getLocalEntries(): Promise<DailyEntry[]> {
    const data = await localforage.getItem<DailyEntry[]>(KEYS.ENTRIES);
    return data || [];
  },

  async getLocalTimeEntries(): Promise<TimeEntry[]> {
    const data = await localforage.getItem<TimeEntry[]>(KEYS.TIME_ENTRIES);
    return data || [];
  },

  async getLocalConfig(): Promise<AppConfig | null> {
    return await localforage.getItem<AppConfig>(KEYS.CONFIG);
  },

  async getEntries(userId?: string): Promise<DailyEntry[]> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.entries) {
            await localforage.setItem(KEYS.ENTRIES, data.entries);
            return data.entries;
          }
        }
      } catch (e: any) {
        // Silenciar erro se for apenas falta de conexão, pois temos o fallback local
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar entradas do Firestore:", e);
        }
      }
    }
    const data = await localforage.getItem<DailyEntry[]>(KEYS.ENTRIES);
    return data || [];
  },

  async saveEntries(entries: DailyEntry[], userId?: string, isPro?: boolean) {
    console.log(`Salvando ${entries.length} entradas no IndexedDB...`);
    await localforage.setItem(KEYS.ENTRIES, entries);
    if (userId && db && isPro) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedEntries = sanitizeForFirestore(entries);
        await setDoc(docRef, { entries: sanitizedEntries }, { merge: true });
      } catch (e: any) {
        console.error("Erro ao salvar entradas no Firestore:", e);
        if (e.code === 'permission-denied') {
          console.warn("Acesso negado ao Firestore. Verifique as regras de segurança.");
        }
      }
    }
  },

  async getTimeEntries(userId?: string): Promise<TimeEntry[]> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.timeEntries) {
            await localforage.setItem(KEYS.TIME_ENTRIES, data.timeEntries);
            return data.timeEntries;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar pontos do Firestore:", e);
        }
      }
    }
    const data = await localforage.getItem<TimeEntry[]>(KEYS.TIME_ENTRIES);
    return data || [];
  },

  async saveTimeEntries(timeEntries: TimeEntry[], userId?: string, isPro?: boolean) {
    console.log(`Salvando ${timeEntries.length} pontos no IndexedDB...`);
    await localforage.setItem(KEYS.TIME_ENTRIES, timeEntries);
    if (userId && db && isPro) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedTimeEntries = sanitizeForFirestore(timeEntries);
        await setDoc(docRef, { timeEntries: sanitizedTimeEntries }, { merge: true });
      } catch (e: any) {
        console.error("Erro ao salvar pontos no Firestore:", e);
        if (e.code === 'permission-denied') {
          console.warn("Acesso negado ao Firestore. Verifique as regras de segurança.");
        }
      }
    }
  },

  async getConfig(userId?: string): Promise<AppConfig | null> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.config) {
            await localforage.setItem(KEYS.CONFIG, data.config);
            return data.config;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar config do Firestore:", e);
        }
      }
    }
    return await localforage.getItem<AppConfig>(KEYS.CONFIG);
  },

  async saveConfig(config: AppConfig, userId?: string, isPro?: boolean) {
    await localforage.setItem(KEYS.CONFIG, config);
    // Sincroniza config sempre que houver userId, para persistir o status de assinatura
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedConfig = sanitizeForFirestore(config);
        await setDoc(docRef, { config: sanitizedConfig }, { merge: true });
      } catch (e: any) {
        console.error("Erro ao salvar config no Firestore:", e);
        if (e.code === 'permission-denied') {
          console.warn("Acesso negado ao Firestore. Verifique as regras de segurança.");
        }
      }
    }
  },

  async resetData(userId?: string) {
    await localforage.setItem(KEYS.ENTRIES, []);
    await localforage.setItem(KEYS.TIME_ENTRIES, []);
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        await setDoc(docRef, { entries: [], timeEntries: [] }, { merge: true });
      } catch (e) {
        console.error("Erro ao resetar dados no Firestore:", e);
      }
    }
  },

  async deleteDataByPeriod(startDate: string, endDate: string, userId?: string) {
    const entries = await this.getLocalEntries();
    const timeEntries = await this.getLocalTimeEntries();

    const filteredEntries = entries.filter(e => e.date < startDate || e.date > endDate);
    const filteredTimeEntries = timeEntries.filter(e => e.date < startDate || e.date > endDate);

    await localforage.setItem(KEYS.ENTRIES, filteredEntries);
    await localforage.setItem(KEYS.TIME_ENTRIES, filteredTimeEntries);

    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        await setDoc(docRef, { 
          entries: sanitizeForFirestore(filteredEntries), 
          timeEntries: sanitizeForFirestore(filteredTimeEntries) 
        }, { merge: true });
      } catch (e) {
        console.error("Erro ao deletar dados por período no Firestore:", e);
      }
    }
    return { entries: filteredEntries, timeEntries: filteredTimeEntries };
  },

  async clearAll() {
    await localforage.clear();
    localStorage.removeItem(KEYS.ENTRIES);
    localStorage.removeItem(KEYS.TIME_ENTRIES);
    localStorage.removeItem(KEYS.CONFIG);
  }
};
