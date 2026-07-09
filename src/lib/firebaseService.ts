import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocsFromServer
} from 'firebase/firestore';
import { db, auth } from './firebaseAuth';
import { IndexedDBService } from './indexedDb';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if user is offline using native navigator
export const isOnline = (): boolean => {
  const isSimOffline = localStorage.getItem("sys_radar_sim_offline") === "true";
  return !isSimOffline && navigator.onLine;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export class FirebaseService {
  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;

  /**
   * Inicializa o observador do estado de autenticação reativo do Firebase.
   */
  public static initAuthObserver(): void {
    if (this.initializedAuthObserver) return;
    this.initializedAuthObserver = true;

    auth.onAuthStateChanged((user) => {
      this.authState = user ? 'authenticated' : 'unauthenticated';
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
   * Totalmente compatível com a assinatura anterior, mas agora baseada em estado reativo.
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
   * Universal fetch for table data using Firestore, falling back to IndexedDB.
   */
  public static async fetchTable<T>(tableName: string, defaultData: T[] = []): Promise<T[]> {
    await this.garantirAuthPronto();

    if (!auth.currentUser) {
      console.warn(`[Firebase] fetchTable(${tableName}) chamado sem usuário autenticado. Retornando cache local.`);
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
        const colRef = collection(db, tableName);
        const querySnapshot = await getDocsFromServer(colRef);
        const data: T[] = [];
        querySnapshot.forEach((docSnap) => {
          data.push(docSnap.data() as T);
        });

        if (data.length > 0) {
          // Sync with local cache
          await IndexedDBService.putMany(tableName, data);
          return data;
        }
      } catch (err) {
        console.warn(`[Firebase] Failed to fetch table ${tableName} online. Falling back to cache.`, err);
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
   * Save / Upsert record in Firestore and IndexedDB
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

    if (!auth.currentUser) {
      console.warn(`[Firebase Offline Fallback] Gravando em "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.put(tableName, finalizedRecord);
      return finalizedRecord;
    }

    // 1. Check local IndexedDB to apply Last Write Wins (LWW)
    const localExisting = await IndexedDBService.get<T>(tableName, docId);
    if (localExisting && localExisting.updated_at) {
      const localTime = new Date(localExisting.updated_at).getTime();
      const newTime = new Date(finalizedRecord.updated_at).getTime();
      if (newTime < localTime) {
        console.log(`[Firebase LWW] Newer record exists locally for ${tableName}:${docId}. Skipping update.`);
        return localExisting;
      }
    }

    // 2. Save locally immediately
    await IndexedDBService.put(tableName, finalizedRecord);

    // 3. Save to Firestore
    if (isOnline()) {
      try {
        const docRef = doc(db, tableName, docId);
        await setDoc(docRef, finalizedRecord);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${tableName}/${docId}`);
      }
    } else {
      console.log(`[Firebase Offline] Queued update for ${tableName}:${docId}`);
      // Store in offline queue
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ tableName, record: finalizedRecord, keyField, action: 'UPSERT' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }

    return finalizedRecord;
  }

  /**
   * Delete record from Firestore and IndexedDB
   */
  public static async deleteRecord(tableName: string, keyVal: any, keyField: string = 'id'): Promise<void> {
    await this.garantirAuthPronto();

    const docId = String(keyVal);
    
    if (!auth.currentUser) {
      console.warn(`[Firebase Offline Fallback] Removendo de "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.delete(tableName, docId);
      return;
    }

    // Delete locally
    await IndexedDBService.delete(tableName, docId);

    // Delete from Firestore
    if (isOnline()) {
      try {
        const docRef = doc(db, tableName, docId);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${tableName}/${docId}`);
      }
    } else {
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ tableName, keyVal, keyField, action: 'DELETE' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }
  }

  /**
   * Realtime Subscription using Firestore onSnapshot
   */
  public static subscribe(
    tableName: string, 
    callback: (payload: { table: string; event: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old?: any }) => void
  ): () => void {
    let unsubscribeReal: (() => void) | null = null;
    let cancelado = false;

    const unsubscribeAuth = this.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        if (unsubscribeReal) {
          unsubscribeReal();
          unsubscribeReal = null;
        }
        return;
      }

      // state === 'authenticated'
      if (cancelado || unsubscribeReal) return;

      if (!isOnline()) {
        console.log(`[Firebase] Offline mode: Real-time subscription to ${tableName} will fall back to local changes.`);
      }

      const colRef = collection(db, tableName);
      
      unsubscribeReal = onSnapshot(colRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          const docId = change.doc.id;
          
          if (change.type === "added" || change.type === "modified") {
            await IndexedDBService.put(tableName, data);
            callback({
              table: tableName,
              event: change.type === "added" ? 'INSERT' : 'UPDATE',
              new: data
            });
          } else if (change.type === "removed") {
            await IndexedDBService.delete(tableName, docId);
            callback({
              table: tableName,
              event: 'DELETE',
              new: { id: docId, lista: docId, chave: docId }
            });
          }
        });
      }, (err) => {
        console.error(`[Firebase] Erro no subscribe para tabela ${tableName}:`, err);
        handleFirestoreError(err, OperationType.GET, tableName);
      });
    });

    return () => {
      cancelado = true;
      unsubscribeAuth();
      if (unsubscribeReal) {
        unsubscribeReal();
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

      console.log(`[Firebase Sync] Sincronizando ${queue.length} alterações pendentes offline...`);
      const remainingQueue = [];

      for (const item of queue) {
        try {
          if (item.action === 'UPSERT') {
            const docId = this.getDocId(item.record, item.keyField);
            await setDoc(doc(db, item.tableName, docId), item.record);
          } else if (item.action === 'DELETE') {
            await deleteDoc(doc(db, item.tableName, String(item.keyVal)));
          }
        } catch (err) {
          console.error(`[Firebase Sync] Erro ao sincronizar item offline:`, err);
          remainingQueue.push(item);
        }
      }

      if (remainingQueue.length > 0) {
        localStorage.setItem("sys_radar_offline_queue", JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem("sys_radar_offline_queue");
        console.log(`[Firebase Sync] Sincronização offline concluída com sucesso.`);
      }
    } catch (e) {
      console.error("[Firebase Sync] Erro ao analisar fila offline:", e);
    }
  }
}
