
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

// Cache para evitar sincronizações redundantes e melhorar performance
let lastSyncedHash: string | null = null;
let lastSyncedTimeHash: string | null = null;
let lastSyncedConfigHash: string | null = null;
let lastSyncedIncomeMap: Map<string, string> = new Map(); // id -> hash dos campos relevantes
let oldEntriesCleared: Set<string> = new Set(); // userId -> boolean
let syncReconciliationDone: Set<string> = new Set(); // userId -> boolean

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

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
    if (entries.length > 0 && !lastSyncedHash) {
      lastSyncedHash = CryptoJS.MD5(JSON.stringify(entries)).toString();
      // Popula o mapa de renda para sync cirúrgico
      entries.filter((e: DailyEntry) => e.category === 'income').forEach((e: DailyEntry) => {
        const entryData = {
          uid: userId,
          netAmount: e.netAmount || 0,
          valor_liquido: e.netAmount || 0,
          date: e.date,
          description: e.storeName || `Faturamento - ${e.date}`
        };
        lastSyncedIncomeMap.set(e.id, CryptoJS.MD5(JSON.stringify(entryData)).toString());
      });
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
    
    if (timeEntries.length > 0 && !lastSyncedTimeHash) {
      lastSyncedTimeHash = CryptoJS.MD5(JSON.stringify(timeEntries)).toString();
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
    if (config && !lastSyncedConfigHash) {
      lastSyncedConfigHash = CryptoJS.MD5(JSON.stringify(config)).toString();
    }
    return config;
  },

  async getEntries(userId: string): Promise<{ entries: DailyEntry[], updatedAt?: string }> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.entries) {
            // Atualiza caches de sincronização
            lastSyncedHash = CryptoJS.MD5(JSON.stringify(data.entries)).toString();
            lastSyncedIncomeMap.clear();
            data.entries.filter((e: DailyEntry) => e.category === 'income').forEach((e: DailyEntry) => {
              const entryData = {
                uid: userId,
                netAmount: e.netAmount || 0,
                valor_liquido: e.netAmount || 0,
                date: e.date,
                description: e.storeName || `Faturamento - ${e.date}`
              };
              lastSyncedIncomeMap.set(e.id, CryptoJS.MD5(JSON.stringify(entryData)).toString());
            });
            // Marca como reconciliado pois acabamos de puxar a verdade da nuvem
            syncReconciliationDone.add(userId);

            await this.saveEntries(data.entries, userId, false); // Salva localmente (criptografado)
            return { entries: data.entries, updatedAt: data.updatedAt };
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error(`Erro ao buscar entradas do Firestore (User: ${userId}):`, e);
        }
      }
    }
    const local = await this.getLocalEntries(userId);
    return { entries: local };
  },

  async saveEntries(entries: DailyEntry[], userId: string, config?: AppConfig, syncToCloud: boolean = true, forceSync: boolean = false) {
    if (!userId) return;
    
    const updatedAt = new Date().toISOString();
    console.log(`[storageService] Iniciando saveEntries para ${userId}. Sync: ${syncToCloud}, Force: ${forceSync}, UpdatedAt: ${updatedAt}`);
    
    // 1. Salva Localmente Primeiro (Sempre)
    const key = `${KEYS.ENTRIES}_${userId}`;
    const encrypted = encrypt({ entries, updatedAt }, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    // 2. Verifica se precisa sincronizar com a nuvem
    if (syncToCloud && db) {
      const currentHash = CryptoJS.MD5(JSON.stringify(entries)).toString();
      
      // Se o hash for igual ao último sincronizado e não for forceSync, não faz nada na nuvem
      if (currentHash === lastSyncedHash && !forceSync) {
        console.log(`[storageService] Hash idêntico (${currentHash}), pulando sync na nuvem.`);
        return;
      }

      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedEntries = sanitizeForFirestore(entries);
        
        // Promessa para o documento principal (sempre atualiza o array completo)
        const mainSavePromise = setDoc(docRef, { entries: sanitizedEntries, updatedAt }, { merge: true });

        // Sincronização com RotaBank (Saldo Mensal)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonth = `${year}-${month}`;
        
        // Calcula as estatísticas do mês
        const stats = entries
          .filter(e => e.date.startsWith(currentMonth))
          .reduce((acc, curr) => {
            if (curr.category === 'income') {
              acc.grossIncome += (curr.grossAmount || 0);
              
              // Calcula o líquido (após reservas) para fins informativos
              let net = curr.netAmount || 0;
              if (config && (curr.netAmount === curr.grossAmount || !curr.netAmount)) {
                const fuel = curr.grossAmount * config.percFuel;
                const food = curr.grossAmount * config.percFood;
                const maintenance = curr.grossAmount * config.percMaintenance;
                const others = curr.grossAmount * (config.percOthers || 0);
                net = curr.grossAmount - fuel - food - maintenance - others;
              }
              acc.netIncome += net;
            } else {
              // Despesas reais (valor negativo no netAmount)
              acc.totalExpenses += Math.abs(curr.netAmount || 0);
            }
            return acc;
          }, { grossIncome: 0, netIncome: 0, totalExpenses: 0 });

        // Conforme pedido: Faturamento Bruto - Gasto Total (Despesas Reais)
        const saldoFinal = stats.grossIncome - stats.totalExpenses;
        
        // Também calculamos o lucro real (após reservas) para o campo valor_liquido
        const lucroReal = stats.netIncome - stats.totalExpenses;

        console.log(`[storageService] Sync RotaBank - Bruto: ${stats.grossIncome}, Gastos: ${stats.totalExpenses}, Saldo: ${saldoFinal}`);

        const balanceRef = doc(db, 'balances', userId);
        const balanceData = {
          totalGrossIncome: stats.grossIncome,
          totalExpenses: stats.totalExpenses,
          totalNetAmount: saldoFinal, // Faturamento Bruto - Gasto Total
          valor_liquido: lucroReal,    // Lucro Real (após reservas)
          uid: userId,
          month: currentMonth,
          updatedAt: new Date().toISOString()
        };
        
        const syncPromises: Promise<void>[] = [setDoc(balanceRef, balanceData, { merge: true })];

        // Sincronização de Entradas Individuais para o RotaBank (Extrato Consolidado)
        const incomeEntries = entries.filter(e => e.category === 'income');
        
        // 1. Limpeza da coleção antiga (apenas uma vez por sessão para garantir integridade)
        // Isso garante que entradas deletadas localmente também sejam removidas da nuvem
        // CRITICAL: Só limpa se já tivermos reconciliado com a nuvem para evitar apagar dados que ainda não baixamos
        if (!oldEntriesCleared.has(userId) && syncReconciliationDone.has(userId)) {
          try {
            console.log(`[storageService] Limpando entradas antigas para ${userId}...`);
            const q = query(collection(db, 'entries'), where('uid', '==', userId));
            const querySnapshot = await getDocs(q);
            
            // Deleta em chunks de 450 para respeitar o limite do Firestore
            const allDocs = querySnapshot.docs;
            for (let i = 0; i < allDocs.length; i += 450) {
              const batch = writeBatch(db);
              allDocs.slice(i, i + 450).forEach(docSnap => {
                batch.delete(docSnap.ref);
              });
              await batch.commit();
            }
            
            oldEntriesCleared.add(userId);
            lastSyncedIncomeMap.clear(); // Limpa o cache para forçar re-sync após a limpeza
            console.log(`[storageService] Limpeza concluída.`);
          } catch (err) {
            console.error("[storageService] Erro ao limpar entradas antigas:", err);
          }
        }

        // 2. Salva cada entrada de faturamento individualmente usando BATCH para performance
        console.log(`[storageService] Sincronizando ${incomeEntries.length} entradas de faturamento (Líquido)...`);
        
        const BATCH_SIZE = 450;
        for (let i = 0; i < incomeEntries.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = incomeEntries.slice(i, i + BATCH_SIZE);
          
          let hasChangesInBatch = false;
          for (const entry of chunk) {
            // Constrói data ISO combinando data e hora do lançamento
            const isoDate = new Date(`${entry.date}T${entry.time || '12:00'}:00`).toISOString();
            
            // Recalcula o líquido se necessário para o extrato do RotaBank
            let netAmount = entry.netAmount || 0;
            if (config && (entry.netAmount === entry.grossAmount || !entry.netAmount)) {
              const fuel = entry.grossAmount * config.percFuel;
              const food = entry.grossAmount * config.percFood;
              const maintenance = entry.grossAmount * config.percMaintenance;
              const others = entry.grossAmount * (config.percOthers || 0);
              netAmount = entry.grossAmount - fuel - food - maintenance - others;
            }

            const entryData = {
              uid: userId,
              netAmount: netAmount,
              valor_liquido: netAmount,
              date: isoDate,
              description: entry.storeName || `Faturamento - ${entry.date}`
            };
            
            const entryHash = CryptoJS.MD5(JSON.stringify(entryData)).toString();
            if (lastSyncedIncomeMap.get(entry.id) !== entryHash) {
              const entryRef = doc(db, 'entries', entry.id);
              batch.set(entryRef, entryData, { merge: true });
              lastSyncedIncomeMap.set(entry.id, entryHash);
              hasChangesInBatch = true;
            }
          }
          
          if (hasChangesInBatch) {
            await batch.commit();
          }
        }

        // Executa as operações principais (array completo e saldo mensal)
        await Promise.all([mainSavePromise, ...syncPromises]);
        
        // Atualiza o hash de sincronização global após sucesso
        lastSyncedHash = currentHash;
        console.log(`[storageService] Sincronização concluída com sucesso. Hash: ${currentHash}`);
        
      } catch (e: any) {
        console.error(`[storageService] Erro na sincronização com a nuvem:`, e);
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          handleFirestoreError(e, OperationType.WRITE, `users/${userId} (and others)`);
        }
      }
    }
  },

  async getTimeEntries(userId: string): Promise<{ timeEntries: TimeEntry[], updatedAt?: string }> {
    if (userId && db) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.timeEntries) {
            lastSyncedTimeHash = CryptoJS.MD5(JSON.stringify(data.timeEntries)).toString();
            await this.saveTimeEntries(data.timeEntries, userId, false);
            return { timeEntries: data.timeEntries, updatedAt: data.updatedAt };
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error(`Erro ao buscar pontos do Firestore (User: ${userId}, Auth: ${auth?.currentUser?.uid}):`, e);
        }
      }
    }
    const local = await this.getLocalTimeEntries(userId);
    return { timeEntries: local };
  },

  async saveTimeEntries(timeEntries: TimeEntry[], userId: string, syncToCloud: boolean = true, forceSync: boolean = false) {
    if (!userId) return;

    const updatedAt = new Date().toISOString();
    
    // 1. Salva Localmente
    const key = `${KEYS.TIME_ENTRIES}_${userId}`;
    const encrypted = encrypt({ timeEntries, updatedAt }, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    if (syncToCloud && db) {
      const currentHash = CryptoJS.MD5(JSON.stringify(timeEntries)).toString();
      if (currentHash === lastSyncedTimeHash && !forceSync) return;

      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedTimeEntries = sanitizeForFirestore(timeEntries);
        await setDoc(docRef, { timeEntries: sanitizedTimeEntries, updatedAt }, { merge: true });
        lastSyncedTimeHash = currentHash;
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error(`Erro ao salvar pontos no Firestore (User: ${userId}, Auth: ${auth?.currentUser?.uid}):`, e);
        }
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
            lastSyncedConfigHash = CryptoJS.MD5(JSON.stringify(data.config)).toString();
            await this.saveConfig(data.config, userId, false);
            return data.config;
          }
        }
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          handleFirestoreError(e, OperationType.GET, `users/${userId}`);
        }
      }
    }
    return await this.getLocalConfig(userId);
  },

  async saveConfig(config: AppConfig, userId: string, syncToCloud: boolean = true, forceSync: boolean = false) {
    if (!userId) return;

    const key = `${KEYS.CONFIG}_${userId}`;
    const encrypted = encrypt(config, userId);
    if (encrypted) {
      await localforage.setItem(key, encrypted);
    }

    if (syncToCloud && db) {
      const currentHash = CryptoJS.MD5(JSON.stringify(config)).toString();
      if (currentHash === lastSyncedConfigHash && !forceSync) return;

      try {
        const docRef = doc(db, 'users', userId);
        const sanitizedConfig = sanitizeForFirestore(config);
        await setDoc(docRef, { config: sanitizedConfig }, { merge: true });
        lastSyncedConfigHash = currentHash;
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
        }
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
      } catch (e: any) {
        if (e.code !== 'unavailable' && !e.message?.includes('offline')) {
          console.error(`Erro ao resetar dados no Firestore (User: ${userId}, Auth: ${auth?.currentUser?.uid}):`, e);
        }
      }
    }
  },

  async deleteDataByPeriod(startDate: string, endDate: string, userId: string, config?: AppConfig) {
    if (!userId) return { entries: [], timeEntries: [] };

    const entries = await this.getLocalEntries(userId);
    const timeEntries = await this.getLocalTimeEntries(userId);

    const filteredEntries = entries.filter(e => e.date < startDate || e.date > endDate);
    const filteredTimeEntries = timeEntries.filter(e => e.date < startDate || e.date > endDate);

    await this.saveEntries(filteredEntries, userId, config, true);
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
