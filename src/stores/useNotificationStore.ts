import { create } from 'zustand';
import { AlertLog } from '../types';
import { ToastNotification } from '../types/Notification';

interface NotificationState {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  alerts: AlertLog[];
  addAlert: (alert: Omit<AlertLog, 'id' | 'hora' | 'lido'>) => void;
  markAsRead: (id: string) => void;
  clearAlerts: () => void;
  setAlerts: (alerts: AlertLog[]) => void;
}

const getInitialAlerts = (): AlertLog[] => {
  const s = localStorage.getItem('tower_alerts');
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
  toasts: [],
  addToast: (toastData) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toastData, id, timestamp: Date.now() } as ToastNotification
      ]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, toastData.duration || 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearAllToasts: () => set({ toasts: [] }),

  
  addAlert: (alertData) => set((state) => {
    const newAlert: AlertLog = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lido: false,
    };
    const updated = [newAlert, ...state.alerts];
    localStorage.setItem('tower_alerts', JSON.stringify(updated));
    return { alerts: updated };
  }),
  
  markAsRead: (id) => set((state) => {
    const updated = state.alerts.map((a) => (a.id === id ? { ...a, lido: true } : a));
    localStorage.setItem('tower_alerts', JSON.stringify(updated));
    return { alerts: updated };
  }),
  
  clearAlerts: () => set(() => {
    localStorage.setItem('tower_alerts', JSON.stringify([]));
    return { alerts: [] };
  }),

  setAlerts: (alerts) => set(() => {
    localStorage.setItem('tower_alerts', JSON.stringify(alerts));
    return { alerts };
  }),
}));
