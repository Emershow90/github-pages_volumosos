import React from 'react';
import { motion } from 'motion/react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { ToastNotification as ToastType } from '../types/Notification';
import { useNotificationStore } from '../stores/useNotificationStore';

const iconMap = {
  critical: AlertTriangle,
  warning: AlertCircle,
  success: CheckCircle,
  info: Info
};

const colorMap = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
};

const progressMap = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  info: 'bg-blue-500'
};

export const ToastItem: React.FC<{ toast: ToastType }> = React.memo(({ toast }) => {
  const removeToast = useNotificationStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={{ 
        type: 'spring', 
        damping: 24, 
        stiffness: 280, 
        mass: 0.8 
      }}
      className={`relative w-full max-w-sm rounded-xl border backdrop-blur-md shadow-xl shadow-slate-950/60 overflow-hidden ${colorMap[toast.type]}`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-200">{toast.title}</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>
          {toast.lojaId && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                {toast.lojaId}
              </span>
              {toast.setor && (
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  {toast.setor}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="shrink-0 text-slate-500 hover:text-slate-300 transition p-1 rounded hover:bg-slate-800/50"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        className={`h-0.5 ${progressMap[toast.type]}`}
      />
    </motion.div>
  );
});

ToastItem.displayName = 'ToastItem';
