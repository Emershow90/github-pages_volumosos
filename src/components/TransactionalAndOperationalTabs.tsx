/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Setor,
  Colaborador,
  CapacidadeSetor,
  CopilSetor,
  ColaboradorStatus,
} from "../types";
import { MixDoughnutChart, CopilBarChart, ProdHorasHorizontalBar } from "./CommandCharts";
import { Minimize2, Plus, RefreshCw, FileText, Upload, ShieldAlert, Sparkles, Sliders, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

// ==========================================
// CAPACIDADE TAB
// ==========================================
interface CapacidadeTabProps {
  setores: Setor[];
  colaboradores: Colaborador[];
  capacidade: CapacidadeSetor[];
  onUpdateCapacidade: (sid: string, field: "abertura" | "fechoHora", value: number) => void;
}

export const CapacidadeTab: React.FC<CapacidadeTabProps> = ({
  setores,
  colaboradores,
  capacidade,
  onUpdateCapacidade,
}) => {
  const totalArmazemMeta = capacidade.reduce((sum, c) => sum + c.abertura, 0);

  return (
    <div className="glass-card p-6 border-l-2 border-indigo-500/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">Consolidado de Turnos &amp; Capacidade</h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-semibold">Previsões operacionais de processamento por setor</p>
        </div>
        <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center gap-4">
          <span className="text-[0.55rem] text-zinc-400 font-bold uppercase tracking-widest">Abertura Armazém Meta</span>
          <span className="text-2xl font-black text-white font-mono">{totalArmazemMeta.toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs bg-black/20 border border-white/5 rounded-xl border-collapse">
          <thead>
            <tr className="text-[0.6rem] text-zinc-500 uppercase border-b border-white/10 bg-white/[0.01]">
              <th className="p-3 font-bold">Setor</th>
              <th className="p-3 font-bold text-center">Pessoas Ativas</th>
              <th className="p-3 font-bold text-right">Abertura Plan (Meta)</th>
              <th className="p-3 font-bold text-right">Fecho/Hora (Meta)</th>
              <th className="p-3 font-bold text-right">Atividade Estimada</th>
              <th className="p-3 font-bold text-right text-white">Real Registado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
            {setores.map((s) => {
              const cap = capacidade.find((c) => c.id === s.id) || { id: s.id, abertura: 0, fechoHora: 0 };
              const pessoasOpCount = colaboradores.filter(
                (c) => c.setor === `Setor ${s.id}` && c.status === ColaboradorStatus.Operacao
              ).length;
              const calcAtiv = cap.fechoHora * pessoasOpCount;

              return (
                <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-3 font-bold text-white font-sans">
                    S{s.id} — {s.resp.split(" ")[0]}
                  </td>
                  <td className="p-3 text-center text-blue-400 font-bold">{pessoasOpCount}</td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      value={cap.abertura}
                      onChange={(e) => onUpdateCapacidade(s.id, "abertura", parseInt(e.target.value) || 0)}
                      className="capacidade-input"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      value={cap.fechoHora}
                      onChange={(e) => onUpdateCapacidade(s.id, "fechoHora", parseInt(e.target.value) || 0)}
                      className="capacidade-input"
                    />
                  </td>
                  <td className="p-3 text-right text-zinc-400">{calcAtiv.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right font-black text-white">{s.ativ.toLocaleString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-zinc-500 border-t border-white/5 pt-4 text-right">
        <span className="opacity-50">Edição em tempo real — as metas salvam automaticamente ao alterar os valores.</span>
      </div>
    </div>
  );
};

// ==========================================
// PRODUTIVIDADE TAB
// ==========================================
interface ProdutividadeTabProps {
  setores: Setor[];
  colaboradores: Colaborador[];
  activeSectorId: string;
  setActiveSectorId: (sid: string) => void;
  onUpdateSetorProd: (sid: string, field: string, value: number) => void;
  onUpdateColaboradorStatus: (index: number, status: ColaboradorStatus) => void;
  onUpdateColaboradorHoras: (index: number, horas: number) => void;
  onGravarTurno: () => void;
}

export const ProdutividadeTab: React.FC<ProdutividadeTabProps> = ({
  setores,
  colaboradores,
  activeSectorId,
  setActiveSectorId,
  onUpdateSetorProd,
  onUpdateColaboradorStatus,
  onUpdateColaboradorHoras,
  onGravarTurno,
}) => {
  const activeS = setores.find((x) => x.id === activeSectorId) || setores[0];

  const hDKT = activeS?.horasDKT || 0;
  const pRec = activeS?.poliRec || 0;
  const rdlHrs = activeS?.rdl || 0;
  const pSaid = activeS?.poliSaid || 0;
  const colVal = activeS?.coletado || 0;

  const macroTotal = hDKT + pRec + rdlHrs;
  const macroSubtotal = macroTotal - pSaid;
  const calculatedUPH = macroSubtotal > 0 ? Math.round(colVal / macroSubtotal) : 0;

  const handleSincronizarDKT = () => {
    const totalSetorHoras = colaboradores
      .filter((c) => c.setor === `Setor ${activeS.id}` && c.status === ColaboradorStatus.Operacao)
      .reduce((sum, c) => sum + c.horas, 0);
    onUpdateSetorProd(activeS.id, "horasDKT", parseFloat(totalSetorHoras.toFixed(1)));
  };

  const sectorColaboradores = colaboradores.filter((c) => c.setor === `Setor ${activeS.id}`);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-l-2 border-rose-500/50 flex items-baseline justify-between">
        <h2 className="text-xl font-black text-white">S{activeS.id} — {activeS.resp.split(" ")[0]}</h2>
        <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Cálculo de UPH &amp; Fluxo de Horas Micro</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="font-black text-white text-sm uppercase">Cálculo Macro Oficial (UPH)</h3>
          <select
            value={activeS.id}
            onChange={(e) => setActiveSectorId(e.target.value)}
            className="inp w-48 font-bold text-indigo-300 focus:outline-none cursor-pointer"
          >
            {setores.map((x) => (
              <option key={x.id} value={x.id}>
                S{x.id} — {x.resp.split(" ")[0]}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-black/30 p-5 rounded-xl border border-white/5">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex flex-col relative pb-3">
              <label className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest mb-1">Horas DKT</label>
              <input
                type="number"
                step="0.1"
                value={hDKT}
                onChange={(e) => onUpdateSetorProd(activeS.id, "horasDKT", parseFloat(e.target.value) || 0)}
                className="prod-input"
              />
              <button
                type="button"
                onClick={handleSincronizarDKT}
                className="absolute bottom-[-10px] left-0 w-full text-[0.5rem] text-indigo-400 font-bold hover:text-indigo-300 transition-colors text-center"
              >
                Sincronizar
              </button>
            </div>
            <span className="text-zinc-600 font-bold mt-2">+</span>
            <div>
              <label className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Poli Rec</label>
              <input
                type="number"
                step="0.1"
                value={pRec}
                onChange={(e) => onUpdateSetorProd(activeS.id, "poliRec", parseFloat(e.target.value) || 0)}
                className="prod-input"
              />
            </div>
            <span className="text-zinc-600 font-bold mt-2">+</span>
            <div>
              <label className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">RDL Hrs</label>
              <input
                type="number"
                step="0.1"
                value={rdlHrs}
                onChange={(e) => onUpdateSetorProd(activeS.id, "rdl", parseFloat(e.target.value) || 0)}
                className="prod-input"
              />
            </div>
            <span className="text-zinc-600 font-bold mt-2">=</span>
            <div className="px-3 bg-indigo-950/20 rounded-xl border border-indigo-500/20 py-1 min-w-[80px] text-center">
              <p className="text-[0.55rem] font-bold text-indigo-400 uppercase tracking-widest">Total Bruto</p>
              <p className="text-base font-black text-indigo-300 font-mono">{macroTotal.toFixed(1)}h</p>
            </div>
            <span className="text-zinc-600 font-bold mt-2">-</span>
            <div>
              <label className="text-[0.55rem] font-bold text-amber-500 uppercase tracking-widest mb-1 block">Poli Saída</label>
              <input
                type="number"
                step="0.1"
                value={pSaid}
                onChange={(e) => onUpdateSetorProd(activeS.id, "poliSaid", parseFloat(e.target.value) || 0)}
                className="prod-input"
              />
            </div>
            <span className="text-zinc-600 font-bold mt-2">=</span>
            <div className="px-3 bg-blue-950/20 rounded-xl border border-blue-500/20 py-1 min-w-[80px] text-center">
              <p className="text-[0.55rem] font-bold text-blue-400 uppercase tracking-widest">Subtotal</p>
              <p className="text-base font-black text-blue-400 font-mono">{macroSubtotal.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-emerald-900/10 rounded-xl border border-emerald-500/20 gap-4">
          <div>
            <label className="text-[0.6rem] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Volume Real Coletado (ATIV)</label>
            <input
              type="number"
              value={colVal}
              onChange={(e) => onUpdateSetorProd(activeS.id, "coletado", parseInt(e.target.value) || 0)}
              className="prod-input w-40 text-xl font-black text-center border-emerald-500/30 text-emerald-400 bg-black/60 py-2 focus:outline-none"
            />
          </div>
          <div className="text-center sm:text-right">
            <p className="text-[0.65rem] font-bold text-blue-400 uppercase tracking-widest mb-1">UPH Calculada do Setor</p>
            <div className="bg-blue-500/10 px-8 py-3 rounded-xl border border-blue-500/30">
              <p className="text-4xl font-black text-blue-400 font-mono">{calculatedUPH}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onGravarTurno}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            Gravar Turno Oficial S{activeS.id}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas da Equipe (Micro) */}
        <div className="glass-card p-6 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <h3 className="font-black text-white text-sm uppercase tracking-widest">Controle de Horas da Equipe (Micro)</h3>
            <span className="text-[0.55rem] text-zinc-500 bg-white/5 px-2 py-0.5 rounded font-mono">Setor S{activeS.id}</span>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[0.6rem] uppercase tracking-widest text-zinc-500 border-b border-white/10">
                  <th className="p-3 font-bold">Colaborador</th>
                  <th className="p-3 font-bold text-center w-32">Status</th>
                  <th className="p-3 font-bold text-center w-24">Horas DKT</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-white/5">
                {sectorColaboradores.map((c) => {
                  const globalIdx = colaboradores.findIndex((co) => co.id === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-bold text-white text-[0.65rem] truncate max-w-[140px]">{c.nome}</td>
                      <td className="p-3 text-center">
                        <select
                          value={c.status}
                          onChange={(e) => onUpdateColaboradorStatus(globalIdx, e.target.value as ColaboradorStatus)}
                          className="status-select bg-black border border-white/10 rounded text-xs px-2 py-1 text-white focus:outline-none"
                        >
                          <option value={ColaboradorStatus.Operacao}>Operação</option>
                          <option value={ColaboradorStatus.Poli}>Poli</option>
                          <option value={ColaboradorStatus.BH}>BH</option>
                          <option value={ColaboradorStatus.Ausente}>Ausente</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={c.horas}
                          onChange={(e) => onUpdateColaboradorHoras(globalIdx, parseFloat(e.target.value) || 0)}
                          className="prod-input-micro font-mono"
                        />
                      </td>
                    </tr>
                  );
                })}
                {sectorColaboradores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-zinc-500 italic">
                      Nenhum colaborador alocado neste setor no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribuição de Horas Recharts */}
        <div className="glass-card p-6 flex flex-col min-h-[350px]">
          <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
            Distribuição Visual de Horas (DKT)
          </h3>
          <div className="flex-1 relative w-full h-[220px]">
            <ProdHorasHorizontalBar colaboradores={colaboradores.filter((c) => c.setor === `Setor ${activeS.id}`)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MIX TAB (ATIVIDADES MIX)
// ==========================================
interface MixTabProps {
  setores: Setor[];
  universos: Record<string, { nome: string; meta: number; feito: number }[]>;
  onAddUniverso: (sid: string, nome: string, meta: number) => void;
  onRemoveUniverso: (sid: string, uIndex: number) => void;
  onIncrementUniverso: (sid: string, uIndex: number, delta: number) => void;
  onZerarMix: () => void;
  onExportMixCSV: () => void;
  currentRole: string | null;
}

export const MixTab: React.FC<MixTabProps> = ({
  setores,
  universos,
  onAddUniverso,
  onRemoveUniverso,
  onIncrementUniverso,
  onZerarMix,
  onExportMixCSV,
  currentRole,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSid, setNewSid] = useState(setores[0]?.id || "87");
  const [newNome, setNewNome] = useState("");
  const [newMeta, setNewMeta] = useState(1000);
  const [pointValues, setPointValues] = useState<Record<string, number>>({});

  const isAdmin = currentRole === "admin";

  let totalMeta = 0;
  let totalFeito = 0;
  const mixAlerts: string[] = [];

  Object.entries(universos).forEach(([sid, list]) => {
    (list as any[]).forEach((u: any) => {
      totalMeta += u.meta;
      totalFeito += u.feito;
      const pct = u.meta ? (u.feito / u.meta) * 100 : 0;
      if (pct < 40) {
        mixAlerts.push(`Setor ${sid} — ${u.nome} está crítico com apenas ${pct.toFixed(0)}% concluído.`);
      }
    });
  });

  const generalProgress = totalMeta ? Math.round((totalFeito / totalMeta) * 100) : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNome.trim() && newMeta > 0) {
      onAddUniverso(newSid, newNome.trim(), newMeta);
      setNewNome("");
      setShowAddModal(false);
    }
  };

  const handleIncrement = (sid: string, uIndex: number) => {
    const key = `${sid}-${uIndex}`;
    const value = pointValues[key] || 0;
    if (value !== 0) {
      onIncrementUniverso(sid, uIndex, value);
      setPointValues((prev) => ({ ...prev, [key]: 0 }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Total Metas Acumuladas</p>
          <p className="text-3xl font-black text-indigo-400 font-mono">{totalMeta.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card p-5 border-b-2 border-emerald-500">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Unidades Concluídas</p>
          <p className="text-3xl font-black text-emerald-400 font-mono">{totalFeito.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Progresso Geral</p>
          <p className="text-3xl font-black text-white font-mono">{generalProgress}%</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Pendente Estimado</p>
          <p className="text-3xl font-black text-amber-500 font-mono">
            {Math.max(0, totalMeta - totalFeito).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table tracking */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <h3 className="font-bold text-white text-sm uppercase">Acompanhamento de Atividades (Mix)</h3>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded transition-all cursor-pointer animate-pulse"
                >
                  + Nova Ativ
                </button>
              )}
              <button
                onClick={onExportMixCSV}
                className="bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs px-3 py-1.5 rounded border border-white/10 transition cursor-pointer"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="flex-1 w-full overflow-y-auto custom-scrollbar border border-white/5 rounded-lg bg-black/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#0d0d0f] z-10 shadow-md">
                <tr className="text-[0.65rem] uppercase tracking-wider text-zinc-500 border-b border-white/10">
                  <th className="p-3 font-bold text-center">Setor</th>
                  <th className="p-3 font-bold">Universo/Atividade</th>
                  <th className="p-3 font-bold text-center">Meta Total</th>
                  <th className="p-3 font-bold text-center text-emerald-400">Já Feito</th>
                  <th className="p-3 font-bold text-center w-36">Apontar (+)</th>
                  <th className="p-3 font-bold text-center w-28">Progresso</th>
                  {isAdmin && <th className="p-3 font-bold text-center">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {setores.flatMap((s) => {
                  const list = universos[s.id] || [];
                  return list.map((u, ui) => {
                    const key = `${s.id}-${ui}`;
                    const pct = u.meta ? Math.min(100, (u.feito / u.meta) * 100) : 0;
                    const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

                    return (
                      <tr key={key} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-3 text-center font-bold text-indigo-400">S{s.id}</td>
                        <td className="p-3 font-bold text-white">{u.nome}</td>
                        <td className="p-3 text-center font-mono text-zinc-400">{u.meta.toLocaleString("pt-BR")}</td>
                        <td className="p-3 text-center font-mono text-emerald-400 font-bold">{u.feito.toLocaleString("pt-BR")}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              placeholder="Qtd"
                              value={pointValues[key] || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setPointValues((prev) => ({ ...prev, [key]: val }));
                              }}
                              className="mix-apontar-input"
                            />
                            <button
                              onClick={() => handleIncrement(s.id, ui)}
                              className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-2">
                            <div className="mix-progress-bar bg-zinc-800 rounded-full h-1.5 w-16 overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-[10px] text-zinc-500">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onRemoveUniverso(s.id, ui)}
                              className="text-red-400 hover:text-red-300 font-bold hover:bg-red-500/10 p-1 rounded"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progresso doughnut e alertas */}
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-col items-center justify-center">
            <h3 className="font-bold text-zinc-400 text-[0.65rem] uppercase tracking-wide w-full text-left mb-4">
              Progresso do Turno Geral
            </h3>
            <div className="h-[180px] w-full relative">
              <MixDoughnutChart percentage={generalProgress} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-white">{generalProgress}%</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Concluído</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-bold text-zinc-400 text-[0.65rem] uppercase tracking-wide mb-3">Alertas Ativos do Mix</h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
              {mixAlerts.map((alt, index) => (
                <div key={index} className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded animate-pulse">
                  ⚠️ {alt}
                </div>
              ))}
              {mixAlerts.length === 0 && (
                <p className="text-[10px] text-emerald-400 opacity-60 italic">Nenhum alerta de atraso no Mix.</p>
              )}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={onZerarMix}
              className="w-full bg-red-900/10 hover:bg-red-900/20 text-red-400 border border-red-500/20 py-2.5 rounded text-xs font-bold uppercase transition cursor-pointer"
            >
              Zerar Todo o Mix
            </button>
          )}
        </div>
      </div>

      {/* Add activity Universo modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 z-[80000] flex items-center justify-center backdrop-blur-sm">
          <form onSubmit={handleAddSubmit} className="glass-card p-6 w-full max-w-sm border border-zinc-800 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
              Nova Atividade (Mix)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Setor</label>
                <select
                  value={newSid}
                  onChange={(e) => setNewSid(e.target.value)}
                  className="inp py-2 text-xs focus:outline-none"
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      S{s.id} — {s.resp.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Nome da Atividade</label>
                <input
                  type="text"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Ex: Picking Decote, Triagem Sul"
                  className="inp py-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Meta Estimada (Qtd)</label>
                <input
                  type="number"
                  value={newMeta}
                  onChange={(e) => setNewMeta(parseInt(e.target.value) || 0)}
                  className="inp py-2 text-xs font-mono focus:outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-xs font-bold hover:bg-white/5 text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-500 cursor-pointer"
              >
                Adicionar Atividade
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// COPIL TAB (PERFORMANCE MATRIX)
// ==========================================
interface CopilTabProps {
  setores: Setor[];
  copilData: Record<string, CopilSetor>;
  activeSectorId: string;
  setActiveSectorId: (sid: string) => void;
  onUpdateCopilKPI: (sid: string, group: string, kpiIdx: number, field: string, value: string) => void;
  onAddCopilKPI: (sid: string, group: string, kpi: string, comp: string) => void;
  onRemoveCopilKPI: (sid: string, group: string, kpiIdx: number) => void;
  onSaveCopil: () => void;
  onExportCopilCSV: () => void;
  currentRole: string | null;
  calcCopilNota: (kpi: any) => string;
  onRestoreDefaultKPIs?: (sid: string) => void;
  onBulkImportKPIs?: (importedData: any[]) => void;
}

export const CopilTab: React.FC<CopilTabProps> = ({
  setores,
  copilData,
  activeSectorId,
  setActiveSectorId,
  onUpdateCopilKPI,
  onAddCopilKPI,
  onRemoveCopilKPI,
  onSaveCopil,
  onExportCopilCSV,
  currentRole,
  calcCopilNota,
  onRestoreDefaultKPIs,
  onBulkImportKPIs,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [newKpiGroup, setNewKpiGroup] = useState("operacionais");
  const [newKpiName, setNewKpiNome] = useState("");
  const [newKpiMeta, setNewKpiMeta] = useState("");

  const [expandedKpis, setExpandedKpis] = useState<Record<string, boolean>>({});
  const [showImporter, setShowImporter] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<string>("idle"); // idle, loading, parsed, done
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [importErrorsCount, setImportErrorsCount] = useState(0);

  const activeS = setores.find((x) => x.id === activeSectorId) || setores[0];
  const activeCopil = copilData[activeS.id] || { operacionais: [], economico: [], seguranca: [] };

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKpiName.trim() && newKpiMeta.trim()) {
      onAddCopilKPI(activeS.id, newKpiGroup, newKpiName.trim(), newKpiMeta.trim());
      setNewKpiNome("");
      setNewKpiMeta("");
    }
  };

  const getNoteClassAndLabel = (grade: string) => {
    if (grade === "A") return { cls: "copil-note-A", label: "Excelente (A)" };
    if (grade === "B") return { cls: "copil-note-B", label: "Bom (B)" };
    if (grade === "C") return { cls: "copil-note-C", label: "Atenção (C)" };
    if (grade === "D") return { cls: "copil-note-D", label: "Crítico (D)" };
    return { cls: "copil-note-unknown", label: "Falta Dado" };
  };

  const allKpis = [...activeCopil.operacionais, ...activeCopil.economico, ...activeCopil.seguranca];
  const isAdmin = currentRole === "admin";

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-l-2 border-indigo-500/50">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">COPIL — Matriz de Performance</h2>
            <p className="text-[0.65rem] text-zinc-500 mt-1 uppercase font-semibold tracking-wider">
              Análise de pilares (Operacional, Econômico, Segurança)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImporter(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded text-[0.6rem] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
            >
              <Upload size={10} />
              Importar Planilha
            </button>
            {onRestoreDefaultKPIs && (
              <button
                onClick={() => onRestoreDefaultKPIs(activeS.id)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded text-[0.6rem] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} />
                Restaurar Padrões
              </button>
            )}
            <button
              onClick={onExportCopilCSV}
              className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-1.5 rounded text-[0.6rem] font-bold uppercase transition cursor-pointer"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-1.5 rounded text-[0.6rem] font-bold uppercase transition cursor-pointer"
            >
              Imprimir PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-[0.65rem] text-zinc-500 uppercase tracking-widest font-bold">Setor em Edição:</label>
            <select
              value={activeS.id}
              onChange={(e) => setActiveSectorId(e.target.value)}
              className="inp py-1.5 w-36 font-bold text-indigo-400 focus:outline-none cursor-pointer"
            >
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  S{s.id}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[0.55rem] text-zinc-500 bg-white/5 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-anim"></span> Dados calculados em tempo real
          </span>
        </div>

        {/* Add KPI manual for admin */}
        {isAdmin && (
          <form onSubmit={handleAddKpi} className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6">
            <h4 className="font-black text-white uppercase text-xs mb-3">
              <span className="text-indigo-400 font-bold">+</span> Adicionar KPI Manual ao Setor S{activeS.id}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">Pilar</label>
                <select
                  value={newKpiGroup}
                  onChange={(e) => setNewKpiGroup(e.target.value)}
                  className="inp py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="operacionais">Operacional</option>
                  <option value="economico">Econômico</option>
                  <option value="seguranca">Segurança</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">Nome do Indicador</label>
                <input
                  type="text"
                  value={newKpiName}
                  onChange={(e) => setNewKpiNome(e.target.value)}
                  placeholder="Ex: Acuracidade de Inventário"
                  className="inp py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">Meta Compartilhada</label>
                <input
                  type="text"
                  value={newKpiMeta}
                  onChange={(e) => setNewKpiMeta(e.target.value)}
                  placeholder="Ex: 99.5"
                  className="inp py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Gravar Novo KPI
            </button>
          </form>
        )}

        {/* Edit fields groups */}
        <div className="space-y-6">
          {["operacionais", "economico", "seguranca"].map((groupKey) => {
            const list = activeCopil[groupKey as keyof CopilSetor] || [];
            if (list.length === 0) return null;

            return (
              <div key={groupKey}>
                <h4 className="text-[0.65rem] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  {groupKey === "operacionais" ? "Pilares Operacionais" : groupKey === "economico" ? "Pilares Econômicos" : "Pilares de Segurança"}
                </h4>

                <div className="space-y-2">
                  {list.map((k, index) => {
                    const notaStr = calcCopilNota(k);
                    const noteInfo = getNoteClassAndLabel(notaStr);

                      const isExpanded = !!expandedKpis[`${groupKey}-${index}`];
                      return (
                        <div
                          key={index}
                          className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                            <div className="md:col-span-4">
                              <p className="text-xs font-bold text-white flex flex-wrap items-center gap-1.5">
                                {k.kpi}
                                {k.auto && (
                                  <span className="text-[8px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded font-black font-mono uppercase">
                                    AUTO
                                  </span>
                                )}
                                {k.notaManual && k.notaManual !== "auto" && (
                                  <span className="text-[8px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono uppercase">
                                    FORÇADO
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[0.5rem] text-zinc-600 uppercase block mb-1">Meta</label>
                              <input
                                type="text"
                                value={k.comp}
                                disabled={k.auto && currentRole !== "admin"}
                                onChange={(e) => onUpdateCopilKPI(activeS.id, groupKey, index, "comp", e.target.value)}
                                className="inp py-1 text-xs text-center font-mono disabled:opacity-50"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[0.5rem] text-zinc-600 uppercase block mb-1">Realizado</label>
                              <input
                                type="text"
                                value={k.real}
                                disabled={k.auto && currentRole !== "admin"}
                                onChange={(e) => onUpdateCopilKPI(activeS.id, groupKey, index, "real", e.target.value)}
                                className="inp py-1 text-xs text-center font-mono disabled:opacity-50"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[0.5rem] text-zinc-600 uppercase block mb-1">Resultado</label>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black ${noteInfo.cls} font-mono px-2 py-0.5 rounded bg-black/40`}>
                                  {notaStr}
                                </span>
                              </div>
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedKpis(prev => ({ ...prev, [`${groupKey}-${index}`]: !isExpanded }))}
                                className={`text-zinc-400 hover:text-white text-xs p-1 rounded border border-white/5 bg-white/5 hover:bg-white/10 flex items-center gap-1 cursor-pointer transition-all ${isExpanded ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400" : ""}`}
                                title="Configurar Indicador"
                              >
                                <Sliders size={12} />
                                <span className="text-[9px] font-bold uppercase">{isExpanded ? "Fechar" : "Ajustes"}</span>
                              </button>
                              {isAdmin && !k.auto && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveCopilKPI(activeS.id, groupKey, index)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs p-1.5 rounded cursor-pointer transition border border-transparent hover:border-red-500/20"
                                  title="Remover Indicador"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-black/20 p-3 rounded-lg text-left">
                              <div>
                                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1 font-bold">Tolerância</label>
                                <input
                                  type="text"
                                  value={k.tolerancia || ""}
                                  onChange={(e) => onUpdateCopilKPI(activeS.id, groupKey, index, "tolerancia", e.target.value)}
                                  placeholder="Ex: ±10% ou ±438"
                                  className="inp py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1 font-bold">Regra de Cálculo</label>
                                <select
                                  value={k.regraCalculo || (k.inverso ? "Inverso" : "Padrão")}
                                  onChange={(e) => {
                                    onUpdateCopilKPI(activeS.id, groupKey, index, "regraCalculo", e.target.value);
                                    if (e.target.value === "Inverso") {
                                      onUpdateCopilKPI(activeS.id, groupKey, index, "inverso", "true");
                                    } else {
                                      onUpdateCopilKPI(activeS.id, groupKey, index, "inverso", "false");
                                    }
                                  }}
                                  className="inp py-1 text-xs cursor-pointer focus:outline-none"
                                >
                                  <option value="Padrão">Padrão (Real/Meta &gt;= 1.0 = A)</option>
                                  <option value="Inverso">Inverso (Erros/Infrações: Menor = Melhor)</option>
                                  <option value="Variação de Estoque">Variação de Estoque (Demarca/Sumarca)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1 font-bold">Critério de Avaliação</label>
                                <input
                                  type="text"
                                  value={k.criterio || ""}
                                  onChange={(e) => onUpdateCopilKPI(activeS.id, groupKey, index, "criterio", e.target.value)}
                                  placeholder="Ex: Dentro da Meta = A"
                                  className="inp py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1 font-bold">Sobrescrever Nota</label>
                                <select
                                  value={k.notaManual || "auto"}
                                  onChange={(e) => onUpdateCopilKPI(activeS.id, groupKey, index, "notaManual", e.target.value)}
                                  className="inp py-1 text-xs cursor-pointer focus:outline-none font-bold text-indigo-400"
                                >
                                  <option value="auto">Automático (Padrão)</option>
                                  <option value="A">Forçar Excelente (A)</option>
                                  <option value="B">Forçar Bom (B)</option>
                                  <option value="C">Forçar Atenção (C)</option>
                                  <option value="D">Forçar Crítico (D)</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5 mt-6">
          <button
            onClick={onSaveCopil}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-widest cursor-pointer"
          >
            Sincronizar COPIL S{activeS.id}
          </button>
        </div>
      </div>

      {/* Visual matrix display */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
            Quadro Analítico — Setor S{activeS.id}
          </h3>
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode("table")}
              className={`nav-btn px-3 py-1 rounded text-xs cursor-pointer ${viewMode === "table" ? "active" : ""}`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`nav-btn px-3 py-1 rounded text-xs cursor-pointer ${viewMode === "chart" ? "active" : ""}`}
            >
              Gráfico
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[0.6rem] uppercase tracking-widest text-zinc-500 border-b border-white/10 bg-white/[0.01]">
                  <th className="p-3 font-bold">Indicador de Performance</th>
                  <th className="p-3 font-bold text-center">Meta Alvo</th>
                  <th className="p-3 font-bold text-center text-white">Real Registrado</th>
                  <th className="p-3 font-bold text-center">Desvio / Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {allKpis.map((r, idx) => {
                  const notaStr = calcCopilNota(r);
                  const noteInfo = getNoteClassAndLabel(notaStr);

                  return (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="p-3 text-zinc-300 font-sans font-bold flex items-center gap-1.5">
                        {r.kpi}
                        {r.auto && (
                          <span className="text-[8px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded font-sans font-bold">
                            AUTO
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-zinc-500">{r.comp}</td>
                      <td className="p-3 text-center text-white font-bold">{r.real}</td>
                      <td className={`p-3 text-center font-bold ${noteInfo.cls}`}>{notaStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full h-[320px] relative">
            <CopilBarChart rows={allKpis} calcNotaFn={calcCopilNota} />
          </div>
        )}
      </div>

      {/* Spreadsheet Importer Modal Overlay */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/85 z-[80000] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-black text-white text-base uppercase tracking-wider">
                    Importador de Indicadores (CSV / XLSX)
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                    Envie dados de performance para os setores em massa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImporter(false);
                  setImportRows([]);
                  setImportStatus("idle");
                }}
                className="text-zinc-500 hover:text-white font-bold text-sm cursor-pointer border border-zinc-800 p-2 rounded-lg bg-zinc-950 hover:bg-zinc-900 transition"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-left">
              {/* File upload zone */}
              <div className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/45 rounded-xl p-8 bg-zinc-900/30 flex flex-col items-center justify-center text-center transition relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setImportStatus("loading");
                    setImportErrorsCount(0);
                    setUnrecognizedColumns([]);

                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const data = evt.target?.result;
                        let rows: any[][] = [];

                        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                          const workbook = XLSX.read(data, { type: "binary" });
                          const sheetName = workbook.SheetNames[0];
                          const sheet = workbook.Sheets[sheetName];
                          rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                        } else {
                          const text = evt.target?.result as string;
                          rows = text.split("\n")
                            .filter(line => line.trim())
                            .map(line => {
                              const parts = [];
                              let current = "";
                              let inQuotes = false;
                              for (let i = 0; i < line.length; i++) {
                                const char = line[i];
                                if (char === '"') {
                                  inQuotes = !inQuotes;
                                } else if ((char === ',' || char === ';') && !inQuotes) {
                                  parts.push(current.trim());
                                  current = "";
                                } else {
                                  current += char;
                                }
                              }
                              parts.push(current.trim());
                              return parts;
                            });
                        }

                        if (rows.length === 0) {
                          alert("O arquivo está vazio.");
                          setImportStatus("idle");
                          return;
                        }

                        // Parse headers
                        const rawHeaders = rows[0].map(h => String(h).trim());
                        const headers = rawHeaders.map(h => h.toLowerCase());

                        // Target columns: Setor, KPI, Meta, Realizado, Nota, Data, Semana, Observações
                        const idxSetor = headers.findIndex(h => h.includes("setor") || h === "set" || h.includes("sector"));
                        const idxKpi = headers.findIndex(h => h.includes("kpi") || h.includes("indicador") || h.includes("indicadores") || h.includes("item"));
                        const idxMeta = headers.findIndex(h => h.includes("meta") || h.includes("comp") || h.includes("target"));
                        const idxRealizado = headers.findIndex(h => h.includes("realizado") || h.includes("real") || h.includes("realiz") || h.includes("actual"));
                        const idxNota = headers.findIndex(h => h === "nota" || h.includes("grade") || h.includes("classificac") || h.includes("classificaç") || h.includes("score"));
                        const idxData = headers.findIndex(h => h.includes("data") || h.includes("date"));
                        const idxSemana = headers.findIndex(h => h.includes("semana") || h === "sem" || h.includes("week"));
                        const idxObs = headers.findIndex(h => h.includes("observ") || h.includes("obs") || h.includes("coment") || h.includes("comment"));

                        // Detect unrecognized columns
                        const recognized = [idxSetor, idxKpi, idxMeta, idxRealizado, idxNota, idxData, idxSemana, idxObs];
                        const unrecognized: string[] = [];
                        rawHeaders.forEach((rh, idx) => {
                          if (idx !== -1 && !recognized.includes(idx)) {
                            unrecognized.push(rh);
                          }
                        });
                        setUnrecognizedColumns(unrecognized);

                        // Required: Setor, KPI, Meta, Realizado
                        if (idxSetor === -1 || idxKpi === -1 || idxMeta === -1 || idxRealizado === -1) {
                          const missing = [];
                          if (idxSetor === -1) missing.push("Setor");
                          if (idxKpi === -1) missing.push("KPI");
                          if (idxMeta === -1) missing.push("Meta");
                          if (idxRealizado === -1) missing.push("Realizado");
                          
                          alert(`Erro de Cabeçalho: Colunas essenciais ausentes: ${missing.join(", ")}. Certifique-se de usar cabeçalhos como: Setor, KPI, Meta, Realizado.`);
                          setImportStatus("idle");
                          return;
                        }

                        const validSectors = ["87", "88", "89", "90"];
                        let errors = 0;

                        const parsedData = rows.slice(1).map((row, rowIdx) => {
                          if (!row || row.length === 0 || row.every(cell => !cell)) return null;

                          let sectorRaw = idxSetor !== -1 ? String(row[idxSetor] || "").trim() : "";
                          let sectorClean = sectorRaw.replace(/\D/g, "");
                          if (!sectorClean) sectorClean = sectorRaw;

                          const kpi = idxKpi !== -1 ? String(row[idxKpi] || "").trim() : "";
                          const metaRaw = idxMeta !== -1 ? String(row[idxMeta] || "").trim() : "";
                          const realRaw = idxRealizado !== -1 ? String(row[idxRealizado] || "").trim() : "";
                          const notaRaw = idxNota !== -1 ? String(row[idxNota] || "").trim().toUpperCase() : "";
                          const dataVal = idxData !== -1 ? String(row[idxData] || "").trim() : "";
                          const semanaVal = idxSemana !== -1 ? String(row[idxSemana] || "").trim() : "";
                          const obsVal = idxObs !== -1 ? String(row[idxObs] || "").trim() : "";

                          // Validations
                          const rowErrors: string[] = [];
                          if (!validSectors.includes(sectorClean)) {
                            rowErrors.push(`Setor inválido: "${sectorRaw}" (Deve ser S87, S88, S89, S90)`);
                          }
                          if (!kpi) {
                            rowErrors.push("Nome do KPI vazio");
                          }
                          if (isNaN(parseFloat(metaRaw))) {
                            rowErrors.push(`Meta inválida: "${metaRaw}" (Deve ser numérica)`);
                          }
                          if (isNaN(parseFloat(realRaw))) {
                            rowErrors.push(`Realizado inválido: "${realRaw}" (Deve ser numérica)`);
                          }

                          if (rowErrors.length > 0) {
                            errors += rowErrors.length;
                          }

                          let isUpdate = false;
                          if (validSectors.includes(sectorClean) && kpi) {
                            const sectorData = copilData[sectorClean];
                            if (sectorData) {
                              const allSectorKpis = [
                                ...sectorData.operacionais,
                                ...sectorData.economico,
                                ...sectorData.seguranca
                              ];
                              isUpdate = allSectorKpis.some(existK => existK.kpi.toLowerCase() === kpi.toLowerCase());
                            }
                          }

                          return {
                            rowNum: rowIdx + 2,
                            sector: sectorClean,
                            kpi,
                            meta: metaRaw,
                            real: realRaw,
                            nota: ["A", "B", "C", "D"].includes(notaRaw) ? notaRaw : "",
                            data: dataVal,
                            semana: semanaVal,
                            obs: obsVal,
                            errors: rowErrors,
                            isUpdate
                          };
                        }).filter(Boolean);

                        setImportRows(parsedData);
                        setImportErrorsCount(errors);
                        setImportStatus("parsed");
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao ler arquivo. Por favor, certifique-se de que é um CSV ou Excel válido.");
                        setImportStatus("idle");
                      }
                    };

                    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                      reader.readAsBinaryString(file);
                    } else {
                      reader.readAsText(file, "UTF-8");
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="bg-zinc-950 p-4 rounded-full text-zinc-400 mb-3 border border-zinc-800">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">
                  Arraste ou Clique para Selecionar o Arquivo
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md uppercase font-medium">
                  Formatos suportados: .CSV ou .XLSX. Cabeçalho padrão: Setor, KPI, Meta, Realizado, Nota, Data, Semana, Observações.
                </p>
              </div>

              {/* Status & Unrecognized Warnings */}
              {unrecognizedColumns.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-amber-400 text-xs">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold uppercase tracking-wider">Atenção: Colunas não mapeadas ignoradas:</h4>
                    <p className="mt-1 font-mono uppercase text-[10px]">
                      {unrecognizedColumns.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Parsed List Preview */}
              {importStatus === "parsed" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                    <p className="text-xs font-black text-white uppercase tracking-wider">
                      Prévia dos Dados ({importRows.length} linhas detectadas)
                    </p>
                    <div className="flex gap-2">
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded font-bold uppercase">
                        {importErrorsCount} Erros Encontrados
                      </span>
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                        {importRows.filter(r => r.errors.length === 0).length} Válidos
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto border border-zinc-800 rounded-xl overflow-hidden custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                      <thead>
                        <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-widest text-[9px] font-bold">
                          <th className="p-3 text-center">Linha</th>
                          <th className="p-3">Setor</th>
                          <th className="p-3">KPI</th>
                          <th className="p-3 text-center">Meta</th>
                          <th className="p-3 text-center">Realizado</th>
                          <th className="p-3 text-center">Nota Planilha</th>
                          <th className="p-3">Data/Semana</th>
                          <th className="p-3">Status / Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 font-mono">
                        {importRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-zinc-900/40 ${row.errors.length > 0 ? "bg-red-500/5 text-red-300" : "text-zinc-300"}`}
                          >
                            <td className="p-2.5 text-center text-zinc-500 font-bold">{row.rowNum}</td>
                            <td className="p-2.5 font-sans font-bold">S{row.sector}</td>
                            <td className="p-2.5 font-sans font-semibold text-white">{row.kpi}</td>
                            <td className="p-2.5 text-center text-zinc-400">{row.meta}</td>
                            <td className="p-2.5 text-center text-zinc-100 font-bold">{row.real}</td>
                            <td className="p-2.5 text-center font-bold text-indigo-400">{row.nota || "—"}</td>
                            <td className="p-2.5 text-zinc-400 font-sans">{row.data} {row.semana ? `(${row.semana})` : ""}</td>
                            <td className="p-2.5 font-sans">
                              {row.errors.length > 0 ? (
                                <div className="space-y-0.5 text-red-400 font-bold text-[9px] uppercase">
                                  {row.errors.map((err: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <span>●</span> <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Válido
                                  </span>
                                  {row.isUpdate && (
                                    <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                      Atualização
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 flex justify-between items-center bg-zinc-900">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                Registros com erro serão ignorados no momento da importação.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImporter(false);
                    setImportRows([]);
                    setImportStatus("idle");
                  }}
                  className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 py-2 px-6 rounded-lg text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={importStatus !== "parsed" || importRows.filter(r => r.errors.length === 0).length === 0}
                  onClick={() => {
                    const validRows = importRows.filter(r => r.errors.length === 0);
                    if (validRows.length === 0) {
                      alert("Nenhum registro válido para importar.");
                      return;
                    }
                    if (onBulkImportKPIs) {
                      onBulkImportKPIs(validRows);
                    }
                    alert(`Sucesso! ${validRows.length} indicadores importados com sucesso.`);
                    setShowImporter(false);
                    setImportRows([]);
                    setImportStatus("idle");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={12} />
                  Confirmar Importação ({importRows.filter(r => r.errors.length === 0).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
