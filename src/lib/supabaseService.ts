import { supabase, auth } from '@/lib/supabase';
import { IndexedDBService } from './indexedDb';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  }
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.getSession()?.then(session => session.data.session?.user.id) || null,
      email: auth.getSession()?.then(session => session.data.session?.user.email) || null,
    },
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if user is offline using native navigator
export const isOnline = (): boolean => {
  const isSimOffline = localStorage.getItem("sys_radar_sim_offline") === "true";
  return !isSimOffline && navigator.onLine;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export class SupabaseService {
  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;

  /**
   * Inicializa o observador do estado de autenticação reativo do Supabase.
   */
  public static initAuthObserver(): void {
    if (this.initializedAuthObserver) return;
    this.initializedAuthObserver = true;

    supabase.auth.onAuthStateChange((event, session) => {
      this.authState = session?.user ? 'authenticated' : 'unauthenticated';
      this.authStateListeners.forEach((cb) => cb(this.authState));
    });

    // Verifica estado inicial
    supabase.auth.getSession().then(({ data }) => {
      this.authState = data.session?.user ? 'authenticated' : 'unauthenticated';
      this.authStateListeners.forEach((cb) => cb(this.authState));
    });
  }

  /**
   * Registra um callback que é chamado imediatamente com o estado de auth atual
   * e reativamente em qualquer mudança futura de autenticação.
   */
  public static onAuthStateResolved(callback: (state: AuthState) => void): () => void {
    this.initAuthObserver();
    callback(this.authState);
    this.authStateListeners.add(callback);
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Aguarda a autenticação resolver antes de permitir qualquer operação.
   */
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

  /**
   * Helper to retrieve doc ID based on typical key fields
   */
  private static getDocId(record: any, keyField: string = 'id'): string {
    const idVal = record[keyField] || record.id || record.lista || record.chave;
    return idVal ? String(idVal) : '';
  }

  /**
   * Universal fetch for table data using Supabase, falling back to IndexedDB.
   */
  public static async fetchTable<T>(tableName: string, defaultData: T[] = []): Promise<T[]> {
    await this.garantirAuthPronto();

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
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
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          // Sync with local cache
          await IndexedDBService.putMany(tableName, data);
          return data as T[];
        }
      } catch (err) {
        console.warn(`[Supabase] Failed to fetch table ${tableName} online. Falling back to cache.`, err);
      }
    }

    // Offline / Fallback
    const cached = await IndexedDBService.getAll<T>(tableName);
    if (cached.length > 0) {
      return cached;
    }

    // If cache is empty, seed with defaultData
    if (defaultData.length > 0) {
      await IndexedDBService.putMany(tableName, defaultData);
      return defaultData;
    }

    return [];
  }

  /**
   * Save / Upsert record in Supabase and IndexedDB
   */
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

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn(`[Supabase Offline Fallback] Gravando em "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.put(tableName, finalizedRecord);
      return finalizedRecord;
    }

    // 1. Check local IndexedDB to apply Last Write Wins (LWW)
    const localExisting = await IndexedDBService.get<T>(tableName, docId);
    if (localExisting && localExisting.updated_at) {
      const localTime = new Date(localExisting.updated_at).getTime();
      const newTime = new Date(finalizedRecord.updated_at).getTime();
      if (newTime < localTime) {
        console.log(`[Supabase LWW] Newer record exists locally for ${tableName}:${docId}. Skipping update.`);
        return localExisting;
      }
    }

    // 2. Save locally immediately
    await IndexedDBService.put(tableName, finalizedRecord);

    // 3. Save to Supabase
    if (isOnline()) {
      try {
        const { error } = await supabase
          .from(tableName)
          .upsert({ ...finalizedRecord, id: docId }, { onConflict: 'id' });

        if (error) throw error;
      } catch (err) {
        handleSupabaseError(err, OperationType.WRITE, `${tableName}/${docId}`);
      }
    } else {
      console.log(`[Supabase Offline] Queued update for ${tableName}:${docId}`);
      // Store in offline queue
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ tableName, record: finalizedRecord, keyField, action: 'UPSERT' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }

    return finalizedRecord;
  }

  /**
   * Delete record from Supabase and IndexedDB
   */
  public static async deleteRecord(tableName: string, keyVal: any, keyField: string = 'id'): Promise<void> {
    await this.garantirAuthPronto();

    const docId = String(keyVal);
    
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn(`[Supabase Offline Fallback] Removendo de "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.delete(tableName, docId);
      return;
    }

    // Delete locally
    await IndexedDBService.delete(tableName, docId);

    // Delete from Supabase
    if (isOnline()) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', docId);

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

  /**
   * Realtime Subscription using Supabase Realtime
   */
  public static subscribe(
    tableName: string, 
    callback: (payload: { table: string; event: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old?: any }) => void
  ): () => void {
    let channel: RealtimeChannel | null = null;
    let cancelado = false;

    const unsubscribeAuth = this.onAuthStateResolved(async (state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
        return;
      }

      // state === 'authenticated'
      if (cancelado || channel) return;

      if (!isOnline()) {
        console.log(`[Supabase] Offline mode: Real-time subscription to ${tableName} will fall back to local changes.`);
      }

      // Criar canal Realtime
      channel = supabase
        .channel(`table-changes-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          async (payload) => {
            // Atualiza cache local
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (payload.new) {
                await IndexedDBService.put(tableName, payload.new);
              }
              callback({
                table: tableName,
                event: payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE',
                new: payload.new
              });
            } else if (payload.eventType === 'DELETE') {
              if (payload.old) {
                await IndexedDBService.delete(tableName, payload.old.id);
              }
              callback({
                table: tableName,
                event: 'DELETE',
                new: { id: payload.old?.id }
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Supabase] Realtime subscription active for ${tableName}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Supabase] Realtime error for ${tableName}`);
          }
        });
    });

    return () => {
      cancelado = true;
      unsubscribeAuth();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }

  /**
   * Sincroniza qualquer item pendente na fila offline ao reconectar
   */
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
          if (item.action === 'UPSERT') {
            const docId = this.getDocId(item.record, item.keyField);
            const { error } = await supabase
              .from(item.tableName)
              .upsert({ ...item.record, id: docId }, { onConflict: 'id' });
            if (error) throw error;
          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.tableName)
              .delete()
              .eq('id', String(item.keyVal));
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

  /**
   * Busca um único registro por ID
   */
  public static async getRecord<T>(tableName: string, id: string): Promise<T | null> {
    await this.garantirAuthPronto();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isOnline()) {
      // Fallback para cache local
      return await IndexedDBService.get<T>(tableName, id);
    }

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        await IndexedDBService.put(tableName, data);
        return data as T;
      }
    } catch (err) {
      console.warn(`[Supabase] Failed to get record ${tableName}:${id}. Falling back to cache.`, err);
    }

    return await IndexedDBService.get<T>(tableName, id);
  }

  /**
   * Busca registros com filtro
   */
  public static async queryRecords<T>(
    tableName: string,
    filters: Record<string, any>
  ): Promise<T[]> {
    await this.garantirAuthPronto();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isOnline()) {
      // Fallback para cache local com filtro básico
      const all = await IndexedDBService.getAll<T>(tableName);
      return all.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }

    try {
      let query = supabase.from(tableName).select('*');
      
      // Aplica filtros
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        await IndexedDBService.putMany(tableName, data);
        return data as T[];
      }
    } catch (err) {
      console.warn(`[Supabase] Failed to query ${tableName}. Falling back to cache.`, err);
    }

    return await IndexedDBService.getAll<T>(tableName);
  }

  /**
   * Escuta mudanças em tempo real para uma tabela específica
   */
  public static subscribeToTable<T>(
    tableName: string,
    onInsert?: (data: T) => void,
    onUpdate?: (data: T) => void,
    onDelete?: (id: string) => void
  ): () => void {
    return this.subscribe(tableName, (payload) => {
      if (payload.event === 'INSERT' && onInsert) {
        onInsert(payload.new);
      } else if (payload.event === 'UPDATE' && onUpdate) {
        onUpdate(payload.new);
      } else if (payload.event === 'DELETE' && onDelete) {
        onDelete(payload.new.id);
      }
    });
  }
}

// Exportar instância para uso direto
export default SupabaseService;
