/**
 * IndexedDB Service for Tower OS local caching and offline-first persistence.
 */

const DB_NAME = "tower_os_offline_v1";
const DB_VERSION = 6;

export class IndexedDBService {
  private static db: IDBDatabase | null = null;
  private static useMemoryFallback = false;
  private static memoryStore: Record<string, Map<any, any>> = {};

  private static getMemoryStore(storeName: string): Map<any, any> {
    if (!this.memoryStore[storeName]) {
      this.memoryStore[storeName] = new Map();
    }
    return this.memoryStore[storeName];
  }

  public static async getDB(): Promise<IDBDatabase> {
    if (this.useMemoryFallback) {
      throw new Error("Using memory fallback");
    }
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          console.warn("[IndexedDB] Database upgrade/open blocked by other tabs. Falling back to memory storage.");
          this.useMemoryFallback = true;
          reject(new Error("IndexedDB blocked"));
        };

        request.onupgradeneeded = (event) => {
          const db = request.result;
          
          // Define stores for offline caching
          const stores = [
            "setores", "colaboradores", "escala_semanal", "lideranca",
            "override_operacional", "audit_logs", "historico_consolidado",
            "lista_coleta", "radar_lojas_status", "store_master",
            "store_operations", "atividade_loja", "universos_trabalho",
            "copil_matriz", "alertas_operacionais", "capacidade", "usuarios"
          ];
          
          stores.forEach(store => {
            if (db.objectStoreNames.contains(store)) {
              try {
                db.deleteObjectStore(store);
              } catch (e) {
                console.warn(`[IndexedDB] Error deleting store ${store} during upgrade:`, e);
              }
            }
            const keyPath = (store === "override_operacional") ? "chave" : 
                            (store === "lista_coleta" || store === "radar_lojas_status") ? "lista" : "id";
            const autoIncrement = (store === "audit_logs" || store === "historico_consolidado");
            db.createObjectStore(store, { keyPath, autoIncrement });
          });
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.db.onversionchange = () => {
            console.warn("[IndexedDB] Version change detected. Closing database connection.");
            this.db?.close();
            this.db = null;
          };
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("IndexedDB failed to open:", request.error);
          this.useMemoryFallback = true;
          reject(request.error || new Error("Failed to open IndexedDB"));
        };
      } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
        this.useMemoryFallback = true;
        reject(err);
      }
    });
  }

  public static async getAll<T>(storeName: string): Promise<T[]> {
    try {
      if (this.useMemoryFallback) {
        return Array.from(this.getMemoryStore(storeName).values()) as T[];
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] getAll failed for store ${storeName}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      return Array.from(this.getMemoryStore(storeName).values()) as T[];
    }
  }

  public static async get<T>(storeName: string, key: any): Promise<T | null> {
    try {
      if (this.useMemoryFallback) {
        return (this.getMemoryStore(storeName).get(key) as T) || null;
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] get failed for store ${storeName}, key ${key}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      return (this.getMemoryStore(storeName).get(key) as T) || null;
    }
  }

  public static async put(storeName: string, value: any): Promise<void> {
    const keyField = (storeName === "override_operacional") ? "chave" : 
                     (storeName === "lista_coleta" || storeName === "radar_lojas_status") ? "lista" : "id";
    
    if (value && typeof value === "object") {
      if (value[keyField] === undefined) {
        if (storeName === "lideranca") {
          value[keyField] = value.nome || "lideranca_atual";
        } else if (storeName === "escala_semanal") {
          value[keyField] = value.dia || "escala_semanal_item";
        } else {
          value[keyField] = "rand_" + Math.random().toString(36).substring(2, 11);
        }
      }
    }
    
    const key = value ? value[keyField] : undefined;
    try {
      if (this.useMemoryFallback) {
        if (key !== undefined) {
          this.getMemoryStore(storeName).set(key, value);
        }
        return;
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.put(value);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] put failed for store ${storeName}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      if (key !== undefined) {
        this.getMemoryStore(storeName).set(key, value);
      }
    }
  }

  public static async putMany(storeName: string, values: any[]): Promise<void> {
    const keyField = (storeName === "override_operacional") ? "chave" : 
                     (storeName === "lista_coleta" || storeName === "radar_lojas_status") ? "lista" : "id";
    
    for (const val of values) {
      if (val && typeof val === "object") {
        if (val[keyField] === undefined) {
          if (storeName === "lideranca") {
            val[keyField] = val.nome || "lideranca_atual";
          } else if (storeName === "escala_semanal") {
            val[keyField] = val.dia || "escala_semanal_item";
          } else {
            val[keyField] = "rand_" + Math.random().toString(36).substring(2, 11);
          }
        }
      }
    }

    try {
      if (this.useMemoryFallback) {
        const memStore = this.getMemoryStore(storeName);
        for (const val of values) {
          const key = val[keyField];
          if (key !== undefined) {
            memStore.set(key, val);
          }
        }
        return;
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);

          for (const val of values) {
            store.put(val);
          }
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] putMany failed for store ${storeName}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      const memStore = this.getMemoryStore(storeName);
      for (const val of values) {
        const key = val[keyField];
        if (key !== undefined) {
          memStore.set(key, val);
        }
      }
    }
  }

  public static async delete(storeName: string, key: any): Promise<void> {
    try {
      if (this.useMemoryFallback) {
        this.getMemoryStore(storeName).delete(key);
        return;
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] delete failed for store ${storeName}, key ${key}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      this.getMemoryStore(storeName).delete(key);
    }
  }

  public static async clear(storeName: string): Promise<void> {
    try {
      if (this.useMemoryFallback) {
        this.getMemoryStore(storeName).clear();
        return;
      }
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.warn(`[IndexedDB Fallback] clear failed for store ${storeName}. Using memory storage.`, err);
      this.useMemoryFallback = true;
      this.getMemoryStore(storeName).clear();
    }
  }
}

