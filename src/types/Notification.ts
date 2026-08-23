export type ToastType = 'critical' | 'warning' | 'success' | 'info' | 'danger';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  lojaId?: string;
  setor?: string;
  timestamp: number;
  duration?: number; // ms
}

export interface NotificationStore {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}
