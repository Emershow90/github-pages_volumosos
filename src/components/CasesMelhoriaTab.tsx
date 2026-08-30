import React, { useState, useMemo } from "react";
import { useActionPlanStore } from "../stores/useActionPlanStore";
import {
  Award,
  TrendingUp,
  Filter,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  User,
  Zap,
} from "lucide-react";

export const CasesMelhoriaTab: React.FC = () => {
  const { cases } = useActionPlanStore();
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");

  const casesFiltrados = useMemo(() => {
    return cases.filter((c) => {
      return filtroCategoria === "Todas" || c.categoria === filtroCategoria;
    });
  }, [cases, filtroCategoria]);

  // Estatísticas do Portfólio
  const stats = useMemo(() => {
    const totalGanhos = cases.reduce((acc, c) => acc + (c.ganhoPercentual > 0 ? c.ganhoPercentual : 0), 0);
    const mediaGanho = cases.length > 0 ? Math.round((totalGanhos / cases.length) * 10) / 10 : 0;
    const padronizados = cases.filter((c) => c.statusPadronizacao === "Padronizado no POP").length;

    return {
      total: cases.length,
      mediaGanho,
      padronizados,
    };
  }, [cases]);

  return (
    <div className="space-y-4 p-3 md:p-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Award size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              🏆 Central de Resultados & Portfólio de Melhorias
            </h1>
            <p className="text-xs text-slate-400">
              Histórico de cases validados, ganhos mensurados de produtividade e padronizações em POP.
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#0f111a] border border-purple-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs text-slate-300 font-medium">Cases Registrados:</span>
            <span className="text-sm font-mono font-black text-purple-300">{stats.total}</span>
          </div>
          <div className="bg-[#0f111a] border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-300 font-medium">Ganho Médio:</span>
            <span className="text-sm font-mono font-black text-emerald-400">+{stats.mediaGanho}%</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro */}
      <div className="bg-[#0b0b10] border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold uppercase">Categoria:</span>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-[#12131c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="Todas">Todas as Categorias</option>
            <option value="Produtividade">Produtividade</option>
            <option value="Qualidade">Qualidade</option>
            <option value="Processo">Processo</option>
            <option value="Ergonomia & Segurança">Ergonomia & Segurança</option>
            <option value="SLA">SLA</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Exibindo <span className="font-mono text-white font-bold">{casesFiltrados.length}</span> cases validados
        </div>
      </div>

      {/* Grid de Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {casesFiltrados.map((item) => {
          const isPositivo = item.ganhoPercentual >= 0;
          return (
            <div
              key={item.id}
              className="bg-[#0b0b10] border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-xl relative overflow-hidden"
            >
              {/* Header do Case */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase">
                      {item.categoria}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-500" />
                      {item.setor}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{item.titulo}</h3>
                </div>

                <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={12} />
                  <span>{item.statusPadronizacao}</span>
                </span>
              </div>

              {/* Visual Antes x Ação x Depois */}
              <div className="bg-[#07070a] border border-white/5 rounded-xl p-3 grid grid-cols-3 gap-2 text-center items-center font-mono">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block font-sans font-semibold">Antes</span>
                  <span className="text-sm font-bold text-rose-400">
                    {item.valorAntes} {item.unidade}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="p-1 bg-white/5 rounded-full mb-0.5">
                    <Zap size={12} className="text-amber-400" />
                  </div>
                  <span className="text-[8px] uppercase text-slate-400 font-sans">Ação Aplicada</span>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-500 block font-sans font-semibold">Depois</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {item.valorDepois} {item.unidade}
                  </span>
                </div>
              </div>

              {/* Ganho % em Destaque */}
              <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 px-3 py-2 rounded-lg">
                <span className="text-xs font-semibold text-emerald-300">Resultado Medido:</span>
                <span className="text-sm font-mono font-black text-emerald-400 flex items-center gap-1">
                  <TrendingUp size={14} />
                  {isPositivo ? `+${item.ganhoPercentual}%` : `${item.ganhoPercentual}%`}
                </span>
              </div>

              {/* Detalhes e Aprendizados */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                    Causa Raiz & Ação:
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{item.acaoImplementada}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                    Impacto Operacional & Aprendizado:
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed italic">{item.aprendizados}</p>
                </div>
              </div>

              {/* Footer do Case */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <User size={11} /> {item.responsavel}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {item.dataInicio} a {item.dataFim}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
