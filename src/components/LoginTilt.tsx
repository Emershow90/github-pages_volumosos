import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import "./torre-theme.css";

/**
 * LoginTilt
 * ---------
 * Tela de login da Torre de Comando com o card inclinando levemente
 * em direção ao cursor (efeito "Lunara"), sobre fundo com textura
 * sutil do tema Obsidian. Mantém RBAC dual (papel + setor) no submit.
 *
 * Uso:
 * <LoginTilt onSubmit={(email, password) => signIn(email, password)} />
 */

type Props = {
  onSubmit: (email: string, password: string) => Promise<void> | void;
  errorMessage?: string;
};

export default function LoginTilt({ onSubmit, errorMessage }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: ny * -8, ry: nx * 8 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="torre-mono flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 30% 20%, rgba(16,185,129,0.08), transparent 45%), var(--torre-bg)",
      }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: "spring", stiffness: 150, damping: 14 }}
        style={{
          transformPerspective: 900,
          background: "var(--torre-bg-elevated)",
          border: "1px solid var(--torre-border)",
          borderRadius: "var(--torre-radius)",
        }}
        className="w-full max-w-[360px] p-8 shadow-2xl"
      >
        <div className="mb-1 flex items-center gap-2 text-xs uppercase" style={{ color: "var(--torre-emerald)" }}>
          <span>●</span> Torre de Comando
        </div>
        <h1 className="mb-1 text-2xl font-semibold" style={{ color: "var(--torre-text)" }}>
          Acessar painel
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--torre-text-dim)" }}>
          Setores 87–90 · Volumosos
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="E-mail corporativo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg px-4 py-3 text-sm outline-none transition-colors"
            style={{ background: "var(--torre-bg)", border: "1px solid var(--torre-border)", color: "var(--torre-text)" }}
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg px-4 py-3 text-sm outline-none transition-colors"
            style={{ background: "var(--torre-bg)", border: "1px solid var(--torre-border)", color: "var(--torre-text)" }}
          />

          {errorMessage && (
            <p className="text-xs font-medium" style={{ color: "var(--torre-carmine)" }}>
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-2 rounded-lg py-3 text-sm font-semibold disabled:opacity-50 transition-all cursor-pointer"
            style={{ background: "var(--torre-emerald-dim)", color: "var(--torre-emerald)", border: "1px solid var(--torre-emerald)" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--torre-text-dim)" }}>
          Novos acessos entram como <span style={{ color: "var(--torre-bronze)" }}>consulta / pendente</span> até aprovação.
        </p>
      </motion.div>
    </div>
  );
}
