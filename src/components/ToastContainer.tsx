import React from "react";

export interface ToastItem {
  id: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-24 right-5 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`p-4 rounded-xl shadow-2xl border text-white font-semibold flex items-center justify-between gap-3 transition-all duration-300 pointer-events-auto backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-600/95 border-emerald-500"
              : toast.type === "error"
              ? "bg-rose-600/95 border-rose-500"
              : toast.type === "warning"
              ? "bg-amber-600/95 border-amber-500"
              : "bg-blue-600/95 border-blue-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span className="text-xs md:text-sm">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white text-xs font-black p-1 hover:bg-white/10 rounded transition-colors shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
