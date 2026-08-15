import { create } from 'zustand';
import { SupabaseService } from '../lib/supabaseService';
import { Setor, CapacidadeSetor, RadarLoja, ReaproData, BolsaoData, CopilSetor, UniversoMix, ReferenteSemana, ActivityEntry } from '../types';
import {
  initialSetores,
  initialCapacidade,
  initialUniversos,
  initialCopil,
  initialRadar,
  initialReapro,
  initialBolsao,
  initialReferentesSemana
} from '../initialData';

interface SectorStoreState {
  setores: Setor[];
  capacidade: CapacidadeSetor[];
  referentesSemana: ReferenteSemana[];
  universos: Record<string, UniversoMix[]>;
  copilData: Record<string, CopilSetor>;
  radar: RadarLoja[];
  reaproData: ReaproData;
  bolsaoData: BolsaoData;
  activityEntries: ActivityEntry[];

  setSetores: (setores: Setor[] | ((prev: Setor[]) => Setor[])) => void;
  setCapacidade: (capacidade: CapacidadeSetor[] | ((prev: CapacidadeSetor[]) => CapacidadeSetor[])) => void;
  setReferentesSemana: (referentes: ReferenteSemana[] | ((prev: ReferenteSemana[]) => ReferenteSemana[])) => void;
  setUniversos: (universos: Record<string, UniversoMix[]> | ((prev: Record<string, UniversoMix[]>) => Record<string, UniversoMix[]>)) => void;
  setCopilData: (copilData: Record<string, CopilSetor> | ((prev: Record<string, CopilSetor>) => Record<string, CopilSetor>)) => void;
  setRadar: (radar: RadarLoja[] | ((prev: RadarLoja[]) => RadarLoja[])) => void;
  setReaproData: (reaproData: ReaproData | ((prev: ReaproData) => ReaproData)) => void;
  setBolsaoData: (bolsaoData: BolsaoData | ((prev: BolsaoData) => BolsaoData)) => void;
  setActivityEntries: (entries: ActivityEntry[] | ((prev: ActivityEntry[]) => ActivityEntry[])) => void;
  incrementActivityCategory: (
    sectorId: string,
    activityDate: string,
    userId: string,
    category: 'alimento' | 'montanha' | 'l7Mochila' | 'colis',
    quantity: number
  ) => Promise<void>;
  updateActivityCategoryValue: (
    sectorId: string,
    activityDate: string,
    userId: string,
    category: 'alimento' | 'montanha' | 'l7Mochila' | 'colis',
    value: number
  ) => Promise<void>;
  updateActivityTextField: (
    sectorId: string,
    activityDate: string,
    userId: string,
    field: 'elog' | 'reapro',
    value: string
  ) => Promise<void>;
  updateActivityUniversosBatch: (
    sectorId: string,
    activityDate: string,
    userId: string,
    data: {
      alimento?: number;
      montanha?: number;
      l7Mochila?: number;
      colis?: number;
      elog?: string;
      reapro?: string;
      adhocCategories?: Record<string, string | number>;
    }
  ) => Promise<void>;
  updateAdhocCategory: (
    sectorId: string,
    activityDate: string,
    userId: string,
    categoryName: string,
    value: string | number
  ) => Promise<void>;
}

export const useSectorStore = create<SectorStoreState>((set, get) => ({
  setores: initialSetores,
  capacidade: initialCapacidade,
  referentesSemana: initialReferentesSemana || [],
  universos: initialUniversos,
  copilData: initialCopil,
  radar: initialRadar,
  reaproData: initialReapro,
  bolsaoData: initialBolsao,
  activityEntries: [],

  setSetores: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.setores) : val;
    return { setores: next };
  }),

  setCapacidade: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.capacidade) : val;
    return { capacidade: next };
  }),

  setReferentesSemana: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.referentesSemana) : val;
    return { referentesSemana: next };
  }),

  setUniversos: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.universos) : val;
    return { universos: next };
  }),

  setCopilData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.copilData) : val;
    return { copilData: next };
  }),

  setRadar: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.radar) : val;
    return { radar: next };
  }),

  setReaproData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.reaproData) : val;
    return { reaproData: next };
  }),

  setBolsaoData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.bolsaoData) : val;
    return { bolsaoData: next };
  }),

  setActivityEntries: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.activityEntries) : val;
    return { activityEntries: next };
  }),

  incrementActivityCategory: async (sectorId, activityDate, userId, category, quantity) => {
    
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        [category]: (existing[category] as number) + quantity,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        updated,
        'id' as keyof ActivityEntry
      );
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId,
        alimento: 0,
        montanha: 0,
        l7Mochila: 0,
        elog: '',
        reapro: '',
        colis: 0,
        adhocCategories: {},
        [category]: quantity,
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  },

  updateActivityCategoryValue: async (sectorId, activityDate, userId, category, value) => {
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate
    );
    const now = new Date().toISOString();

    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        [category]: value,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        updated,
        'id' as keyof ActivityEntry
      );
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId: userId || 'system',
        alimento: 0,
        montanha: 0,
        l7Mochila: 0,
        elog: '',
        reapro: '',
        colis: 0,
        adhocCategories: {},
        [category]: value,
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  },

  updateActivityTextField: async (sectorId, activityDate, userId, field, value) => {
    
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        [field]: value,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord('activity_entries', updated, 'id' as keyof ActivityEntry);
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId: userId || 'system',
        alimento: 0,
        montanha: 0,
        l7Mochila: 0,
        elog: '',
        reapro: '',
        colis: 0,
        adhocCategories: {},
        [field]: value,
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  },

  updateActivityUniversosBatch: async (sectorId, activityDate, userId, data) => {
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate
    );
    const now = new Date().toISOString();

    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        ...(data.alimento !== undefined && { alimento: data.alimento }),
        ...(data.montanha !== undefined && { montanha: data.montanha }),
        ...(data.l7Mochila !== undefined && { l7Mochila: data.l7Mochila }),
        ...(data.colis !== undefined && { colis: data.colis }),
        ...(data.elog !== undefined && { elog: data.elog }),
        ...(data.reapro !== undefined && { reapro: data.reapro }),
        ...(data.adhocCategories !== undefined && { adhocCategories: data.adhocCategories }),
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord('activity_entries', updated, 'id' as keyof ActivityEntry);
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId: userId || 'system',
        alimento: data.alimento ?? 0,
        montanha: data.montanha ?? 0,
        l7Mochila: data.l7Mochila ?? 0,
        colis: data.colis ?? 0,
        elog: data.elog ?? '',
        reapro: data.reapro ?? '',
        adhocCategories: data.adhocCategories ?? {},
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  },

  updateAdhocCategory: async (sectorId, activityDate, userId, categoryName, value) => {
    
    const existing = get().activityEntries.find(
      e => e.sectorId === sectorId && e.activityDate === activityDate && e.userId === userId
    );
    const now = new Date().toISOString();
    
    if (existing) {
      const updated: ActivityEntry = {
        ...existing,
        adhocCategories: {
          ...(existing.adhocCategories || {}),
          [categoryName]: value
        },
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord('activity_entries', updated, 'id' as keyof ActivityEntry);
      get().setActivityEntries((prev) => {
        const idx = prev.findIndex(e => e.id === result.id);
        if (idx >= 0) {
          const updatedList = [...prev];
          updatedList[idx] = result;
          return updatedList;
        }
        return [...prev, result];
      });
    } else {
      const newEntry: Omit<ActivityEntry, 'id'> = {
        sectorId,
        activityDate,
        userId,
        alimento: 0,
        montanha: 0,
        l7Mochila: 0,
        elog: '',
        reapro: '',
        colis: 0,
        adhocCategories: {
          [categoryName]: value
        },
        createdAt: now,
        updatedAt: now
      };
      const result = await SupabaseService.upsertRecord(
        'activity_entries',
        newEntry as ActivityEntry,
        undefined,
        'sector_id,activity_date,user_id'
      );
      get().setActivityEntries((prev) => [...prev, result]);
    }
  }
}));
