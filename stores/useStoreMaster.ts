import { create } from 'zustand';
import { StoreMaster } from '../types/Store';
import { masterCadastroLojas } from '../initialData';
import { IndexedDBService } from '../lib/indexedDb';
import { SupabaseService } from '../lib/supabaseService';

interface StoreMasterState {
  stores: StoreMaster[];
  loading: boolean;
  searchQuery: string;
  selectedStore: StoreMaster | null;
  loadStores: () => Promise<StoreMaster[]>;
  addStore: (store: StoreMaster) => Promise<void>;
  updateStore: (id: string, updates: Partial<StoreMaster>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedStore: (store: StoreMaster | null) => void;
}

const DEFAULT_SEEDS: StoreMaster[] = masterCadastroLojas.map((m) => ({
  id: m.id,
  nome: m.nome,
  cidade: m.id === "2722" ? "Florianópolis" : m.id === "2360" ? "Osasco" : m.id === "1250" ? "São José dos Campos" : m.id === "1540" ? "Curitiba" : m.id === "1990" ? "Porto Alegre" : "Campinas",
  uf: m.id === "2722" ? "SC" : m.id === "1540" ? "PR" : m.id === "1990" ? "RS" : "SP",
  transportadoraPadrao: "JADLOG",
  observacoes: "Loja padrão cadastrada no sistema"
}));

export const useStoreMaster = create<StoreMasterState>((set, get) => ({
  stores: DEFAULT_SEEDS,
  loading: false,
  searchQuery: '',
  selectedStore: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedStore: (selectedStore) => set({ selectedStore }),

  loadStores: async () => {
    set({ loading: true });
    try {
      // 1. Carrega do IndexedDB primeiro para resposta instantânea na UI
      const localStores = await IndexedDBService.getAll<StoreMaster>('store_master');
      
      let mergedStores: StoreMaster[] = [];
      if (localStores && localStores.length > 0) {
        mergedStores = localStores;
      } else {
        // Se vazio, semeia os dados padrões no IndexedDB
        mergedStores = [...DEFAULT_SEEDS];
        for (const s of DEFAULT_SEEDS) {
          await IndexedDBService.put('store_master', s);
        }
      }

      set({ stores: mergedStores, loading: false });

      // 2. Busca em segundo plano no Supabase se houver conexão
      try {
        const remoteStores = await SupabaseService.fetchTable<StoreMaster>('store_master', []);
        if (remoteStores && remoteStores.length > 0) {
          // Mescla stores locais e remotas
          const storeMap = new Map<string, StoreMaster>();
          mergedStores.forEach(s => storeMap.set(s.id, s));
          remoteStores.forEach(s => {
            storeMap.set(s.id, s);
            IndexedDBService.put('store_master', s);
          });
          const finalList = Array.from(storeMap.values());
          set({ stores: finalList });
          return finalList;
        }
      } catch (remoteErr) {
        console.warn('[useStoreMaster] Falha ao sincronizar remotamente com Supabase, mantendo cache local:', remoteErr);
      }

      return mergedStores;
    } catch (err) {
      console.error('[useStoreMaster] Erro ao carregar lojas do cadastro master:', err);
      set({ stores: DEFAULT_SEEDS, loading: false });
      return DEFAULT_SEEDS;
    }
  },

  addStore: async (store: StoreMaster) => {
    const current = get().stores;
    const exists = current.some(s => s.id === store.id);
    const updated = exists 
      ? current.map(s => s.id === store.id ? { ...s, ...store } : s)
      : [...current, store];

    set({ stores: updated });

    // Salva localmente no IndexedDB
    await IndexedDBService.put('store_master', store);

    // Tenta sincronizar com o Supabase
    try {
      await SupabaseService.upsertRecord('store_master', store, 'id');
    } catch (e) {
      console.warn('[useStoreMaster] Salvo no IndexedDB, aguardando sincronização remota:', e);
    }
  },

  updateStore: async (id: string, updates: Partial<StoreMaster>) => {
    const current = get().stores;
    let updatedItem: StoreMaster | null = null;

    const updatedList = current.map(s => {
      if (s.id === id) {
        updatedItem = { ...s, ...updates };
        return updatedItem;
      }
      return s;
    });

    if (updatedItem) {
      set({ stores: updatedList });
      await IndexedDBService.put('store_master', updatedItem);
      try {
        await SupabaseService.upsertRecord('store_master', updatedItem, 'id');
      } catch (e) {
        console.warn('[useStoreMaster] Atualização mantida localmente no IndexedDB:', e);
      }
    }
  },

  deleteStore: async (id: string) => {
    const current = get().stores;
    const updatedList = current.filter(s => s.id !== id);
    set({ stores: updatedList });

    await IndexedDBService.delete('store_master', id);
    try {
      await SupabaseService.deleteRecord('store_master', id, 'id');
    } catch (e) {
      console.warn('[useStoreMaster] Exclusão mantida no IndexedDB:', e);
    }
  }
}));
