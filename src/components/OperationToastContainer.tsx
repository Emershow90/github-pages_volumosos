import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { ToastItem } from './ToastNotification';

export const OperationToastContainer: React.FC = React.memo(() => {
  const toasts = useNotificationStore((s) => s.toasts);

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={`optoast-${toast.id}`} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});

OperationToastContainer.displayName = 'OperationToastContainer';
