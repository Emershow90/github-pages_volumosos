import { create } from 'zustand';
import { SupabaseService } from '../lib/supabaseService';
import { Setor, SectorOverrideValues, CapacidadeSetor, RadarLoja, ReaproData, BolsaoData, CopilSetor, UniversoMix, ReferenteSemana, ActivityEntry } from '../types';
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
  updateSectorOverride: (sectorId: string, overrides: Partial<SectorOverrideValues>, userId?: string) => Promise<void>;
  applySuggestedMetrics: (suggestedMap: Record<string, SectorOverrideValues>) => void;
  getResolvedSector: (sectorId: string) => Setor | undefined;
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
      atividade?: number;
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

/**
 * Função pura que calcula os valores finais do setor respeitando a hierarquia:
 * Valor Final = Override ?? Valor Sugerido da Planilha ?? Valor Baseline
 */
export function resolveSectorMetrics(sector: Setor): Setor {
  const overrides = sector.overrides || {};
  const suggested = sector.suggestedMetrics || {};

  const ativFinal = overrides.ativ !== undefined && overrides.ativ !== null
    ? overrides.ativ
    : (suggested.ativ !== undefined && suggested.ativ !== null ? suggested.ativ : sector.ativ);

  const uphFinal = overrides.uph !== undefined && overrides.uph !== null
    ? overrides.uph
    : (suggested.uph !== undefined && suggested.uph !== null ? suggested.uph : sector.uph);

  const reproFinal = overrides.reproTotal !== undefined && overrides.reproTotal !== null
    ? overrides.reproTotal
    : (suggested.reproTotal !== undefined && suggested.reproTotal !== null ? suggested.reproTotal : sector.reproTotal);

  const colisFinal = overrides.colis !== undefined && overrides.colis !== null
    ? overrides.colis
    : (suggested.colis !== undefined && suggested.colis !== null ? suggested.colis : (sector.colis ?? 0));

  const promessaFinal = overrides.promessa !== undefined && overrides.promessa !== null
    ? overrides.promessa
    : (suggested.promessa !== undefined && suggested.promessa !== null ? suggested.promessa : sector.promessa);

  const nota5sFinal = overrides.nota5s !== undefined && overrides.nota5s !== null
    ? overrides.nota5s
    : (suggested.nota5s !== undefined && suggested.nota5s !== null ? suggested.nota5s : sector.nota5s);

  const bsiFinal = overrides.bsi !== undefined && overrides.bsi !== null
    ? overrides.bsi
    : (suggested.bsi !== undefined && suggested.bsi !== null ? suggested.bsi : sector.bsi);

  const errosFinal = overrides.errosPicking !== undefined && overrides.errosPicking !== null
    ? overrides.errosPicking
    : (suggested.errosPicking !== undefined && suggested.errosPicking !== null ? suggested.errosPicking : sector.errosPicking);

  return {
    ...sector,
    ativ: ativFinal,
    uph: uphFinal,
    reproTotal: reproFinal,
    colis: colisFinal,
    promessa: promessaFinal,
    nota5s: nota5sFinal,
    bsi: bsiFinal,
    errosPicking: errosFinal
  };
}

export const useSectorStore = create<SectorStoreState>((set, get) => ({
  setores: initialSetores.map(resolveSectorMetrics),
  capacidade: initialCapacidade,
  referentesSemana: initialReferentesSemana || [],
  universos: initialUniversos,
  copilData: initialCopil,
  radar: initialRadar,
  reaproData: initialReapro,
  bolsaoData: initialBolsao,
  activityEntries: [],

  setSetores: (val) => set((state) => {
    const rawList = typeof val === 'function' ? val(state.setores) : val;
    return { setores: rawList.map(resolveSectorMetrics) };
  }),

  applySuggestedMetrics: (suggestedMap) => set((state) => {
    const updated = state.setores.map((s) => {
      const sug = suggestedMap[s.id] || suggestedMap[String(s.numero)] || suggestedMap[s.id.replace('-', '')];
      if (!sug) return s;
      const mergedSug: SectorOverrideValues = {
        ...(s.suggestedMetrics || {}),
        ...sug
      };
      return resolveSectorMetrics({
        ...s,
        suggestedMetrics: mergedSug
      });
    });
    return { setores: updated };
  }),

  updateSectorOverride: async (sectorId, newOverrides, userId = 'system') => {
    const state = get();
    const targetSector = state.setores.find(s => s.id === sectorId || String(s.numero) === sectorId);
    if (!targetSector) return;

    const mergedOverrides: SectorOverrideValues = {
      ...(targetSector.overrides || {}),
      ...newOverrides
    };

    const updatedSector = resolveSectorMetrics({
      ...targetSector,
      overrides: mergedOverrides
    });

    set((s) => ({
      setores: s.setores.map(sec => (sec.id === targetSector.id ? updatedSector : sec))
    }));

    try {
      await SupabaseService.upsertRecord('setores', updatedSector, 'id');
      await SupabaseService.upsertRecord('audit_logs', {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        acao: 'override_salvo',
        setor_id: sectorId,
        dados: newOverrides,
        usuario: userId,
        timestamp: new Date().toISOString()
      }, 'id');
    } catch (err) {
      console.warn('[useSectorStore] Erro ao sincronizar override no Supabase:', err);
    }
  },

  getResolvedSector: (sectorId) => {
    const found = get().setores.find(s => s.id === sectorId || String(s.numero) === sectorId);
    return found ? resolveSectorMetrics(found) : undefined;
  },

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
        atividade: 0,
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
        atividade: 0,
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
        atividade: 0,
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
        ...(data.atividade !== undefined && { atividade: data.atividade }),
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
        atividade: data.atividade ?? 0,
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
        atividade: 0,
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
