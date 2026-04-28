
import localforage from 'localforage';
import CryptoJS from 'crypto-js';
import { DailyEntry, TimeEntry, AppConfig } from '../types';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, collection, writeBatch, query, where, getDocs, deleteDoc, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  projectId: string | undefined;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    projectId: (auth?.app?.options as any)?.projectId,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  MIGRATED: 'rota_financeira_migrated_v3', // Incremented version for new encryption/isolation
  LAST_BACKUP: 'last_backup_timestamp'
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

// Cache para evitar sincronizações redundantes e melhorar performance - Isolado por usuário
let syncCache: {
  [userId: string]: {
    entries?: string;
    timeEntries?: string;
    config?: string;
  }
} = {};

let oldEntriesCleared: Set<string> = new Set(); // userId -> boolean

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[storageService] Conexão com Firestore testada com sucesso.");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("[storageService] Firestore Offline: Verifique sua conexão. ");
    } else {
      console.warn("[storageService] Falha silenciosa no teste de conexão (esperado em alguns ambientes):", error);
    }
  }
}
testConnection();

// Helper to get/set cache safely
const getSyncCache = (userId: string) => {
  if (!syncCache[userId]) syncCache[userId] = {};
  return syncCache[userId];
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
      await this.saveEntries(oldEntries, userId, oldConfig || undefined, false);
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
    console.log('Migração isolada concluída!');
  },

  async getLocalEntries(userId: string): Promise<DailyEntry[]> {
    if (!userId) return [];
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    const decrypted = decrypt(encrypted, userId);
    
    let entries: DailyEntry[] = [];
    if (decrypted) {
      if (Array.isArray(decrypted)) {
        entries = decrypted;
      } else if (decrypted.entries) {
        entries = decrypted.entries;
      }
    }
    
    // Inicializa o hash local para evitar sync imediato se os dados forem iguais
    if (entries.length > 0) {
      getSyncCache(userId).entries = CryptoJS.MD5(JSON.stringify(entries)).toString();
    }
    
    return entries;
  },

  async getLocalEntriesWithMetadata(userId: string): Promise<{ entries: DailyEntry[], updatedAt?: string }> {
    if (!userId) return { entries: [] };
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    const decrypted = decrypt(encrypted, userId);
    
    if (decrypted) {
      if (Array.isArray(decrypted)) {
        return { entries: decrypted };
      }
      return decrypted;
    }
    return { entries: [] };
  },

  async getLocalTimeEntries(userId: string): Promise<TimeEntry[]> {
    if (!userId) return [];
    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    const decrypted = decrypt(encrypted, userId);
    
    let timeEntries: TimeEntry[] = [];
    if (decrypted) {
      if (Array.isArray(decrypted)) {
        timeEntries = decrypted;
      } else if (decrypted.timeEntries) {
        timeEntries = decrypted.timeEntries;
      }
    }
    
    if (timeEntries.length > 0) {
      getSyncCache(userId).timeEntries = CryptoJS.MD5(JSON.stringify(timeEntries)).toString();
    }
    return timeEntries;
  },

  async getLocalTimeEntriesWithMetadata(userId: string): Promise<{ timeEntries: TimeEntry[], updatedAt?: string }> {
    if (!userId) return { timeEntries: [] };
    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    const decrypted = decrypt(encrypted, userId);
    
    if (decrypted) {
      if (Array.isArray(decrypted)) {
        return { timeEntries: decrypted };
      }
      return decrypted;
    }
    return { timeEntries: [] };
  },

  async getLocalConfig(userId: string): Promise<AppConfig | null> {
    if (!userId) return null;
    const key = `${KEYS.CONFIG}_${userId}`;
    const encrypted = await localforage.getItem<string>(key);
    const config = decrypt(encrypted, userId);
    if (config) {
      getSyncCache(userId).config = CryptoJS.MD5(JSON.stringify(config)).toString();
    }
    return config;
  },

  async getEntries(userId: string): Promise<{ entries: DailyEntry[], updatedAt?: string }> {
    // Modo Local-Only: Ignora Firestore
    const local = await this.getLocalEntries(userId);
    const metadata = await this.getLocalEntriesWithMetadata(userId);
    return { entries: local, updatedAt: metadata.updatedAt };
  },

  async saveEntries(entries: DailyEntry[], userId: string, config?: AppConfig, syncToCloud: boolean = false, forceSync: boolean = false) {
    if (!userId) return;
    
    const updatedAt = new Date().toISOString();
    
    // 1. Salva Localmente (Única operação ativa agora)
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = encrypt({ entries, updatedAt }, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }
    
    // Sincronização com a nuvem desativada
    console.log(`[storageService] Registro salvo localmente para ${userId}. (Nuvem Desativada)`);
  },

  async getTimeEntries(userId: string): Promise<{ timeEntries: TimeEntry[], updatedAt?: string }> {
    const local = await this.getLocalTimeEntries(userId);
    const metadata = await this.getLocalTimeEntriesWithMetadata(userId);
    return { timeEntries: local, updatedAt: metadata.updatedAt };
  },

  async saveTimeEntries(timeEntries: TimeEntry[], userId: string, syncToCloud: boolean = false, forceSync: boolean = false) {
    if (!userId) return;
    const updatedAt = new Date().toISOString();
    
    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = encrypt({ timeEntries, updatedAt }, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }
  },

  async getConfig(userId: string): Promise<AppConfig | null> {
    return await this.getLocalConfig(userId);
  },

  async saveConfig(config: AppConfig, userId: string, syncToCloud: boolean = false, forceSync: boolean = false) {
    if (!userId) return;
    const key = `${KEYS.CONFIG}_${userId}`;
    const encrypted = encrypt(config, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }
  },

  /**
   * Sincronização Global desativada
   */
  async syncAll(userId: string, entries: DailyEntry[], timeEntries: TimeEntry[], config: AppConfig, force: boolean = false) {
    // Apenas mantém o cache local atualizado para consistência interna
    const userCache = getSyncCache(userId);
    userCache.entries = CryptoJS.MD5(JSON.stringify(entries)).toString();
    userCache.timeEntries = CryptoJS.MD5(JSON.stringify(timeEntries)).toString();
    userCache.config = CryptoJS.MD5(JSON.stringify(config)).toString();
  },

  async resetData(userId: string) {
    if (!userId) return;
    await localforage.removeItem(`${KEYS.ENTRIES}_${userId}`);
    await localforage.removeItem(`${KEYS.TIME_ENTRIES}_${userId}`);
    console.log(`[storageService] Dados resetados localmente para ${userId}.`);
  },

  async deleteDataByPeriod(startDate: string, endDate: string, userId: string, config?: AppConfig) {
    if (!userId) return { entries: [], timeEntries: [] };

    const entries = await this.getLocalEntries(userId);
    const timeEntries = await this.getLocalTimeEntries(userId);

    const filteredEntries = entries.filter(e => e.date < startDate || e.date > endDate);
    const filteredTimeEntries = timeEntries.filter(e => e.date < startDate || e.date > endDate);

    await this.saveEntries(filteredEntries, userId, config, false);
    await this.saveTimeEntries(filteredTimeEntries, userId, false);

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

  async exportBackup(userId: string) {
    if (!userId) return;

    try {
      const [entries, timeEntries, config] = await Promise.all([
        this.getLocalEntries(userId),
        this.getLocalTimeEntries(userId),
        this.getLocalConfig(userId)
      ]);

      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        userId,
        data: {
          entries,
          timeEntries,
          config
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_rota_financeira_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      await localforage.setItem(`${KEYS.LAST_BACKUP}_${userId}`, new Date().toISOString());
      console.log(`[storageService] Backup exportado com sucesso para ${userId}`);
    } catch (e) {
      console.error("[storageService] Erro ao exportar backup:", e);
      throw e;
    }
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
  },

  async getLastBackupTime(userId: string): Promise<string | null> {
    if (!userId) return null;
    return await localforage.getItem(`${KEYS.LAST_BACKUP}_${userId}`);
  }
};
