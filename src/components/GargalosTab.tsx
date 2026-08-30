import React, { useState, useMemo } from "react";
import { SetorData } from "../types/Setor";
import { StoreOperation } from "../types/Radar";
import { DiagnosticoGargalo } from "../types/Gargalo";
import { GargaloService } from "../services/gargaloService";
import {
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  PlusCircle,
  X,
  Target,
  FileText,
  Filter,
} from "lucide-react";

interface GargalosTabProps {
  setores: SetorData[];
  operacoes?: StoreOperation[];
  onCriarPlanoAcao: (gargalo: DiagnosticoGargalo) => void;
}

export const GargalosTab: React.FC<GargalosTabProps> = ({
  setores,
  operacoes,
  onCriarPlanoAcao,
}) => {
  const [filtroNivel, setFiltroNivel] = useState<string>("Todos");
  const [filtroSetor, setFiltroSetor] = useState<string>("Todos");
  const [diagnosticoSelecionado, setDiagnosticoSelecionado] = useState<DiagnosticoGargalo | null>(null);

  // Calcula gargalos dinamicamente a partir dos setores e operações reais
  const todosGargalos = useMemo(() => {
    return GargaloService.analisarGargalos(setores, operacoes);
  }, [setores, operacoes]);

  // Filtros
  const gargalosFiltrados = useMemo(() => {
    return todosGargalos.filter((g) => {
      const matchNivel = filtroNivel === "Todos" || g.prioridadeNivel === filtroNivel;
      const matchSetor = filtroSetor === "Todos" || g.setorNome === filtroSetor;
      return matchNivel && matchSetor;
    });
  }, [todosGargalos, filtroNivel, filtroSetor]);

  // Métricas do Topo
  const criticos = todosGargalos.filter((g) => g.prioridadeNivel === "Critico").length;
  const atencao = todosGargalos.filter((g) => g.prioridadeNivel === "Atencao").length;
  const horasImpactoTotal = Math.round(
    todosGargalos.reduce((acc, g) => acc + g.impactoHorasEstimado, 0) * 10
  ) / 10;

  // Lista única de setores presentes nos gargalos
  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    todosGargalos.forEach((g) => s.add(g.setorNome));
    return Array.from(s);
  }, [todosGargalos]);

  return (
    <div className="space-y-4 p-3 md:p-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
              <Flame size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                🚨 Matriz de Gargalos & Diagnóstico
              </h1>
              <p className="text-xs text-slate-400">
                Detecção em malha fechada: <span className="text-rose-400 font-semibold font-mono">Prioridade = Impacto × Urgência × Frequência</span>
              </p>
            </div>
          </div>
        </div>

        {/* Resumo de Estado Operacional */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#0f111a] border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">Críticos:</span>
            <span className="text-sm font-mono font-black text-rose-400">{criticos}</span>
          </div>
          <div className="bg-[#0f111a] border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-300 font-medium">Atenção:</span>
            <span className="text-sm font-mono font-black text-amber-400">{atencao}</span>
          </div>
          <div className="bg-[#0f111a] border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock size={14} className="text-indigo-400" />
            <span className="text-xs text-slate-300 font-medium">Perda Estimada:</span>
            <span className="text-sm font-mono font-black text-indigo-300">{horasImpactoTotal}h</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-[#0b0b10] border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold uppercase">Filtros:</span>
          
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="bg-[#12131c] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Todos">Todos os Níveis</option>
            <option value="Critico">🔴 Crítico</option>
            <option value="Atencao">🟡 Atenção</option>
            <option value="Controlado">🟢 Controlado</option>
          </select>

          <select
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="bg-[#12131c] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Todos">Todos os Setores</option>
            {setoresUnicos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Exibindo <span className="font-mono text-white font-bold">{gargalosFiltrados.length}</span> de{" "}
          <span className="font-mono">{todosGargalos.length}</span> gargalos identificados
        </div>
      </div>

      {/* Grid de Gargalos */}
      {gargalosFiltrados.length === 0 ? (
        <div className="bg-[#0b0b10] border border-emerald-500/20 rounded-xl p-8 text-center space-y-2">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Operação em Conformidade</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Nenhum desvio crítico ou ponto de estrangulamento detectado nos setores filtrados. Acompanhe a produtividade e o ritmo no Cockpit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gargalosFiltrados.map((gargalo, index) => {
            const isCritico = gargalo.prioridadeNivel === "Critico";
            const borderClass = isCritico
              ? "border-rose-500/30 bg-gradient-to-br from-[#160d14] to-[#0b0b10]"
              : "border-amber-500/30 bg-gradient-to-br from-[#16120d] to-[#0b0b10]";
            
            const badgeClass = isCritico
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30";

            return (
              <div
                key={gargalo.id}
                className={`border rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-200 hover:border-white/20 ${borderClass}`}
              >
                <div className="space-y-3">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        GARGALO #{index + 1} • {gargalo.setorNome}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 line-clamp-1 mt-0.5">
                        {gargalo.titulo}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${badgeClass}`}>
                      {gargalo.prioridadeNivel === "Critico" ? "🔴 Crítico" : "🟡 Atenção"}
                    </span>
                  </div>

                  {/* Indicador & Desvio */}
                  <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 rounded-lg p-2.5 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Atual</span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {gargalo.valorAtual} {gargalo.unidade}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Meta</span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {gargalo.meta} {gargalo.unidade}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Desvio</span>
                      <span className="text-xs font-mono font-bold text-rose-400 flex items-center justify-center gap-0.5">
                        <TrendingDown size={10} />
                        {gargalo.desvioPercentual}%
                      </span>
                    </div>
                  </div>

                  {/* Causa Provável & Impacto */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-tight text-slate-300">
                        <strong className="text-slate-200">Causa:</strong> {gargalo.causaProvavel}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock size={12} className="text-indigo-400 shrink-0" />
                      <span>Impacto estimado: <strong className="text-indigo-300 font-mono">{gargalo.impactoHorasEstimado}h</strong> operacionais</span>
                    </div>
                  </div>
                </div>

                {/* Ações do Card */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setDiagnosticoSelecionado(gargalo)}
                    className="py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText size={12} />
                    <span>Diagnóstico</span>
                  </button>
                  <button
                    onClick={() => onCriarPlanoAcao(gargalo)}
                    className="py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <PlusCircle size={12} />
                    <span>Criar 5W2H</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Diagnóstico Completo (Árvore de Causa Raiz) */}
      {diagnosticoSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0e15] border border-white/10 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Diagnóstico Estruturado de Causa Raiz
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {diagnosticoSelecionado.setorNome} • {diagnosticoSelecionado.processo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosticoSelecionado(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Árvore Sequencial de Gestão (DADO -> DESVIO -> CAUSA -> IMPACTO -> AÇÃO) */}
            <div className="space-y-3 bg-[#08080c] border border-white/5 rounded-xl p-4 font-mono text-xs">
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase shrink-0">
                  1. PROBLEMA
                </span>
                <span className="text-rose-400 font-bold">{diagnosticoSelecionado.titulo}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 pl-4">
                <ArrowRight size={12} />
              </div>

              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase shrink-0">
                  2. ONDE / QUANDO
                </span>
                <span className="text-slate-200">
                  {diagnosticoSelecionado.setorNome} {diagnosticoSelecionado.rua ? `(Rua ${diagnosticoSelecionado.rua})` : ""} • Turno Atual
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 pl-4">
                <ArrowRight size={12} />
              </div>

              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase shrink-0">
                  3. DESVIO MEDIDO
                </span>
                <span className="text-amber-400 font-bold">
                  {diagnosticoSelecionado.valorAtual} {diagnosticoSelecionado.unidade} vs Meta de {diagnosticoSelecionado.meta} ({diagnosticoSelecionado.desvioPercentual}%)
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 pl-4">
                <ArrowRight size={12} />
              </div>

              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase shrink-0">
                  4. CAUSA PROVÁVEL
                </span>
                <span className="text-slate-300 font-sans">{diagnosticoSelecionado.causaProvavel}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 pl-4">
                <ArrowRight size={12} />
              </div>

              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase shrink-0">
                  5. IMPACTO ESTIMADO
                </span>
                <span className="text-indigo-400 font-bold">
                  {diagnosticoSelecionado.impactoHorasEstimado} horas de capacidade produtiva
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 pl-4">
                <ArrowRight size={12} />
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase shrink-0">
                  6. RECOMENDAÇÃO
                </span>
                <span className="text-emerald-300 font-sans">{diagnosticoSelecionado.acaoRecomendada}</span>
              </div>
            </div>

            {/* Ações Modal */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDiagnosticoSelecionado(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  onCriarPlanoAcao(diagnosticoSelecionado);
                  setDiagnosticoSelecionado(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg transition-all"
              >
                <PlusCircle size={14} />
                <span>Converter em Plano de Ação 5W2H</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
