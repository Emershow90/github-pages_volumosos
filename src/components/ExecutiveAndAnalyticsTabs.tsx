/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Setor, CapacidadeSetor, AlertLog, HistoricoRegistro, CopilSetor } from "../types";
import { ExecutivoBarChart, AnalyticsDoubleLineChart, HourlyBarChart } from "./CommandCharts";
import { TrendingUp, AlertOctagon, Zap, Shield, HelpCircle, Activity } from "lucide-react";

interface ExecutivoTabProps {
  setores: Setor[];
  capacidade: CapacidadeSetor[];
  alerts: AlertLog[];
  historico: HistoricoRegistro[];
  copilData: Record<string, CopilSetor>;
  calcCopilNota: (kpi: any) => string;
}

export const ExecutivoTab: React.FC<ExecutivoTabProps> = ({
  setores,
  capacidade,
  alerts,
  historico,
  copilData,
  calcCopilNota,
}) => {
  // Compute indicators
  const totalVolume = setores.reduce((sum, s) => sum + s.ativ, 0);
  const mediaUPH = setores.length ? Math.round(setores.reduce((sum, s) => sum + s.uph, 0) / setores.length) : 0;
  const mediaSLA = setores.length ? parseFloat((setores.reduce((sum, s) => sum + s.promessa, 0) / setores.length).toFixed(1)) : 0;
  const capTotal = capacidade.reduce((sum, c) => sum + c.abertura, 0);
  const totalRiscoSetores = setores.filter((s) => s.bsi < 99 || s.infracaoSeguranca).length;

  // Find bottleneck (sector with lowest UPH)
  const gargalo = setores.length
    ? setores.reduce((min, s) => (s.uph > 0 && s.uph < min.uph ? s : min), setores[0])
    : null;

  // Render HeatMap helper
  const getHeatmapColor = (s: Setor) => {
    const isOk = s.promessa >= 98 && s.bsi >= 99 && !s.infracaoSeguranca;
    const isWarn = !isOk && (s.promessa >= 95 || s.bsi >= 95);
    return {
      dot: isOk ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-red-500 pulse-anim",
      label: isOk ? "Normal" : isWarn ? "Atenção" : "Crítico",
      border: isOk ? "border-emerald-500/20" : isWarn ? "border-amber-500/20" : "border-red-500/30 neon-border-red",
    };
  };

  // Convert historico to simple graph items if empty
  const mockTrendData = [
    { data: "22/06", ativ: 12000, uph: 450, promessa: 98 },
    { data: "23/06", ativ: 14500, uph: 480, promessa: 99 },
    { data: "24/06", ativ: 15100, uph: 510, promessa: 98.5 },
    { data: "25/06", ativ: 13900, uph: 490, promessa: 99.2 },
    { data: "26/06", ativ: 16200, uph: 520, promessa: 97.8 },
    { data: "27/06", ativ: 15899, uph: 550, promessa: 100 },
    { data: "28/06", ativ: 17200, uph: 540, promessa: 99.5 },
  ];

  const graphData = historico.length > 0
    ? historico.map((h) => ({ data: h.data, ativ: h.ativ, uph: h.uph, promessa: h.promessa }))
    : mockTrendData;

  const criticalAlerts = alerts.filter((a) => a.prioridade === "critica" && !a.lido);

  return (
    <div className="space-y-6">
      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="kpi-card">
          <div className="kpi-value text-white font-mono">{totalVolume.toLocaleString("pt-BR")}</div>
          <div className="kpi-label">Volume Total</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">Soma ATIV real-time</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-sky-400 font-mono">{mediaUPH}</div>
          <div className="kpi-label">Produtividade Média</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">UPH médio operacional</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-emerald-400 font-mono">{mediaSLA}%</div>
          <div className="kpi-label">Eficiência (SLA)</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">SLA médio da entrega</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-indigo-400 font-mono">{capTotal.toLocaleString("pt-BR")}</div>
          <div className="kpi-label">Capacidade Ativa</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">Meta de abertura</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-amber-500 font-mono">{gargalo ? `S${gargalo.id}` : "—"}</div>
          <div className="kpi-label">Gargalo Ativo</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">Menor UPH ({gargalo?.uph || 0} UPH)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-red-500 font-mono">{totalRiscoSetores}</div>
          <div className="kpi-label">Risco Crítico</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-sans">Setores em perigo/BSI</div>
        </div>
      </div>

      {/* Evolução de Volume */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Evolução do Volume (Histórico recente)</h3>
          <span className="text-[0.55rem] text-zinc-500 font-mono">Fonte: Registros do Sistema</span>
        </div>
        <div className="h-[250px] w-full">
          <ExecutivoBarChart data={graphData} />
        </div>
      </div>

      {/* HeatMap e Alertas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">HeatMap Logístico — Status dos Setores</h3>
            <div className="flex gap-4 text-[0.6rem] font-bold uppercase tracking-widest text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Atenção</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Alerta</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {setores.map((s) => {
              const hState = getHeatmapColor(s);
              return (
                <div key={s.id} className={`glass-card p-4 text-center border ${hState.border}`}>
                  <p className="text-[0.55rem] text-zinc-500 uppercase font-bold mb-2 flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${hState.dot}`}></span>
                    {hState.label}
                  </p>
                  <p className="text-xl font-black text-white font-mono">S{s.id}</p>
                  <p className="text-[0.55rem] text-zinc-500 truncate mt-0.5">{s.resp.split(" ")[0]}</p>
                  
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-1 text-center">
                    <div>
                      <p className="text-xs font-black text-indigo-400 font-mono">{s.uph}</p>
                      <p className="text-[0.45rem] text-zinc-600 uppercase font-bold">UPH</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-white font-mono">{s.promessa}%</p>
                      <p className="text-[0.45rem] text-zinc-600 uppercase font-bold">SLA</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas Rápidos */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 pulse-anim"></span> Alertas de Segurança &amp; SLA
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {criticalAlerts.length > 0 ? (
              criticalAlerts.map((a) => (
                <div key={a.id} className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold text-red-400 mb-1">
                    <span>{a.titulo}</span>
                    <span className="text-[9px] bg-red-500/20 px-1 py-0.2 rounded font-mono">CRÍTICO</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">{a.descricao}</p>
                  <p className="text-[9px] text-zinc-600 font-mono mt-1">{new Date(a.hora).toLocaleTimeString("pt-BR")}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <Shield size={24} className="mx-auto text-emerald-500 opacity-40 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">Tudo Sob Controle</p>
                <p className="text-[10px] mt-1">Nenhum incidente de segurança ou falha crítica de SLA ativo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Consolidado por Setor */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3">Resumo Executivo Consolidado</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[0.55rem] uppercase tracking-widest text-zinc-500 border-b border-white/10">
                <th className="p-3 font-bold">Setor</th>
                <th className="p-3 font-bold">Líder</th>
                <th className="p-3 font-bold text-right">Volume ATIV</th>
                <th className="p-3 font-bold text-right">UPH Real</th>
                <th className="p-3 font-bold text-right">SLA Promessa</th>
                <th className="p-3 font-bold text-right">Auditoria 5S</th>
                <th className="p-3 font-bold text-right">BSI Status</th>
                <th className="p-3 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {setores.map((s) => {
                const ok = s.promessa >= 98 && s.bsi >= 99 && !s.infracaoSeguranca;
                return (
                  <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-3 font-black text-white">S{s.id}</td>
                    <td className="p-3 font-sans text-zinc-400">{s.resp}</td>
                    <td className="p-3 text-right text-white font-bold">{s.ativ.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right text-indigo-400">{s.uph}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">{s.promessa}%</td>
                    <td className="p-3 text-right text-sky-400">{s.nota5s}%</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{s.bsi}%</td>
                    <td className="p-3 text-center">
                      <span className={`status-pill ${ok ? "status-pill-operacao" : "status-pill-bh"}`}>
                        {ok ? "Normal" : "Atenção"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface AnalyticsTabProps {
  setores: Setor[];
  historico: HistoricoRegistro[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ setores, historico }) => {
  // Compute analytics numbers over historical logs
  const totalRecords = historico.length;
  const totalVolumeLog = historico.reduce((sum, h) => sum + h.ativ, 0);
  const mediaUPHLog = totalRecords ? Math.round(historico.reduce((sum, h) => sum + h.uph, 0) / totalRecords) : 0;
  const mediaSlaLog = totalRecords ? parseFloat((historico.reduce((sum, h) => sum + h.promessa, 0) / totalRecords).toFixed(1)) : 0;
  const picoUPHLog = totalRecords ? Math.max(...historico.map((h) => h.uph)) : 0;

  const mockTrendData = [
    { data: "20/06", ativ: 11000, uph: 420, promessa: 97 },
    { data: "21/06", ativ: 12500, uph: 460, promessa: 98 },
    { data: "22/06", ativ: 13000, uph: 450, promessa: 98.2 },
    { data: "23/06", ativ: 14500, uph: 480, promessa: 99 },
    { data: "24/06", ativ: 15100, uph: 510, promessa: 98.5 },
    { data: "25/06", ativ: 13900, uph: 490, promessa: 99.2 },
    { data: "26/06", ativ: 16200, uph: 520, promessa: 97.8 },
    { data: "27/06", ativ: 15899, uph: 550, promessa: 100 },
    { data: "28/06", ativ: 17200, uph: 540, promessa: 99.5 },
  ];

  const graphData = historico.length > 0
    ? historico.map((h) => ({ data: h.data, ativ: h.ativ, uph: h.uph, promessa: h.promessa }))
    : mockTrendData;

  const sortedHistory = [...historico].reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="kpi-value text-white font-mono">
            {(historico.length ? totalVolumeLog : 345000).toLocaleString("pt-BR")}
          </div>
          <div className="kpi-label">Volume Acumulado</div>
          <div className="text-[10px] text-zinc-500 mt-1">Acumulado do período logado</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-sky-400 font-mono">{historico.length ? mediaUPHLog : 480}</div>
          <div className="kpi-label">Produtividade Média</div>
          <div className="text-[10px] text-zinc-500 mt-1">UPH médio histórico</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-emerald-400 font-mono">
            {historico.length ? mediaSlaLog : 98.8}%
          </div>
          <div className="kpi-label">SLA Médio do Turno</div>
          <div className="text-[10px] text-zinc-500 mt-1">Nível de serviço médio</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value text-amber-500 font-mono">{historico.length ? picoUPHLog : 550}</div>
          <div className="kpi-label">Pico de Produtividade</div>
          <div className="text-[10px] text-zinc-500 mt-1">Maior UPH registrado</div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
          Evolução Histórica do Volume &amp; SLA
        </h3>
        <div className="h-[250px] w-full">
          <AnalyticsDoubleLineChart data={graphData} />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
          Distribuição de Produtividade (UPH Horário Estimado)
        </h3>
        <div className="h-[250px] w-full">
          <HourlyBarChart data={graphData} />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
          Registros Históricos Recentes
        </h3>
        <div className="overflow-x-auto custom-scrollbar max-h-[300px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[0.55rem] uppercase tracking-widest text-zinc-500 border-b border-white/10 sticky top-0 bg-[#0c0c0e] z-10">
                <th className="p-3 font-bold">Data/Hora</th>
                <th className="p-3 font-bold text-center">Setor</th>
                <th className="p-3 font-bold text-right">Volume</th>
                <th className="p-3 font-bold text-right">UPH</th>
                <th className="p-3 font-bold text-right">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {sortedHistory.length > 0 ? (
                sortedHistory.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.01]">
                    <td className="p-3 text-zinc-400">{h.data} {h.hora}</td>
                    <td className="p-3 text-center text-white font-black">S{h.setor}</td>
                    <td className="p-3 text-right font-bold text-sky-400">{h.ativ.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right text-indigo-400">{h.uph}</td>
                    <td className="p-3 text-right text-emerald-400">{h.promessa}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 italic">
                    Nenhum registro no histórico. Use a aba "Produtividade" para gravar turnos de produção.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
