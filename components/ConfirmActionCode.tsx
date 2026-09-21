import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./torre-theme.css";

/**
 * ConfirmActionCode
 * -----------------
 * Confirmação de ações críticas (promover usuário a Admin, excluir
 * registro de auditoria, zerar KPI de setor) através de um código de
 * 4 dígitos exibido em "leque de cartas", inspirado no padrão de
 * verificação OTP. Em vez de SMS, o código é gerado no cliente e
 * mostrado na tela — o usuário confirma que viu e digita de volta,
 * criando fricção intencional antes de uma ação irreversível.
 *
 * Uso:
 * <ConfirmActionCode
 *   actionLabel="Promover para Admin"
 *   onConfirm={() => promoteUser(userId)}
 *   onCancel={() => setOpen(false)}
 * />
 */

export type ConfirmActionCodeProps = {
  actionLabel: string;
  severity?: "emerald" | "bronze" | "carmine";
  onConfirm: () => void;
  onCancel: () => void;
};

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function ConfirmActionCode({
  actionLabel,
  severity = "carmine",
  onConfirm,
  onCancel,
}: ConfirmActionCodeProps) {
  const [code] = useState(generateCode);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [fanned, setFanned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setFanned(true), 150);
    inputRef.current?.focus();
    return () => clearTimeout(t);
  }, []);

  const accent = `var(--torre-${severity})`;
  const accentDim = `var(--torre-${severity}-dim)`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === code) {
      onConfirm();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setInput("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="torre-mono w-full max-w-[340px] rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--torre-bg-elevated)",
          border: "1px solid var(--torre-border)",
          borderRadius: "var(--torre-radius)",
        }}
      >
        <p className="text-xs uppercase font-medium" style={{ color: "var(--torre-text-dim)" }}>
          Confirmação de Segurança
        </p>
        <h2 className="mt-1 text-lg font-semibold" style={{ color: "var(--torre-text)" }}>
          {actionLabel}
        </h2>

        {/* leque de 4 cartas revelando o código */}
        <div className="relative mt-6 mb-6 flex h-24 items-center justify-center select-none">
          {code.split("").map((digit, i) => {
            const offset = (i - 1.5) * 14;
            const rotate = (i - 1.5) * 8;
            return (
              <motion.div
                key={i}
                className="absolute flex h-16 w-14 items-center justify-center rounded-xl text-xl font-bold shadow-md"
                style={{
                  background: "var(--torre-bg)",
                  border: `1px solid ${accent}`,
                  color: accent,
                }}
                animate={
                  fanned
                    ? { x: offset, rotate, y: Math.abs(i - 1.5) * 4 }
                    : { x: 0, rotate: 0, y: 0 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.05 }}
              >
                {digit}
              </motion.div>
            );
          })}
        </div>

        <p className="mb-3 text-center text-xs" style={{ color: "var(--torre-text-dim)" }}>
          Digite o código acima para confirmar
        </p>

        <form onSubmit={handleSubmit}>
          <motion.input
            ref={inputRef}
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            className="w-full rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] font-mono outline-none transition-colors"
            style={{
              background: "var(--torre-bg)",
              border: `1px solid ${shake ? "var(--torre-carmine)" : "var(--torre-border)"}`,
              color: "var(--torre-text)",
            }}
            placeholder="••••"
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{ border: "1px solid var(--torre-border)", color: "var(--torre-text-dim)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={input.length < 4}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-all cursor-pointer"
              style={{ background: accentDim, color: accent, border: `1px solid ${accent}` }}
            >
              Confirmar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
