import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCollaboratorStore } from "../stores/useCollaboratorStore";
import { ColaboradorStatus } from "../types";
import { ChevronLeft, ChevronRight, User, ShieldCheck, Clock, Award, Users } from "lucide-react";
import "./torre-theme.css";

/**
 * CollaboratorCarousel
 * --------------------
 * Carrossel interativo exibido no painel de turno, alimentado reativamente
 * pela `useCollaboratorStore`. Permite filtrar por setores (87, 88, 89, 90)
 * e navegar com deslize suave, apresentando o status em tempo real,
 * carga horária DKT e indicadores operacionais de cada colaborador.
 */

interface CollaboratorCarouselProps {
  activeSectorId?: string;
}

const statusColorMap: Record<ColaboradorStatus, { bg: string; text: string; border: string }> = {
  [ColaboradorStatus.Operacao]: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  [ColaboradorStatus.Poli]: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  [ColaboradorStatus.BH]: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  [ColaboradorStatus.Ausente]: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  [ColaboradorStatus.Apoio]: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  [ColaboradorStatus.GestaoEstoque]: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  [ColaboradorStatus.Reabastecimento]: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
};

export const CollaboratorCarousel: React.FC<CollaboratorCarouselProps> = ({ activeSectorId }) => {
  const colaboradores = useCollaboratorStore((state) => state.colaboradores);
  const [selectedFilter, setSelectedFilter] = useState<string>(activeSectorId || "all");
  const [scrollIndex, setScrollIndex] = useState(0);

  const availableSectors = ["87", "88", "89", "90"];

  const filtered = colaboradores.filter((c) => {
    if (selectedFilter !== "all") {
      return c.setor === `Setor ${selectedFilter}` || c.setor === selectedFilter;
    }
    return availableSectors.some((s) => c.setor === `Setor ${s}` || c.setor === s);
  });

  const itemsPerPage = 4;
  const maxPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePrev = () => {
    setScrollIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setScrollIndex((prev) => Math.min(maxPages - 1, prev + 1));
  };

  const visibleItems = filtered.slice(scrollIndex * itemsPerPage, (scrollIndex + 1) * itemsPerPage);

  return (
    <div className="glass-card p-5 border border-white/10 bg-zinc-950/60 rounded-2xl shadow-xl space-y-4">
      {/* Header com Filtros de Setor (87-90) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users size={14} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Escala de Turno &amp; Colaboradores
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Alocação dos setores 87, 88, 89 e 90 ({filtered.length} ativos)
            </p>
          </div>
        </div>

        {/* Badges de Filtro */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => { setSelectedFilter("all"); setScrollIndex(0); }}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              selectedFilter === "all"
                ? "bg-indigo-600 text-white shadow"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Todos
          </button>
          {availableSectors.map((sec) => (
            <button
              key={sec}
              onClick={() => { setSelectedFilter(sec); setScrollIndex(0); }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                selectedFilter === sec
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Setor {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Track do Carrossel */}
      <div className="relative overflow-hidden min-h-[140px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-500 italic text-xs">
            Nenhum colaborador cadastrado nos setores selecionados.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedFilter}-${scrollIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
            >
              {visibleItems.map((colab) => {
                const style = statusColorMap[colab.status] || {
                  bg: "bg-zinc-800",
                  text: "text-zinc-300",
                  border: "border-zinc-700",
                };
                return (
                  <div
                    key={colab.id}
                    className="group relative bg-black/40 hover:bg-black/60 border border-white/5 hover:border-indigo-500/30 rounded-xl p-3.5 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {colab.foto ? (
                            <img
                              src={colab.foto}
                              alt={colab.nome}
                              className="w-8 h-8 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                              {colab.nome.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                                {colab.nome}
                              </h4>
                              {colab.lider && (
                                <ShieldCheck size={12} className="text-amber-400 shrink-0" title="Líder de Turno" />
                              )}
                            </div>
                            <span className="text-[9.5px] text-zinc-500 font-mono block truncate">
                              {colab.cargo || colab.funcao || colab.setor}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border} shrink-0`}>
                          {colab.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-zinc-500" />
                        <span>{colab.horas || 0}h DKT</span>
                      </div>
                      {colab.produtividade ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Award size={11} />
                          <span>{colab.produtividade} UPH</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-sans text-[9px]">S{colab.setor.replace("Setor ", "")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Controles de Paginação */}
      {maxPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[10px] text-zinc-500 font-mono">
            Página {scrollIndex + 1} de {maxPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              disabled={scrollIndex === 0}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNext}
              disabled={scrollIndex >= maxPages - 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
