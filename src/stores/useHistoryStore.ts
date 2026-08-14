import { create } from 'zustand';
import { HistoricoRegistro, AlertLog, AuditLog } from '../types';
import { initialSystemState } from '../initialData';
import { SupabaseService } from '../lib/supabaseService';
import { IndexedDBService } from '../lib/indexedDb';

const STORAGE_HISTORICO_KEY = 'radar_history_cache';
const STORAGE_ALERTS_KEY = 'radar_alerts_cache';
const STORAGE_AUDIT_KEY = 'radar_audit_cache';
const STORAGE_PENDING_HISTORY_KEY = 'radar_history_pending';
const STORAGE_PENDING_AUDIT_KEY = 'radar_audit_pending';

const getLocalOrDefault = <T>(key: string, defaultValue: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : defaultValue;
  } catch {
    return defaultValue;
  }
};

interface HistoryStoreState {
  historico: HistoricoRegistro[];
  alerts: AlertLog[];
  audit: AuditLog[];
  pendingHistory: HistoricoRegistro[];
  pendingAudit: AuditLog[];
  pendingCount: number;

  setHistorico: (historico: HistoricoRegistro[] | ((prev: HistoricoRegistro[]) => HistoricoRegistro[])) => void;
  addHistorico: (item: HistoricoRegistro) => Promise<void>;
  setAlerts: (alerts: AlertLog[] | ((prev: AlertLog[]) => AlertLog[])) => void;
  addAlert: (alert: AlertLog) => Promise<void>;
  setAudit: (audit: AuditLog[] | ((prev: AuditLog[]) => AuditLog[])) => void;
  addAuditLog: (log: AuditLog) => Promise<void>;
  syncPending: () => Promise<{ success: boolean; synced: number }>;
  clearPending: () => void;
}

const initialHistorico = getLocalOrDefault<HistoricoRegistro[]>(STORAGE_HISTORICO_KEY, initialSystemState.historico || []);
const initialAlerts = getLocalOrDefault<AlertLog[]>(STORAGE_ALERTS_KEY, initialSystemState.alerts || []);
const initialAudit = getLocalOrDefault<AuditLog[]>(STORAGE_AUDIT_KEY, initialSystemState.audit || []);
const initialPendingHistory = getLocalOrDefault<HistoricoRegistro[]>(STORAGE_PENDING_HISTORY_KEY, []);
const initialPendingAudit = getLocalOrDefault<AuditLog[]>(STORAGE_PENDING_AUDIT_KEY, []);

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  historico: initialHistorico,
  alerts: initialAlerts,
  audit: initialAudit,
  pendingHistory: initialPendingHistory,
  pendingAudit: initialPendingAudit,
  pendingCount: initialPendingHistory.length + initialPendingAudit.length,

  setHistorico: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.historico) : val;
    try {
      localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(next));
    } catch {}
    return { historico: next };
  }),

  addHistorico: async (item: HistoricoRegistro) => {
    set((state) => {
      const next = [item, ...state.historico];
      try {
        localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(next));
      } catch {}
      return { historico: next };
    });

    try {
      await IndexedDBService.put('historico_consolidado', item);
    } catch {}

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      try {
        await SupabaseService.upsertRecord('historico_consolidado', item as any, 'id');
      } catch (err) {
        console.warn('[useHistoryStore] Erro ao salvar historico no Supabase, enfileirando:', err);
        set((state) => {
          const nextPending = [...state.pendingHistory, item];
          try {
            localStorage.setItem(STORAGE_PENDING_HISTORY_KEY, JSON.stringify(nextPending));
          } catch {}
          return {
            pendingHistory: nextPending,
            pendingCount: nextPending.length + state.pendingAudit.length
          };
        });
      }
    } else {
      set((state) => {
        const nextPending = [...state.pendingHistory, item];
        try {
          localStorage.setItem(STORAGE_PENDING_HISTORY_KEY, JSON.stringify(nextPending));
        } catch {}
        return {
          pendingHistory: nextPending,
          pendingCount: nextPending.length + state.pendingAudit.length
        };
      });
    }
  },

  setAlerts: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.alerts) : val;
    try {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(next));
    } catch {}
    return { alerts: next };
  }),

  addAlert: async (alert: AlertLog) => {
    set((state) => {
      const next = [alert, ...state.alerts];
      try {
        localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(next));
      } catch {}
      return { alerts: next };
    });
    try {
      await IndexedDBService.put('alertas_operacionais', alert);
    } catch {}
  },

  setAudit: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.audit) : val;
    try {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(next));
    } catch {}
    return { audit: next };
  }),

  addAuditLog: async (log: AuditLog) => {
    set((state) => {
      const next = [log, ...state.audit];
      try {
        localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(next));
      } catch {}
      return { audit: next };
    });

    try {
      await IndexedDBService.put('audit_logs', log);
    } catch {}

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      try {
        await SupabaseService.upsertRecord('audit_logs', log, 'id');
      } catch (err) {
        console.warn('[useHistoryStore] Erro ao salvar audit_log no Supabase, enfileirando:', err);
        set((state) => {
          const nextPending = [...state.pendingAudit, log];
          try {
            localStorage.setItem(STORAGE_PENDING_AUDIT_KEY, JSON.stringify(nextPending));
          } catch {}
          return {
            pendingAudit: nextPending,
            pendingCount: state.pendingHistory.length + nextPending.length
          };
        });
      }
    } else {
      set((state) => {
        const nextPending = [...state.pendingAudit, log];
        try {
          localStorage.setItem(STORAGE_PENDING_AUDIT_KEY, JSON.stringify(nextPending));
        } catch {}
        return {
          pendingAudit: nextPending,
          pendingCount: state.pendingHistory.length + nextPending.length
        };
      });
    }
  },

  syncPending: async () => {
    const { pendingHistory, pendingAudit } = get();
    let synced = 0;
    const remainingHistory: HistoricoRegistro[] = [];
    const remainingAudit: AuditLog[] = [];

    for (const h of pendingHistory) {
      try {
        await SupabaseService.upsertRecord('historico_consolidado', h as any, 'id');
        synced++;
      } catch {
        remainingHistory.push(h);
      }
    }

    for (const a of pendingAudit) {
      try {
        await SupabaseService.upsertRecord('audit_logs', a, 'id');
        synced++;
      } catch {
        remainingAudit.push(a);
      }
    }

    set({
      pendingHistory: remainingHistory,
      pendingAudit: remainingAudit,
      pendingCount: remainingHistory.length + remainingAudit.length
    });

    try {
      localStorage.setItem(STORAGE_PENDING_HISTORY_KEY, JSON.stringify(remainingHistory));
      localStorage.setItem(STORAGE_PENDING_AUDIT_KEY, JSON.stringify(remainingAudit));
    } catch {}

    return {
      success: remainingHistory.length === 0 && remainingAudit.length === 0,
      synced
    };
  },

  clearPending: () => {
    set({ pendingHistory: [], pendingAudit: [], pendingCount: 0 });
    try {
      localStorage.removeItem(STORAGE_PENDING_HISTORY_KEY);
      localStorage.removeItem(STORAGE_PENDING_AUDIT_KEY);
    } catch {}
  }
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useHistoryStore.getState().syncPending();
  });
}

