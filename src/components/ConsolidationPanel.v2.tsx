/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ConsolidationPanel.v2.tsx
 * 
 * Painel visual para gerenciar registros consolidados por data.
 * Permite:
 * - Ver histórico cronológico de todos os dias consolidados
 * - Consolidar manualmente o dia de hoje
 * - Consolidar todos os dias de uma vez
 * - Exportar para Google Sheets (3 abas organizadas)
 * - Ver detalhes de um dia específico (setores + colaboradores)
 */

import React, { useState, useMemo } from "react";
import { ConsolidationService, ConsolidadoDia } from "../services/consolidationService.v2";
import { HistoricoRegistro, Setor, Colaborador, UserRole } from "../types";
import { exportarPlanilhaOrganizada } from "../hooks/useMidnightConsolidation";
import { Calendar, RefreshCw, FileSpreadsheet, List, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface Props {
  historico: HistoricoRegistro[];
  setores: Setor[];
  colaboradores: Colaborador[];
  currentRole: UserRole;
  spreadsheetId: string;
  googleSheetsService: any;
  addToast: (t: { title: string; message: string; type: string; duration?: number }) => void;
}

export const ConsolidationPanel: React.FC<Props> = ({
  historico,
  setores,
  colaboradores,
  currentRole,
  spreadsheetId,
  googleSheetsService,
  addToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  // Carrega do cache local
  const consolidados = useMemo(() => {
    return ConsolidationService.carregarCache();
  }, [cacheVersion, historico.length]);

  const stats = useMemo(() => {
    return ConsolidationService.estatisticas(consolidados);
  }, [consolidados]);

  const hoje = new Date().toLocaleDateString("pt-BR");
  const consolidadoHoje = consolidados.find((c) => c.data === hoje);

  // ─── AÇÕES ───

  const handleConsolidarHoje = () => {
    setLoading(true);
    try {
      ConsolidationService.consolidarUmDia(hoje, historico, setores, colaboradores);
      setCacheVersion((v) => v + 1);
      addToast({
        title: "✅ Dia Consolidado",
        message: `Registros de ${hoje} organizados e salvos.`,
        type: "success",
        duration: 4000,
      });
    } catch (err) {
      addToast({
        title: "❌ Erro",
        message: "Falha ao consolidar o dia.",
        type: "danger",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConsolidarTodos = () => {
    setLoading(true);
    try {
      ConsolidationService.consolidarTodos(historico, setores, colaboradores);
      setCacheVersion((v) => v + 1);
      addToast({
        title: "✅ Tudo Consolidado",
        message: `${consolidados.length} dias organizados no cache local.`,
        type: "success",
        duration: 4000,
      });
    } catch (err) {
      addToast({
        title: "❌ Erro",
        message: "Falha ao consolidar todos os dias.",
        type: "danger",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    if (consolidados.length === 0) {
      addToast({
        title: "⚠️ Nada para exportar",
        message: "Consolide os dados primeiro.",
        type: "warning",
        duration: 4000,
      });
      return;
    }
    setExporting(true);
    try {
      const ok = await exportarPlanilhaOrganizada(googleSheetsService, spreadsheetId, consolidados);
      addToast({
        title: ok ? "✅ Exportado" : "⚠️ Falha parcial",
        message: ok
          ? `Planilha atualizada com ${consolidados.length} dias em 3 abas organizadas.`
          : "Verifique o ID da planilha e as permissões.",
        type: ok ? "success" : "warning",
        duration: 5000,
      });
    } catch (err) {
      addToast({
        title: "❌ Erro de exportação",
        message: "Falha ao exportar para Google Sheets.",
        type: "danger",
        duration: 5000,
      });
    } finally {
      setExporting(false);
    }
  };

  // ─── RENDER ───

  const statusColors: Record<string, string> = {
    Excelente: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Bom: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    Regular: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Crítico: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const selected = selectedDate
    ? consolidados.find((c) => c.data === selectedDate)
    : null;

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
        <div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Calendar className="text-indigo-400" size={20} />
            <span>Registros Consolidados por Data</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-0.5 font-mono">
            {stats
              ? `${stats.totalDias} dias no histórico • Último: ${stats.ultimoDia} (${stats.ultimoStatus})`
              : "Nenhum dado consolidado ainda"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {(Object.entries(stats.porStatus) as [string, number][]).map(([status, count]) =>
                count > 0 ? (
                  <span
                    key={status}
                    className={`px-2 py-0.5 rounded border font-semibold ${statusColors[status] || "text-zinc-400 border-zinc-800"}`}
                  >
                    {status}: {count}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          id="btn-consolidar-hoje"
          onClick={handleConsolidarHoje}
          disabled={loading}
          className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-left hover:border-indigo-500/40 hover:bg-zinc-800/50 transition-all disabled:opacity-50 group"
        >
          <div className="text-indigo-400 mb-1 group-hover:scale-110 transition-transform"><Calendar size={22} /></div>
          <div className="text-white text-xs font-bold mt-1">Consolidar Hoje</div>
          <div className="text-zinc-500 text-[10px]">
            {consolidadoHoje ? "Atualizar hoje" : "Criar consolidado"}
          </div>
        </button>

        <button
          id="btn-consolidar-tudo"
          onClick={handleConsolidarTodos}
          disabled={loading}
          className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-left hover:border-emerald-500/40 hover:bg-zinc-800/50 transition-all disabled:opacity-50 group"
        >
          <div className="text-emerald-400 mb-1 group-hover:scale-110 transition-transform"><RefreshCw size={22} /></div>
          <div className="text-white text-xs font-bold mt-1">Consolidar Tudo</div>
          <div className="text-zinc-500 text-[10px]">
            {historico.length} registros brutos
          </div>
        </button>

        <button
          id="btn-exportar-sheets"
          onClick={handleExportar}
          disabled={exporting || consolidados.length === 0}
          className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-left hover:border-amber-500/40 hover:bg-zinc-800/50 transition-all disabled:opacity-50 group"
        >
          <div className="text-amber-400 mb-1 group-hover:scale-110 transition-transform"><FileSpreadsheet size={22} /></div>
          <div className="text-white text-xs font-bold mt-1">
            {exporting ? "Exportando..." : "Exportar Sheets"}
          </div>
          <div className="text-zinc-500 text-[10px]">
            {consolidados.length} dias (3 abas)
          </div>
        </button>

        <button
          id="btn-ver-todos"
          onClick={() => setSelectedDate(null)}
          className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-left hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group"
        >
          <div className="text-zinc-400 mb-1 group-hover:scale-110 transition-transform"><List size={22} /></div>
          <div className="text-white text-xs font-bold mt-1">Ver Todos</div>
          <div className="text-zinc-500 text-[10px]">
            {consolidados.length} dias
          </div>
        </button>
      </div>

      {/* RESUMO DE HOJE */}
      {consolidadoHoje && (
        <div className="rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Resumo Hoje — {consolidadoHoje.data}</span>
            </h3>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${statusColors[consolidadoHoje.statusGeral]}`}>
              {consolidadoHoje.statusGeral}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Metric label="Setores" value={consolidadoHoje.totalSetores} />
            <Metric label="Média UPH" value={consolidadoHoje.mediaUPH} />
            <Metric label="Média ATIV" value={consolidadoHoje.mediaAtiv} />
            <Metric label="Promessa" value={`${consolidadoHoje.mediaPromessa}%`} />
            <Metric label="Nota 5S" value={`${consolidadoHoje.mediaNota5S}%`} />
            <Metric label="Colaboradores" value={consolidadoHoje.detalhesColaborador.length} />
          </div>
        </div>
      )}

      {/* LISTA CRONOLÓGICA */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <List size={14} className="text-indigo-400" />
            <span>Histórico Cronológico Consolidado</span>
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">
            {consolidados.length} {consolidados.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {consolidados.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-sm">
            Nenhum registro consolidado no momento. Clique em <strong className="text-indigo-400">"Consolidar Tudo"</strong> ou grave novos turnos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-mono text-[11px]">
                  <th className="text-left p-3 font-semibold">Data</th>
                  <th className="text-left p-3 font-semibold">Semana</th>
                  <th className="text-center p-3 font-semibold">Setores</th>
                  <th className="text-center p-3 font-semibold">UPH</th>
                  <th className="text-center p-3 font-semibold">ATIV</th>
                  <th className="text-center p-3 font-semibold">Promessa</th>
                  <th className="text-center p-3 font-semibold">5S</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  <th className="text-center p-3 font-semibold">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {[...consolidados].reverse().map((c) => (
                  <tr
                    key={c.dataISO}
                    className={`hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      selectedDate === c.data ? "bg-indigo-950/20 border-l-2 border-indigo-500" : ""
                    }`}
                    onClick={() => setSelectedDate(c.data === selectedDate ? null : c.data)}
                  >
                    <td className="p-3 text-zinc-200 font-mono font-medium">{c.data}</td>
                    <td className="p-3 text-zinc-400 font-mono">{c.semana}</td>
                    <td className="p-3 text-center text-zinc-300 font-mono">{c.totalSetores}</td>
                    <td className="p-3 text-center text-zinc-200 font-mono font-bold">{c.mediaUPH}</td>
                    <td className="p-3 text-center text-zinc-300 font-mono">{c.mediaAtiv}</td>
                    <td className="p-3 text-center text-zinc-300 font-mono">{c.mediaPromessa}%</td>
                    <td className="p-3 text-center text-zinc-300 font-mono">{c.mediaNota5S}%</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${statusColors[c.statusGeral]}`}>
                        {c.statusGeral}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-indigo-400 text-[11px] font-medium flex items-center justify-center gap-1">
                        {selectedDate === c.data ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {selectedDate === c.data ? "Fechar" : "Ver"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETALHES DO DIA SELECIONADO */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Setores */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4 shadow-lg">
            <h4 className="text-white font-bold text-xs uppercase mb-3 flex items-center justify-between">
              <span>🏭 Setores Ativos — {selected.data}</span>
              <span className="text-zinc-500 font-mono text-[10px]">{selected.detalhesSetor.length} setores</span>
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selected.detalhesSetor.map((s) => (
                <div
                  key={s.setorId}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-zinc-200 font-semibold truncate">{s.setorNome}</div>
                    <div className="text-zinc-500 text-[10px]">{s.resp}</div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-zinc-400">UPH <strong className="text-zinc-200">{s.uph}</strong></span>
                    <span className="text-zinc-400">ATIV <strong className="text-zinc-200">{s.ativ}</strong></span>
                    <span className="text-zinc-400">Prom. <strong className="text-zinc-200">{s.promessa}%</strong></span>
                    {s.infracaoSeguranca && (
                      <span className="text-red-400 font-bold flex items-center gap-0.5 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/50">
                        <AlertTriangle size={10} /> BSI
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Colaboradores */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4 shadow-lg">
            <h4 className="text-white font-bold text-xs uppercase mb-3 flex items-center justify-between">
              <span>👥 Colaboradores Ativos — {selected.data}</span>
              <span className="text-zinc-500 font-mono text-[10px]">{selected.detalhesColaborador.length} pessoas</span>
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selected.detalhesColaborador.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-zinc-200 font-semibold truncate">{c.nome}</div>
                    <div className="text-zinc-500 text-[10px]">Setor {c.setor}</div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.status === "Presente" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {c.status}
                    </span>
                    <span className="text-zinc-400">{c.horas}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/80 p-2.5 text-center">
    <div className="text-zinc-500 text-[9.5px] uppercase tracking-wider font-mono font-semibold">{label}</div>
    <div className="text-white text-sm font-black mt-0.5 font-mono">{value}</div>
  </div>
);
