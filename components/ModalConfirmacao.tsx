import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ModalConfirmacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  recordCount?: number;
}

export const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar Exclusão",
  cancelLabel = "Cancelar",
  recordCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-card w-full max-w-md border border-red-500/30 bg-zinc-950/95 rounded-2xl shadow-2xl overflow-hidden relative"
        id="modal-confirmacao"
      >
        {/* Header decoration */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 w-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">
                {title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                {description}
              </p>
            </div>
          </div>

          {recordCount !== undefined && recordCount > 0 && (
            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-500">Registros afetados:</span>
              <span className="text-red-400 font-bold uppercase tracking-wider">
                {recordCount} registros
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end font-mono">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/15 hover:shadow-red-600/30 transition cursor-pointer border border-red-500/30"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
