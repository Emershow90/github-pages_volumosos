/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useUserStore } from "../stores/useUserStore";
import { AdminApprovalTab } from "./AdminApprovalTab";
import ConfirmActionCode from "./ConfirmActionCode";
import {
  Colaborador,
  Setor,
  AlertLog,
  AuditLog,
  HistoricoRegistro,
  ReferenteSemana,
  ScreensaverConfig,
  UserRole,
  ColaboradorStatus,
  RadarLoja,
  StoreMaster,
} from "../types";
import { masterCadastroLojas } from "../initialData";
import { useStoreMaster } from "../stores/useStoreMaster";
import {
  Shield,
  Trash2,
  CheckCircle,
  FileText,
  Copy,
  Plus,
  ArrowRight,
  TrendingUp,
  Download,
  Upload,
  User,
  Image,
  RefreshCw,
  Search,
  ExternalLink,
  LogOut,
  Check,
  AlertTriangle,
  Info,
  Settings,
  Store,
  Building2,
  MapPin,
  Edit2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  googleSignIn,
  logoutGoogle,
  initAuth
} from "../lib/supabaseAuth";
import { OverrideOperacionalModal } from "./OverrideOperacionalModal";

import { SupabaseService, SupabaseService as FirebaseService } from "../lib/supabaseService";
import { IndexedDBService } from "../lib/indexedDb";
import { ListaColetaItem, RadarLojaStatus, UniversoMix } from "../types";
import { ModalConfirmacao } from "./ModalConfirmacao";
import { useSectorStore } from "../stores/useSectorStore";
import { DailyActivityAlertBanner } from "./DailyActivityAlertBanner";
import { exportToGoogleSheets, initGoogleIdentity } from "../services/googleSheetsExportService";
import { ReaproData, CapacidadeSetor } from "../types";

// ==========================================
// EQUIPA TAB
// ==========================================
interface EquipaTabProps {
  colaboradores: Colaborador[];
  setores: Setor[];
  onAddColaborador: (c: Colaborador) => void;
  onUpdateColaborador: (index: number, c: Colaborador) => void;
  onRemoveColaborador: (index: number) => void;
  onUpdateColaboradorStatus: (index: number, status: ColaboradorStatus) => void;
  onUpdateColaboradorHoras: (index: number, horas: number) => void;
  onSetColaboradores: (colaboradores: Colaborador[]) => void;
  currentRole: UserRole | null;
}

export const EquipaTab: React.FC<EquipaTabProps> = ({
  colaboradores,
  setores,
  onAddColaborador,
  onUpdateColaborador,
  onRemoveColaborador,
  onUpdateColaboradorStatus,
  onUpdateColaboradorHoras,
  onSetColaboradores,
  currentRole,
}) => {
  const [showModal, setShowAddModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [setorStr, setSetorStr] = useState("Setor 87");
  const [foto, setFoto] = useState("");
  const [cargo, setCargo] = useState("Operador");
  const [horas, setHoras] = useState(7.2);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");

  // Google Integration states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const isAdmin = currentRole === UserRole.Admin;

  // Load spreadsheet link & Service Account from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem("google_sheets_scale_id");
    setSpreadsheetId(savedId || "");
  }, []);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditIdx(null);
    setNome("");
    setSetorStr(`Setor ${setores[0]?.id || "87"}`);
    setFoto("");
    setCargo("Operador");
    setHoras(7.2);
    setShowAddModal(true);
  };

  const handleOpenEdit = (idx: number) => {
    const c = colaboradores[idx];
    setEditIdx(idx);
    setNome(c.nome);
    setSetorStr(c.setor);
    setFoto(c.foto || "");
    setCargo(c.cargo || "Operador");
    setHoras(c.horas);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const data: Colaborador = {
      id: editIdx !== null ? colaboradores[editIdx].id : `col-${Date.now()}`,
      nome: nome.trim(),
      setor: setorStr,
      status: editIdx !== null ? colaboradores[editIdx].status : ColaboradorStatus.Operacao,
      foto,
      horas,
      cargo,
    };

    if (editIdx !== null) {
      onUpdateColaborador(editIdx, data);
    } else {
      onAddColaborador(data);
    }
    setShowAddModal(false);
  };

  const handleCopyLink = () => {
    if (!spreadsheetId) return;
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Status statistics
  const countOp = colaboradores.filter((c) => c.status === ColaboradorStatus.Operacao).length;
  const countPoli = colaboradores.filter((c) => c.status === ColaboradorStatus.Poli).length;
  const countBH = colaboradores.filter((c) => c.status === ColaboradorStatus.BH).length;
  const countAusente = colaboradores.filter((c) => c.status === ColaboradorStatus.Ausente).length;

  // Filter and search logic
  const filteredColaboradores = colaboradores.filter((col) => {
    const matchesSearch = col.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (col.cargo && col.cargo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSector = sectorFilter === "all" || col.setor === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION WITH TITLE AND ADD BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">Equipe de Volumosos</h2>
          <p className="text-xs text-zinc-500 uppercase font-semibold mt-1">Status e controle de escala micro dos operadores</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[0.65rem] font-bold py-1.5 px-4 rounded-lg uppercase tracking-widest cursor-pointer self-start sm:self-auto transition-colors"
          >
            + Novo Colaborador
          </button>
        )}
      </div>

      {/* RAPID TOP COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0d] border border-emerald-500/15 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Op. (Em Operação)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{countOp}</span>
            <span className="text-[9px] text-zinc-500 font-medium">Operando hoje</span>
          </div>
        </div>
        <div className="bg-[#0a0a0d] border border-blue-500/15 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Poli (Em Poli)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{countPoli}</span>
            <span className="text-[9px] text-zinc-500 font-medium">Polivalentes</span>
          </div>
        </div>
        <div className="bg-[#0a0a0d] border border-amber-500/15 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">BH (Em BH)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{countBH}</span>
            <span className="text-[9px] text-zinc-500 font-medium">Banco de Horas</span>
          </div>
        </div>
        <div className="bg-[#0a0a0d] border border-red-500/15 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">Aus. (Ausentes)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{countAusente}</span>
            <span className="text-[9px] text-zinc-500 font-medium">Faltas/Afastados</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0a0a0d] border border-white/5 p-3 rounded-xl">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome ou cargo..."
            className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="all">Todos os Setores</option>
            {setores.map((s) => (
              <option key={s.id} value={`Setor ${s.id}`}>
                Setor {s.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HIGH-PERFORMANCE TABLE LIST OF OPERATORS FOR MICRO CONTROLS */}
      <div className="bg-[#08080b] border border-white/5 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-zinc-400 bg-black/15">
              <th className="py-3 px-4 w-[40%]">Operador / Colaborador</th>
              <th className="py-3 px-4 w-[20%]">Setor Alocado</th>
              <th className="py-3 px-4 w-[15%]">Cargo</th>
              <th className="py-3 px-4 w-[12%] text-center">Horas Micro (DKT)</th>
              <th className="py-3 px-4 w-[15%]">Status da Escala</th>
              {isAdmin && <th className="py-3 px-4 text-right w-[8%]">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredColaboradores.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-zinc-500 uppercase font-black">
                  Nenhum colaborador encontrado
                </td>
              </tr>
            ) : (
              filteredColaboradores.map((col) => {
                const globalIdx = colaboradores.findIndex((c) => c.id === col.id);
                const initials = col.nome ? col.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

                return (
                  <tr key={col.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* AVATAR + NAME */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center font-black text-[10px] text-zinc-400 flex-shrink-0">
                          {col.foto ? (
                            <img src={col.foto} alt={col.nome} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase truncate">{col.nome}</p>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mt-0.5">{col.cargo || "Operador"}</span>
                        </div>
                      </div>
                    </td>

                    {/* SECTOR */}
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold text-zinc-300 uppercase">{col.setor}</span>
                    </td>

                    {/* CARGO */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{col.cargo || "Operador"}</span>
                    </td>

                    {/* HORAS MICRO (EDITABLE INPUT) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="24"
                          value={col.horas}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              onUpdateColaboradorHoras(globalIdx, val);
                            }
                          }}
                          className="w-16 bg-black/40 text-xs font-mono font-bold text-sky-400 text-center border border-white/5 rounded py-1 focus:outline-none focus:border-sky-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        <span className="text-[10px] text-zinc-500 font-mono">h</span>
                      </div>
                    </td>

                    {/* STATUS DROP-DOWN (EDITABLE DIRECTLY) */}
                    <td className="py-3 px-4">
                      <select
                        value={col.status}
                        disabled={!isAdmin}
                        onChange={(e) => onUpdateColaboradorStatus(globalIdx, e.target.value as ColaboradorStatus)}
                        className={`text-xs font-black border border-white/5 rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500/50 cursor-pointer text-white uppercase tracking-wider bg-[#0a0a0d] disabled:opacity-70 disabled:cursor-not-allowed ${
                          col.status === ColaboradorStatus.Operacao
                            ? "text-emerald-400 border-emerald-500/10"
                            : col.status === ColaboradorStatus.Poli
                            ? "text-blue-400 border-blue-500/10"
                            : col.status === ColaboradorStatus.BH
                            ? "text-amber-400 border-amber-500/10"
                            : "text-red-400 border-red-500/10"
                        }`}
                      >
                        <option value={ColaboradorStatus.Operacao} className="text-emerald-400 bg-[#08080b]">Operação</option>
                        <option value={ColaboradorStatus.Poli} className="text-blue-400 bg-[#08080b]">Poli</option>
                        <option value={ColaboradorStatus.BH} className="text-amber-400 bg-[#08080b]">BH</option>
                        <option value={ColaboradorStatus.Ausente} className="text-red-400 bg-[#08080b]">Ausente</option>
                      </select>
                    </td>

                    {/* ACTIONS */}
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleOpenEdit(globalIdx)}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 py-1 px-2.5 rounded font-bold uppercase transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${col.nome}?`)) {
                                onRemoveColaborador(globalIdx);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/85 z-[80000] flex items-center justify-center backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="glass-card p-6 w-full max-w-sm border border-zinc-800 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
              {editIdx !== null ? "Editar Colaborador" : "Adicionar Colaborador"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="inp py-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Setor Alocado</label>
                <select
                  value={setorStr}
                  onChange={(e) => setSetorStr(e.target.value)}
                  className="inp py-2 text-xs focus:outline-none cursor-pointer"
                >
                  {setores.map((s) => (
                    <option key={s.id} value={`Setor ${s.id}`}>
                      Setor {s.id} — {s.resp.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">URL da Foto (Opcional)</label>
                <input
                  type="url"
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="inp py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Operador, Líder"
                    className="inp py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[0.55rem] font-bold text-zinc-500 uppercase block mb-1">Horas Diárias</label>
                  <input
                    type="number"
                    step="0.1"
                    value={horas}
                    onChange={(e) => setHoras(parseFloat(e.target.value) || 0)}
                    className="inp py-2 text-xs font-mono focus:outline-none"
                  />
                </div>
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
                Salvar Cadastro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// HISTÓRICO TAB
// ==========================================
interface HistoricoTabProps {
  historico: HistoricoRegistro[];
  onClearHistorico: () => void;
  currentRole: UserRole | null;
}

export const HistoricoTab: React.FC<HistoricoTabProps> = ({
  historico,
  onClearHistorico,
  currentRole,
}) => {
  const isAdmin = currentRole === UserRole.Admin;
  const [purging, setPurging] = useState(false);

  const handlePurge6Months = async () => {
    if (!confirm("Deseja aplicar a política de retenção semestral e limpar registros com mais de 6 meses (180 dias)?")) return;
    setPurging(true);
    try {
      const stats = await SupabaseService.purgeRecordsOlderThanMonths(6);
      alert(`Política de retenção semestral aplicada com sucesso! ${stats.totalPurged} registros arquivados.`);
    } catch {
      alert("Erro ao executar retenção semestral.");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest">Histórico de Apontamentos</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Registros consolidados de fechamento de turno (Retenção semestral de 6 meses)</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePurge6Months}
              disabled={purging}
              className="px-3 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold rounded hover:bg-purple-600/30 text-xs uppercase tracking-wider transition cursor-pointer"
            >
              {purging ? "Purgando..." : "Purga > 6 Meses"}
            </button>
            <button
              onClick={() => {
                if (confirm("Deseja realmente limpar todo o histórico?")) {
                  onClearHistorico();
                }
              }}
              className="px-3 py-2 bg-transparent border border-red-500/50 text-red-500 font-bold rounded hover:bg-red-500/10 text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Limpar Tudo
            </button>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-black/30">
              <tr className="text-[0.6rem] uppercase tracking-widest text-zinc-500 border-b border-white/10">
                <th className="p-4 font-bold">Data / Hora</th>
                <th className="p-4 font-bold text-blue-400">Semanas</th>
                <th className="p-4 font-bold text-purple-400">Turno</th>
                <th className="p-4 font-bold">Setor</th>
                <th className="p-4 font-bold text-zinc-200">Volume ATIV</th>
                <th className="p-4 font-bold text-sky-400">UPH</th>
                <th className="p-4 font-bold text-amber-500">Repros</th>
                <th className="p-4 font-bold">Promessa SLA</th>
                <th className="p-4 font-bold text-sky-400">Auditoria 5S</th>
                <th className="p-4 font-bold text-red-400">Erros Picking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
              {[...historico].reverse().map((h, i) => (
                <tr key={i} className="hover:bg-white/[0.01]">
                  <td className="p-4 text-zinc-400">
                    {h.data} {h.hora}
                  </td>
                  <td className="p-4 font-bold text-blue-400">{h.semana}</td>
                  <td className="p-4 font-sans font-bold text-purple-400">{h.turno}</td>
                  <td className="p-4 font-bold text-white font-sans">S{h.setor}</td>
                  <td className="p-4 font-black text-white">{(h.ativ ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="p-4 font-black text-sky-400">{h.uph}</td>
                  <td className="p-4 text-amber-500">{h.repro}</td>
                  <td className="p-4 font-black text-emerald-400">{h.promessa}%</td>
                  <td className="p-4 text-sky-400">{h.nota5s}%</td>
                  <td className="p-4 text-red-400">{h.erros}%</td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-zinc-500 italic">
                    Nenhum turno consolidado. Use a aba "Produtividade" para gravar.
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

// ==========================================
// ALERTAS TAB
// ==========================================
interface AlertasTabProps {
  alerts: AlertLog[];
  onMarkAlertLido: (id: string) => void;
  onClearOldAlerts: () => void;
}

export const AlertasTab: React.FC<AlertasTabProps> = ({
  alerts,
  onMarkAlertLido,
  onClearOldAlerts,
}) => {
  const [filterPriority, setFilterPrioridade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = alerts.filter((a) => {
    if (filterPriority !== "all" && a.prioridade !== filterPriority) return false;
    if (filterStatus === "lidos" && !a.lido) return false;
    if (filterStatus === "nao-lidos" && a.lido) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest">Alertas Operacionais</h2>
          <p className="text-xs text-zinc-500 mt-1">Notificações e desvios de SLA, produtividade e BSI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPrioridade(e.target.value)}
            className="inp py-1.5 text-xs w-36 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as prioridades</option>
            <option value="critica">Prioridade Crítica</option>
            <option value="alta">Prioridade Alta</option>
            <option value="media">Prioridade Média</option>
            <option value="baixa">Prioridade Baixa</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="inp py-1.5 text-xs w-36 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="nao-lidos">Não lidos</option>
            <option value="lidos">Lidos</option>
          </select>
          <button
            onClick={onClearOldAlerts}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer"
          >
            Limpar Antigos
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((a) => {
          const borderClass =
            a.prioridade === "critica"
              ? "border-l-4 border-l-red-500"
              : a.prioridade === "alta"
              ? "border-l-4 border-l-amber-500"
              : a.prioridade === "media"
              ? "border-l-4 border-l-sky-500"
              : "border-l-4 border-l-zinc-500";

          return (
            <div
              key={a.id}
              className={`glass-card p-4 flex items-start justify-between gap-4 transition-all duration-300 ${
                a.lido ? "opacity-50" : ""
              } ${borderClass}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{a.titulo}</span>
                  <span className="text-[8px] bg-white/5 border border-white/10 rounded px-1 text-zinc-500 uppercase font-mono">
                    S{a.setor}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{a.descricao}</p>
                <p className="text-[9px] text-zinc-600 font-mono mt-1">
                  {new Date(a.hora).toLocaleTimeString("pt-BR")} — {new Date(a.hora).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {!a.lido && (
                <button
                  onClick={() => onMarkAlertLido(a.id)}
                  className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded text-[10px] px-2.5 py-1 font-bold transition-all cursor-pointer"
                >
                  Marcar Lido
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <CheckCircle size={32} className="mx-auto text-emerald-500 opacity-40 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhum Alerta Encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// AUDITORIA TAB
// ==========================================
interface AuditoriaTabProps {
  audit: AuditLog[];
  onClearAudit?: () => void;
  onDeleteAuditLog?: (id: string) => void;
}

export const AuditoriaTab: React.FC<AuditoriaTabProps> = ({ audit, onClearAudit, onDeleteAuditLog }) => {
  const [subTab, setSubTab] = useState<"logs" | "aprovacoes" | "sync_logs">("logs");
  const [filterUser, setFilterUser] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync logs states
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingSyncLogs, setLoadingSyncLogs] = useState(false);
  const [syncFilter, setSyncFilter] = useState<"all" | "error" | "success">("all");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadSyncLogs = async () => {
    setLoadingSyncLogs(true);
    try {
      const logs = (await FirebaseService.fetchTable("sync_logs")) as any[];
      logs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setSyncLogs(logs);
    } catch (err) {
      console.warn("Could not load sync logs", err);
    } finally {
      setLoadingSyncLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === "sync_logs") {
      loadSyncLogs();
    }
  }, [subTab]);

  const handleRetrySyncLog = async (logId: string) => {
    setRetryingLogId(logId);
    setSyncFeedback(null);
    try {
      const { ConexoesService } = await import("../services/conexoesService");
      const res = await ConexoesService.syncControladoriaSheet();
      if (res.success) {
        setSyncFeedback(`✅ Registro reprocessado com sucesso (${res.importedCount} registros sincronizados).`);
        await loadSyncLogs();
      } else {
        setSyncFeedback(`❌ Falha ao reenviar: ${res.error || "Erro desconhecido"}`);
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Erro no reenvio: ${err.message || String(err)}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setRetryingLogId("all");
    setSyncFeedback(null);
    try {
      const { ConexoesService } = await import("../services/conexoesService");
      const res = await ConexoesService.syncControladoriaSheet();
      await FirebaseService.syncOfflineQueue();
      if (res.success) {
        setSyncFeedback(`✅ Todas as falhas foram reenviadas e processadas com sucesso.`);
        await loadSyncLogs();
      } else {
        setSyncFeedback(`❌ Falha no reprocessamento geral: ${res.error || "Erro desconhecido"}`);
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Erro: ${err.message || String(err)}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  const filtered = audit.filter((a) => {
    if (filterUser && !a.usuario.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterField && !a.campo.toLowerCase().includes(filterField.toLowerCase())) return false;
    if (filterAction && !a.acao.toLowerCase().includes(filterAction.toLowerCase())) return false;
    return true;
  });

  const filteredSyncLogs = syncLogs.filter((l) => {
    if (syncFilter === "error") return l.status === "error";
    if (syncFilter === "success") return l.status === "success";
    return true;
  });

  const failedSyncCount = syncLogs.filter((l) => l.status === "error").length;

  const handleExportCSV = () => {
    const headers = ["Data/Hora", "Usuario", "Acao", "Campo", "Valor Anterior", "Novo Valor", "Dispositivo"];
    const rows = filtered.map((a) => [
      new Date(a.data).toLocaleString("pt-BR"),
      a.usuario,
      a.acao,
      a.campo,
      String(a.valorAnterior ?? ""),
      String(a.valorNovo ?? ""),
      a.dispositivo
    ]);
    const csvContent = [headers, ...rows]
      .map((e) => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trilha_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Subtabs Selector inside Auditoria */}
      <div className="flex border-b border-white/5 pb-2 gap-4 flex-wrap">
        <button
          onClick={() => setSubTab("logs")}
          className={`pb-2 px-2 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer ${
            subTab === "logs"
              ? "text-indigo-400 border-b-2 border-indigo-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span>📋 Trilha de Auditoria</span>
        </button>
        <button
          onClick={() => setSubTab("sync_logs")}
          className={`pb-2 px-2 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer ${
            subTab === "sync_logs"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span>🔄 Logs de Sincronização & Falhas</span>
          {failedSyncCount > 0 && (
            <span className="bg-rose-500/20 text-rose-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
              {failedSyncCount} falhas
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab("aprovacoes")}
          className={`pb-2 px-2 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer ${
            subTab === "aprovacoes"
              ? "text-rose-400 border-b-2 border-rose-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span>✅ Controle de Acessos Pendentes</span>
        </button>
      </div>

      {subTab === "logs" && (
        <div className="space-y-6">
          {confirmClearAll && (
            <ConfirmActionCode
              actionLabel="Excluir Todos os Logs de Auditoria"
              severity="carmine"
              onConfirm={() => {
                onClearAudit?.();
                setConfirmClearAll(false);
              }}
              onCancel={() => setConfirmClearAll(false)}
            />
          )}

          {confirmDeleteId && (
            <ConfirmActionCode
              actionLabel="Excluir Registro de Auditoria"
              severity="carmine"
              onConfirm={() => {
                onDeleteAuditLog?.(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              onCancel={() => setConfirmDeleteId(null)}
            />
          )}

          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Trilha de Auditoria</h2>
              <p className="text-xs text-zinc-500 mt-1">Trilha de modificações e segurança operacional em tempo real</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="Filtrar operador"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="inp py-1.5 text-xs w-32 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Filtrar ação"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="inp py-1.5 text-xs w-32 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Filtrar campo"
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="inp py-1.5 text-xs w-32 focus:outline-none"
              />
              <button
                onClick={handleExportCSV}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer"
              >
                Exportar CSV
              </button>
              {onClearAudit && audit.length > 0 && (
                <button
                  id="btn-clear-audit-logs"
                  onClick={() => setConfirmClearAll(true)}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer flex items-center gap-1.5"
                  title="Excluir todos os registros de auditoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Trilha
                </button>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[0.55rem] uppercase tracking-widest text-zinc-500 border-b border-white/10 bg-black/20">
                    <th className="p-3 font-bold">Data/Hora</th>
                    <th className="p-3 font-bold">Usuário</th>
                    <th className="p-3 font-bold">Ação</th>
                    <th className="p-3 font-bold text-sky-400">Campo</th>
                    <th className="p-3 font-bold text-red-400">Valor Anterior</th>
                    <th className="p-3 font-bold text-emerald-400">Novo Valor</th>
                    <th className="p-3 font-bold text-right">Dispositivo</th>
                    {onDeleteAuditLog && <th className="p-3 font-bold text-center w-12">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                  {[...filtered].reverse().map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-white/[0.01]">
                      <td className="p-3 text-zinc-400">
                        {new Date(a.data).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-3 font-bold text-indigo-400 font-sans">{a.usuario}</td>
                      <td className="p-3 font-sans text-white">{a.acao}</td>
                      <td className="p-3 text-sky-400 font-bold">{a.campo}</td>
                      <td className="p-3 text-red-400">{String(a.valorAnterior ?? "—")}</td>
                      <td className="p-3 text-emerald-400 font-bold">{String(a.valorNovo ?? "—")}</td>
                      <td className="p-3 text-right text-[10px] text-zinc-600 font-sans uppercase">{a.dispositivo}</td>
                      {onDeleteAuditLog && (
                        <td className="p-3 text-center">
                          <button
                            id={`btn-delete-audit-${a.id || i}`}
                            onClick={() => setConfirmDeleteId(a.id || `${i}`)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10 cursor-pointer"
                            title="Excluir este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={onDeleteAuditLog ? 8 : 7} className="text-center py-16 text-zinc-500 italic">
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === "sync_logs" && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">
                Log de Sincronização & Reenvio de Falhas
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Monitoramento de transações com o Supabase e reprocessamento de operações com falha
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => setSyncFilter("all")}
                  className={`px-3 py-1 rounded transition-colors ${syncFilter === "all" ? "bg-white/10 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  Todos ({syncLogs.length})
                </button>
                <button
                  onClick={() => setSyncFilter("error")}
                  className={`px-3 py-1 rounded transition-colors ${syncFilter === "error" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  Falhas ({failedSyncCount})
                </button>
                <button
                  onClick={() => setSyncFilter("success")}
                  className={`px-3 py-1 rounded transition-colors ${syncFilter === "success" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  Sucessos ({syncLogs.length - failedSyncCount})
                </button>
              </div>

              {failedSyncCount > 0 && (
                <button
                  onClick={handleRetryAllFailed}
                  disabled={retryingLogId === "all"}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retryingLogId === "all" ? "animate-spin" : ""}`} />
                  Reenviar Todas as Falhas
                </button>
              )}

              <button
                onClick={loadSyncLogs}
                disabled={loadingSyncLogs}
                className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSyncLogs ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-200 font-mono">
              {syncFeedback}
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[0.55rem] uppercase tracking-widest text-zinc-500 border-b border-white/10 bg-black/20">
                    <th className="p-3 font-bold">Data/Hora</th>
                    <th className="p-3 font-bold">Conexão / Origem</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Registros</th>
                    <th className="p-3 font-bold">Detalhes / Mensagem</th>
                    <th className="p-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                  {filteredSyncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 text-zinc-400">
                        {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="p-3 font-bold text-purple-400 font-sans">{log.conexao_id}</td>
                      <td className="p-3">
                        {log.status === "success" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-500/20">
                            ✓ Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-500/20">
                            ✕ Falha
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-sky-400">{log.registros_afetados || 0}</td>
                      <td className="p-3 text-zinc-400 max-w-sm break-words font-sans">
                        {log.mensagem_erro || "Operação executada com sucesso."}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRetrySyncLog(log.id)}
                          disabled={retryingLogId === log.id}
                          className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? "animate-spin text-purple-400" : ""}`} />
                          Reenviar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSyncLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-zinc-500 italic">
                        {loadingSyncLogs ? "Carregando logs..." : "Nenhum log de sincronização encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === "aprovacoes" && <AdminApprovalTab />}
    </div>
  );
};

// ==========================================
// RELATÓRIOS TAB
// ==========================================
interface RelatoriosTabProps {
  setores: Setor[];
  coordenador: string;
  historico?: HistoricoRegistro[];
  colaboradores?: Colaborador[];
  reaproData?: ReaproData;
  capacidade?: CapacidadeSetor[];
}

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({
  setores,
  coordenador,
  historico = [],
  colaboradores = [],
  reaproData = {
    setores: {},
    indicadores: { totalPresoDAll: 0, emCursoColetado: 0, totalEmMaquina: 0, disponibilidade: 0 },
    terminoPrevisao: '',
    capacidadeFechamentoEst: 0,
    listasFechadas: { artigos: 0, colis: 0 }
  },
  capacidade = []
}) => {
  const [relatorioText, setRelatorioText] = useState("");
  const [dataFiltro, setDataFiltro] = useState(new Date().toLocaleDateString("pt-BR"));
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = (tipo: "abertura" | "fechamento") => {
    const header = tipo === "abertura" ? "== ABERTURA DE TURNO LOGÍSTICO ==" : "== FECHAMENTO DE TURNO LOGÍSTICO ==";
    const body = setores
      .map(
        (s) =>
          `S${s.id} | ATIV: ${s.ativ.toString().padEnd(6)} | UPH: ${s.uph.toString().padEnd(3)} | Promessa: ${s.promessa.toString().padEnd(4)}% | Líder: ${s.resp.split(" ")[0]}`
      )
      .join("\n");

    const text = `${header}\nData: ${new Date().toLocaleString("pt-BR")}\nCoordenador Responsável: ${coordenador}\n----------------------------------------\n${body}\n----------------------------------------\nStatus Geral: Turno processado com total sucesso.`;
    setRelatorioText(text);
  };

  const handleCopy = () => {
    if (relatorioText) {
      navigator.clipboard.writeText(relatorioText);
      alert("Copiado com sucesso para a área de transferência!");
    }
  };

  const historicoFiltrado = historico.filter((h) => h.data === dataFiltro);

  const handleDownloadCSV = () => {
    if (historicoFiltrado.length === 0) {
      alert("Nenhum registro encontrado para a data filtrada.");
      return;
    }
    const header = ["Data", "Hora", "Setor", "Volume (ATIV)", "Repro (Caixas)", "Colis", "Pessoas", "UPH", "SLA (Promessa %)", "Nota 5S", "Erros", "Coordenador"];
    const rows = historicoFiltrado.map(h => [
      h.data,
      h.hora,
      h.setor,
      h.ativ,
      h.repro || 0,
      h.colis || 0,
      h.pessoas || 0,
      h.uph,
      h.promessa,
      h.nota5s || 0,
      h.erros || 0,
      h.coordenador || coordenador
    ]);
    const csvContent = [
      header.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_consolidado_${dataFiltro.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      initGoogleIdentity();
      const url = await exportToGoogleSheets({
        setores,
        colaboradores,
        reapro: reaproData,
        historico,
        coordenador,
        capacidade,
      });
      window.open(url, '_blank');
      alert('Relatório consolidado exportado com sucesso no Google Sheets!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar para o Google Sheets: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-l-2 border-sky-500/50">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} className="text-sky-400" />
          Gerador de Relatórios e Handovers (WhatsApp/E-mail)
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleGenerate("abertura")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Relatório de Abertura
          </button>
          <button
            onClick={() => handleGenerate("fechamento")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Relatório de Fechamento
          </button>
          {relatorioText && (
            <button
              onClick={handleCopy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ml-auto flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={14} />
              Copiar Texto
            </button>
          )}
        </div>
        <textarea
          value={relatorioText}
          readOnly
          className="inp font-mono text-xs h-64 leading-relaxed whitespace-pre overflow-x-auto bg-black/60 focus:outline-none p-3 border border-white/5 rounded-lg w-full"
          placeholder="Selecione um dos relatórios acima para gerar..."
        />
      </div>

      <div className="glass-card p-6 border-l-2 border-emerald-500/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
            <Download size={16} className="text-emerald-400" />
            Extração de Histórico Consolidado por Setor & Dia
          </h3>

          <button
            onClick={handleExportSheets}
            disabled={isExporting}
            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <span>☁️</span>
            )}
            {isExporting ? "Exportando..." : "Salvar no Google Sheets"}
          </button>
        </div>
        
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">
              Data de Filtro (DD/MM/AAAA)
            </label>
            <input
              type="text"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="inp text-sm font-mono w-40"
              placeholder="Ex: 20/06/2026"
            />
          </div>
          <button
            onClick={handleDownloadCSV}
            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            Baixar CSV do Dia
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar max-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[0.55rem] uppercase tracking-widest text-zinc-500 border-b border-white/10 sticky top-0 bg-[#0c0c0e] z-10">
                <th className="p-3 font-bold">Hora</th>
                <th className="p-3 font-bold text-center">Setor</th>
                <th className="p-3 font-bold text-right">Volume (ATIV)</th>
                <th className="p-3 font-bold text-right">Repro (CX)</th>
                <th className="p-3 font-bold text-right">Colis</th>
                <th className="p-3 font-bold text-center">Pessoas</th>
                <th className="p-3 font-bold text-right">UPH</th>
                <th className="p-3 font-bold text-right">SLA</th>
                <th className="p-3 font-bold text-right">5S</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {historicoFiltrado.length > 0 ? (
                historicoFiltrado.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.01]">
                    <td className="p-3 text-zinc-400">{h.hora}</td>
                    <td className="p-3 text-center text-white font-black">S{h.setor}</td>
                    <td className="p-3 text-right font-bold text-sky-400">{(h.ativ ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right text-amber-400">{(h.repro ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right text-purple-400">{(h.colis ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-center text-zinc-300 font-bold">{h.pessoas ?? '-'}</td>
                    <td className="p-3 text-right text-indigo-400">{h.uph}</td>
                    <td className="p-3 text-right text-emerald-400">{h.promessa}%</td>
                    <td className="p-3 text-right text-zinc-400">{h.nota5s ?? 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-zinc-500 italic">
                    Nenhum registro no histórico para a data {dataFiltro}.
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

// ==========================================
// CONFIG TAB
// ==========================================
interface ConfigTabProps {
  userRole: UserRole;
  setores: Setor[];
  colaboradores: Colaborador[];
  referentesSemana: ReferenteSemana[];
  screensaver: ScreensaverConfig;
  coordenador: string;
  fotoCoordenador: string;
  initialSubCat?: string;
  onUpdateReferente: (index: number, field: string, val: string) => void;
  onAddReferente: () => void;
  onRemoveReferente: (index: number) => void;
  onAddSetor: (id: string, resp: string, foto: string) => void;
  onRemoveSetor: (index: number) => void;
  onUpdateSetor: (sid: string, field: string, value: number) => void;
  onUpdateSetorProd?: (sid: string, field: string, value: number) => void;
  onUpdateCoordenador: (nome: string, foto: string) => void;
  onUpdateScreensaver: (config: ScreensaverConfig) => void;
  onImportBackup: (state: any) => void;
  onExportBackup: () => void;
  onLogout: () => void;
  onSaveRadar?: (r: RadarLoja[]) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  userRole,
  setores,
  colaboradores,
  referentesSemana,
  screensaver,
  coordenador,
  fotoCoordenador,
  initialSubCat,
  onUpdateReferente,
  onAddReferente,
  onRemoveReferente,
  onAddSetor,
  onRemoveSetor,
  onUpdateSetor,
  onUpdateSetorProd,
  onUpdateCoordenador,
  onUpdateScreensaver,
  onImportBackup,
  onExportBackup,
  onLogout,
  onSaveRadar,
}) => {
  const isAdmin = userRole === UserRole.Admin;
  const isCoordinator = userRole === UserRole.Coordenador;
  const isLeader = userRole === UserRole.Lider;
  const isOperator = userRole === UserRole.Operador;

  // Let's define checks for specific actions:
  const canEditLeadership = isAdmin || isCoordinator;
  const canEditReferents = isAdmin || isCoordinator || isLeader;
  const canManageSectors = isAdmin;
  const canEditSectorParams = isAdmin || isCoordinator || isLeader;
  const canManageStores = isAdmin || isCoordinator;
  const canImportData = isAdmin || isCoordinator;
  const canDeleteAllData = isAdmin;
  const canImportBackup = isAdmin;
  const canConfigureScreensaver = isAdmin || isCoordinator;

  const [subCat, setSubCat] = useState(initialSubCat || "geral");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [totalImportedCount, setTotalImportedCount] = useState(0);

  // Store Sector Master UI State
  const { universos: globUniversos, setUniversos: setGlobUniversos } = useSectorStore();
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [editingSetorId, setEditingSetorId] = useState<string | null>(null);
  const [setorFormId, setSetorFormId] = useState("");
  const [setorFormNumero, setSetorFormNumero] = useState(0);
  const [setorFormNome, setSetorFormNome] = useState("");
  const [setorFormMeta, setSetorFormMeta] = useState(100);
  
  const [showUniversoModal, setShowUniversoModal] = useState(false);
  const [activeSetorForUniverso, setActiveSetorForUniverso] = useState<string | null>(null);
  const [editingUniversoIdx, setEditingUniversoIdx] = useState<number | null>(null);
  const [universoFormNome, setUniversoFormNome] = useState("");
  const [universoFormMeta, setUniversoFormMeta] = useState(0);

  // Store Master Zustand hook
  const {
    stores: masterStores,
    addStore: addMasterStore,
    updateStore: updateMasterStore,
    deleteStore: deleteMasterStore,
    loadStores: loadMasterStores,
  } = useStoreMaster();

  // Store Master Local UI State
  const [storeSearch, setStoreSearch] = useState("");
  const [storeUfFilter, setStoreUfFilter] = useState("all");
  const [storeTransFilter, setStoreTransFilter] = useState("all");
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeFormId, setStoreFormId] = useState("");
  const [storeFormNome, setStoreFormNome] = useState("");
  const [storeFormCidade, setStoreFormCidade] = useState("");
  const [storeFormUf, setStoreFormUf] = useState("SP");
  const [storeFormTrans, setStoreFormTrans] = useState("JADLOG");
  const [storeFormObs, setStoreFormObs] = useState("");
  const [isDeleteStoreConfirmOpen, setIsDeleteStoreConfirmOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<StoreMaster | null>(null);

  useEffect(() => {
    loadMasterStores();
  }, []);

  const handleOpenNewStore = () => {
    setEditingStoreId(null);
    setStoreFormId("");
    setStoreFormNome("");
    setStoreFormCidade("São Paulo");
    setStoreFormUf("SP");
    setStoreFormTrans("JADLOG");
    setStoreFormObs("");
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (st: StoreMaster) => {
    setEditingStoreId(st.id);
    setStoreFormId(st.id);
    setStoreFormNome(st.nome);
    setStoreFormCidade(st.cidade || "");
    setStoreFormUf(st.uf || "SP");
    setStoreFormTrans(st.transportadoraPadrao || "JADLOG");
    setStoreFormObs(st.observacoes || "");
    setShowStoreModal(true);
  };

  const handleSaveStoreForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeFormId || !storeFormNome) {
      showFeedback("Código e Nome da Loja são obrigatórios.", "error");
      return;
    }

    const payload: StoreMaster = {
      id: storeFormId.trim().toUpperCase(),
      nome: storeFormNome.trim().toUpperCase(),
      cidade: storeFormCidade.trim() || "São Paulo",
      uf: storeFormUf.trim().toUpperCase() || "SP",
      transportadoraPadrao: storeFormTrans.trim().toUpperCase() || "JADLOG",
      observacoes: storeFormObs.trim() || "Cadastrado via Painel Master"
    };

    if (editingStoreId) {
      await updateMasterStore(editingStoreId, payload);
      showFeedback(`Loja ${payload.id} - ${payload.nome} atualizada com sucesso!`);
    } else {
      await addMasterStore(payload);
      showFeedback(`Loja ${payload.id} - ${payload.nome} cadastrada no Master com sucesso!`);
    }

    setShowStoreModal(false);
  };

  const handleDeleteStoreConfirm = async () => {
    if (!storeToDelete) return;
    await deleteMasterStore(storeToDelete.id);
    showFeedback(`Loja ${storeToDelete.id} removida do cadastro.`);
    setIsDeleteStoreConfirmOpen(false);
    setStoreToDelete(null);
  };

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const lists = await FirebaseService.fetchTable<ListaColetaItem>("lista_coleta");
        setTotalImportedCount(lists.length);
      } catch (err) {
        console.warn("Could not fetch imported list count", err);
      }
    };
    if (subCat === "importacao") {
      fetchCount();
    }
  }, [subCat, isConfirmModalOpen]);

  // Custom feedback notification toast state
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" | "info" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenNewSetor = () => {
    setEditingSetorId(null);
    setSetorFormId("");
    setSetorFormNumero(0);
    setSetorFormNome("");
    setSetorFormMeta(100);
    setShowSetorModal(true);
  };

  const handleOpenEditSetor = (st: Setor) => {
    setEditingSetorId(st.id);
    setSetorFormId(st.id);
    setSetorFormNumero(st.numero);
    setSetorFormNome(st.nome);
    setSetorFormMeta(st.meta);
    setShowSetorModal(true);
  };

  const { setSetores } = useSectorStore();

  const handleSaveSetorForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setorFormId || !setorFormNome) {
      showFeedback("ID e Nome do Setor são obrigatórios.", "error");
      return;
    }

    if (editingSetorId) {
      setSetores(prev => prev.map(s => s.id === editingSetorId ? {
        ...s,
        id: setorFormId,
        numero: setorFormNumero,
        nome: setorFormNome,
        meta: setorFormMeta,
      } : s));
      showFeedback(`Setor ${setorFormNome} atualizado com sucesso!`);
    } else {
      const novoSetor: Setor = {
        id: setorFormId,
        numero: setorFormNumero,
        nome: setorFormNome,
        meta: setorFormMeta,
        resp: "PENDENTE",
        ativ: 0,
        promessa: 100,
        varFin: 0,
        bsi: 100,
        nota5s: 100,
        errosPicking: 0,
        reproTotal: 0,
        infracaoSeguranca: false,
        horasDKT: 0,
        poliRec: 0,
        rdl: 0,
        poliSaid: 0,
        coletado: 0,
        uph: 0,
        situacao: 'Ativo'
      };
      setSetores(prev => [...prev, novoSetor]);
      showFeedback(`Setor ${setorFormNome} adicionado com sucesso!`);
    }
    setShowSetorModal(false);
  };

  const handleDeleteSetor = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este setor?")) {
      setSetores(prev => prev.filter(s => s.id !== id));
      showFeedback("Setor removido com sucesso!");
    }
  };

  const handleOpenNewUniverso = (setorId: string) => {
    setActiveSetorForUniverso(setorId);
    setEditingUniversoIdx(null);
    setUniversoFormNome("");
    setUniversoFormMeta(0);
    setShowUniversoModal(true);
  };

  const handleOpenEditUniverso = (setorId: string, idx: number, univ: UniversoMix) => {
    setActiveSetorForUniverso(setorId);
    setEditingUniversoIdx(idx);
    setUniversoFormNome(univ.nome);
    setUniversoFormMeta(univ.meta);
    setShowUniversoModal(true);
  };

  const handleSaveUniversoForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSetorForUniverso || !universoFormNome) {
      showFeedback("Nome do universo é obrigatório.", "error");
      return;
    }

    const currentUnivs = globUniversos[activeSetorForUniverso] || [];
    let nextUnivs = [...currentUnivs];

    if (editingUniversoIdx !== null) {
      nextUnivs[editingUniversoIdx] = {
        ...nextUnivs[editingUniversoIdx],
        nome: universoFormNome,
        meta: universoFormMeta
      };
      showFeedback("Universo atualizado com sucesso!");
    } else {
      nextUnivs.push({
        setor_id: activeSetorForUniverso,
        nome: universoFormNome,
        meta: universoFormMeta,
        feito: 0
      });
      showFeedback("Universo adicionado com sucesso!");
    }

    setGlobUniversos({
      ...globUniversos,
      [activeSetorForUniverso]: nextUnivs
    });
    setShowUniversoModal(false);
  };

  const handleDeleteUniverso = (setorId: string, idx: number) => {
    if (confirm("Tem certeza que deseja excluir este universo?")) {
      const currentUnivs = globUniversos[setorId] || [];
      const nextUnivs = currentUnivs.filter((_, i) => i !== idx);
      setGlobUniversos({
        ...globUniversos,
        [setorId]: nextUnivs
      });
      showFeedback("Universo removido com sucesso!");
    }
  };



  // General Liderança forms
  const [coordNome, setCoordNome] = useState(coordenador);
  const [coordFoto, setCoordFoto] = useState(fotoCoordenador);

  // Setor override modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(initialSubCat === "override");

  useEffect(() => {
    if (subCat === "override") {
      setIsOverrideModalOpen(true);
    }
  }, [subCat]);


  // Simulated OCR Loader
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [parsedPreview, setParsedPreview] = useState<RadarLoja[]>([]);

  useEffect(() => {
    if (!ocrText) {
      setParsedPreview([]);
      return;
    }
    const lines = ocrText.split("\n");
    const list: RadarLoja[] = [];
    lines.forEach((line) => {
      if (!line.includes("CORTE:") || !line.includes("LOJA:")) return;
      const parts = line.split("|").map(p => p.trim());
      let corte = "00:00";
      let loja = "";
      let vol = 0;
      let ativ = 0;
      let prog = 0;

      parts.forEach((p) => {
        const [key, val] = p.split(":").map(s => s.trim());
        if (key === "CORTE") corte = val;
        if (key === "LOJA") loja = val;
        if (key === "VOL") vol = parseInt(val) || 0;
        if (key === "ATIV") ativ = parseInt(val) || 0;
        if (key === "PROG") prog = parseInt(val.replace("%", "")) || 0;
      });

      if (loja) {
        const storeCode = loja.split("-")[0].trim();
        const registeredStore = masterStores.find(s => s.id === storeCode) || masterCadastroLojas.find(s => s.id === storeCode);

        let statusOCR: "registrada" | "pendente" | "divergente" | "nao_cadastrada" = "registrada";
        let erroDesc = "";

        if (!registeredStore) {
          statusOCR = "nao_cadastrada";
          erroDesc = `Loja código "${storeCode}" não está cadastrada no banco master.`;
        } else if (prog === 0) {
          statusOCR = "pendente";
          erroDesc = "Aguardando início da expedição";
        } else if ('volEsperado' in registeredStore && vol !== (registeredStore as any).volEsperado) {
          statusOCR = "divergente";
          erroDesc = `Divergência detectada! Volume real: ${vol} | Cadastrado esperado: ${(registeredStore as any).volEsperado}`;
        }

        list.push({
          corte,
          loja,
          vol,
          ativ,
          prog,
        });
      }
    });
    setParsedPreview(list);
  }, [ocrText]);

  // JSON Data Importer States
  const [importSubTab, setImportSubTab] = useState<"ocr" | "json" | "historico" | "configuracoes">("json");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonStrategy, setJsonStrategy] = useState<"merge" | "append" | "overwrite" | "update">("merge");
  const [applyToAllSectors, setApplyToAllSectors] = useState(false);
  const [fileSelectedName, setFileSelectedName] = useState("");
  const [jsonPreview, setJsonPreview] = useState<{
    valid: { item: any; warnings: string[] }[];
    invalid: { item: any; errors: string[] }[];
    total: number;
  }>({ valid: [], invalid: [], total: 0 });
  const [jsonError, setJsonError] = useState("");

  const [importHistory, setImportHistory] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("json_import_history");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [importSettings, setImportSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("json_import_settings");
      return cached ? JSON.parse(cached) : {
        ignoreInvalid: true,
        strictValidation: true,
        logAudit: true
      };
    } catch {
      return {
        ignoreInvalid: true,
        strictValidation: true,
        logAudit: true
      };
    }
  });

  // Save settings when changed
  const updateImportSetting = (field: string, val: boolean) => {
    setImportSettings((prev: any) => {
      const updated = { ...prev, [field]: val };
      localStorage.setItem("json_import_settings", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!jsonInput.trim()) {
      setJsonPreview({ valid: [], invalid: [], total: 0 });
      setJsonError("");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setJsonError("O JSON deve ser uma lista (Array) de objetos de coleta.");
        setJsonPreview({ valid: [], invalid: [], total: 0 });
        return;
      }

      setJsonError("");
      const valid: { item: any; warnings: string[] }[] = [];
      const invalid: { item: any; errors: string[] }[] = [];
      const registeredSectors = setores.map((s) => s.id);

      parsed.forEach((item: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields
        if (!item.lista || typeof item.lista !== "string" || !item.lista.trim()) {
          errors.push('Campo "lista" é obrigatório e deve ser um texto identificador.');
        }
        if (!item.loja || typeof item.loja !== "string" || !item.loja.trim()) {
          errors.push('Campo "loja" é obrigatório e deve ser um texto descritivo.');
        }

        if (item.setor === undefined || item.setor === null) {
          errors.push('Campo "setor" é obrigatório.');
        } else {
          const sId = String(item.setor);
          if (!registeredSectors.includes(sId)) {
            errors.push(`Setor "${item.setor}" não está registrado como um setor ativo do CD (disponíveis: ${registeredSectors.join(", ")}).`);
          }
        }

        const timeRegex = /^[0-2]\d:[0-5]\d$/;
        if (!item.corte || typeof item.corte !== "string") {
          errors.push('Campo "corte" é obrigatório.');
        } else if (!timeRegex.test(item.corte)) {
          errors.push(`Horário de corte "${item.corte}" é inválido. Formato esperado: HH:MM (ex: 07:15).`);
        }

        if (!item.carregamento || typeof item.carregamento !== "string") {
          errors.push('Campo "carregamento" é obrigatório.');
        } else if (!timeRegex.test(item.carregamento)) {
          errors.push(`Horário de carregamento "${item.carregamento}" é inválido. Formato esperado: HH:MM (ex: 08:30).`);
        }

        if (item.volumes !== undefined && (typeof item.volumes !== "number" || item.volumes < 0)) {
          errors.push('O campo "volumes" deve ser um número maior ou igual a zero.');
        }
        if (item.enderecos !== undefined && (typeof item.enderecos !== "number" || item.enderecos < 0)) {
          errors.push('O campo "enderecos" deve ser um número maior ou igual a zero.');
        }

        // Warnings for non-critical things
        if (item.volumes > 10000) {
          warnings.push(`Alerta: Volume alto detectado (${item.volumes}). Verifique se a informação está correta.`);
        }

        if (errors.length > 0) {
          invalid.push({ item, errors });
        } else {
          valid.push({ item, warnings });
        }
      });

      setJsonPreview({
        valid,
        invalid,
        total: parsed.length,
      });
    } catch (e: any) {
      setJsonError(`Erro de sintaxe JSON: ${e.message}`);
      setJsonPreview({ valid: [], invalid: [], total: 0 });
    }
  }, [jsonInput, setores]);

  // Setor create form
  const [newSid, setNewSid] = useState("");
  const [newSResp, setNewSResp] = useState("");
  const [newSFoto, setNewSFoto] = useState("");

  // Screensaver Config forms
  const [ssEnabled, setSsEnabled] = useState(screensaver.enabled);
  const [ssTimeout, setSsTimeout] = useState(screensaver.timeout);
  const [ssDuration, setSsDuration] = useState(screensaver.duration);
  const [ssImage, setSsImage] = useState(screensaver.image || "");



  const DIAS_OPTS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

  const handleLiderancaSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCoordenador(coordNome, coordFoto);
    showFeedback("Liderança geral do turno atualizada com sucesso!", "success");
  };

  const handleCreateSetor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSid.trim() || !newSResp.trim()) return;
    onAddSetor(newSid.trim(), newSResp.trim(), newSFoto);
    setNewSid("");
    setNewSResp("");
    showFeedback("Novo setor operacional criado com sucesso!", "success");
  };

  const handleScreensaverSave = () => {
    onUpdateScreensaver({
      enabled: ssEnabled,
      timeout: ssTimeout,
      duration: ssDuration,
      image: ssImage,
    });
    showFeedback("Configurações da tela de descanso salvas com sucesso!", "success");
  };

  // OCR Processing Simulator
  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(10);

    const intv = setInterval(() => {
      setOcrProgress((p) => {
        if (p >= 100) {
          clearInterval(intv);
          setOcrLoading(false);
          setOcrText(
            `== RECONHECIMENTO OCR RADAR DE LOJAS ==\n` +
            `CORTE: 07:00 | LOJA: 2722 - FLORIPA CONTINENTE | VOL: 3787 | ATIV: 52700 | PROG: 100%\n` +
            `CORTE: 08:00 | LOJA: 2360 - OSASCO | VOL: 6817 | ATIV: 5750 | PROG: 72%\n` +
            `CORTE: 10:00 | LOJA: 1250 - SÃO JOSÉ DOS CAMPOS | VOL: 0 | ATIV: 0 | PROG: 0%\n` +
            `CORTE: 12:00 | LOJA: 1540 - CURITIBA | VOL: 3100 | ATIV: 1500 | PROG: 48%\n` +
            `CORTE: 14:00 | LOJA: 9999 - LOJA TESTE INEXISTENTE | VOL: 1200 | ATIV: 200 | PROG: 15%\n` +
            `CORTE: 16:00 | LOJA: 3015 - CAMPINAS | VOL: 3400 | ATIV: 2900 | PROG: 85%`
          );
          return 100;
        }
        return p + 30;
      });
    }, 400);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rdr = new FileReader();
    rdr.onload = (evt) => {
      try {
        const obj = JSON.parse(evt.target?.result as string);
        onImportBackup(obj);
        showFeedback("Backup importado com sucesso!", "success");
      } catch {
        showFeedback("Erro ao processar backup. Arquivo JSON inválido.", "error");
      }
    };
    rdr.readAsText(file);
  };

  // Normalize time strings to HH:MM format
  const normalizeTimeString = (val: any): string => {
    if (val === undefined || val === null) return "00:00";
    let str = String(val).trim().replace(/\s/g, "");
    if (!str) return "00:00";
    
    // If it's an Excel numeric time (fraction of a day, e.g. 0.3125 for 07:30)
    const num = Number(str);
    if (!isNaN(num) && num > 0 && num < 1) {
      const totalMinutes = Math.round(num * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    // If it has a colon, e.g. "7:30" or "18:45"
    if (str.includes(":")) {
      const parts = str.split(":");
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // If it's just a number like 7 or 730 or 1430
    if (/^\d+$/.test(str)) {
      if (str.length <= 2) {
        const h = parseInt(str) || 0;
        return `${String(h).padStart(2, "0")}:00`;
      } else if (str.length === 3) {
        const h = parseInt(str.substring(0, 1)) || 0;
        const m = parseInt(str.substring(1)) || 0;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      } else if (str.length === 4) {
        const h = parseInt(str.substring(0, 2)) || 0;
        const m = parseInt(str.substring(2)) || 0;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    return str;
  };

  // Convert parsed worksheet rows to standard objects
  const mapRowsToLists = (rows: any[][]): any[] => {
    if (rows.length === 0) return [];

    // Extract and normalize headers
    const rawHeaders = rows[0].map(h => String(h || "").trim());
    const headers = rawHeaders.map(h => h.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "") // remove non-alphanumeric
    );

    // Synonyms/aliases mapping
    const idxLista = headers.findIndex(h => h.includes("lista") || h === "id" || h === "codigo" || h.includes("listid") || h === "key");
    const idxLoja = headers.findIndex(h => h.includes("loja") || h === "store" || h.includes("destino") || h.includes("cliente") || h.includes("nome"));
    const idxSetor = headers.findIndex(h => h.includes("setor") || h === "set" || h.includes("sector") || h === "sec");
    const idxCorte = headers.findIndex(h => h.includes("corte") || h === "cut" || h.includes("cutoff") || h.includes("horariocorte"));
    const idxCarregamento = headers.findIndex(h => h.includes("carregamento") || h === "load" || h.includes("loading") || h.includes("horariocarregamento"));
    const idxVolumes = headers.findIndex(h => h.includes("volumes") || h === "vol" || h === "vols" || h.includes("qtd") || h.includes("quantidade") || h.includes("items") || h === "volume");
    const idxEnderecos = headers.findIndex(h => h.includes("enderecos") || h === "end" || h === "ends" || h.includes("atividades") || h.includes("address") || h === "endereco");
    const idxTransp = headers.findIndex(h => h.includes("transportadora") || h === "transp" || h === "carrier" || h.includes("logistica"));
    const idxAtiv = headers.findIndex(h => h.includes("atividade") || h.includes("ativrelacionada") || h.includes("tipo") || h.includes("operation"));

    // Default fallback indices if columns can't be recognized
    const finalIdxLista = idxLista !== -1 ? idxLista : 0;
    const finalIdxLoja = idxLoja !== -1 ? idxLoja : 1;
    const finalIdxSetor = idxSetor !== -1 ? idxSetor : 2;
    const finalIdxCorte = idxCorte !== -1 ? idxCorte : 3;
    const finalIdxCarregamento = idxCarregamento !== -1 ? idxCarregamento : 4;
    const finalIdxVolumes = idxVolumes !== -1 ? idxVolumes : 5;
    const finalIdxEnderecos = idxEnderecos !== -1 ? idxEnderecos : 6;
    const finalIdxTransp = idxTransp !== -1 ? idxTransp : 7;
    const finalIdxAtiv = idxAtiv !== -1 ? idxAtiv : 8;

    // Map rows to objects
    return rows.slice(1).map((row) => {
      if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === "")) return null;

      const sectorRaw = row[finalIdxSetor] !== undefined ? String(row[finalIdxSetor]).trim() : "";
      let sectorNum = parseInt(sectorRaw.replace(/\D/g, "")) || 87;

      const corteRaw = row[finalIdxCorte] !== undefined ? row[finalIdxCorte] : "";
      const corteClean = normalizeTimeString(corteRaw);

      const carregamentoRaw = row[finalIdxCarregamento] !== undefined ? row[finalIdxCarregamento] : "";
      const carregamentoClean = normalizeTimeString(carregamentoRaw);

      const volsRaw = row[finalIdxVolumes] !== undefined ? row[finalIdxVolumes] : 0;
      const volsNum = parseInt(String(volsRaw).replace(/\D/g, "")) || 0;

      const endsRaw = row[finalIdxEnderecos] !== undefined ? row[finalIdxEnderecos] : 0;
      const endsNum = parseInt(String(endsRaw).replace(/\D/g, "")) || 0;

      return {
        lista: row[finalIdxLista] !== undefined ? String(row[finalIdxLista]).trim() : "",
        loja: row[finalIdxLoja] !== undefined ? String(row[finalIdxLoja]).trim() : "",
        setor: sectorNum,
        corte: corteClean,
        carregamento: carregamentoClean,
        volumes: volsNum,
        enderecos: endsNum,
        transportadora: row[finalIdxTransp] !== undefined ? String(row[finalIdxTransp]).trim() : "MOBI",
        atividadeRelacionada: row[finalIdxAtiv] !== undefined ? String(row[finalIdxAtiv]).trim() : "Picking"
      };
    }).filter(Boolean);
  };

  // Enhanced Import handler supporting JSON, CSV and XLSX
  const handlePlanilhaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileSelectedName(file.name);
    const rdr = new FileReader();

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      rdr.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          const mappedObjects = mapRowsToLists(rows);
          setJsonInput(JSON.stringify(mappedObjects, null, 2));
          showFeedback("Planilha Excel importada com sucesso!", "success");
        } catch (err: any) {
          showFeedback(`Erro ao importar planilha Excel: ${err.message}`, "error");
        }
      };
      rdr.readAsBinaryString(file);
    } else if (file.name.endsWith(".csv")) {
      rdr.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          // Split into rows and cell arrays
          const rows = text.split("\n")
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

          const mappedObjects = mapRowsToLists(rows);
          setJsonInput(JSON.stringify(mappedObjects, null, 2));
          showFeedback("Arquivo CSV importado com sucesso!", "success");
        } catch (err: any) {
          showFeedback(`Erro ao importar arquivo CSV: ${err.message}`, "error");
        }
      };
      rdr.readAsText(file, "UTF-8");
    } else if (file.name.endsWith(".json")) {
      rdr.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          JSON.parse(content); // Test JSON structure
          setJsonInput(content);
          showFeedback("Arquivo JSON carregado com sucesso!", "success");
        } catch {
          showFeedback("Erro ao carregar arquivo JSON. Verifique a sintaxe.", "error");
        }
      };
      rdr.readAsText(file);
    } else {
      showFeedback("Formato não suportado. Carregue .xlsx, .csv ou .json", "error");
    }
  };

  const downloadJsonTemplate = () => {
    const template = [
      {
        lista: "L101",
        loja: "2722 - FLORIPA CONTINENTE",
        setor: 87,
        corte: "07:00",
        carregamento: "07:30",
        transportadora: "JADLOG",
        volumes: 1200,
        enderecos: 45,
        atividadeRelacionada: "Picking"
      },
      {
        lista: "L102",
        loja: "2360 - OSASCO",
        setor: 88,
        corte: "08:00",
        carregamento: "08:30",
        transportadora: "BRADESCO LOG",
        volumes: 6817,
        enderecos: 120,
        atividadeRelacionada: "Volumosos"
      }
    ];

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `modelo_importacao_listas.json`);
    dlAnchorElem.click();
  };

  const downloadCsvTemplate = () => {
    const csvContent = [
      "lista;loja;setor;corte;carregamento;volumes;enderecos;transportadora;atividadeRelacionada",
      "L101;2722 - FLORIPA CONTINENTE;87;07:00;07:30;1200;45;JADLOG;Picking",
      "L102;2360 - OSASCO;88;08:00;08:30;6817;120;BRADESCO LOG;Volumosos"
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_listas.csv";
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Modelo CSV gerado e baixado!", "success");
  };

  const downloadXlsxTemplate = () => {
    const templateData = [
      {
        lista: "L101",
        loja: "2722 - FLORIPA CONTINENTE",
        setor: 87,
        corte: "07:00",
        carregamento: "07:30",
        transportadora: "JADLOG",
        volumes: 1200,
        enderecos: 45,
        atividadeRelacionada: "Picking"
      },
      {
        lista: "L102",
        loja: "2360 - OSASCO",
        setor: 88,
        corte: "08:00",
        carregamento: "08:30",
        transportadora: "BRADESCO LOG",
        volumes: 6817,
        enderecos: 120,
        atividadeRelacionada: "Volumosos"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Listas");
    const wopts: any = { bookType: 'xlsx', bookSST: false, type: 'binary' };
    const wbout = XLSX.write(workbook, wopts);
    
    const s2ab = (s: string) => {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    };

    const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_listas.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Modelo Excel (.xlsx) gerado e baixado!", "success");
  };

  const copyJsonTemplate = () => {
    const template = [
      {
        lista: "L101",
        loja: "2722 - FLORIPA CONTINENTE",
        setor: 87,
        corte: "07:00",
        carregamento: "07:30",
        transportadora: "JADLOG",
        volumes: 1200,
        enderecos: 45,
        atividadeRelacionada: "Picking"
      }
    ];
    navigator.clipboard.writeText(JSON.stringify(template, null, 2))
      .then(() => showFeedback("Template JSON copiado para a área de transferência!", "success"))
      .catch(() => showFeedback("Falha ao copiar template.", "error"));
  };

  const exportCurrentListsAsJson = async () => {
    try {
      const lists = await FirebaseService.fetchTable<ListaColetaItem>("lista_coleta");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lists, null, 2));
      const dlAnchorElem = document.createElement("a");
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `listas_coleta_export_${Date.now()}.json`);
      dlAnchorElem.click();
      showFeedback("Backup de listas exportado com sucesso!", "success");
    } catch (e) {
      showFeedback("Erro ao exportar dados.", "error");
    }
  };

  const createDefaultStatus = (listaId: string, timestamp: string, user: string): RadarLojaStatus => ({
    lista: listaId,
    statusSoltura: 'Não Solta',
    horarioSoltura: null,
    soltoPor: null,
    statusColeta: 'Não iniciada',
    horarioColeta: null,
    coletadoPor: null,
    statusCarregamento: 'Não carregada',
    horarioCarregamento: null,
    carregadoPor: null,
    statusExpedicao: 'Pendente',
    updated_at: timestamp,
    updated_by: user
  });

  const handleJsonImportSubmit = async () => {
    if (jsonPreview.valid.length === 0) {
      showFeedback("Nenhum registro válido para importar.", "error");
      return;
    }

    const timestamp = new Date().toISOString();
    const currentUser = coordenador || "Admin";
    const validItemsToImport = jsonPreview.valid.map(v => v.item);

    // Expandir para todos os setores se a opção estiver ativa
    let itemsToImport = validItemsToImport;
    if (applyToAllSectors) {
      const targetSectors = [87, 88, 89, 90];
      itemsToImport = validItemsToImport.flatMap((item) =>
        targetSectors.map((sec) => ({
          ...item,
          setor: sec,
          lista: `${item.lista}_S${sec}`
        }))
      );
    }

    try {
      // 1. Fetch current database table values to evaluate strategies
      const existingLists = await FirebaseService.fetchTable<ListaColetaItem>("lista_coleta");
      
      const listsToUpsert: ListaColetaItem[] = [];
      const statusesToUpsert: RadarLojaStatus[] = [];

      if (jsonStrategy === "overwrite") {
        // Clear all previous items in database
        await IndexedDBService.clear("lista_coleta");
        await IndexedDBService.clear("radar_lojas_status");

        for (const item of existingLists) {
          await FirebaseService.deleteRecord("lista_coleta", item.lista, "lista");
          await FirebaseService.deleteRecord("radar_lojas_status", item.lista, "lista");
        }

        for (const item of itemsToImport) {
          listsToUpsert.push({ ...item, updated_at: timestamp });
          statusesToUpsert.push(createDefaultStatus(item.lista, timestamp, currentUser));
        }
      } else if (jsonStrategy === "append") {
        for (const item of itemsToImport) {
          const exists = existingLists.some(el => el.lista === item.lista);
          if (!exists) {
            listsToUpsert.push({ ...item, updated_at: timestamp });
            statusesToUpsert.push(createDefaultStatus(item.lista, timestamp, currentUser));
          }
        }
      } else if (jsonStrategy === "update") {
        for (const item of itemsToImport) {
          const exists = existingLists.find(el => el.lista === item.lista);
          if (exists) {
            listsToUpsert.push({ ...exists, ...item, updated_at: timestamp });
          }
        }
      } else if (jsonStrategy === "merge") {
        for (const item of itemsToImport) {
          const exists = existingLists.find(el => el.lista === item.lista);
          if (exists) {
            listsToUpsert.push({ ...exists, ...item, updated_at: timestamp });
          } else {
            listsToUpsert.push({ ...item, updated_at: timestamp });
            statusesToUpsert.push(createDefaultStatus(item.lista, timestamp, currentUser));
          }
        }
      }

      // 2. Perform bulk upserts
      for (const list of listsToUpsert) {
        await FirebaseService.upsertRecord("lista_coleta", list, "lista");
      }
      for (const stat of statusesToUpsert) {
        await FirebaseService.upsertRecord("radar_lojas_status", stat, "lista");
      }

      // 3. Sync up to legacy state inside App.tsx using onSaveRadar
      if (onSaveRadar) {
        const finalLists = await IndexedDBService.getAll<ListaColetaItem>("lista_coleta");
        const finalStatuses = await IndexedDBService.getAll<RadarLojaStatus>("radar_lojas_status");
        const legacyItems = finalLists.map(u => {
          const stat = finalStatuses.find(s => s.lista === u.lista);
          return {
            corte: u.corte,
            loja: u.loja,
            vol: u.volumes,
            ativ: u.enderecos,
            prog: stat?.statusColeta === 'Coletada' ? 100 : (stat?.statusColeta === 'Em andamento' ? 50 : 0)
          };
        });
        onSaveRadar(legacyItems);
      }

      // 4. Save audit log record to local history and parent state
      const auditLogHistoryItem = {
        id: String(Date.now()),
        dataHora: new Date().toLocaleString("pt-BR"),
        usuario: currentUser,
        origem: fileSelectedName || "Texto Colado",
        totalProcessados: jsonPreview.total,
        validosProcessados: itemsToImport.length,
        invalidosProcessados: jsonPreview.invalid.length,
        estrategia: jsonStrategy,
      };

      const updatedHistory = [auditLogHistoryItem, ...importHistory];
      setImportHistory(updatedHistory);
      localStorage.setItem("json_import_history", JSON.stringify(updatedHistory));

      showFeedback(`Sucesso! ${itemsToImport.length} listas processadas e salvas com a estratégia "${jsonStrategy.toUpperCase()}".`, "success");
      setJsonInput("");
      setFileSelectedName("");
      setJsonPreview({ valid: [], invalid: [], total: 0 });

    } catch (err: any) {
      showFeedback(`Falha durante a importação de dados: ${err.message}`, "error");
    }
  };

  const handleDeleteAllImportedData = async () => {
    try {
      const existingLists = await FirebaseService.fetchTable<ListaColetaItem>("lista_coleta");
      if (existingLists.length === 0) {
        showFeedback("Não há dados de importação (lista_coleta) para apagar.", "error");
        return;
      }

      await IndexedDBService.clear("lista_coleta");
      await IndexedDBService.clear("radar_lojas_status");

      let count = 0;
      for (const item of existingLists) {
        await FirebaseService.deleteRecord("lista_coleta", item.lista, "lista");
        await FirebaseService.deleteRecord("radar_lojas_status", item.lista, "lista");
        count++;
      }

      showFeedback(`Sucesso! ${count} listas importadas foram completamente apagadas de forma definitiva.`, "success");
    } catch (err: any) {
      console.error("[Delete All Import] Erro:", err);
      showFeedback(`Erro ao apagar dados importados: ${err.message || err}`, "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Configuration Navigation */}
      <div className="lg:col-span-1 bg-[#0d0d0f]/80 p-3 rounded-2xl border border-white/5 flex flex-col gap-1 shadow-2xl h-fit">
        <div className="px-3 pb-3 pt-1 border-b border-white/5 mb-2">
          <p className="text-[0.65rem] text-indigo-400 uppercase tracking-widest font-black">Painel de Configuração</p>
        </div>
        <button
          onClick={() => setSubCat("geral")}
          className={`cfg-nav ${subCat === "geral" ? "active" : ""}`}
        >
          📋 Liderança &amp; Escala
        </button>

        <button
          onClick={() => setSubCat("setores")}
          className={`cfg-nav ${subCat === "setores" ? "active" : ""}`}
        >
          🏷️ Setores &amp; Universos
        </button>

        <button
          onClick={() => setSubCat("lojas")}
          className={`cfg-nav flex items-center justify-between ${subCat === "lojas" ? "active" : ""}`}
        >
          <span className="flex items-center gap-1.5">
            <Store size={13} className="text-indigo-400" />
            Cadastro de Lojas
          </span>
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
            {masterStores.length}
          </span>
        </button>
        
        <button
          onClick={() => setSubCat("importacao")}
          className={`cfg-nav ${subCat === "importacao" ? "active" : ""}`}
        >
          📥 Importação de Dados
        </button>
        <button
          onClick={() => setSubCat("seguranca")}
          className={`cfg-nav ${subCat === "seguranca" ? "active" : ""}`}
        >
          🔒 Segurança &amp; Backup
        </button>
        <button
          onClick={() => setSubCat("screensaver")}
          className={`cfg-nav ${subCat === "screensaver" ? "active" : ""}`}
        >
          🖥️ Tela de Descanso
        </button>
      </div>

      {/* Configuration Contents */}
      <div className="lg:col-span-3 min-w-0 space-y-4">
        {!isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3.5 rounded-xl text-[11px] font-mono flex items-start gap-2.5 shadow-sm">
            <span className="text-sm mt-0.5">🔒</span>
            <div>
              <p className="font-bold uppercase tracking-wider text-amber-300">Nível de Permissão: {userRole.toUpperCase()}</p>
              <p className="text-zinc-400 mt-1">Algumas ações operacionais e bancos de dados mestres estão protegidos contra alteração.</p>
            </div>
          </div>
        )}

        {/* Modern Toast-style Feedback Banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-mono shadow-lg shadow-black/30 transition-all ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <div className={`p-1 rounded-md ${feedback.type === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {feedback.type === "success" ? (
                  <CheckCircle size={14} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
              </div>
              <span className="font-semibold">{feedback.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CATEGORY: GERAL */}
        {subCat === "geral" && (
          <div className="space-y-6">
            <form onSubmit={handleLiderancaSave} className="glass-card p-6 border-l-2 border-indigo-500/50">
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">Liderança Geral do Turno</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.65rem] text-zinc-500 uppercase block mb-2 font-bold">Nome Coordenador</label>
                  <select
                    value={coordNome}
                    disabled={!canEditLeadership}
                    onChange={(e) => setCoordNome(e.target.value)}
                    className="inp py-2 text-sm focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Selecione...</option>
                    {colaboradores
                      .filter(c => c.lider || c.cargo?.toLowerCase().includes('coordenador') || c.cargo?.toLowerCase().includes('líder'))
                      .map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))}
                    {coordNome && !colaboradores.some(c => c.nome === coordNome && (c.lider || c.cargo?.toLowerCase().includes('coordenador') || c.cargo?.toLowerCase().includes('líder'))) && (
                      <option value={coordNome}>{coordNome} (Inativo)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[0.65rem] text-zinc-500 uppercase block mb-2 font-bold">URL da Foto (Opcional)</label>
                  <input
                    type="url"
                    value={coordFoto}
                    disabled={!canEditLeadership}
                    onChange={(e) => setCoordFoto(e.target.value)}
                    className="inp py-2 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!canEditLeadership}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-6 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Liderança
              </button>
            </form>

            <div className="glass-card p-6 border-l-2 border-fuchsia-500/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-fuchsia-400 uppercase tracking-widest">Escala: Referentes Semanais</h3>
                <button
                  onClick={onAddReferente}
                  disabled={!canEditReferents}
                  className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar Linha
                </button>
              </div>

              <div className="space-y-3">
                {referentesSemana.map((r, i) => (
                  <div key={i} className="ref-row bg-black/30 p-3 rounded-xl border border-white/5 flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-[0.5rem] text-zinc-500 uppercase block mb-1">Dia da Semana</label>
                      <select
                        value={r.dia}
                        disabled={!canEditReferents}
                        onChange={(e) => onUpdateReferente(i, "dia", e.target.value)}
                        className="inp py-1.5 text-xs focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {DIAS_OPTS.map((d) => (
                          <option key={d} value={d}>
                            {d.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-2 min-w-[150px]">
                      <label className="text-[0.5rem] text-zinc-500 uppercase block mb-1">Ref. S87</label>
                      <select
                        value={r.ref87}
                        disabled={!canEditReferents}
                        onChange={(e) => onUpdateReferente(i, "ref87", e.target.value)}
                        className="inp py-1.5 text-xs focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione...</option>
                        {colaboradores.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                        {r.ref87 && !colaboradores.some(c => c.nome === r.ref87) && (
                          <option value={r.ref87}>{r.ref87} (Inativo)</option>
                        )}
                      </select>
                    </div>
                    <div className="flex-2 min-w-[150px]">
                      <label className="text-[0.5rem] text-zinc-500 uppercase block mb-1">Ref. Volumosos</label>
                      <select
                        value={r.refVol}
                        disabled={!canEditReferents}
                        onChange={(e) => onUpdateReferente(i, "refVol", e.target.value)}
                        className="inp py-1.5 text-xs focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione...</option>
                        {colaboradores.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                        {r.refVol && !colaboradores.some(c => c.nome === r.refVol) && (
                          <option value={r.refVol}>{r.refVol} (Inativo)</option>
                        )}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-[0.5rem] text-zinc-500 uppercase block mb-1">Apoios</label>
                      <select
                        value={r.apoios || ""}
                        disabled={!canEditReferents}
                        onChange={(e) => onUpdateReferente(i, "apoios", e.target.value)}
                        className="inp py-1.5 text-xs focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Nenhum...</option>
                        {colaboradores.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                        {r.apoios && !colaboradores.some(c => c.nome === r.apoios) && (
                          <option value={r.apoios}>{r.apoios} (Inativo)</option>
                        )}
                      </select>
                    </div>
                    <button
                      onClick={() => onRemoveReferente(i)}
                      disabled={!canEditReferents}
                      className="text-red-400 hover:text-red-300 p-2 font-bold disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        

        {/* CATEGORY: SETORES E UNIVERSOS */}
        {subCat === "setores" && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-indigo-500/50 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">🏷️</span>
                    Gestão de Setores ({setores.length})
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Adicione, edite ou remova setores e configure seus universos produtivos.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewSetor}
                  disabled={!canManageSectors}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  Cadastrar Setor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {setores.map(setor => (
                  <div key={setor.id} className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">{setor.id}</span>
                          {setor.nome}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Nº {setor.numero} • Meta Global: {setor.meta} UPH</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditSetor(setor)}
                          disabled={!canEditSectorParams}
                          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Editar Setor"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSetor(setor.id)}
                          disabled={!canManageSectors}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Excluir Setor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase">Universos (Mix)</span>
                        <button
                          onClick={() => handleOpenNewUniverso(setor.id)}
                          disabled={!canEditSectorParams}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 uppercase transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} /> Adicionar
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(!globUniversos[setor.id] || globUniversos[setor.id].length === 0) ? (
                          <div className="text-[10px] text-zinc-600 italic">Nenhum universo cadastrado.</div>
                        ) : (
                          globUniversos[setor.id].map((u, i) => (
                            <div key={i} className="flex justify-between items-center bg-zinc-900/50 px-2 py-1.5 rounded border border-white/5">
                              <span className="text-[10px] text-zinc-300 font-bold">{u.nome}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] text-zinc-500 font-mono">Meta: {u.meta}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleOpenEditUniverso(setor.id, i, u)}
                                    disabled={!canEditSectorParams}
                                    className="text-zinc-400 hover:text-indigo-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUniverso(setor.id, i)}
                                    disabled={!canEditSectorParams}
                                    className="text-zinc-400 hover:text-red-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: CADASTRO MASTER DE LOJAS */}
        {subCat === "lojas" && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-indigo-500/50 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">🏪</span>
                    Cadastro Master de Lojas ({masterStores.length} Lojas)
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Catálogo central de lojas, códigos operacionais, cidades, estados e transportadoras padrão para expedição e rotas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenNewStore}
                    disabled={!canManageStores}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Cadastrar Nova Loja
                  </button>
                  <button
                    onClick={() => loadMasterStores()}
                    className="bg-white/5 hover:bg-white/10 text-zinc-300 p-2 rounded-lg border border-white/10 transition cursor-pointer"
                    title="Recarregar do banco"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="relative sm:col-span-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Buscar código, nome ou cidade..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <select
                    value={storeUfFilter}
                    onChange={(e) => setStoreUfFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    <option value="all">Todos os Estados (UF)</option>
                    {Array.from(new Set(masterStores.map(s => s.uf).filter(Boolean))).sort().map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={storeTransFilter}
                    onChange={(e) => setStoreTransFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    <option value="all">Todas as Transportadoras</option>
                    {Array.from(new Set(masterStores.map(s => s.transportadoraPadrao).filter(Boolean))).sort().map(trans => (
                      <option key={trans} value={trans}>{trans}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stores Grid / Table */}
              {(() => {
                const filtered = masterStores.filter(s => {
                  const q = storeSearch.toLowerCase();
                  const matchQuery = !q || s.id.toLowerCase().includes(q) || s.nome.toLowerCase().includes(q) || (s.cidade && s.cidade.toLowerCase().includes(q));
                  const matchUf = storeUfFilter === "all" || s.uf === storeUfFilter;
                  const matchTrans = storeTransFilter === "all" || s.transportadoraPadrao === storeTransFilter;
                  return matchQuery && matchUf && matchTrans;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-zinc-900/40 p-8 rounded-xl text-center border border-zinc-800 text-zinc-500 uppercase font-black text-xs space-y-2">
                      <Store size={28} className="mx-auto text-zinc-600 mb-2" />
                      <p>Nenhuma loja encontrada com os filtros selecionados.</p>
                      {storeSearch && (
                        <button
                          onClick={() => { setStoreSearch(""); setStoreUfFilter("all"); setStoreTransFilter("all"); }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase font-bold"
                        >
                          Limpar Filtros de Busca
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {filtered.map((st) => (
                      <div
                        key={st.id}
                        className="bg-black/40 hover:bg-black/60 border border-white/5 hover:border-indigo-500/30 p-3.5 rounded-xl transition-all duration-200 flex flex-col justify-between space-y-2.5 shadow-sm group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {st.id}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                              {st.uf || "SP"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEditStore(st)}
                              disabled={!canManageStores}
                              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Editar Loja"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                setStoreToDelete(st);
                                setIsDeleteStoreConfirmOpen(true);
                              }}
                              disabled={!canManageStores}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Excluir Loja"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate" title={st.nome}>
                            {st.nome}
                          </h4>
                          <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-zinc-500 shrink-0" />
                            <span className="truncate">{st.cidade || "Não informada"} - {st.uf || "SP"}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                          <span className="truncate font-bold text-zinc-400">
                            🚚 {st.transportadoraPadrao || "JADLOG"}
                          </span>
                          {st.observacoes && (
                            <span className="truncate max-w-[120px] text-zinc-500" title={st.observacoes}>
                              {st.observacoes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* CATEGORY: IMPORTAÇÃO DE DADOS */}
        {subCat === "importacao" && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-indigo-500/50 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4">
                <div className="flex justify-between items-start w-full md:w-auto">
                  <div>
                    <h3 className="text-base font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">📥</span>
                      Módulo de Importação de Dados
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Sincronize planejamentos de coleta operacionais (Bolsão D+1) via planilhas Excel, arquivos CSV ou JSON.</p>
                  </div>
                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={!canDeleteAllData}
                    className="ml-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg py-1.5 px-3 text-[10px] font-bold font-mono uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>🗑️</span> Apagar Todos os Dados
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 md:mt-0 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setImportSubTab("json")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                      importSubTab === "json" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>📄</span> Planilha / JSON
                  </button>
                  <button
                    onClick={() => setImportSubTab("ocr")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                      importSubTab === "ocr" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>📷</span> Importar OCR
                  </button>
                  <button
                    onClick={() => setImportSubTab("historico")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                      importSubTab === "historico" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>🕒</span> Histórico
                  </button>
                  <button
                    onClick={() => setImportSubTab("configuracoes")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                      importSubTab === "configuracoes" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>⚙️</span> Configurações
                  </button>
                </div>
              </div>

              {/* TAB 1: SPREADSHEET / CSV / JSON IMPORT */}
              {importSubTab === "json" && (
                <div className="space-y-6">
                  {/* HEADER MODELS EXPLANATION BLOCK */}
                  <div className="bg-[#0c0d12]/90 border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/5 text-indigo-400">
                      <span>💡</span>
                      <h4 className="text-xs font-black uppercase tracking-wider">Modelos de Cabeçalhos Suportados (JSON, CSV, XLSX)</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Nosso importador inteligente aceita arquivos Excel (<b>.xlsx, .xls</b>), arquivos texto separados por ponto e vírgula/vírgula (<b>.csv</b>) ou códigos <b>.json</b>. Os nomes das colunas são mapeados automaticamente de forma flexível (sem distinção entre maiúsculas, minúsculas ou acentuações).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* JSON Schema Guide */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">1. Formato JSON (Array)</span>
                        <p className="text-[10px] text-zinc-500">Chaves estruturadas em minúsculo:</p>
                        <pre className="text-[9px] text-zinc-400 font-mono bg-zinc-950 p-2 rounded max-h-24 overflow-y-auto">
{`[
  {
    "lista": "L101",
    "loja": "2722 - FLORIPA",
    "setor": 87,
    "corte": "07:00",
    "carregamento": "07:30",
    "volumes": 1200,
    "enderecos": 45
  }
]`}
                        </pre>
                      </div>

                      {/* CSV Guide */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">2. Formato CSV (Ponto e Vírgula)</span>
                        <p className="text-[10px] text-zinc-500">Linha de cabeçalho padrão com separador ";" ou ",":</p>
                        <pre className="text-[9px] text-zinc-400 font-mono bg-zinc-950 p-2 rounded truncate max-h-24 overflow-y-auto">
{`lista;loja;setor;corte;carregamento;volumes;enderecos;transportadora;atividadeRelacionada
L101;2722 - FLORIPA;87;07:00;07:30;1200;45;JADLOG;Picking`}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("lista;loja;setor;corte;carregamento;volumes;enderecos;transportadora;atividadeRelacionada\nL101;2722 - FLORIPA;87;07:00;07:30;1200;45;JADLOG;Picking")
                              .then(() => showFeedback("Cabeçalho CSV copiado!", "success"));
                          }}
                          className="w-full py-1 text-[9px] font-bold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 rounded transition uppercase cursor-pointer"
                        >
                          Copiar Cabeçalho CSV
                        </button>
                      </div>

                      {/* XLSX Guide */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">3. Formato XLSX / XLS (Excel)</span>
                        <p className="text-[10px] text-zinc-500">Mapeamento inteligente das colunas da primeira aba:</p>
                        <div className="text-[9px] text-zinc-400 space-y-1 bg-zinc-950 p-2 rounded max-h-24 overflow-y-auto font-mono">
                          <div>• <b>ID Lista:</b> "lista", "id", "codigo", "lista id"</div>
                          <div>• <b>Loja:</b> "loja", "store", "destino", "cliente"</div>
                          <div>• <b>Setor CD:</b> "setor", "set", "sector" (87, 88, 89, 90)</div>
                          <div>• <b>Corte/Carreg:</b> "corte", "carregamento" (HH:MM)</div>
                          <div>• <b>Volumes/End:</b> "volumes", "enderecos"</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Input Controls */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Entrada de Dados (Planilha / JSON / CSV)</span>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <button
                            onClick={downloadJsonTemplate}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-2.5 py-1 rounded border border-white/5 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>📥</span> Modelo JSON
                          </button>
                          <button
                            onClick={downloadCsvTemplate}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-2.5 py-1 rounded border border-white/5 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>📥</span> Modelo CSV
                          </button>
                          <button
                            onClick={downloadXlsxTemplate}
                            className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 font-bold px-2.5 py-1 rounded border border-indigo-500/10 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>📊</span> Modelo Excel (XLSX)
                          </button>
                          <button
                            onClick={exportCurrentListsAsJson}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold px-2.5 py-1 rounded border border-indigo-500/10 transition cursor-pointer"
                          >
                            📤 Exportar Atuais
                          </button>
                        </div>
                      </div>

                      {/* File Upload drag/drop area */}
                      <div className={`bg-zinc-950/40 p-5 rounded-xl border border-dashed border-white/10 text-center relative hover:border-indigo-500/40 transition ${!canImportData ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className={`cursor-pointer flex flex-col items-center gap-2 ${!canImportData ? 'cursor-not-allowed' : ''}`}>
                          <span className="text-2xl">📊</span>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            {fileSelectedName ? `Arquivo Carregado: ${fileSelectedName}` : "Arraste ou selecione um arquivo (.xlsx, .xls, .csv, .json)"}
                          </span>
                          <span className="text-[9px] text-zinc-500">O leitor mapeia as colunas e atualiza a área de texto interativa</span>
                          <input type="file" accept=".xlsx,.xls,.csv,.json" disabled={!canImportData} onChange={handlePlanilhaFileChange} className="hidden" />
                        </label>
                        {fileSelectedName && (
                          <button
                            onClick={() => {
                              setFileSelectedName("");
                              setJsonInput("");
                            }}
                            className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 font-bold text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* JSON Raw area */}
                      <div className="space-y-1">
                        <textarea
                          placeholder='Cole o código JSON ou registros estruturados aqui... Ex: [{"lista": "L101", "loja": "2722 - FLORIPA", "setor": 87, "corte": "07:00", "carregamento": "07:30", "volumes": 120, "enderecos": 14}]'
                          value={jsonInput}
                          disabled={!canImportData}
                          onChange={(e) => setJsonInput(e.target.value)}
                          className="inp font-mono text-[11px] h-64 bg-black/60 p-4 border border-white/5 rounded-xl w-full leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {jsonInput && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setJsonInput("");
                                setFileSelectedName("");
                              }}
                              className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold"
                            >
                              ✕ Limpar Área de Texto
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Strategy & Preview Actions */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Estratégia de Atualização</h4>
                        
                        <div className="space-y-2">
                          <select
                            value={jsonStrategy}
                            onChange={(e: any) => setJsonStrategy(e.target.value)}
                            className="inp w-full py-2 px-3 font-bold text-indigo-300 bg-zinc-900 border border-white/10 rounded-lg focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
                          >
                            <option value="merge">Mesclar (Merge) — Atualiza existentes / Insere novos (Recomendado)</option>
                            <option value="overwrite">Sobrescrever (Overwrite) — Apaga atuais e escreve novos</option>
                            <option value="append">Anexar (Append) — Apenas adiciona se lista não existir</option>
                            <option value="update">Atualizar (Update) — Apenas atualiza cadastrados existentes</option>
                          </select>
                          
                          <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                            {jsonStrategy === "merge" && "• MESCLAR: Combina os registros do arquivo com o banco de dados. Caso o código da lista (ex: L101) já exista, os valores serão atualizados, mantendo o status operacional intacto. Listas inexistentes serão criadas."}
                            {jsonStrategy === "overwrite" && "• SOBRESCREVER: Limpa COMPLETAMENTE o banco de dados das listas de coletas atuais antes de registrar os novos dados. Útil para limpeza matinal."}
                            {jsonStrategy === "append" && "• ANEXAR: Insere apenas listas que ainda não constam no banco. Listas repetidas no arquivo serão ignoradas para evitar conflito."}
                            {jsonStrategy === "update" && "• ATUALIZAR: Modifica apenas listas que já existiam no banco, ignorando registros novos. Útil para atualizar pesos e volumes de listas planejadas."}
                          </p>
                        </div>

                        {/* NOVO: Opção para aplicar a todos os setores */}
                        <div className="flex items-center gap-3 pt-2 border-t border-white/5 mt-2">
                          <label className="flex items-center gap-2 text-[11px] text-zinc-300 font-bold uppercase tracking-wider cursor-pointer">
                            <input
                              type="checkbox"
                              checked={applyToAllSectors}
                              onChange={(e) => setApplyToAllSectors(e.target.checked)}
                              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                            />
                            Aplicar a todos os setores
                          </label>
                          <span className="text-[9px] text-zinc-500 font-mono">(duplica registros para S87, S88, S89, S90)</span>
                        </div>

                        {/* Summary Block */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] text-zinc-500 uppercase block">Total</span>
                            <span className="text-sm font-black text-white font-mono">{jsonPreview.total}</span>
                          </div>
                          <div className="bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                            <span className="text-[9px] text-emerald-500 uppercase block font-bold">Válidos</span>
                            <span className="text-sm font-black text-emerald-400 font-mono">{jsonPreview.valid.length}</span>
                          </div>
                          <div className="bg-red-500/5 p-2.5 rounded-xl border border-red-500/10">
                            <span className="text-[9px] text-red-500 uppercase block font-bold">Inválidos</span>
                            <span className="text-sm font-black text-red-400 font-mono">{jsonPreview.invalid.length}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <button
                          disabled={jsonPreview.valid.length === 0 || !canImportData}
                          onClick={handleJsonImportSubmit}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>💾</span> Processar {jsonPreview.valid.length} Itens Válidos
                        </button>
                      </div>

                      {/* Syntax Errors display */}
                      {jsonError && (
                        <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl space-y-1">
                          <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block">⚠️ Erro Estrutural Detectado</span>
                          <p className="text-xs text-red-300 font-mono leading-relaxed">{jsonError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previews Valid / Invalid Records */}
                  {(jsonPreview.valid.length > 0 || jsonPreview.invalid.length > 0) && (
                    <div className="space-y-4 border-t border-white/5 pt-4">
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Pré-visualização da Validação dos Registros</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Invalid records list */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block">Registros com Inconsistências ({jsonPreview.invalid.length})</span>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {jsonPreview.invalid.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 italic">Nenhum registro inválido encontrado!</p>
                            ) : (
                              jsonPreview.invalid.map((record, index) => (
                                <div key={index} className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 space-y-1 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-white font-mono">{record.item.lista || "Sem Lista ID"}</span>
                                    <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono">Inválido</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate">{JSON.stringify(record.item)}</p>
                                  <ul className="space-y-1 mt-1.5 border-t border-red-500/5 pt-1.5">
                                    {record.errors.map((err, i) => (
                                      <li key={i} className="text-[10px] text-red-400 flex items-start gap-1">
                                        <span className="mt-0.5">⚠️</span> <span>{err}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Valid records list */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Registros Válidos ({jsonPreview.valid.length})</span>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {jsonPreview.valid.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 italic">Nenhum registro válido carregado.</p>
                            ) : (
                              jsonPreview.valid.map((record, index) => (
                                <div key={index} className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 space-y-1 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-white font-mono">{record.item.lista}</span>
                                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono">Aprovado</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-400 mt-1">
                                    <div>Loja: <b className="text-white">{record.item.loja}</b></div>
                                    <div>Setor: <b className="text-white">S{record.item.setor}</b></div>
                                    <div>Corte: <b className="text-white">{record.item.corte}</b></div>
                                    <div>Carregamento: <b className="text-white">{record.item.carregamento}</b></div>
                                    <div>Volumes: <b className="text-white">{record.item.volumes ?? 0}</b></div>
                                    <div>Endereços: <b className="text-white">{record.item.enderecos ?? 0}</b></div>
                                  </div>
                                  {record.warnings.map((warn, i) => (
                                    <p key={i} className="text-[9px] text-amber-500 font-medium bg-amber-500/5 p-1 rounded mt-1.5">
                                      💡 {warn}
                                    </p>
                                  ))}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OCR IMPORT (LEGACY INTEGRATED) */}
              {importSubTab === "ocr" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  {/* Left Column: Upload and RAW text */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className={`bg-black/40 p-6 rounded-xl border border-white/5 text-center ${!canImportData ? 'opacity-50 pointer-events-none' : ''}`}>
                      <label className={`cursor-pointer flex flex-col items-center gap-3 ${!canImportData ? 'cursor-not-allowed' : ''}`}>
                        <div className="bg-amber-500/10 p-3 rounded-full text-amber-400 animate-pulse">
                          <Image size={28} />
                        </div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Arraste ou Selecione Relatório de Picking (Imagem)</span>
                        <input type="file" accept="image/*" disabled={!canImportData} onChange={handleOcrFileChange} className="hidden" />
                      </label>

                      {ocrLoading && (
                        <div className="mt-4 w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                        </div>
                      )}
                    </div>

                    {ocrText && (
                      <div className="space-y-2">
                        <label className="text-[0.6rem] text-zinc-500 uppercase font-black tracking-widest block">RAW Text Extraído por OCR</label>
                        <textarea
                          readOnly
                          value={ocrText}
                          className="inp font-mono text-[10px] h-48 bg-black/60 p-3 border border-white/5 rounded-lg w-full leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={() => setOcrText("")}
                          className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold"
                        >
                          ✕ Limpar Leitura
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Parsed output and matching dashboard */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-wider">
                          Cadastro Master de Lojas ({masterStores.length} lojas registradas)
                        </span>
                        <span className="text-[8px] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded font-bold font-mono">LOJAS ATIVAS</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] max-h-48 overflow-y-auto custom-scrollbar">
                        {masterStores.map((st) => (
                          <div key={st.id} className="bg-white/[0.02] p-2 rounded border border-white/5 flex flex-col justify-between">
                            <span className="font-bold text-white truncate">{st.id} - {st.nome}</span>
                            <span className="text-[8px] text-zinc-500 font-mono mt-1 uppercase">
                              {st.cidade} ({st.uf}) | 🚚 {st.transportadoraPadrao || "JADLOG"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {parsedPreview.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                          <p className="text-xs font-black text-white uppercase tracking-wider">
                            Resultado da Correlação de Lojas ({parsedPreview.length} identificadas)
                          </p>
                          <button
                            onClick={() => {
                              if (onSaveRadar) {
                                onSaveRadar(parsedPreview);
                                localStorage.setItem("radar", JSON.stringify(parsedPreview));
                                alert(`Sucesso! ${parsedPreview.length} lojas do OCR foram enviadas e sincronizadas com o Radar de Lojas na aba Operacional!`);
                              }
                            }}
                            disabled={!canImportData}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] py-1.5 px-4 rounded uppercase tracking-wider transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Sincronizar com o Radar
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                          {parsedPreview.map((item, idx) => {
                            let statusCls = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                            let statusLbl = "REGISTRADA";

                            if (item.statusOCR === "divergente") {
                              statusCls = "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse";
                              statusLbl = "DIVERGENTE";
                            } else if (item.statusOCR === "pendente") {
                              statusCls = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                              statusLbl = "PENDENTE";
                            } else if (item.statusOCR === "nao_cadastrada") {
                              statusCls = "bg-red-500/10 text-red-400 border-red-500/20";
                              statusLbl = "NÃO CADASTRADA";
                            }

                            return (
                              <div
                                key={idx}
                                className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2 text-xs"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold text-white uppercase">{item.loja}</h4>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
                                      Corte: {item.corte} | Volume: {item.vol} | Ativadas: {item.ativ} | Progresso: {item.prog}%
                                    </p>
                                  </div>
                                  <span className={`text-[8px] font-black border px-2 py-0.5 rounded font-mono ${statusCls}`}>
                                    {statusLbl}
                                  </span>
                                </div>

                                {item.erroDesc && (
                                  <p className="text-[10px] text-zinc-400 bg-white/[0.01] p-1.5 rounded border border-white/5 font-medium leading-relaxed">
                                    ⚠️ {item.erroDesc}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      ocrText && (
                        <div className="bg-zinc-900/40 p-6 rounded-lg text-center border border-zinc-800 text-zinc-500 uppercase font-black text-xs">
                          Nenhuma correspondência encontrada no OCR.
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: IMPORT HISTORY LOGS */}
              {importSubTab === "historico" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Histórico de Auditoria das Importações</span>
                    {importHistory.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("Limpar todo o histórico de importação?")) {
                            setImportHistory([]);
                            localStorage.removeItem("json_import_history");
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold"
                      >
                        ✕ Limpar Registros
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 uppercase text-[9px] tracking-wider">
                          <th className="p-3">Data/Hora</th>
                          <th className="p-3">Usuário</th>
                          <th className="p-3">Arquivo / Origem</th>
                          <th className="p-3 text-center">Enviados</th>
                          <th className="p-3 text-center">Válidos</th>
                          <th className="p-3 text-center">Erros</th>
                          <th className="p-3">Estratégia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
                        {importHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-zinc-500 uppercase text-[10px] tracking-widest font-bold">
                              Nenhuma importação JSON registrada nesta sessão.
                            </td>
                          </tr>
                        ) : (
                          importHistory.map((h, i) => (
                            <tr key={h.id || i} className="hover:bg-white/[0.01]">
                              <td className="p-3">{h.dataHora}</td>
                              <td className="p-3 text-zinc-400">{h.usuario}</td>
                              <td className="p-3 text-indigo-300 truncate max-w-[150px]" title={h.origem}>{h.origem}</td>
                              <td className="p-3 text-center font-bold text-white">{h.totalProcessados}</td>
                              <td className="p-3 text-center text-emerald-400 font-bold">{h.validosProcessados}</td>
                              <td className="p-3 text-center text-red-400 font-bold">{h.invalidosProcessados}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {h.estrategia}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: IMPORT SETTINGS */}
              {importSubTab === "configuracoes" && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-white uppercase tracking-wider block border-b border-white/5 pb-2">Configurações de Validação Strict</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Ignorar registros inválidos durante importação</span>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Se ativo, apenas os itens aprovados serão inseridos, descartando as linhas com erros.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={importSettings.ignoreInvalid}
                        onChange={(e) => updateImportSetting("ignoreInvalid", e.target.checked)}
                        className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                      />
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Validar formato de horários estritamente</span>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Obriga a checagem das chaves "corte" e "carregamento" no formato de 24 horas (HH:MM).</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={importSettings.strictValidation}
                        onChange={(e) => updateImportSetting("strictValidation", e.target.checked)}
                        className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                      />
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Logar auditoria detalhada no banco</span>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Envia relatórios de inserções e atualizações para a aba de Auditorias Operacionais.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={importSettings.logAudit}
                        onChange={(e) => updateImportSetting("logAudit", e.target.checked)}
                        className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY: SEGURANÇA */}
        {subCat === "seguranca" && (
          <div className="glass-card p-6 border-l-2 border-red-500/50">
            <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-6">🔒 Segurança &amp; Backup de Dados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                    <Download size={14} className="text-emerald-400" />
                    Exportar Backup Operacional
                  </h4>
                  <p className="text-[10px] text-zinc-500">Salve o estado completo de colaboradores, históricos e metas em um arquivo JSON local.</p>
                </div>
                <button
                  onClick={onExportBackup}
                  className="mt-4 w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white py-2 rounded text-xs font-bold uppercase transition"
                >
                  Download Backup JSON
                </button>
              </div>

              <div className="bg-black/30 p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                    <Upload size={14} className="text-blue-400" />
                    Restaurar do Backup Operacional
                  </h4>
                  <p className="text-[10px] text-zinc-500">Substitua as informações do sistema a partir de um arquivo JSON previamente salvo.</p>
                </div>
                <label className={`mt-4 w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded text-xs font-bold uppercase transition block text-center ${!canDeleteAllData ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}>
                  Importar JSON
                  <input type="file" accept=".json" disabled={!canDeleteAllData} onChange={handleImportBackupFile} className="hidden" />
                </label>
              </div>
            </div>

            <div className="mt-6 p-4 bg-red-950/20 border border-red-500/20 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[0.6rem] text-red-400 font-bold uppercase tracking-widest">Controle de Sessão</p>
                <p className="text-xs text-zinc-400 mt-1">Conectado como <b className="text-white">Admin</b></p>
              </div>
              <button
                onClick={onLogout}
                className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Sair do Perfil
              </button>
            </div>
          </div>
        )}

        {/* CATEGORY: SCREENSAVER */}
        {subCat === "screensaver" && (
          <div className="glass-card p-6 border-l-2 border-indigo-500/50">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">🖥️ Configurações da Tela de Descanso (Inatividade)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Ativar Tela de Descanso</span>
                <input
                  type="checkbox"
                  checked={ssEnabled}
                  disabled={!canEditSectorParams}
                  onChange={(e) => setSsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <label className="text-[0.65rem] text-zinc-500 uppercase font-black block mb-2">Timeout de Inatividade (Segundos)</label>
                <input
                  type="number"
                  value={ssTimeout}
                  disabled={!canEditSectorParams}
                  onChange={(e) => setSsTimeout(parseInt(e.target.value) || 120)}
                  className="inp py-1.5 font-mono focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <label className="text-[0.65rem] text-zinc-500 uppercase font-black block mb-2">Duração da Exibição (Segundos)</label>
                <input
                  type="number"
                  value={ssDuration}
                  disabled={!canEditSectorParams}
                  onChange={(e) => setSsDuration(parseInt(e.target.value) || 30)}
                  className="inp py-1.5 font-mono focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <label className="text-[0.65rem] text-zinc-500 uppercase font-black block mb-2">URL da Imagem de Aviso (Opcional)</label>
                <input
                  type="url"
                  value={ssImage}
                  disabled={!canEditSectorParams}
                  onChange={(e) => setSsImage(e.target.value)}
                  placeholder="https://exemplo.com/aviso.png"
                  className="inp py-1.5 focus:outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={handleScreensaverSave}
                disabled={!canEditSectorParams}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Definições
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CADASTRO / EDIÇÃO DE LOJA MASTER */}
      <AnimatePresence>
        {showStoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {editingStoreId ? "Editar Loja Cadastrada" : "Cadastrar Nova Loja Master"}
                    </h3>
                    <p className="text-[10px] text-zinc-500">
                      {editingStoreId ? `Atualizando informações da loja ${editingStoreId}` : "Adicione uma nova loja ao catálogo permanente"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStoreModal(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStoreForm} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      Cód. Loja (ID)*
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingStoreId}
                      value={storeFormId}
                      onChange={(e) => setStoreFormId(e.target.value)}
                      placeholder="Ex: 2722"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      Nome da Loja*
                    </label>
                    <input
                      type="text"
                      required
                      value={storeFormNome}
                      onChange={(e) => setStoreFormNome(e.target.value)}
                      placeholder="Ex: FLORIPA CONTINENTE"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={storeFormCidade}
                      onChange={(e) => setStoreFormCidade(e.target.value)}
                      placeholder="Ex: São José"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      UF (Estado)
                    </label>
                    <select
                      value={storeFormUf}
                      onChange={(e) => setStoreFormUf(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      {["SP", "RJ", "MG", "ES", "PR", "SC", "RS", "BA", "PE", "CE", "GO", "DF", "MT", "MS", "PA", "AM", "RN", "PB", "AL", "SE", "PI", "MA", "TO", "RO", "AC", "AP", "RR"].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      Transportadora Padrão
                    </label>
                    <input
                      type="text"
                      value={storeFormTrans}
                      onChange={(e) => setStoreFormTrans(e.target.value)}
                      placeholder="Ex: JADLOG, MOBI, TOTAL"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                      Observações / Detalhes
                    </label>
                    <input
                      type="text"
                      value={storeFormObs}
                      onChange={(e) => setStoreFormObs(e.target.value)}
                      placeholder="Ex: Doca 04, Carga especial"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowStoreModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-md"
                  >
                    {editingStoreId ? "Salvar Alterações" : "Cadastrar Loja"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE LOJA MASTER */}
      {isDeleteStoreConfirmOpen && storeToDelete && (
        <ModalConfirmacao
          isOpen={isDeleteStoreConfirmOpen}
          onClose={() => {
            setIsDeleteStoreConfirmOpen(false);
            setStoreToDelete(null);
          }}
          onConfirm={handleDeleteStoreConfirm}
          title="EXCLUIR LOJA DO CADASTRO MASTER?"
          description={`Deseja realmente excluir a loja ${storeToDelete.id} - ${storeToDelete.nome} (${storeToDelete.cidade}/${storeToDelete.uf}) do cadastro permanente?`}
          confirmLabel="Sim, Excluir Loja"
          cancelLabel="Cancelar"
        />
      )}

      <ModalConfirmacao
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteAllImportedData}
        title="⚠️ ATENÇÃO: APAGAR TODOS OS DADOS IMPORTADOS?"
        description="Você está prestes a apagar permanentemente todas as listas importadas (lista_coleta) e seus respectivos status operacionais (radar_lojas_status). Esta ação não poderá ser desfeita!"
        confirmLabel="Sim, Apagar Tudo"
        cancelLabel="Cancelar"
        recordCount={totalImportedCount}
      />

      {/* MODAL SETOR */}
      <AnimatePresence>
        {showSetorModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingSetorId ? "Editar Setor" : "Novo Setor"}
                </h3>
                <button onClick={() => setShowSetorModal(false)} className="text-zinc-500 hover:text-white p-1 rounded cursor-pointer">✕</button>
              </div>
              <form onSubmit={handleSaveSetorForm} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Cód. Setor (ID)*</label>
                  <input type="text" required disabled={!!editingSetorId} value={setorFormId} onChange={(e) => setSetorFormId(e.target.value)} placeholder="Ex: 87" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-60" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Número</label>
                  <input type="number" required value={setorFormNumero} onChange={(e) => setSetorFormNumero(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Nome do Setor*</label>
                  <input type="text" required value={setorFormNome} onChange={(e) => setSetorFormNome(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Meta Global (UPH)</label>
                  <input type="number" required value={setorFormMeta} onChange={(e) => setSetorFormMeta(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowSetorModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase rounded-lg cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-lg shadow-md cursor-pointer">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL UNIVERSO */}
      <AnimatePresence>
        {showUniversoModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingUniversoIdx !== null ? "Editar Universo" : "Novo Universo"}
                </h3>
                <button onClick={() => setShowUniversoModal(false)} className="text-zinc-500 hover:text-white p-1 rounded cursor-pointer">✕</button>
              </div>
              <form onSubmit={handleSaveUniversoForm} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Nome do Universo*</label>
                  <input type="text" required value={universoFormNome} onChange={(e) => setUniversoFormNome(e.target.value)} placeholder="Ex: Picking Especial" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Meta de Produtividade</label>
                  <input type="number" required value={universoFormMeta} onChange={(e) => setUniversoFormMeta(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowUniversoModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase rounded-lg cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-lg shadow-md cursor-pointer">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
