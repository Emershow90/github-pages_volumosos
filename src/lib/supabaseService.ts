import { supabase, isStaticBuild } from './supabase';
import { auth, initAuth } from './supabaseAuth';
import { IndexedDBService } from './indexedDb';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const isOnline = (): boolean => {
  if (isStaticBuild) return false;
  const isSimOffline = localStorage.getItem("sys_radar_sim_offline") === "true";
  return !isSimOffline && navigator.onLine;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export class SupabaseService {
  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;

  public static initAuthObserver(): void {
    if (this.initializedAuthObserver) return;
    this.initializedAuthObserver = true;

    auth.onAuthStateChanged((user) => {
      this.authState = user ? 'authenticated' : 'unauthenticated';
      this.authStateListeners.forEach((cb) => cb(this.authState));
    });
  }

  public static onAuthStateResolved(callback: (state: AuthState) => void): () => void {
    this.initAuthObserver();
    callback(this.authState);
    this.authStateListeners.add(callback);
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  public static garantirAuthPronto(): Promise<void> {
    return new Promise((resolve) => {
      if (this.authState !== 'loading') {
        resolve();
        return;
      }

      let unsubscribe: (() => void) | undefined;
      unsubscribe = this.onAuthStateResolved((state) => {
        if (state !== 'loading') {
          if (unsubscribe) {
            unsubscribe();
          } else {
            queueMicrotask(() => {
              if (unsubscribe) unsubscribe();
            });
          }
          resolve();
        }
      });
    });
  }

  private static getDocId(record: any, keyField: string = 'id'): string {
    const idVal = record[keyField] || record.id || record.lista || record.chave;
    return idVal ? String(idVal) : '';
  }

  public static async fetchTable<T>(tableName: string, defaultData: T[] = []): Promise<T[]> {
    await this.garantirAuthPronto();

    if (!auth.currentUser) {
      console.warn(`[Supabase] fetchTable(${tableName}) chamado sem usuário autenticado. Retornando cache local.`);
      const cached = await IndexedDBService.getAll<T>(tableName);
      if (cached.length > 0) {
        return cached;
      }
      if (defaultData.length > 0) {
        await IndexedDBService.putMany(tableName, defaultData);
        return defaultData;
      }
      return [];
    }

    if (isOnline()) {
      try {
        const { data, error } = await supabase!
          .from(tableName)
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          await IndexedDBService.putMany(tableName, data);
          return data as T[];
        }
      } catch (err) {
        console.warn(`[Supabase] Failed to fetch table ${tableName} online. Falling back to cache.`, err);
      }
    }

    const cached = await IndexedDBService.getAll<T>(tableName);
    if (cached.length > 0) {
      return cached;
    }

    if (defaultData.length > 0) {
      await IndexedDBService.putMany(tableName, defaultData);
      return defaultData;
    }

    return [];
  }

  public static async upsertRecord<T extends { updated_at?: string; id?: any; lista?: string; key?: string; chave?: string }>(
    tableName: string,
    record: T,
    keyField: keyof T = 'id' as keyof T
  ): Promise<T> {
    await this.garantirAuthPronto();

    const docId = this.getDocId(record, keyField as string);
    if (!docId) {
      throw new Error(`Cannot upsert to ${tableName} without a valid unique key.`);
    }

    const now = new Date().toISOString();
    const finalizedRecord = {
      ...record,
      updated_at: record.updated_at || now
    };

    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Gravando em "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.put(tableName, finalizedRecord);
      return finalizedRecord;
    }

    const localExisting = await IndexedDBService.get<T>(tableName, docId);
    if (localExisting && localExisting.updated_at) {
      const localTime = new Date(localExisting.updated_at).getTime();
      const newTime = new Date(finalizedRecord.updated_at).getTime();
      if (newTime < localTime) {
        console.log(`[Supabase LWW] Newer record exists locally for ${tableName}:${docId}. Skipping update.`);
        return localExisting;
      }
    }

    await IndexedDBService.put(tableName, finalizedRecord);

    if (isOnline()) {
      try {
        const { error } = await supabase!
          .from(tableName)
          .upsert(finalizedRecord);

        if (error) throw error;
      } catch (err) {
        handleSupabaseError(err, OperationType.WRITE, `${tableName}/${docId}`);
      }
    } else {
      console.log(`[Supabase Offline] Queued update for ${tableName}:${docId}`);
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ tableName, record: finalizedRecord, keyField, action: 'UPSERT' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }

    return finalizedRecord;
  }

  public static async deleteRecord(tableName: string, keyVal: any, keyField: string = 'id'): Promise<void> {
    await this.garantirAuthPronto();

    const docId = String(keyVal);
    
    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Removendo de "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.delete(tableName, docId);
      return;
    }

    await IndexedDBService.delete(tableName, docId);

    if (isOnline()) {
      try {
        const { error } = await supabase!
          .from(tableName)
          .delete()
          .eq(keyField, keyVal);

        if (error) throw error;
      } catch (err) {
        handleSupabaseError(err, OperationType.DELETE, `${tableName}/${docId}`);
      }
    } else {
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ tableName, keyVal, keyField, action: 'DELETE' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }
  }

  public static subscribe(
    tableName: string, 
    callback: (payload: { table: string; event: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old?: any }) => void
  ): () => void {
    let channel: any = null;
    let cancelado = false;

    const unsubscribeAuth = this.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        if (channel) {
          channel.unsubscribe();
          channel = null;
        }
        return;
      }

      if (cancelado || channel) return;

      if (!isOnline()) {
        console.log(`[Supabase] Offline mode: Real-time subscription to ${tableName} will fall back to local changes.`);
        return;
      }

      channel = supabase!.channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async (payload) => {
          const changeType = payload.eventType;
          const newData = payload.new;
          const oldData = payload.old;
          
          if (changeType === 'INSERT' || changeType === 'UPDATE') {
            await IndexedDBService.put(tableName, newData);
            callback({
              table: tableName,
              event: changeType,
              new: newData
            });
          } else if (changeType === 'DELETE') {
            const oldRecord = oldData as any;
            const docId = oldRecord?.id || oldRecord?.lista || oldRecord?.chave || payload.errors?.[0];
            if (docId) {
              await IndexedDBService.delete(tableName, docId);
              callback({
                table: tableName,
                event: 'DELETE',
                new: { id: docId, lista: docId, chave: docId }
              });
            }
          }
        })
        .subscribe();
    });

    return () => {
      cancelado = true;
      unsubscribeAuth();
      if (channel) {
        channel.unsubscribe();
      }
    };
  }

  public static async flushOfflineQueue(): Promise<void> {
    if (!isOnline()) return;

    const queueStr = localStorage.getItem("sys_radar_offline_queue");
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      console.log(`[Supabase Sync] Sincronizando ${queue.length} alterações pendentes offline...`);
      const remainingQueue = [];

      for (const item of queue) {
        try {
          const client = supabase as any;
          if (item.action === 'UPSERT') {
            const { error } = await client
              .from(item.tableName)
              .upsert(item.record);
            if (error) throw error;
          } else if (item.action === 'DELETE') {
            const { error } = await client
              .from(item.tableName)
              .delete()
              .eq(item.keyField, item.keyVal);
            if (error) throw error;
          }
        } catch (err) {
          console.error(`[Supabase Sync] Erro ao sincronizar item offline:`, err);
          remainingQueue.push(item);
        }
      }

      if (remainingQueue.length > 0) {
        localStorage.setItem("sys_radar_offline_queue", JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem("sys_radar_offline_queue");
        console.log(`[Supabase Sync] Sincronização offline concluída com sucesso.`);
      }
    } catch (e) {
      console.error("[Supabase Sync] Erro ao analisar fila offline:", e);
    }
  }
}
