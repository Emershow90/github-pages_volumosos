import { create } from 'zustand';
import { SupabaseService } from '../lib/supabaseService';
import { IndexedDBService } from '../lib/indexedDb';
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

const OVERRIDES_STORAGE_KEY = 'torre_overrides_v1';

function getLocalCachedOverrides(): Record<string, SectorOverrideValues> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCachedOverrides(cache: Record<string, SectorOverrideValues>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Função pura que calcula os valores finais do setor respeitando a hierarquia:
 * Valor Final = Override ?? Valor Sugerido da Planilha ?? Valor Baseline
 */
export function resolveSectorMetrics(sector: Setor): Setor {
  let overrides: SectorOverrideValues = sector.overrides || {};
  if (typeof overrides === 'string') {
    try {
      overrides = JSON.parse(overrides);
    } catch {
      overrides = {};
    }
  }

  let suggested: SectorOverrideValues = sector.suggestedMetrics || {};
  if (typeof suggested === 'string') {
    try {
      suggested = JSON.parse(suggested);
    } catch {
      suggested = {};
    }
  }

  // ATIVIDADE (respeita canônico 'ativ' e alias 'atividade')
  const ativOverride = overrides.ativ ?? overrides.atividade;
  const ativSuggested = suggested.ativ ?? suggested.atividade;
  const ativFinal = ativOverride !== undefined && ativOverride !== null
    ? ativOverride
    : (ativSuggested !== undefined && ativSuggested !== null ? ativSuggested : sector.ativ);

  // UPH
  const uphOverride = overrides.uph;
  const uphSuggested = suggested.uph;
  const uphFinal = uphOverride !== undefined && uphOverride !== null
    ? uphOverride
    : (uphSuggested !== undefined && uphSuggested !== null ? uphSuggested : sector.uph);

  // REABASTECIMENTO / CAIXAS (respeita canônico 'reproTotal' e alias 'caixasReapro')
  const reproOverride = overrides.reproTotal ?? overrides.caixasReapro;
  const reproSuggested = suggested.reproTotal ?? suggested.caixasReapro;
  const reproFinal = reproOverride !== undefined && reproOverride !== null
    ? reproOverride
    : (reproSuggested !== undefined && reproSuggested !== null ? reproSuggested : sector.reproTotal);

  // COLIS (respeita canônico 'colis' e alias 'colisColeta')
  const colisOverride = overrides.colis ?? overrides.colisColeta;
  const colisSuggested = suggested.colis ?? suggested.colisColeta;
  const colisFinal = colisOverride !== undefined && colisOverride !== null
    ? colisOverride
    : (colisSuggested !== undefined && colisSuggested !== null ? colisSuggested : (sector.colis ?? 0));

  // PROMESSA
  const promessaOverride = overrides.promessa;
  const promessaSuggested = suggested.promessa;
  const promessaFinal = promessaOverride !== undefined && promessaOverride !== null
    ? promessaOverride
    : (promessaSuggested !== undefined && promessaSuggested !== null ? promessaSuggested : sector.promessa);

  // NOTA 5S (respeita canônico 'nota5s' e alias 'auditoria5s')
  const nota5sOverride = overrides.nota5s ?? overrides.auditoria5s;
  const nota5sSuggested = suggested.nota5s ?? suggested.auditoria5s;
  const nota5sFinal = nota5sOverride !== undefined && nota5sOverride !== null
    ? nota5sOverride
    : (nota5sSuggested !== undefined && nota5sSuggested !== null ? nota5sSuggested : sector.nota5s);

  // BSI
  const bsiOverride = overrides.bsi;
  const bsiSuggested = suggested.bsi;
  const bsiFinal = bsiOverride !== undefined && bsiOverride !== null
    ? bsiOverride
    : (bsiSuggested !== undefined && bsiSuggested !== null ? bsiSuggested : sector.bsi);

  // ERROS PICKING
  const errosOverride = overrides.errosPicking;
  const errosSuggested = suggested.errosPicking;
  const errosFinal = errosOverride !== undefined && errosOverride !== null
    ? errosOverride
    : (errosSuggested !== undefined && errosSuggested !== null ? errosSuggested : sector.errosPicking);

  return {
    ...sector,
    overrides,
    suggestedMetrics: suggested,
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

export interface SectorStoreState {
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

function getInitialSetoresWithCachedOverrides(): Setor[] {
  const cached = getLocalCachedOverrides();
  return initialSetores.map((s) => {
    const ov = cached[s.id] || cached[String(s.numero)] || s.overrides;
    return resolveSectorMetrics({
      ...s,
      overrides: ov ? { ...(s.overrides || {}), ...ov } : s.overrides
    });
  });
}

export const useSectorStore = create<SectorStoreState>((set, get) => ({
  setores: getInitialSetoresWithCachedOverrides(),
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
    const cachedOverrides = getLocalCachedOverrides();

    const mergedList = rawList.map((incoming) => {
      const current = state.setores.find(
        (s) => s.id === incoming.id || String(s.numero) === String(incoming.id)
      );

      const cached = cachedOverrides[incoming.id] || cachedOverrides[String(incoming.numero)];

      // Preserva overrides existentes se a carga externa vier sem o campo
      const incomingOverrides = incoming.overrides;
      const currentOverrides = current?.overrides;
      const finalOverrides = (incomingOverrides && Object.keys(incomingOverrides).length > 0)
        ? { ...(cached || {}), ...(currentOverrides || {}), ...incomingOverrides }
        : { ...(cached || {}), ...(currentOverrides || {}) };

      const incomingSuggested = incoming.suggestedMetrics;
      const currentSuggested = current?.suggestedMetrics;
      const finalSuggested = (incomingSuggested && Object.keys(incomingSuggested).length > 0)
        ? { ...(currentSuggested || {}), ...incomingSuggested }
        : currentSuggested;

      return resolveSectorMetrics({
        ...incoming,
        overrides: finalOverrides,
        suggestedMetrics: finalSuggested,
      });
    });
    return { setores: mergedList };
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

    // Normalizar as chaves dos overrides para guardar os dois formatos (canônico e alias)
    const normalizedNew: Partial<SectorOverrideValues> = { ...newOverrides };
    if ('atividade' in newOverrides && newOverrides.atividade !== undefined) {
      normalizedNew.ativ = newOverrides.atividade;
    }
    if ('ativ' in newOverrides && newOverrides.ativ !== undefined) {
      normalizedNew.atividade = newOverrides.ativ;
    }
    if ('caixasReapro' in newOverrides && newOverrides.caixasReapro !== undefined) {
      normalizedNew.reproTotal = newOverrides.caixasReapro;
    }
    if ('reproTotal' in newOverrides && newOverrides.reproTotal !== undefined) {
      normalizedNew.caixasReapro = newOverrides.reproTotal;
    }
    if ('colisColeta' in newOverrides && newOverrides.colisColeta !== undefined) {
      normalizedNew.colis = newOverrides.colisColeta;
    }
    if ('colis' in newOverrides && newOverrides.colis !== undefined) {
      normalizedNew.colisColeta = newOverrides.colis;
    }
    if ('auditoria5s' in newOverrides && newOverrides.auditoria5s !== undefined) {
      normalizedNew.nota5s = newOverrides.auditoria5s;
    }
    if ('nota5s' in newOverrides && newOverrides.nota5s !== undefined) {
      normalizedNew.auditoria5s = newOverrides.nota5s;
    }

    const mergedOverrides: SectorOverrideValues = {
      ...(targetSector.overrides || {}),
      ...normalizedNew
    };

    const updatedSector = resolveSectorMetrics({
      ...targetSector,
      overrides: mergedOverrides
    });

    // 1. Atualização imediata no estado Zustand e Cache Local (sincronização síncrona com o Monitor)
    set((s) => {
      const nextSetores = s.setores.map(sec => (sec.id === targetSector.id ? updatedSector : sec));
      try {
        const cacheMap = getLocalCachedOverrides();
        cacheMap[targetSector.id] = mergedOverrides;
        cacheMap[String(targetSector.numero)] = mergedOverrides;
        saveLocalCachedOverrides(cacheMap);
      } catch {}
      return { setores: nextSetores };
    });

    // 2. Persistência assíncrona com redundância (Supabase + IndexedDB + Audit Logs)
    try {
      await SupabaseService.upsertRecord('setores', updatedSector, 'id');
      await IndexedDBService.put('setores', updatedSector).catch(() => {});

      await SupabaseService.upsertRecord('audit_logs', {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        acao: 'override_salvo',
        setor_id: sectorId,
        dados: newOverrides,
        usuario: userId,
        timestamp: new Date().toISOString()
      }, 'id').catch(() => {});
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
