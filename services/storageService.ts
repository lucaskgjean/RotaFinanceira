
import localforage from 'localforage';
import CryptoJS from 'crypto-js';
import { DailyEntry, TimeEntry, AppConfig } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, writeBatch, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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
  MIGRATED: 'rota_financeira_migrated_v3' // Incremented version for new encryption/isolation
};

// Funções de Criptografia
const encrypt = (data: any, key: string) => {
  if (!data) return null;
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  } catch (e) {
    console.error("Erro na criptografia:", e);
    return null;
  }
};

const decrypt = (ciphertext: string | null, key: string) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return null;
    return JSON.parse(decryptedStr);
  } catch (e) {
    console.error("Erro na descriptografia:", e);
    return null;
  }
};

// Função auxiliar para remover valores 'undefined' antes de salvar no Firestore
const sanitizeForFirestore = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const storageService = {
  /**
   * Migra dados do localStorage/IndexedDB antigo para o novo formato isolado e criptografado
   */
  async migrateFromLocalStorage(userId: string) {
    if (!userId) return;
    
    const isMigrated = await localforage.getItem(KEYS.MIGRATED + '_' + userId);
    if (isMigrated) return;

    console.log('Iniciando migração de dados isolados para o usuário:', userId);

    // Tenta pegar dados do formato antigo (não isolado)
    const oldEntries = await localforage.getItem<DailyEntry[]>('rota_financeira_data');
    const oldTimeEntries = await localforage.getItem<TimeEntry[]>('rota_financeira_time');
    const oldConfig = await localforage.getItem<AppConfig>('rota_financeira_config');

    // Se existirem dados antigos, salva no novo formato isolado para este usuário
    if (oldEntries) {
      await this.saveEntries(oldEntries, userId, false);
    }
    if (oldTimeEntries) {
      await this.saveTimeEntries(oldTimeEntries, userId, false);
    }
    if (oldConfig) {
      await this.saveConfig(oldConfig, userId, false);
    }

    // Marca como migrado para este usuário específico
    await localforage.setItem(KEYS.MIGRATED + '_' + userId, true);
    
    // Opcional: Limpar dados antigos globais para evitar vazamento futuro
    // Mas vamos manter por segurança por enquanto, ou limpar se tivermos certeza
    console.log('Migração isolada concluída!');
  },

  async getLocalEntries(userId: string): Promise<DailyEntry[]> {
    if (!userId) return [];
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    return decrypt(encrypted, userId) || [];
  },

  async getLocalTimeEntries(userId: string): Promise<TimeEntry[]> {
    if (!userId) return [];
    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    return decrypt(encrypted, userId) || [];
  },

  async getLocalConfig(userId: string): Promise<AppConfig | null> {
    if (!userId) return null;
    const key = `${KEYS.CONFIG}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    return decrypt(encrypted, userId);
  },

  async getEntries(userId: string): Promise<DailyEntry[]> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.entries) {
            await this.saveEntries(data.entries, userId, false); // Salva localmente (criptografado)
            return data.entries;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar entradas do Firestore:", e);
        }
      }
    }
    return await this.getLocalEntries(userId);
  },

  async saveEntries(entries: DailyEntry[], userId: string, syncToCloud: boolean = true) {
    if (!userId) return;
    
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = encrypt(entries, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    if (syncToCloud && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedEntries = sanitizeForFirestore(entries);
        await setDoc(docRef, { entries: sanitizedEntries }, { merge: true });

        // Sincronização com RotaBank (coleção raiz 'entries')
        // Filtra apenas as entradas de renda (ganhos)
        const incomeEntries = entries.filter(e => e.category === 'income');
        
        // Salva cada entrada de renda na coleção raiz 'entries'
        // Nota: Usamos o ID da entrada original para manter consistência
        for (const entry of incomeEntries) {
          const entryRef = doc(db, 'entries', entry.id);
          await setDoc(entryRef, {
            netAmount: entry.netAmount,
            uid: userId,
            date: entry.date
          }, { merge: true });
        }

        // Limpeza de entradas que não são mais de renda ou foram deletadas
        const q = query(collection(db, 'entries'), where('uid', '==', userId));
        const querySnapshot = await getDocs(q);
        const currentIncomeIds = incomeEntries.map(e => e.id);
        
        for (const docSnap of querySnapshot.docs) {
          if (!currentIncomeIds.includes(docSnap.id)) {
            await deleteDoc(docSnap.ref);
          }
        }
      } catch (e: any) {
        console.error("Erro ao salvar entradas no Firestore:", e);
      }
    }
  },

  async getTimeEntries(userId: string): Promise<TimeEntry[]> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.timeEntries) {
            await this.saveTimeEntries(data.timeEntries, userId, false);
            return data.timeEntries;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar pontos do Firestore:", e);
        }
      }
    }
    return await this.getLocalTimeEntries(userId);
  },

  async saveTimeEntries(timeEntries: TimeEntry[], userId: string, syncToCloud: boolean = true) {
    if (!userId) return;

    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = encrypt(timeEntries, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    if (syncToCloud && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedTimeEntries = sanitizeForFirestore(timeEntries);
        await setDoc(docRef, { timeEntries: sanitizedTimeEntries }, { merge: true });
      } catch (e: any) {
        console.error("Erro ao salvar pontos no Firestore:", e);
      }
    }
  },

  async getConfig(userId: string): Promise<AppConfig | null> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.config) {
            await this.saveConfig(data.config, userId, false);
            return data.config;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error("Erro ao buscar config do Firestore:", e);
        }
      }
    }
    return await this.getLocalConfig(userId);
  },

  async saveConfig(config: AppConfig, userId: string, syncToCloud: boolean = true) {
    if (!userId) return;

    const key = `${KEYS.CONFIG}_${userId}`;
    const encrypted = encrypt(config, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    if (syncToCloud && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedConfig = sanitizeForFirestore(config);
        await setDoc(docRef, { config: sanitizedConfig }, { merge: true });
      } catch (e: any) {
        console.error("Erro ao salvar config no Firestore:", e);
      }
    }
  },

  async resetData(userId: string) {
    if (!userId) return;
    
    await localforage.removeItem(`${KEYS.ENTRIES}_${userId}`);
    await localforage.removeItem(`${KEYS.TIME_ENTRIES}_${userId}`);
    
    if (db) {
      try {
        const docRef = doc(db, 'users', userId);
        await setDoc(docRef, { entries: [], timeEntries: [] }, { merge: true });
      } catch (e) {
        console.error("Erro ao resetar dados no Firestore:", e);
      }
    }
  },

  async deleteDataByPeriod(startDate: string, endDate: string, userId: string) {
    if (!userId) return { entries: [], timeEntries: [] };

    const entries = await this.getLocalEntries(userId);
    const timeEntries = await this.getLocalTimeEntries(userId);

    const filteredEntries = entries.filter(e => e.date < startDate || e.date > endDate);
    const filteredTimeEntries = timeEntries.filter(e => e.date < startDate || e.date > endDate);

    await this.saveEntries(filteredEntries, userId, true);
    await this.saveTimeEntries(filteredTimeEntries, userId, true);

    return { entries: filteredEntries, timeEntries: filteredTimeEntries };
  },

  async clearAll() {
    // Limpa tudo do localforage (incluindo dados de outros usuários se estiverem lá)
    await localforage.clear();
    // Limpa localStorage antigo
    localStorage.removeItem('rota_financeira_data');
    localStorage.removeItem('rota_financeira_time');
    localStorage.removeItem('rota_financeira_config');
    localStorage.removeItem('rota_financeira_migrated_v2');
  },

  /**
   * Escaneia a memória local em busca de qualquer dado que possa pertencer ao app,
   * mesmo que de outros usuários ou versões antigas.
   */
  async scanLocalMemory() {
    const results: { userId: string; type: string; data: any; encrypted: boolean }[] = [];
    const keys = await localforage.keys();
    
    for (const key of keys) {
      if (key.startsWith('rota_financeira_')) {
        const value = await localforage.getItem(key);
        if (!value) continue;

        // Tenta identificar o tipo e o userId
        let type = 'unknown';
        let userId = 'global';

        if (key.includes('data')) type = 'entries';
        else if (key.includes('time')) type = 'timeEntries';
        else if (key.includes('config')) type = 'config';
        else if (key.includes('migrated')) continue;

        const parts = key.split('_');
        if (parts.length > 3) {
          userId = parts[parts.length - 1];
        }

        // Tenta descriptografar se for string (provavelmente criptografado)
        if (typeof value === 'string') {
          // Tenta descriptografar com o userId extraído da chave
          const decrypted = decrypt(value, userId);
          if (decrypted) {
            results.push({ userId, type, data: decrypted, encrypted: true });
          } else {
            // Se falhar, adiciona como dado criptografado não recuperado
            results.push({ userId, type, data: value, encrypted: true });
          }
        } else {
          // Dado não criptografado (versão antiga)
          results.push({ userId, type, data: value, encrypted: false });
        }
      }
    }

    // Também checa o localStorage antigo
    const oldKeys = ['rota_financeira_data', 'rota_financeira_time', 'rota_financeira_config'];
    for (const key of oldKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const data = JSON.parse(val);
          results.push({ userId: 'localStorage', type: key.split('_').pop() || 'unknown', data, encrypted: false });
        } catch (e) {
          // Ignora se não for JSON válido
        }
      }
    }

    return results;
  }
};
