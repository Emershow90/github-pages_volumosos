import React from 'react';
import { useToastContext, ToastItem } from '../hooks/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts?: ToastItem[];
  removeToast?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts: propsToasts,
  removeToast: propsRemoveToast,
}) => {
  const toastCtx = useToastContext();

  const toasts = propsToasts || toastCtx?.toasts || [];
  const removeToast = propsRemoveToast || toastCtx?.removeToast || (() => {});

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`p-3.5 rounded-xl shadow-2xl border text-white font-medium text-xs flex items-center justify-between gap-3 transition-all duration-300 pointer-events-auto backdrop-blur-md animate-in slide-in-from-right-5 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 border-emerald-500 shadow-emerald-950/50'
              : toast.type === 'error'
              ? 'bg-rose-600/95 border-rose-500 shadow-rose-950/50'
              : 'bg-blue-600/95 border-blue-500 shadow-blue-950/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-emerald-200" />}
            {toast.type === 'error' && <AlertCircle size={16} className="shrink-0 text-rose-200" />}
            {toast.type === 'info' && <Info size={16} className="shrink-0 text-blue-200" />}
            <span className="truncate">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded transition-colors shrink-0 cursor-pointer"
            aria-label="Fechar notificação"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
