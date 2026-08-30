import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./torre-theme.css";

/**
 * useUndoableDelete + DeleteUndoToast
 * ------------------------------------
 * Exclusão de registros (auditoria, matriz KPI, radar de lojas) com
 * uma janela de undo de N segundos antes da exclusão ser efetivada,
 * inspirada no toast "crumple & toss". Evita chamadas destrutivas
 * imediatas ao Supabase/Firestore por clique acidental.
 *
 * Uso:
 * const { pending, requestDelete, undo } = useUndoableDelete(
 *   (id) => actuallyDeleteFromSupabase(id)
 * );
 * ...
 * <button onClick={() => requestDelete(record.id, record.label)}>Excluir</button>
 * <DeleteUndoToast pending={pending} onUndo={undo} />
 */

export type PendingDelete = { id: string; label: string } | null;

export function useUndoableDelete(commitDelete: (id: string) => void, windowMs = 5000) {
  const [pending, setPending] = useState<PendingDelete>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestDelete = useCallback(
    (id: string, label: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPending({ id, label });
      timerRef.current = setTimeout(() => {
        commitDelete(id);
        setPending(null);
      }, windowMs);
    },
    [commitDelete, windowMs]
  );

  const undo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(null);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { pending, requestDelete, undo, windowMs };
}

type ToastProps = {
  pending: PendingDelete;
  onUndo: () => void;
  windowMs?: number;
};

export function DeleteUndoToast({ pending, onUndo, windowMs = 5000 }: ToastProps) {
  return (
    <div className="torre-mono fixed bottom-6 left-1/2 z-[99999] -translate-x-1/2">
      <AnimatePresence>
        {pending && (
          <motion.div
            key={pending.id}
            initial={{ opacity: 0, y: 16, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 12, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl"
            style={{
              background: "var(--torre-bg-elevated)",
              border: "1px solid var(--torre-carmine)",
            }}
          >
            <span style={{ color: "var(--torre-carmine)" }}>🗑</span>
            <span className="text-sm font-medium" style={{ color: "var(--torre-text)" }}>
              "{pending.label}" será excluído
            </span>

            <button
              onClick={onUndo}
              className="ml-2 rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
              style={{
                background: "var(--torre-emerald-dim)",
                color: "var(--torre-emerald)",
                border: "1px solid var(--torre-emerald)",
              }}
            >
              Desfazer
            </button>

            {/* anel de contagem regressiva */}
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="none" stroke="var(--torre-border)" strokeWidth="2" />
              <motion.circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="var(--torre-carmine)"
                strokeWidth="2"
                strokeDasharray={2 * Math.PI * 8}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 8 }}
                transition={{ duration: windowMs / 1000, ease: "linear" }}
                transform="rotate(-90 10 10)"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
