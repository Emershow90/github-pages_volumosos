import { create } from 'zustand';
import { StoreOperation } from '../types/Store';
import { SupabaseService } from '../lib/supabaseService';
import { IndexedDBService } from '../lib/indexedDb';

const STORAGE_OPS_KEY = 'radar_store_operations_cache';
const STORAGE_PENDING_KEY = 'radar_store_operations_pending';

const loadLocalOperations = (): Record<string, StoreOperation> => {
  try {
    const raw = localStorage.getItem(STORAGE_OPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const loadLocalPending = (): Record<string, StoreOperation> => {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

interface StoreOperationsState {
  operations: Record<string, StoreOperation>;
  pendingOperations: Record<string, StoreOperation>;
  pendingCount: number;
  upsertOperation: (op: StoreOperation) => Promise<void>;
  removeOperation: (id: string) => Promise<void>;
  setOperations: (ops: Record<string, StoreOperation>) => void;
  syncPending: () => Promise<{ success: boolean; synced: number }>;
  clearPending: () => void;
}

const initialOperations = loadLocalOperations();
const initialPending = loadLocalPending();

export const useStoreOperations = create<StoreOperationsState>((set, get) => ({
  operations: initialOperations,
  pendingOperations: initialPending,
  pendingCount: Object.keys(initialPending).length,

  upsertOperation: async (op: StoreOperation) => {
    const finalizedOp: StoreOperation = {
      ...op,
      updated_at: op.updated_at || new Date().toISOString()
    };

    // 1. Atualização síncrona de estado e LocalStorage
    set((state) => {
      const nextOps = { ...state.operations, [finalizedOp.id]: finalizedOp };
      try {
        localStorage.setItem(STORAGE_OPS_KEY, JSON.stringify(nextOps));
      } catch (e) {
        console.warn('[useStoreOperations] Erro ao salvar operações no LocalStorage:', e);
      }
      return { operations: nextOps };
    });

    // 2. Persiste no IndexedDB local
    try {
      await IndexedDBService.put('store_operations', finalizedOp);
    } catch (e) {
      console.warn('[useStoreOperations] Erro ao salvar no IndexedDB:', e);
    }

    // 3. Se online, tenta enviar ao Supabase; se falhar ou offline, enfileira no LocalStorage
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      try {
        await SupabaseService.upsertRecord('store_operations', finalizedOp, 'id');
        // Se estava nas pendências, remove
        set((state) => {
          if (!state.pendingOperations[finalizedOp.id]) return state;
          const nextPending = { ...state.pendingOperations };
          delete nextPending[finalizedOp.id];
          try {
            localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(nextPending));
          } catch {}
          return {
            pendingOperations: nextPending,
            pendingCount: Object.keys(nextPending).length
          };
        });
      } catch (err) {
        console.warn('[useStoreOperations] Falha de rede ao salvar no Supabase, adicionando a pendentes:', err);
        set((state) => {
          const nextPending = { ...state.pendingOperations, [finalizedOp.id]: finalizedOp };
          try {
            localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(nextPending));
          } catch {}
          return {
            pendingOperations: nextPending,
            pendingCount: Object.keys(nextPending).length
          };
        });
      }
    } else {
      // Offline: Enfileira para sync posterior
      set((state) => {
        const nextPending = { ...state.pendingOperations, [finalizedOp.id]: finalizedOp };
        try {
          localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(nextPending));
        } catch {}
        return {
          pendingOperations: nextPending,
          pendingCount: Object.keys(nextPending).length
        };
      });
    }
  },

  removeOperation: async (id: string) => {
    set((state) => {
      const nextOps = { ...state.operations };
      delete nextOps[id];
      const nextPending = { ...state.pendingOperations };
      delete nextPending[id];
      try {
        localStorage.setItem(STORAGE_OPS_KEY, JSON.stringify(nextOps));
        localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(nextPending));
      } catch {}
      return {
        operations: nextOps,
        pendingOperations: nextPending,
        pendingCount: Object.keys(nextPending).length
      };
    });

    try {
      await IndexedDBService.delete('store_operations', id);
    } catch {}

    try {
      await SupabaseService.deleteRecord('store_operations', id, 'id');
    } catch (e) {
      console.warn('[useStoreOperations] Erro ao deletar no Supabase:', e);
    }
  },

  setOperations: (ops: Record<string, StoreOperation>) => {
    set({ operations: ops });
    try {
      localStorage.setItem(STORAGE_OPS_KEY, JSON.stringify(ops));
    } catch (e) {
      console.warn('[useStoreOperations] Erro ao persistir setOperations:', e);
    }
  },

  syncPending: async () => {
    const { pendingOperations } = get();
    const items = Object.values(pendingOperations);
    if (items.length === 0) {
      return { success: true, synced: 0 };
    }

    let syncedCount = 0;
    const remainingPending: Record<string, StoreOperation> = { ...pendingOperations };

    for (const op of items) {
      try {
        await SupabaseService.upsertRecord('store_operations', op, 'id');
        delete remainingPending[op.id];
        syncedCount++;
      } catch (e) {
        console.warn(`[useStoreOperations] Falha ao sincronizar op pendente ${op.id}:`, e);
      }
    }

    set({
      pendingOperations: remainingPending,
      pendingCount: Object.keys(remainingPending).length
    });

    try {
      localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(remainingPending));
    } catch {}

    return {
      success: Object.keys(remainingPending).length === 0,
      synced: syncedCount
    };
  },

  clearPending: () => {
    set({ pendingOperations: {}, pendingCount: 0 });
    try {
      localStorage.removeItem(STORAGE_PENDING_KEY);
    } catch {}
  }
}));

// Listener automático para reconexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useStoreOperations.getState().syncPending();
  });
}

