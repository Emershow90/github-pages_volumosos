import { create } from 'zustand';
import { PainelProducao } from '../types/PainelProducao';
import { SupabaseService } from '../lib/supabaseService';
import { IndexedDBService } from '../lib/indexedDb';

interface PainelProducaoState {
  registros: PainelProducao[];
  loading: boolean;
  setRegistros: (registros: PainelProducao[]) => void;
  upsertRegistro: (registro: PainelProducao) => Promise<void>;
  fetchRegistrosHoje: (dateStr?: string) => Promise<PainelProducao[]>;
}

export const usePainelProducaoStore = create<PainelProducaoState>((set, get) => ({
  registros: [],
  loading: false,

  setRegistros: (registros) => set({ registros }),

  upsertRegistro: async (registro) => {
    // Generate UUID if not present
    if (!registro.id) {
      registro.id = `pp-${registro.sector_id}-${registro.upload_date}-${Date.now()}`;
    }
    const now = new Date().toISOString();
    registro.updated_at = now;

    // Local optimistic update
    const current = get().registros;
    const existingIdx = current.findIndex(
      r => r.sector_id === registro.sector_id && r.upload_date === registro.upload_date
    );

    let updatedList: PainelProducao[];
    if (existingIdx >= 0) {
      updatedList = [...current];
      updatedList[existingIdx] = { ...updatedList[existingIdx], ...registro };
    } else {
      updatedList = [...current, registro];
    }

    set({ registros: updatedList });

    // Save to IndexedDB & Supabase
    try {
      await IndexedDBService.put('painel_producao', registro);
      await SupabaseService.upsertRecord('painel_producao', registro, 'id');
    } catch (err) {
      console.warn('[usePainelProducaoStore] Warning saving record:', err);
    }
  },

  fetchRegistrosHoje: async (dateStr) => {
    set({ loading: true });
    try {
      const dbRecords = await SupabaseService.fetchTable<PainelProducao>('painel_producao');
      if (dbRecords && Array.isArray(dbRecords)) {
        set({ registros: dbRecords, loading: false });
        return dbRecords;
      }
    } catch (e) {
      console.warn('[usePainelProducaoStore] Fallback to IndexedDB:', e);
    }

    const local = await IndexedDBService.getAll<PainelProducao>('painel_producao');
    set({ registros: local || [], loading: false });
    return local || [];
  }
}));
