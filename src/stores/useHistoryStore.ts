import { create } from 'zustand';
import { HistoricoRegistro, AlertLog, AuditLog } from '../types';
import { initialSystemState } from '../initialData';

interface HistoryStoreState {
  historico: HistoricoRegistro[];
  alerts: AlertLog[];
  audit: AuditLog[];

  setHistorico: (historico: HistoricoRegistro[] | ((prev: HistoricoRegistro[]) => HistoricoRegistro[])) => void;
  setAlerts: (alerts: AlertLog[] | ((prev: AlertLog[]) => AlertLog[])) => void;
  setAudit: (audit: AuditLog[] | ((prev: AuditLog[]) => AuditLog[])) => void;
}

const getLocalOrDefault = <T>(key: string, defaultValue: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const useHistoryStore = create<HistoryStoreState>((set) => ({
  historico: initialSystemState.historico || [],
  alerts: initialSystemState.alerts || [],
  audit: initialSystemState.audit || [],

  setHistorico: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.historico) : val;
    return { historico: next };
  }),

  setAlerts: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.alerts) : val;
    return { alerts: next };
  }),

  setAudit: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.audit) : val;
    return { audit: next };
  }),
}));
