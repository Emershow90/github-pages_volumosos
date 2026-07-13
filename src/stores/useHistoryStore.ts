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
  historico: getLocalOrDefault('sys_historico', initialSystemState.historico),
  alerts: getLocalOrDefault('sys_alerts', initialSystemState.alerts),
  audit: getLocalOrDefault('sys_audit', initialSystemState.audit),

  setHistorico: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.historico) : val;
    localStorage.setItem('sys_historico', JSON.stringify(next));
    return { historico: next };
  }),

  setAlerts: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.alerts) : val;
    localStorage.setItem('sys_alerts', JSON.stringify(next));
    return { alerts: next };
  }),

  setAudit: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.audit) : val;
    localStorage.setItem('sys_audit', JSON.stringify(next));
    return { audit: next };
  }),
}));
