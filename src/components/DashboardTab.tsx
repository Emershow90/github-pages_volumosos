/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  Setor,
  ReferenteSemana,
  Colaborador,
  ColaboradorStatus,
  RadarLoja,
  ReaproData,
  BolsaoData,
  CopilSetor,
  HistoricoRegistro,
  UserRole,
  CapacidadeSetor,
} from "../types";
import {
  Edit3,
  Users,
  Activity,
  BarChart2,
  TrendingUp,
  Sliders,
  PieChart,
  Apple,
  Mountain,
  Package,
  RotateCcw,
  Tag,
  Plus,
  Trash2,
  Check,
  X,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  AlertTriangle,
  FileSpreadsheet,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSectorStore, resolveSectorMetrics } from "../stores/useSectorStore";
import { useUserStore } from "../stores/useUserStore";
import { exportToGoogleSheets, initGoogleIdentity } from "../services/googleSheetsExportService";
import { can } from "../lib/rbac";

interface DashboardTabProps {
  setores: Setor[];
  referentesSemana: ReferenteSemana[];
  colaboradores: Colaborador[];
  radar: RadarLoja[];
  reaproData: ReaproData;
  bolsaoData: BolsaoData;
  copilData: Record<string, CopilSetor>;
  copilActiveSector: string;
  setCopilActiveSector: (s: string) => void;
  onToggleSeguranca: (index: number) => void;
  onSaveRadar: (radar: RadarLoja[]) => void;
  onSaveBolsao: (bolsao: BolsaoData) => void;
  onSaveReapro: (reapro: ReaproData) => void;
  terminalLogs: string[];
  onTerminalCommand: (cmd: string) => void;
  currentRole: UserRole | null;
  historico: HistoricoRegistro[];
  capacidade: CapacidadeSetor[];
  onUpdateSetor?: (sid: string, field: string, val: string | number) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  setores,
  referentesSemana,
  colaboradores,
  reaproData,
  onToggleSeguranca,
  terminalLogs,
  onTerminalCommand,
  currentRole,
  historico,
  capacidade,
  onUpdateSetor,
  onNavigateTab,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState<"all" | "escala" | "monitor" | "grafico">("all");
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [chartViewMode, setChartViewMode] = useState<"historico" | "uph_setores" | "volume_mix">("historico");

  // Store & User Access
  const { activityEntries } = useSectorStore();
  const { currentUser, currentUserUid } = useUserStore();
  const todayStr = new Date().toISOString().split("T")[0];

  const currentUserProfile = useMemo(() => {
    const cached = localStorage.getItem(`cached_profile_${currentUserUid}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return { role: currentRole, setoresAutorizados: [] };
  }, [currentUserUid, currentRole]);

  useEffect(() => {
    const tId = setTimeout(() => {
      initGoogleIdentity();
    }, 1500);
    return () => clearTimeout(tId);
  }, []);

  // Quick Sector & Universos Adjustment Modal State
  const [editingSectorUniversos, setEditingSectorUniversos] = useState<string | null>(null);
  const [editAtividade, setEditAtividade] = useState<number>(0);
  const [editAlimento, setEditAlimento] = useState<number>(0);
  const [editMontanha, setEditMontanha] = useState<number>(0);
  const [editCustomUniversos, setEditCustomUniversos] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [editReproTotal, setEditReproTotal] = useState<number>(0);
  const [editColis, setEditColis] = useState<number>(0);
  const [editElog, setEditElog] = useState<string>("");
  const [isSavingUniversos, setIsSavingUniversos] = useState<boolean>(false);
  const [saveFeedbackNotice, setSaveFeedbackNotice] = useState<string | null>(null);

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      const url = await exportToGoogleSheets({
        setores,
        colaboradores,
        reapro: reaproData,
        historico,
        capacidade,
      });
      window.open(url, "_blank");
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao exportar: " + errMsg);
    } finally {
      setIsExporting(false);
    }
  };

  // Plantão do Dia
  const DIAS_LISTA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const hojeIdx = new Date().getDay();
  const nomeHoje = DIAS_LISTA[hojeIdx];
  const plantaoHoje = useMemo(() => {
    return (
      referentesSemana.find(
        (r) =>
          r.dia?.toLowerCase().trim().startsWith(nomeHoje.toLowerCase().slice(0, 3)) ||
          r.dia?.toLowerCase().trim() === nomeHoje.toLowerCase()
      ) ||
      referentesSemana[hojeIdx] ||
      referentesSemana[0]
    );
  }, [referentesSemana, hojeIdx, nomeHoje]);

  // Contagem de operadores por status
  const totalColaboradores = colaboradores.length;
  const operadoresEmOperacao = colaboradores.filter((c) => c.status === ColaboradorStatus.Operacao || c.status === "Operacao").length;
  const operadoresApoio = colaboradores.filter(
    (c) =>
      c.status === ColaboradorStatus.Apoio ||
      c.status === ColaboradorStatus.Reabastecimento ||
      c.status === ColaboradorStatus.GestaoEstoque
  ).length;
  const operadoresPausa = colaboradores.filter(
    (c) =>
      c.status === ColaboradorStatus.Ausente ||
      c.status === ColaboradorStatus.BH ||
      (c.status as string) === "Pausa" ||
      (c.status as string) === "Refeicao"
  ).length;

  // Totais operacionais do CD
  const totalVolumeAtiv = useMemo(() => setores.reduce((sum, s) => sum + (s.ativ || 0), 0), [setores]);
  const totalReabastecimento = useMemo(() => setores.reduce((sum, s) => sum + (s.reproTotal || 0), 0), [setores]);
  const totalColis = useMemo(() => setores.reduce((sum, s) => sum + (s.colis || 0), 0), [setores]);
  const mediaUPH = useMemo(
    () => (setores.length ? Math.round(setores.reduce((sum, s) => sum + (s.uph || 0), 0) / setores.length) : 0),
    [setores]
  );
  const mediaSLA = useMemo(
    () =>
      setores.length
        ? parseFloat((setores.reduce((sum, s) => sum + (s.promessa || 0), 0) / setores.length).toFixed(1))
        : 0,
    [setores]
  );

  // Helper de mix de universos
  const getSectorMix = (sid: string, ativTotal: number) => {
    const entry =
      activityEntries.find((e) => e.sectorId === sid && e.activityDate === todayStr) ||
      activityEntries.find((e) => e.sectorId === sid);
    const sectorObj = setores.find((s) => String(s.id) === String(sid) || String(s.numero) === String(sid));
    const reproVal = sectorObj?.reproTotal ?? (parseInt(entry?.reapro || "0") || (sid === "87" ? 151 : 127));
    const colisVal = sectorObj?.colis ?? entry?.colis ?? (sid === "87" ? 1500 : 0);
    const atividadeVal = sectorObj?.ativ ?? entry?.atividade ?? ativTotal;

    const customList: { id: string; name: string; value: number; pct: number }[] = [];
    if (entry?.adhocCategories && typeof entry.adhocCategories === "object") {
      Object.entries(entry.adhocCategories).forEach(([name, val], idx) => {
        const numVal = typeof val === "number" ? val : parseInt(String(val)) || 0;
        if (numVal > 0) {
          customList.push({
            id: `custom-${idx}-${name}`,
            name,
            value: numVal,
            pct: 0,
          });
        }
      });
    }

    if (entry && (entry.alimento > 0 || entry.montanha > 0 || customList.length > 0)) {
      const customSum = customList.reduce((acc, c) => acc + c.value, 0);
      const totUniversos = (entry.alimento || 0) + (entry.montanha || 0) + customSum;
      const safeTot = totUniversos > 0 ? totUniversos : ativTotal || 1;
      const alim = entry.alimento || 0;
      const mont = entry.montanha || 0;

      customList.forEach((c) => {
        c.pct = Math.round((c.value / safeTot) * 100);
      });

      return {
        alimento: alim,
        montanha: mont,
        customUniversos: customList,
        colis: colisVal,
        atividade: atividadeVal,
        reapro: `${reproVal} CX`,
        elog: entry.elog || "2J RA FALC (174)",
        alimentoPct: Math.round((alim / safeTot) * 100),
        montanhaPct: Math.round((mont / safeTot) * 100),
        colisPct: Math.round((colisVal / safeTot) * 100),
        total: totUniversos > 0 ? totUniversos : ativTotal,
      };
    }

    const mixPadrao: Record<string, { alim: number; mont: number }> = {
      "88": { alim: 0.65, mont: 0.35 },
      "87": { alim: 0.4, mont: 0.6 },
      "86": { alim: 0.3, mont: 0.7 },
      "89": { alim: 0.6, mont: 0.4 },
      "85": { alim: 0.5, mont: 0.5 },
    };

    const ratio = mixPadrao[sid] || { alim: 0.5, mont: 0.5 };
    const base = ativTotal > 0 ? ativTotal : sid === "88" ? 5965 : sid === "87" ? 15899 : 4500;
    const alim = Math.round(base * ratio.alim);
    const mont = Math.max(0, base - alim);

    return {
      alimento: alim,
      montanha: mont,
      customUniversos: [] as { id: string; name: string; value: number; pct: number }[],
      colis: colisVal,
      atividade: atividadeVal,
      reapro: `${reproVal} CX`,
      elog: "2J RA FALC (174)",
      alimentoPct: Math.round(ratio.alim * 100),
      montanhaPct: Math.round(ratio.mont * 100),
      colisPct: Math.round((colisVal / (base || 1)) * 100),
      total: base,
    };
  };

  // Helper para abrir o modal de ajuste rápido validando RBAC
  const handleOpenEditSector = (s: Setor) => {
    if (!can(currentUserProfile, "edit_sector_params", s.id)) {
      alert(`Acesso negado: você não possui permissão para editar os parâmetros do Setor ${s.id}.`);
      return;
    }
    const resolved = resolveSectorMetrics(s);
    const resolvedAtiv = resolved.ativ ?? 0;
    const mix = getSectorMix(s.id, resolvedAtiv);

    setEditingSectorUniversos(s.id);
    setEditAtividade(resolvedAtiv);
    setEditAlimento(mix.alimento || 0);
    setEditMontanha(mix.montanha || 0);
    setEditCustomUniversos(
      (mix.customUniversos || []).map((c) => ({
        id: c.id,
        name: c.name,
        value: c.value || 0,
      }))
    );
    setEditReproTotal(resolved.reproTotal ?? (s.id === "87" ? 151 : 127));
    setEditColis(resolved.colis ?? mix.colis ?? 0);
    setEditElog(mix.elog || "2J RA FALC (174)");
  };

  // Sincronização direta com o Supabase + Zustand + Audit Logs
  const handleSaveUniversos = async () => {
    if (!editingSectorUniversos) return;
    if (!can(currentUserProfile, "edit_sector_params", editingSectorUniversos)) {
      alert(`Ação não autorizada para o Setor ${editingSectorUniversos} pelo controle de acesso (RBAC).`);
      return;
    }

    setIsSavingUniversos(true);
    try {
      const totalCustom = editCustomUniversos.reduce((acc, c) => acc + (c.value || 0), 0);
      const calculatedAtividade = editAtividade > 0 ? editAtividade : editAlimento + editMontanha + totalCustom;

      const adhocCategories: Record<string, number> = {};
      editCustomUniversos.forEach((c) => {
        if (c.name && c.name.trim()) {
          adhocCategories[c.name.trim()] = c.value || 0;
        }
      });

      const userName = currentUser || "system";

      // 1. Atualizar overrides do Setor no Supabase (com auditoria)
      await useSectorStore.getState().updateSectorOverride(
        editingSectorUniversos,
        {
          ativ: calculatedAtividade,
          reproTotal: editReproTotal,
          colis: editColis,
        },
        userName
      );

      // 2. Atualizar atividade diária no Supabase (activity_entries)
      await useSectorStore.getState().updateActivityUniversosBatch(
        editingSectorUniversos,
        todayStr,
        currentUserUid || "system",
        {
          alimento: editAlimento,
          montanha: editMontanha,
          colis: editColis,
          atividade: calculatedAtividade,
          elog: editElog,
          reapro: String(editReproTotal),
          adhocCategories,
        }
      );

      // 3. Notificar callback do App.tsx se existente
      if (onUpdateSetor) {
        onUpdateSetor(editingSectorUniversos, "atividade", calculatedAtividade);
        onUpdateSetor(editingSectorUniversos, "alimento", editAlimento);
        onUpdateSetor(editingSectorUniversos, "montanha", editMontanha);
        onUpdateSetor(editingSectorUniversos, "reproTotal", editReproTotal);
        onUpdateSetor(editingSectorUniversos, "colis", editColis);
        onUpdateSetor(editingSectorUniversos, "elog", editElog);
      }

      setSaveFeedbackNotice(`Parâmetros do Setor ${editingSectorUniversos} sincronizados com sucesso no Supabase!`);
      setTimeout(() => setSaveFeedbackNotice(null), 4000);
      setEditingSectorUniversos(null);
    } catch (err) {
      console.error("Erro ao sincronizar parâmetros:", err);
      alert("Erro ao persistir alterações: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingUniversos(false);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      onTerminalCommand(terminalInput.trim());
      setTerminalInput("");
    }
  };

  // Dados para Gráficos
  const chartHistoricoData = useMemo(() => {
    return historico.slice(-14).map((h) => ({
      name: `${h.data.slice(0, 5)} S${h.setor}`,
      ATIV: h.ativ,
      UPH: h.uph,
    }));
  }, [historico]);

  const chartSetoresUPH = useMemo(() => {
    return setores.map((s) => ({
      setor: `S${s.id}`,
      uph: s.uph,
      metaUph: s.id === "87" ? 520 : s.id === "88" ? 480 : 450,
      sla: s.promessa,
    }));
  }, [setores]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 🔔 Feedback de Sincronização em Tempo Real */}
      {saveFeedbackNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check size={16} className="text-emerald-400" />
            <span>{saveFeedbackNotice}</span>
          </div>
          <button
            onClick={() => setSaveFeedbackNotice(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 🧭 Top Bar & Seletor de Seções (Escala | Monitor | Gráfico) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0a10] border border-white/10 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-base font-black text-white uppercase tracking-wider">
              Painel Operacional
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Escala &bull; Monitor em Tempo Real &bull; Gráficos de Produção
            </p>
          </div>
        </div>

        {/* Filtros de Seção & Ações */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveSection("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeSection === "all"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🌟 Todos
            </button>
            <button
              onClick={() => setActiveSection("escala")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeSection === "escala"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users size={13} />
              <span>Escala</span>
            </button>
            <button
              onClick={() => setActiveSection("monitor")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeSection === "monitor"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity size={13} />
              <span>Monitor</span>
            </button>
            <button
              onClick={() => setActiveSection("grafico")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeSection === "grafico"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TrendingUp size={13} />
              <span>Gráficos</span>
            </button>
          </div>

          <button
            onClick={handleExportSheets}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            title="Exportar dados operacionais para o Google Sheets"
          >
            {isExporting ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></span>
            ) : (
              <FileSpreadsheet size={14} className="text-emerald-400" />
            )}
            <span>{isExporting ? "Exportando..." : "Google Sheets"}</span>
          </button>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-2 rounded-xl border text-xs font-mono transition-all ${
              showTerminal
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
            }`}
            title="Terminal de Comando Operacional"
          >
            <Terminal size={15} />
          </button>
        </div>
      </div>

      {/* Terminal retrátil quando solicitado */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-black/90 border border-emerald-500/40 rounded-2xl p-4 font-mono text-xs shadow-2xl"
          >
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Cpu size={14} />
                <span>TERMINAL DE COMANDO &bull; AI COPIL LOGISTICS</span>
              </div>
              <button
                onClick={() => setShowTerminal(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar text-[11px]">
              <div className="text-zinc-500">
                Sintaxe permitida:{" "}
                <span className="text-emerald-400">"S[Setor] [parâmetro] para [Valor]"</span> (ex:{" "}
                <span className="text-sky-300">S87 promessa para 99.8</span>,{" "}
                <span className="text-sky-300">S87 uph para 520</span>)
              </div>
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.startsWith("> ")
                      ? "text-emerald-400 font-bold"
                      : log.includes("Erro")
                      ? "text-rose-400"
                      : "text-zinc-300"
                  }
                >
                  {log}
                </div>
              ))}
            </div>
            <form onSubmit={handleTerminalSubmit} className="mt-3 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">&gt;_</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Digite um comando para calibrar setor..."
                className="w-full bg-black/70 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-emerald-200 focus:outline-none focus:border-emerald-400 font-mono text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                Executar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 👥 1. SEÇÃO ESCALA (Plantão, Liderança & Equipe Ativa) */}
      {/* ========================================================================= */}
      {(activeSection === "all" || activeSection === "escala") && (
        <section className="space-y-3" id="painel-secao-escala">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                Escala &amp; Plantão de Liderança — Hoje ({nomeHoje})
              </h2>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("capacidade")}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold transition-colors"
              >
                <span>Gerenciar Escala Completa</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Referente S87 / SB7 */}
            <div className="bg-[#0b0f14] border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-base flex items-center justify-center shadow-inner">
                  {(plantaoHoje?.ref87 || plantaoHoje?.referente_sb7 || "S")?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                    Referente Setor 87
                  </span>
                  <p className="text-sm font-black text-white uppercase truncate max-w-[150px] mt-0.5">
                    {plantaoHoje?.ref87 || plantaoHoje?.referente_sb7 || "Não Definido"}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono">Liderança Ativa</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  S87
                </span>
              </div>
            </div>

            {/* Card Referente Volumosos */}
            <div className="bg-[#0b0f14] border border-cyan-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-black text-base flex items-center justify-center shadow-inner">
                  {(plantaoHoje?.refVol || plantaoHoje?.referente_volumosos || "V")?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                    Ref. Volumosos (S88/86/89)
                  </span>
                  <p className="text-sm font-black text-white uppercase truncate max-w-[150px] mt-0.5">
                    {plantaoHoje?.refVol || plantaoHoje?.referente_volumosos || "Não Definido"}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono">Liderança Volumosos</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-400/90 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  VOL
                </span>
              </div>
            </div>

            {/* Card Apoio do Turno */}
            <div className="bg-[#0b0f14] border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-base flex items-center justify-center shadow-inner">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    Apoio &amp; Retaguarda
                  </span>
                  <p className="text-sm font-black text-white uppercase truncate max-w-[150px] mt-0.5">
                    {plantaoHoje?.apoios || plantaoHoje?.apoio || "Sem Apoio Registrado"}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono">Suporte e Fechamento</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  APOIO
                </span>
              </div>
            </div>

            {/* Card Quadro de Operadores Ativos */}
            <div className="bg-[#0b0f14] border border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Equipe em Operação
                </span>
                <span className="text-xs font-mono font-bold text-white bg-indigo-950/50 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                  {operadoresEmOperacao} / {totalColaboradores} ativos
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{operadoresEmOperacao} Separação</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{operadoresApoio} Apoio/Reapro</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                  <span>{operadoresPausa} Pausa</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 📊 2. SEÇÃO MONITOR (Monitor de Setores Ativos & Métricas em Tempo Real) */}
      {/* ========================================================================= */}
      {(activeSection === "all" || activeSection === "monitor") && (
        <section className="space-y-4" id="painel-secao-monitor">
          {/* Header do Monitor & KPIs de Resumo Operacional */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-sky-400" />
                Monitor de Setores Ativos &amp; Operação
              </h2>
            </div>
            {/* Mini Resumo Operacional */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="bg-black/40 border border-white/10 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">Volume Total:</span>
                <span className="text-white font-black">{totalVolumeAtiv.toLocaleString("pt-BR")}</span>
              </div>
              <div className="bg-black/40 border border-white/10 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">UPH Médio:</span>
                <span className="text-sky-400 font-black">{mediaUPH}</span>
              </div>
              <div className="bg-black/40 border border-white/10 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">SLA Médio:</span>
                <span className="text-emerald-400 font-black">{mediaSLA}%</span>
              </div>
              <div className="bg-black/40 border border-amber-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="text-amber-400/80">Reabastecimento:</span>
                <span className="text-amber-300 font-black">{totalReabastecimento.toLocaleString("pt-BR")} CX</span>
              </div>
            </div>
          </div>

          {/* Grid de Cards de Setores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {setores.map((s, idx) => {
              const isDanger = s.bsi < 99 || s.infracaoSeguranca;
              const borderTopColor = isDanger ? "#ef4444" : "#6366f1";
              const isCaixasSector = ["87", "087", "88", "088", "89", "089", "90", "090"].includes(String(s.id));
              const unitText = isCaixasSector ? "CAIXAS" : "COLIS";

              const atividadeValue = s.ativ;
              const mix = getSectorMix(s.id, atividadeValue);

              const plantaoLider =
                s.id === "87"
                  ? plantaoHoje?.ref87 || plantaoHoje?.referente_sb7 || s.resp || "Líder"
                  : plantaoHoje?.refVol || plantaoHoje?.referente_volumosos || s.resp || "Líder";
              const plantaoLiderStr = String(plantaoLider || "Líder");
              const initialLetter = plantaoLiderStr.charAt(0).toUpperCase() || "L";
              const plantaoPrimeiroNome = plantaoLiderStr.split(" ")[0] || "Líder";

              return (
                <div
                  key={s.id}
                  className={`bg-[#0c0c14] p-5 flex flex-col justify-between border-t-2 rounded-2xl space-y-3.5 shadow-md hover:border-indigo-500/30 transition-all ${
                    isDanger ? "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/5"
                  }`}
                  style={{ borderTopColor }}
                >
                  {/* Cabeçalho do Setor */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-300">
                        {initialLetter}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider leading-none">
                          SETOR {s.id} &bull; {unitText}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-300 mt-1 uppercase tracking-wider truncate max-w-[120px]">
                          Líder: {plantaoPrimeiroNome}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {can(currentUserProfile, "edit_sector_params", s.id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSector(s);
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold flex items-center gap-1 transition-all shadow-sm"
                          title={`Ajuste rápido de atividade e universos (Setor ${s.id})`}
                        >
                          <Edit3 size={10} />
                          <span>Ajustar</span>
                        </button>
                      )}

                      {can(currentUserProfile, "toggle_safety", s.id) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSeguranca(idx);
                          }}
                          className={`px-2 py-1 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                            s.infracaoSeguranca
                              ? "bg-red-950/90 text-red-400 border border-red-700/60 hover:bg-red-900/80 animate-pulse"
                              : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60"
                          }`}
                          title={`Clique para alternar alerta visual de segurança (Setor ${s.id})`}
                        >
                          <Shield size={10} />
                          <span>{s.infracaoSeguranca ? "INFRAÇÃO" : "SEG: OK"}</span>
                        </button>
                      ) : (
                        <div
                          className={`px-2 py-1 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1 ${
                            s.infracaoSeguranca
                              ? "bg-red-950/80 text-red-400 border border-red-800/40 animate-pulse"
                              : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                          }`}
                          title={s.infracaoSeguranca ? "Infração de segurança ativa" : "Sem infrações de segurança"}
                        >
                          <Shield size={10} />
                          <span>{s.infracaoSeguranca ? "INFRAÇÃO" : "SEG: OK"}</span>
                        </div>
                      )}
                    </div>
                  </div>
 
                  {/* DISPLAY PRINCIPAL: ATIVIDADE */}
                  <div
                    onClick={() => {
                      if (can(currentUserProfile, "edit_sector_params", s.id)) {
                        handleOpenEditSector(s);
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-3.5 bg-black/40 border border-white/5 rounded-xl relative transition-all ${
                      can(currentUserProfile, "edit_sector_params", s.id)
                        ? "cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-950/20 group"
                        : ""
                    }`}
                    title={
                      can(currentUserProfile, "edit_sector_params", s.id)
                        ? `Clique para ajustar a atividade e universos do Setor ${s.id}`
                        : undefined
                    }
                  >
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      ATIVIDADE
                      {can(currentUserProfile, "edit_sector_params", s.id) && (
                        <Edit3 size={10} className="text-indigo-400/50 group-hover:text-indigo-300 transition-colors" />
                      )}
                    </span>
                    <span className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]">
                      {(atividadeValue ?? 0).toLocaleString("pt-BR")}
                    </span>
                    {can(currentUserProfile, "edit_sector_params", s.id) && (
                      <span className="text-[8.5px] font-semibold text-indigo-400/70 group-hover:text-indigo-300 mt-0.5 transition-colors">
                        Ajuste Rápido
                      </span>
                    )}
                  </div>
 
                  {/* UNIVERSOS DE PRODUTOS */}
                  <div className="bg-black/30 border border-white/5 p-2.5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                      <span className="flex items-center gap-1 text-indigo-300">
                        <PieChart size={11} />
                        <span>UNIVERSOS</span>
                      </span>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-zinc-300">{(mix.total ?? 0).toLocaleString("pt-BR")} un</span>
                      </div>
                    </div>

                    {/* Barra Segmentada */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-black/50 border border-white/5">
                      <div
                        style={{ width: `${mix.alimentoPct}%` }}
                        className="bg-amber-500 h-full"
                        title={`Alimento: ${(mix.alimento ?? 0).toLocaleString("pt-BR")} (${mix.alimentoPct}%)`}
                      ></div>
                      <div
                        style={{ width: `${mix.montanhaPct}%` }}
                        className="bg-purple-500 h-full"
                        title={`Montanha: ${(mix.montanha ?? 0).toLocaleString("pt-BR")} (${mix.montanhaPct}%)`}
                      ></div>
                      {mix.customUniversos.map((cu, cIdx) => (
                        <div
                          key={`mini-bar-custom-${cIdx}`}
                          style={{ width: `${cu.pct}%` }}
                          className="bg-cyan-500 h-full"
                          title={`${cu.name}: ${(cu.value ?? 0).toLocaleString("pt-BR")} (${cu.pct}%)`}
                        ></div>
                      ))}
                    </div>

                    {/* Pílulas de Universos */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                      <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex flex-col">
                        <span className="text-amber-400 font-sans flex items-center gap-0.5 font-bold text-[9px]">
                          <Apple size={9} /> 🍎 Alim
                        </span>
                        <span className="text-white font-bold text-[10px]">
                          {(mix.alimento ?? 0).toLocaleString("pt-BR")}{" "}
                          <span className="text-amber-400/80 font-normal text-[8.5px]">({mix.alimentoPct}%)</span>
                        </span>
                      </div>

                      <div className="bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg flex flex-col">
                        <span className="text-purple-400 font-sans flex items-center gap-0.5 font-bold text-[9px]">
                          <Mountain size={9} /> ⛰️ Mont
                        </span>
                        <span className="text-white font-bold text-[10px]">
                          {(mix.montanha ?? 0).toLocaleString("pt-BR")}{" "}
                          <span className="text-purple-400/80 font-normal text-[8.5px]">({mix.montanhaPct}%)</span>
                        </span>
                      </div>
                    </div>

                    {/* Bloco de Reabastecimento (CX) */}
                    <div className="bg-amber-950/40 border border-amber-500/40 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw size={12} className="text-amber-400" />
                        <span className="text-amber-400 font-sans font-bold text-[10px] uppercase">
                          REABASTECIMENTO
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-amber-300 font-black text-sm">
                          {(s.reproTotal ?? (s.id === "87" ? 151 : 127)).toLocaleString("pt-BR")}
                        </span>
                        <span className="text-amber-400/80 text-[9px] font-bold">CX</span>
                      </div>
                    </div>

                    {/* Bloco de Colis */}
                    <div className="bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-sans font-bold text-[10px] uppercase">
                          COLIS COLETA
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-emerald-300 font-black text-sm">
                          {(s.colis ?? mix.colis ?? 0).toLocaleString("pt-BR")}
                        </span>
                        <span className="text-emerald-400/80 text-[9px] font-bold">COLIS</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 KPIs Operacionais (Promessa, UPH, BSI, Erros) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    {/* PROMESSA (SLA) */}
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase flex items-center justify-between">
                        Promessa
                      </span>
                      <span className="text-base font-black text-emerald-400 font-mono">{s.promessa}%</span>
                    </div>

                    {/* UPH */}
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase flex items-center justify-between">
                        UPH
                      </span>
                      <span className="text-base font-black text-sky-400 font-mono">{s.uph}</span>
                    </div>

                    {/* BSI */}
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase flex items-center justify-between">
                        BSI
                      </span>
                      <span className="text-base font-black text-cyan-400 font-mono">{s.bsi}%</span>
                    </div>

                    {/* ERROS PICKING */}
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase flex items-center justify-between">
                        Erros Pick.
                      </span>
                      <span className="text-base font-black text-red-400 font-mono">{s.errosPicking}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 📈 3. SEÇÃO GRÁFICOS (Tendência, Produtividade UPH e Desempenho) */}
      {/* ========================================================================= */}
      {(activeSection === "all" || activeSection === "grafico") && (
        <section className="space-y-4" id="painel-secao-grafico">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-400" />
                Gráficos &amp; Tendência de Produtividade
              </h2>
            </div>

            <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-1 text-xs">
              <button
                onClick={() => setChartViewMode("historico")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  chartViewMode === "historico"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Evolução Temporal
              </button>
              <button
                onClick={() => setChartViewMode("uph_setores")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  chartViewMode === "uph_setores"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                UPH vs Meta Setor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gráfico Principal (2 Colunas) */}
            <div className="lg:col-span-2 bg-[#0c0c14] border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {chartViewMode === "historico"
                      ? "Tendência de Atividade & Produtividade UPH"
                      : "Comparativo de Produtividade UPH por Setor"}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {chartViewMode === "historico"
                      ? "Curva contínua de volume movimentado e rendimento"
                      : "Desempenho em caixas/hora comparado à meta operacional"}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-md">
                  TEMPO REAL
                </span>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartViewMode === "historico" ? (
                    <LineChart data={chartHistoricoData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px" }}
                        labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Line
                        type="monotone"
                        dataKey="ATIV"
                        name="Volume Atividade"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="UPH"
                        name="Produtividade UPH"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartSetoresUPH} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="setor" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px" }}
                        labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar dataKey="uph" name="UPH Real" fill="#818cf8" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="metaUph" name="Meta UPH" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Painel Lateral de Diagnóstico de Ritmo */}
            <div className="bg-[#0c0c14] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  Diagnóstico de Ritmo Operacional
                </h3>

                <div className="space-y-3 mt-3">
                  <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                        Setor Maior Produtividade
                      </span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {(() => {
                          const top = [...setores].sort((a, b) => b.uph - a.uph)[0];
                          return top ? `Setor ${top.id} (${top.uph} UPH)` : "—";
                        })()}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
                      LÍDER
                    </span>
                  </div>

                  <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                        Atenção / Menor Ritmo
                      </span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {(() => {
                          const bottom = [...setores].filter((s) => s.uph > 0).sort((a, b) => a.uph - b.uph)[0];
                          return bottom ? `Setor ${bottom.id} (${bottom.uph} UPH)` : "—";
                        })()}
                      </span>
                    </div>
                    <span className="text-xs text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded-lg">
                      ALERTA
                    </span>
                  </div>

                  <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                        Eficiência de Separação
                      </span>
                      <span className="text-sm font-black text-sky-400 font-mono">
                        {mediaSLA >= 99 ? "Excelente (Acima de 99%)" : "Estável"}
                      </span>
                    </div>
                    <span className="text-xs text-sky-400 font-bold bg-sky-950/40 border border-sky-500/30 px-2 py-1 rounded-lg">
                      {mediaSLA}%
                    </span>
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab("produtividade")}
                  className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Ver Detalhes na Aba Produtividade</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 🛠️ MODAL DE AJUSTE RÁPIDO DE UNIVERSOS E PARÂMETROS */}
      {/* ========================================================================= */}
      {editingSectorUniversos && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-[#2a2a3c] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#222234] pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Parâmetros por Universo &bull; Setor {editingSectorUniversos}
                  </h3>
                  <p className="text-xs text-slate-400">Edição de proporções e volumes operacionais</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSectorUniversos(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 self-center">Presets Rápidos:</span>
              <button
                type="button"
                onClick={() => {
                  const total = editAlimento + editMontanha || editAtividade || 6000;
                  setEditAlimento(Math.round(total * 0.65));
                  setEditMontanha(Math.round(total * 0.35));
                }}
                className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-colors"
              >
                65% Alim / 35% Mont
              </button>
              <button
                type="button"
                onClick={() => {
                  const total = editAlimento + editMontanha || editAtividade || 6000;
                  setEditAlimento(Math.round(total * 0.5));
                  setEditMontanha(Math.round(total * 0.5));
                }}
                className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-colors"
              >
                50% Alim / 50% Mont
              </button>
              <button
                type="button"
                onClick={() => {
                  const total = editAlimento + editMontanha || editAtividade || 6000;
                  setEditAlimento(Math.round(total * 0.4));
                  setEditMontanha(Math.round(total * 0.6));
                }}
                className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-colors"
              >
                40% Alim / 60% Mont (S87)
              </button>
            </div>

            {/* ATIVIDADE DO SETOR */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Activity size={15} /> ATIVIDADE
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Sincronização &amp; Override</span>
              </div>
              <div className="bg-[#0b0b12] p-3.5 rounded-xl border-2 border-white/10 flex flex-col justify-between gap-2 shadow-sm">
                <div className="flex items-center justify-between text-slate-300 text-xs font-black uppercase tracking-wider mb-1">
                  <span>OVERRIDE MANUAL (OPCIONAL)</span>
                </div>
                <input
                  type="number"
                  value={editAtividade}
                  onChange={(e) => setEditAtividade(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-right font-mono font-black text-xl bg-black border-2 border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400 shadow-inner"
                  placeholder="Vazio = usa valor da planilha"
                />
              </div>
            </div>

            {/* UNIVERSOS DE PRODUTOS */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <PieChart size={14} className="text-indigo-400" />
                  <span>Universos de Produtos (Separação)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `custom-${Date.now()}`;
                    setEditCustomUniversos([
                      ...editCustomUniversos,
                      { id: newId, name: `Novo Universo ${editCustomUniversos.length + 1}`, value: 0 },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus size={13} />
                  <span>+ Adicionar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-[#0b0b12] p-3 rounded-xl border border-amber-500/20 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Apple size={14} /> 🍎 Alimento
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editAlimento}
                    onChange={(e) => setEditAlimento(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-bold text-sm bg-black border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="bg-[#0b0b12] p-3 rounded-xl border border-purple-500/20 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Mountain size={14} /> ⛰️ Montanha
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editMontanha}
                    onChange={(e) => setEditMontanha(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-bold text-sm bg-black border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {editCustomUniversos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1e1e2a]/60">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag size={13} /> Universos Customizados
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {editCustomUniversos.map((item, idx) => (
                      <div
                        key={item.id || `edit-custom-dash-${idx}`}
                        className="bg-[#090912] p-3 rounded-xl border border-cyan-500/20 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...editCustomUniversos];
                              updated[idx].name = e.target.value;
                              setEditCustomUniversos(updated);
                            }}
                            className="w-full font-bold text-xs bg-black/60 border border-slate-700 rounded-md px-2 py-1 text-cyan-400 focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => setEditCustomUniversos(editCustomUniversos.filter((_, i) => i !== idx))}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => {
                            const updated = [...editCustomUniversos];
                            updated[idx].value = Math.max(0, parseInt(e.target.value) || 0);
                            setEditCustomUniversos(updated);
                          }}
                          className="w-full text-right font-mono font-bold text-sm bg-black border border-cyan-500/40 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* REABASTECIMENTO & COLIS */}
            <div className="space-y-3 pt-2 border-t border-[#1e1e2a]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#1a1408] p-3.5 rounded-xl border-2 border-amber-500/60 flex flex-col justify-between gap-2">
                  <span className="text-amber-400 text-xs font-black uppercase flex items-center gap-1.5">
                    <RotateCcw size={16} /> REABASTECIMENTO
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={editReproTotal}
                      onChange={(e) => setEditReproTotal(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right font-mono font-black text-xl bg-black border-2 border-amber-500/70 rounded-lg px-3 py-2 pr-12 text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 font-mono font-bold text-amber-400/80 text-[10px] pointer-events-none">
                      CX
                    </span>
                  </div>
                </div>

                <div className="bg-[#0b0b12] p-3.5 rounded-xl border-2 border-emerald-500/60 flex flex-col justify-between gap-2">
                  <span className="text-emerald-400 text-xs font-black uppercase flex items-center gap-1.5">
                    <Package size={16} /> COLIS COLETA
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={editColis}
                      onChange={(e) => setEditColis(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right font-mono font-black text-xl bg-black border-2 border-emerald-500/70 rounded-lg px-3 py-2 pr-16 text-emerald-300 focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-3 font-mono font-bold text-emerald-400/80 text-[10px] pointer-events-none">
                      COLIS
                    </span>
                  </div>
                </div>
              </div>

              {/* E-Log */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-slate-700 flex flex-col justify-between gap-1.5">
                <div className="text-slate-300 text-xs font-bold flex justify-between items-center">
                  <span>E-Log (Identificador / Linha)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Decathlon WMS</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: 2J RA FALC (174)"
                  value={editElog}
                  onChange={(e) => setEditElog(e.target.value)}
                  className="w-full text-left font-mono font-semibold text-xs bg-black border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-3 border-t border-[#222234]">
              {onNavigateTab && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectorUniversos(null);
                      onNavigateTab("override");
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders size={13} />
                    <span>Override</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectorUniversos(null);
                      onNavigateTab("config");
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Ajustes &amp; Metas</span>
                  </button>
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  disabled={isSavingUniversos}
                  onClick={() => setEditingSectorUniversos(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingUniversos}
                  onClick={handleSaveUniversos}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSavingUniversos ? "Sincronizando..." : "Salvar no Banco"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
