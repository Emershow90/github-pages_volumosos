import { create } from 'zustand';
import { AlertLog } from '../types';

interface NotificationState {
  alerts: AlertLog[];
  addAlert: (alert: Omit<AlertLog, 'id' | 'hora' | 'lido'>) => void;
  markAsRead: (id: string) => void;
  clearAlerts: () => void;
  setAlerts: (alerts: AlertLog[]) => void;
}

const getInitialAlerts = (): AlertLog[] => {
  const s = localStorage.getItem('sys_alerts');
  if (s) {
    try {
      return JSON.parse(s);
    } catch {
      return [];
    }
  }
  return [];
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  alerts: getInitialAlerts(),
  
  addAlert: (alertData) => set((state) => {
    const newAlert: AlertLog = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lido: false,
    };
    const updated = [newAlert, ...state.alerts];
    localStorage.setItem('sys_alerts', JSON.stringify(updated));
    return { alerts: updated };
  }),
  
  markAsRead: (id) => set((state) => {
    const updated = state.alerts.map((a) => (a.id === id ? { ...a, lido: true } : a));
    localStorage.setItem('sys_alerts', JSON.stringify(updated));
    return { alerts: updated };
  }),
  
  clearAlerts: () => set(() => {
    localStorage.setItem('sys_alerts', JSON.stringify([]));
    return { alerts: [] };
  }),

  setAlerts: (alerts) => set(() => {
    localStorage.setItem('sys_alerts', JSON.stringify(alerts));
    return { alerts };
  }),
}));
