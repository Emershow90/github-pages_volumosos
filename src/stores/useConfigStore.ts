import { create } from 'zustand';
import { Setor, ScreensaverConfig } from '../types';
import { initialSetores } from '../initialData';
import { SupabaseService } from '../lib/supabaseService';

interface ConfigState {
  setores: Setor[];
  screensaver: ScreensaverConfig;
  loading: boolean;
  activeSectorId: string;
  setActiveSectorId: (id: string) => void;
  setSetores: (setores: Setor[]) => void;
  loadSetores: () => Promise<void>;
  addSetor: (setor: Setor) => Promise<void>;
  updateSetor: (id: string, updates: Partial<Setor>) => Promise<void>;
  deleteSetor: (id: string) => Promise<void>;
  updateScreensaver: (config: ScreensaverConfig) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  setores: [],
  screensaver: {
    enabled: false,
    timeout: 120,
    duration: 30,
    image: '',
  },
  loading: false,
  activeSectorId: 'S87',

  setActiveSectorId: (id) => set({ activeSectorId: id }),
  setSetores: (setores) => set({ setores }),
  
  loadSetores: async () => {
    set({ loading: true });
    try {
      const data = await SupabaseService.fetchTable<Setor>('setores', initialSetores);
      set({ setores: data, loading: false });
    } catch (e) {
      console.error('Error loading sectors', e);
      set({ setores: initialSetores, loading: false });
    }
  },

  addSetor: async (setor) => {
    const updated = [...get().setores, setor];
    set({ setores: updated });
    await SupabaseService.upsertRecord('setores', setor, 'id');
  },

  updateSetor: async (id, updates) => {
    const updated = get().setores.map((s) => {
      if (s.id === id) {
        const item = { ...s, ...updates };
        SupabaseService.upsertRecord('setores', item, 'id');
        return item;
      }
      return s;
    });
    set({ setores: updated });
  },

  deleteSetor: async (id) => {
    const updated = get().setores.filter((s) => s.id !== id);
    set({ setores: updated });
    await SupabaseService.deleteRecord('setores', id, 'id');
  },

  updateScreensaver: (screensaver) => {
    set({ screensaver });
    localStorage.setItem('sys_screensaver', JSON.stringify(screensaver));
  },
}));
