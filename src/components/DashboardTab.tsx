/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Setor,
  ReferenteSemana,
  Colaborador,
  RadarLoja,
  ReaproData,
  BolsaoData,
  CopilSetor,
  HistoricoRegistro,
  UserRole,
  CapacidadeSetor,
} from "../types";
import { TrendLineChart } from "./CommandCharts";
import {
  Edit3,
  Shield,
  ArrowUp,
  ArrowDown,
  Terminal,
  AlertTriangle,
  Cpu,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Activity,
  Users,
  Radio,
  Layers,
  RefreshCw,
  BarChart2,
} from "lucide-react";

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
  onUpdateSetor?: (sid: string, field: string, val: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  setores,
  referentesSemana,
  colaboradores,
  radar,
  reaproData,
  bolsaoData,
  copilData,
  copilActiveSector,
  setCopilActiveSector,
  onToggleSeguranca,
  onSaveRadar,
  onSaveBolsao,
  onSaveReapro,
  terminalLogs,
  onTerminalCommand,
  currentRole,
  historico,
  capacidade,
  onUpdateSetor,
}) => {
  // Widget Order State with Drag & Drop & Persistence
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dashboard_card_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        const required = [
          "referentes",
          "executivos",
          "atrasos",
          "setores",
          "copil",
          "radar",
          "bolsao",
          "reapro",
          "trend",
          "terminal",
        ];
        // Validate saved order contains all required items
        if (
          parsed.length === required.length &&
          required.every((r) => parsed.includes(r))
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error parsing card order:", e);
    }
    // Default logical order matching target layout specification
    return [
      "referentes",
      "executivos",
      "atrasos",
      "setores",
      "copil",
      "radar",
      "bolsao",
      "reapro",
      "trend",
      "terminal",
    ];
  });

  // Minimized state of widgets with Persistence
  const [minimized, setMinimized] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("dashboard_card_minimized");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error parsing minimized state:", e);
    }
    return {};
  });

  const [radarEdit, setRadarEdit] = useState(false);
  const [localRadar, setLocalRadar] = useState<RadarLoja[]>([]);
  const [bolsaoEdit, setBolsaoEdit] = useState(false);
  const [localBolsao, setLocalBolsao] = useState<BolsaoData>({ ...bolsaoData });
  const [reaproEdit, setReaproEdit] = useState(false);
  const [localReapro, setLocalReapro] = useState<ReaproData>({ ...reaproData });
  const [terminalInput, setTerminalInput] = useState("");

  // Drag and drop local states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Inline editing states for Monitor de Setores Ativos
  const [editingMetric, setEditingMetric] = useState<{ sid: string; field: string } | null>(null);
  const [editMetricValue, setEditMetricValue] = useState<string>("");

  const handleSaveInline = () => {
    if (!editingMetric || !onUpdateSetor) return;
    const { sid, field } = editingMetric;
    const numValue = parseFloat(editMetricValue) || 0;
    onUpdateSetor(sid, field, numValue);
    setEditingMetric(null);
  };

  // Synchronize local states with props when edit modes trigger
  const handleRadarEditToggle = () => {
    if (radarEdit) {
      onSaveRadar(localRadar);
    } else {
      setLocalRadar([...radar]);
    }
    setRadarEdit(!radarEdit);
  };

  const handleBolsaoEditToggle = () => {
    if (bolsaoEdit) {
      onSaveBolsao(localBolsao);
    } else {
      setLocalBolsao({ ...bolsaoData });
    }
    setBolsaoEdit(!bolsaoEdit);
  };

  const handleReaproEditToggle = () => {
    if (reaproEdit) {
      onSaveReapro(localReapro);
    } else {
      setLocalReapro({ ...reaproData });
    }
    setReaproEdit(!reaproEdit);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      onTerminalCommand(terminalInput.trim());
      setTerminalInput("");
    }
  };

  const isEditable =
    currentRole === UserRole.Admin || currentRole === UserRole.Coordenador;

  // Constants & Calculated indicators for header scale
  const DIAS = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  const diaHoje = DIAS[new Date().getDay()];
  const refHoje =
    referentesSemana.find((r) => r.dia.toLowerCase() === diaHoje) ||
    referentesSemana[0];

  const eqAtivaCount = colaboradores.filter((c) => c.status === "Operacao").length;

  // Executive dashboard stats (Calculated matching Executive tab exactly)
  const totalVolume = setores.reduce((sum, s) => sum + s.ativ, 0);
  const mediaUPH = setores.length
    ? Math.round(setores.reduce((sum, s) => sum + s.uph, 0) / setores.length)
    : 0;
  const mediaSLA = setores.length
    ? parseFloat(
        (setores.reduce((sum, s) => sum + s.promessa, 0) / setores.length).toFixed(
          1
        )
      )
    : 0;
  const capTotal = capacidade.reduce((sum, c) => sum + c.abertura, 0);
  const totalRiscoSetores = setores.filter(
    (s) => s.bsi < 99 || s.infracaoSeguranca
  ).length;

  const gargalo = setores.length
    ? setores.reduce(
        (min, s) => (s.uph > 0 && s.uph < min.uph ? s : min),
        setores[0]
      )
    : null;

  // Helper mapping columns span for desktop
  const colSpanMap: Record<string, string> = {
    referentes: "lg:col-span-2",
    executivos: "lg:col-span-2",
    setores: "lg:col-span-2",
    copil: "lg:col-span-1",
    radar: "lg:col-span-1",
    bolsao: "lg:col-span-1",
    reapro: "lg:col-span-2",
    trend: "lg:col-span-1",
    terminal: "lg:col-span-1",
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = cardOrder.indexOf(draggedId);
    const targetIndex = cardOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...cardOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      setCardOrder(newOrder);
      localStorage.setItem("dashboard_card_order", JSON.stringify(newOrder));
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // Accessibility reordering buttons (TV & Tablet compatibility)
  const handleMoveUp = (id: string) => {
    const idx = cardOrder.indexOf(id);
    if (idx > 0) {
      const newOrder = [...cardOrder];
      const temp = newOrder[idx];
      newOrder[idx] = newOrder[idx - 1];
      newOrder[idx - 1] = temp;
      setCardOrder(newOrder);
      localStorage.setItem("dashboard_card_order", JSON.stringify(newOrder));
    }
  };

  const handleMoveDown = (id: string) => {
    const idx = cardOrder.indexOf(id);
    if (idx < cardOrder.length - 1) {
      const newOrder = [...cardOrder];
      const temp = newOrder[idx];
      newOrder[idx] = newOrder[idx + 1];
      newOrder[idx + 1] = temp;
      setCardOrder(newOrder);
      localStorage.setItem("dashboard_card_order", JSON.stringify(newOrder));
    }
  };

  const toggleMinimize = (id: string) => {
    const updated = { ...minimized, [id]: !minimized[id] };
    setMinimized(updated);
    localStorage.setItem("dashboard_card_minimized", JSON.stringify(updated));
  };

  // Reusable widget container wrapping card contents
  const renderWidget = (
    id: string,
    title: string,
    icon: React.ReactNode,
    minimizedIndicator: React.ReactNode,
    children: React.ReactNode,
    borderClasses: string = ""
  ) => {
    const isMin = !!minimized[id];
    const isDragging = draggedId === id;
    const isDragOver = dragOverId === id;

    return (
      <motion.div
        key={id}
        layout
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className={`glass-card flex flex-col h-full overflow-hidden transition-all duration-300 relative ${
          colSpanMap[id] || "lg:col-span-1"
        } ${borderClasses} ${
          isDragging
            ? "opacity-40 scale-[0.98] border-dashed border-indigo-500/50 bg-indigo-950/5"
            : ""
        } ${
          isDragOver
            ? "border-indigo-500/60 bg-indigo-950/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            : ""
        }`}
        onDragOver={(e) => handleDragOver(e, id)}
        onDrop={(e) => handleDrop(e, id)}
      >
        {/* Widget Drag-Handle Header */}
        <div
          className="flex items-center justify-between pb-3 border-b border-white/5 p-4 select-none cursor-grab active:cursor-grabbing bg-black/15 hover:bg-black/25 transition-colors duration-150 rounded-t-xl"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, id)}
          onDragEnd={handleDragEnd}
          title="Arraste pelo cabeçalho para reorganizar"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GripVertical
              size={14}
              className="text-zinc-600 hover:text-indigo-400 cursor-grab flex-shrink-0"
            />
            <span className="text-zinc-400 flex-shrink-0">{icon}</span>
            <span className="text-xs font-black text-white uppercase tracking-widest truncate">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick Reorder Arrows for TVs & Tablets */}
            <div className="flex items-center gap-0.5 bg-black/45 border border-white/5 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => handleMoveUp(id)}
                disabled={cardOrder.indexOf(id) === 0}
                className="p-1 text-zinc-500 hover:text-white hover:bg-white/5 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                title="Mover para cima/trás"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(id)}
                disabled={cardOrder.indexOf(id) === cardOrder.length - 1}
                className="p-1 text-zinc-500 hover:text-white hover:bg-white/5 rounded disabled:opacity-20 disabled:pointer-events-none transition-colors"
                title="Mover para baixo/frente"
              >
                <ArrowDown size={12} />
              </button>
            </div>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => toggleMinimize(id)}
              className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded transition-colors"
              title={isMin ? "Expandir" : "Minimizar"}
            >
              {isMin ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 p-5">
          {isMin ? (
            <div className="flex items-center justify-between py-1 text-zinc-400 text-xs font-mono">
              <span className="text-[10px] uppercase font-black text-zinc-600 tracking-wider">
                Modo Compacto
              </span>
              <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-indigo-400 font-bold text-center">
                {minimizedIndicator}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Draggable & Animating Widgets Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {cardOrder.map((id) => {
          switch (id) {
            case "referentes":
              return renderWidget(
                "referentes",
                `Escala de Plantão & Liderança — Hoje (${diaHoje.toUpperCase()})`,
                <Users size={14} className="text-emerald-400" />,
                `S87: ${refHoje?.ref87 || "—"} | Vol: ${refHoje?.refVol || "—"}`,
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="p-3 flex items-center gap-3 border border-emerald-500/20 bg-emerald-950/10 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm">
                      {refHoje?.ref87?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-[0.55rem] font-bold text-emerald-400 uppercase tracking-widest leading-none">
                        Referente S87
                      </p>
                      <p className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[180px] mt-1">
                        {refHoje?.ref87 || "Não Definido"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 flex items-center gap-3 border border-cyan-500/20 bg-cyan-950/10 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-sm">
                      {refHoje?.refVol?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-[0.55rem] font-bold text-cyan-400 uppercase tracking-widest leading-none">
                        Ref. Volumosos
                      </p>
                      <p className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[180px] mt-1">
                        {refHoje?.refVol || "Não Definido"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between border border-blue-500/15 bg-blue-950/10 rounded-xl">
                    <div>
                      <p className="text-[0.55rem] font-bold text-blue-400 uppercase tracking-widest leading-none">
                        Equipe Ativa Geral
                      </p>
                      <p className="text-base font-black text-white mt-1 font-mono">
                        {eqAtivaCount} Operadores
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.55rem] font-bold text-gray-500 uppercase leading-none">
                        Apoio
                      </p>
                      <p className="text-xs font-bold text-blue-300 mt-1">
                        {refHoje?.apoios || "—"}
                      </p>
                    </div>
                  </div>
                </div>,
                "border-l-2 border-emerald-500/50"
              );

            case "executivos":
              return renderWidget(
                "executivos",
                "Indicadores Executivos Consolidados",
                <TrendingUp size={14} className="text-indigo-400" />,
                `Volume: ${totalVolume.toLocaleString("pt-BR")} | SLA: ${mediaSLA}%`,
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                  <div className="kpi-card">
                    <div className="kpi-value text-white font-mono">
                      {totalVolume.toLocaleString("pt-BR")}
                    </div>
                    <div className="kpi-label">Volume Total</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      Soma ATIV real-time
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-value text-sky-400 font-mono">
                      {mediaUPH}
                    </div>
                    <div className="kpi-label">Produtividade Média</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      UPH médio operacional
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-value text-emerald-400 font-mono">
                      {mediaSLA}%
                    </div>
                    <div className="kpi-label">Eficiência (SLA)</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      SLA médio da entrega
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-value text-indigo-400 font-mono">
                      {capTotal.toLocaleString("pt-BR")}
                    </div>
                    <div className="kpi-label">Capacidade Ativa</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      Meta de abertura
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-value text-amber-500 font-mono">
                      {gargalo ? `S${gargalo.id}` : "—"}
                    </div>
                    <div className="kpi-label">Gargalo Ativo</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      Menor UPH ({gargalo?.uph || 0} UPH)
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-value text-red-500 font-mono">
                      {totalRiscoSetores}
                    </div>
                    <div className="kpi-label">Risco Crítico</div>
                    <div className="text-[9px] text-zinc-500 mt-1 font-sans">
                      Setores em perigo/BSI
                    </div>
                  </div>
                </div>,
                "border-l-2 border-indigo-500/50"
              );

            case "atrasos":
              {
                // Real-time calculations based on active dataset
                const totalLojasRadar = radar.length;
                const naoColetadas = radar.filter(r => r.vol === 0 || r.prog === 0).length;
                const pendentesCarregamento = radar.filter(r => r.prog > 0 && r.prog < 100).length;
                const concluidasExp = radar.filter(r => r.prog === 100).length;

                const setoresComRiscoList = setores.map(s => {
                  let risco: "baixo" | "medio" | "alto" = "baixo";
                  let motivo = "Desempenho operacional estável e seguro.";
                  
                  if (s.infracaoSeguranca) {
                    risco = "alto";
                    motivo = "Infração de segurança / Bloqueio imediato de postos.";
                  } else if (s.promessa < 98.5 || s.uph < 320) {
                    risco = "alto";
                    motivo = `KPI Crítico! UPH de ${s.uph} e SLA de ${s.promessa}% abaixo do limite de corte.`;
                  } else if (s.promessa < 99.5 || s.uph < 450) {
                    risco = "medio";
                    motivo = `Atenção: Fluxo moderado de carregamento pendente (UPH: ${s.uph}).`;
                  }
                  
                  return { id: s.id, risco, motivo, resp: s.resp };
                });

                const setoresAltoRisco = setoresComRiscoList.filter(s => s.risco === "alto").length;
                const setoresMedioRisco = setoresComRiscoList.filter(s => s.risco === "medio").length;
                const setoresBaixoRisco = setoresComRiscoList.filter(s => s.risco === "baixo").length;

                return renderWidget(
                  "atrasos",
                  "Previsão Inteligente de Atrasos & Riscos",
                  <AlertTriangle size={14} className="text-red-400" />,
                  `Alertas Críticos: ${setoresAltoRisco + radar.filter(r => r.prog < 100 && r.vol > 0).length} | Monitoramento Ativo`,
                  <div className="space-y-4 w-full text-xs">
                    {/* Executive Risk Index Summary */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                        <p className="text-lg font-black text-red-400 font-mono leading-none">
                          {setoresAltoRisco + radar.filter(r => r.prog < 70 && r.vol > 0).length}
                        </p>
                        <p className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest mt-1">Risco Alto</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                        <p className="text-lg font-black text-amber-400 font-mono leading-none">
                          {setoresMedioRisco + radar.filter(r => r.prog >= 70 && r.prog < 100).length}
                        </p>
                        <p className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest mt-1">Risco Médio</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                        <p className="text-lg font-black text-emerald-400 font-mono leading-none">
                          {setoresBaixoRisco + concluidasExp}
                        </p>
                        <p className="text-[8px] text-zinc-400 uppercase font-bold tracking-widest mt-1">Risco Baixo</p>
                      </div>
                    </div>

                    {/* Automatic Calculations Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                      <div className="bg-white/[0.01] border border-white/5 p-2 rounded-lg text-left">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Pendentes Corte</span>
                        <span className="text-sm font-black text-white">{radar.filter(r => r.prog < 100).length} Lojas</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-2 rounded-lg text-left">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Sem Coleta</span>
                        <span className="text-sm font-black text-amber-400">{naoColetadas} Lojas</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-2 rounded-lg text-left">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Carregamentos</span>
                        <span className="text-sm font-black text-indigo-400">{pendentesCarregamento} Ativos</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-2 rounded-lg text-left">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Concluídas</span>
                        <span className="text-sm font-black text-emerald-400">{concluidasExp} Lojas</span>
                      </div>
                    </div>

                    {/* Dynamic Alert Rows */}
                    <div className="space-y-2">
                      <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mb-1">
                        Detalhamento de Alertas Preventivos
                      </p>
                      
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Lojas com pendências críticas */}
                        {radar.map((r, idx) => {
                          if (r.prog === 100) return null;
                          const isCritical = r.prog < 60;
                          const riskBadge = isCritical ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black px-1 rounded font-mono">RISCO ALTO</span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-black px-1 rounded font-mono">RISCO MÉDIO</span>
                          );
                          return (
                            <div key={`alert-r-${idx}`} className="flex items-center justify-between p-2 bg-black/30 border border-white/5 rounded-lg">
                              <div className="text-left">
                                <p className="font-bold text-white uppercase">{r.loja}</p>
                                <p className="text-[9px] text-zinc-500 font-mono">Expedição: {r.prog}% • Corte às {r.corte} • {r.vol - r.ativ} volumosos restantes</p>
                              </div>
                              <div>{riskBadge}</div>
                            </div>
                          );
                        })}

                        {/* Setores com desvios de produtividade */}
                        {setoresComRiscoList.map((s) => {
                          if (s.risco === "baixo") return null;
                          const riskBadge = s.risco === "alto" ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black px-1 rounded font-mono">RISCO ALTO</span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-black px-1 rounded font-mono">RISCO MÉDIO</span>
                          );
                          return (
                            <div key={`alert-s-${s.id}`} className="flex items-center justify-between p-2 bg-black/30 border border-white/5 rounded-lg">
                              <div className="text-left">
                                <p className="font-bold text-white uppercase font-sans">Setor S{s.id} ({s.resp})</p>
                                <p className="text-[9px] text-zinc-500 leading-snug">{s.motivo}</p>
                              </div>
                              <div>{riskBadge}</div>
                            </div>
                          );
                        })}

                        {radar.filter(r => r.prog < 100).length === 0 && setoresComRiscoList.filter(s => s.risco !== "baixo").length === 0 && (
                          <div className="p-3 text-center text-zinc-500 bg-white/[0.01] border border-dashed border-white/5 rounded-lg">
                            Sem gargalos ativos. Toda a operação está em conformidade com o SLA!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>,
                  "border-l-2 border-red-500/50"
                );
              }

            case "setores":
              return renderWidget(
                "setores",
                "Monitor de Setores Ativos",
                <Activity size={14} className="text-indigo-400" />,
                `Avg SLA: ${mediaSLA}% | Ativos: ${totalVolume}`,
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {setores.map((s, idx) => {
                    const isDanger = s.bsi < 99 || s.infracaoSeguranca;
                    const dangerClasses = isDanger
                      ? "neon-border-red border-red-500/40"
                      : "";
                    const borderTopColor = isDanger ? "#ef4444" : "#6366f1";
                    const unitText = s.id === "87" ? "CAIXAS" : "COLIS";

                    return (
                      <div
                        key={s.id}
                        className={`glass-card p-6 flex flex-col justify-between border-t-2 transition-all duration-300 rounded-[18px] space-y-4 ${dangerClasses}`}
                        style={{
                          borderTopColor,
                          borderLeftColor: "rgba(255,255,255,0.06)",
                          borderRightColor: "rgba(255,255,255,0.06)",
                          borderBottomColor: "rgba(255,255,255,0.06)",
                          borderStyle: "solid",
                          borderLeftWidth: "1px",
                          borderRightWidth: "1px",
                          borderBottomWidth: "1px",
                          borderTopWidth: "2px"
                        }}
                      >
                        {/* Header: Sector ID, Responsible, Security Toggle */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-black/50 flex items-center justify-center text-sm font-black text-zinc-300">
                              {s.resp[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-white leading-none uppercase tracking-wider">
                                SETOR {s.id} • {unitText}
                              </p>
                              <p className="text-[0.6rem] font-bold text-zinc-400 mt-1 uppercase tracking-widest truncate max-w-[80px]">
                                {s.resp.split(" ")[0]}
                              </p>
                            </div>
                          </div>
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => onToggleSeguranca(idx)}
                              className={`px-2 py-1 rounded text-[0.6rem] font-black tracking-widest uppercase transition-colors flex items-center gap-1 ${
                                s.infracaoSeguranca
                                  ? "bg-red-950/80 text-red-400 border border-red-800/40 pulse-anim"
                                  : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                              }`}
                            >
                              <span>🛡️</span>
                              <span>SEGURANÇA</span>
                            </button>
                          )}
                        </div>

                        {/* HIGH-PROMINENCE ELEMENT: Atividade Principal Display */}
                        <div
                          onClick={() => {
                            if (isEditable) {
                              setEditingMetric({ sid: s.id, field: "ativ" });
                              setEditMetricValue(String(s.ativ));
                            }
                          }}
                          className={`flex flex-col items-center justify-center py-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden transition-all duration-200 group/ativ ${
                            isEditable ? "cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30" : ""
                          }`}
                        >
                          <span className="text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            ATIVIDADE
                            {isEditable && (
                              <Edit3
                                size={10}
                                className="text-zinc-500 group-hover/ativ:text-indigo-400 transition-colors"
                              />
                            )}
                          </span>
                          {editingMetric?.sid === s.id && editingMetric?.field === "ativ" ? (
                            <div className="flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={editMetricValue}
                                onChange={(e) => setEditMetricValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInline();
                                  if (e.key === "Escape") setEditingMetric(null);
                                }}
                                className="w-24 text-center font-black font-mono text-xl bg-black border border-indigo-500 rounded px-1.5 py-0.5 text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveInline}
                                className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingMetric(null)}
                                className="p-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-[10px] font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]">
                              {s.ativ.toLocaleString("pt-BR")}
                            </span>
                          )}

                          {/* REPRO TOTAL ACCENT (Rendered always but editable) */}
                          <span
                            onClick={(e) => {
                              if (isEditable) {
                                e.stopPropagation();
                                setEditingMetric({ sid: s.id, field: "reproTotal" });
                                setEditMetricValue(String(s.reproTotal));
                              }
                            }}
                            className={`mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider group/repro transition-all duration-200 ${
                              isEditable ? "cursor-pointer hover:scale-105 border-indigo-500/40" : ""
                            }`}
                            style={{
                              backgroundColor: "#2B1D08",
                              color: "#F5B041",
                              border: "1px solid #7A5313",
                              borderRadius: "10px",
                              padding: "6px 12px",
                              fontWeight: 700,
                            }}
                          >
                            {editingMetric?.sid === s.id && editingMetric?.field === "reproTotal" ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editMetricValue}
                                  onChange={(e) => setEditMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInline();
                                    if (e.key === "Escape") setEditingMetric(null);
                                  }}
                                  className="w-16 text-center font-bold font-mono text-[11px] bg-black border border-amber-500 rounded px-1 py-0.5 text-amber-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveInline}
                                  className="p-0.5 bg-emerald-600 text-white rounded text-[8px] font-bold"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditingMetric(null)}
                                  className="p-0.5 bg-zinc-700 text-zinc-300 rounded text-[8px] font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                📦 {s.reproTotal} {unitText}
                                {isEditable && (
                                  <Edit3
                                    size={8}
                                    className="text-amber-500/60 group-hover/repro:text-amber-400 transition-colors ml-0.5"
                                  />
                                )}
                              </>
                            )}
                          </span>
                        </div>

                        {/* Space-Optimized 2x2 Grid for Secondary Operational Metrics */}
                        <div className="grid grid-cols-2 gap-3 mt-auto pt-1">
                          {/* PROMESSA */}
                          <div
                            onClick={() => {
                              if (isEditable) {
                                setEditingMetric({ sid: s.id, field: "promessa" });
                                setEditMetricValue(String(s.promessa));
                              }
                            }}
                            className={`bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between transition-all duration-200 group/prom ${
                              isEditable ? "cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/20" : ""
                            }`}
                          >
                            <span className="text-[0.55rem] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              Promessa
                              {isEditable && (
                                <Edit3
                                  size={8}
                                  className="text-zinc-600 group-hover/prom:text-emerald-400 transition-colors"
                                />
                              )}
                            </span>
                            {editingMetric?.sid === s.id && editingMetric?.field === "promessa" ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editMetricValue}
                                  onChange={(e) => setEditMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInline();
                                    if (e.key === "Escape") setEditingMetric(null);
                                  }}
                                  className="w-14 text-center text-xs font-mono bg-black border border-emerald-500 rounded py-0.5 text-emerald-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveInline}
                                  className="p-0.5 bg-emerald-600 text-white rounded text-[8px]"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono mt-0.5">
                                {s.promessa}%
                              </span>
                            )}
                          </div>

                          {/* UPH */}
                          <div
                            onClick={() => {
                              if (isEditable) {
                                setEditingMetric({ sid: s.id, field: "uph" });
                                setEditMetricValue(String(s.uph));
                              }
                            }}
                            className={`bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between transition-all duration-200 group/uph ${
                              isEditable ? "cursor-pointer hover:bg-sky-500/10 hover:border-sky-500/20" : ""
                            }`}
                          >
                            <span className="text-[0.55rem] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              UPH
                              {isEditable && (
                                <Edit3
                                  size={8}
                                  className="text-zinc-600 group-hover/uph:text-sky-400 transition-colors"
                                />
                              )}
                            </span>
                            {editingMetric?.sid === s.id && editingMetric?.field === "uph" ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editMetricValue}
                                  onChange={(e) => setEditMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInline();
                                    if (e.key === "Escape") setEditingMetric(null);
                                  }}
                                  className="w-14 text-center text-xs font-mono bg-black border border-sky-500 rounded py-0.5 text-sky-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveInline}
                                  className="p-0.5 bg-sky-600 text-white rounded text-[8px]"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-lg lg:text-xl font-black text-sky-400 font-mono mt-0.5">
                                {s.uph}
                              </span>
                            )}
                          </div>

                          {/* BSI */}
                          <div
                            onClick={() => {
                              if (isEditable) {
                                setEditingMetric({ sid: s.id, field: "bsi" });
                                setEditMetricValue(String(s.bsi));
                              }
                            }}
                            className={`bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between transition-all duration-200 group/bsi ${
                              isEditable ? "cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/20" : ""
                            }`}
                          >
                            <span className="text-[0.55rem] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              BSI
                              {isEditable && (
                                <Edit3
                                  size={8}
                                  className="text-zinc-600 group-hover/bsi:text-cyan-400 transition-colors"
                                />
                              )}
                            </span>
                            {editingMetric?.sid === s.id && editingMetric?.field === "bsi" ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editMetricValue}
                                  onChange={(e) => setEditMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInline();
                                    if (e.key === "Escape") setEditingMetric(null);
                                  }}
                                  className="w-14 text-center text-xs font-mono bg-black border border-cyan-500 rounded py-0.5 text-cyan-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveInline}
                                  className="p-0.5 bg-cyan-600 text-white rounded text-[8px]"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-lg lg:text-xl font-black text-cyan-400 font-mono mt-0.5">
                                {s.bsi}%
                              </span>
                            )}
                          </div>

                          {/* ERROS PICKING */}
                          <div
                            onClick={() => {
                              if (isEditable) {
                                setEditingMetric({ sid: s.id, field: "errosPicking" });
                                setEditMetricValue(String(s.errosPicking));
                              }
                            }}
                            className={`bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between transition-all duration-200 group/err ${
                              isEditable ? "cursor-pointer hover:bg-red-500/10 hover:border-red-500/20" : ""
                            }`}
                          >
                            <span className="text-[0.55rem] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              Erros Picking
                              {isEditable && (
                                <Edit3
                                  size={8}
                                  className="text-zinc-600 group-hover/err:text-red-400 transition-colors"
                                />
                              )}
                            </span>
                            {editingMetric?.sid === s.id && editingMetric?.field === "errosPicking" ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editMetricValue}
                                  onChange={(e) => setEditMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveInline();
                                    if (e.key === "Escape") setEditingMetric(null);
                                  }}
                                  className="w-14 text-center text-xs font-mono bg-black border border-red-500 rounded py-0.5 text-red-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveInline}
                                  className="p-0.5 bg-red-600 text-white rounded text-[8px]"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-lg lg:text-xl font-black text-red-400 font-mono mt-0.5">
                                {s.errosPicking}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>,
                "border-t-2 border-indigo-500"
              );

            case "copil":
              return renderWidget(
                "copil",
                "Gestão à Vista (COPIL)",
                <Shield size={14} className="text-emerald-400" />,
                `Setor S${copilActiveSector} Ativo`,
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/5">
                    <span className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">
                      Setor Ativo:
                    </span>
                    <select
                      value={copilActiveSector}
                      onChange={(e) => setCopilActiveSector(e.target.value)}
                      className="bg-zinc-900 border border-white/10 rounded px-2.5 py-1 text-white text-[0.65rem] font-black cursor-pointer focus:outline-none"
                    >
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          Setor {s.id} — {s.resp.split(" ")[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar max-h-[250px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                        <tr className="text-[0.55rem] uppercase tracking-wider text-gray-400 border-b border-white/10">
                          <th className="p-2 font-bold">KPI</th>
                          <th className="p-2 font-bold text-center">Meta</th>
                          <th className="p-2 font-bold text-center">Real</th>
                          <th className="p-2 font-bold text-center">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-white/5 font-mono">
                        {Object.entries(copilData[copilActiveSector] || {}).flatMap(
                          ([groupName, kpis]) => {
                            return (kpis as any[]).map((kpi: any, idx: number) => {
                              const comp = parseFloat(kpi.comp);
                              const real = parseFloat(kpi.real);
                              let nota = "—";
                              if (!isNaN(comp) && !isNaN(real) && comp > 0) {
                                nota = (kpi.inverso ? comp / real : real / comp).toFixed(2);
                              }
                              const nVal = parseFloat(nota);
                              const cls =
                                nota === "—"
                                  ? "copil-note-unknown"
                                  : nVal >= 1.0
                                  ? "copil-note-A"
                                  : nVal >= 0.8
                                  ? "copil-note-B"
                                  : nVal >= 0.6
                                  ? "copil-note-C"
                                  : "copil-note-D";

                              return (
                                <tr
                                  key={`${groupName}-${idx}`}
                                  className="hover:bg-white/[0.02]"
                                >
                                  <td className="p-2 text-zinc-300 text-[0.65rem] font-sans flex items-center gap-1.5">
                                    {kpi.kpi}
                                    {kpi.auto && (
                                      <span className="text-[8px] bg-sky-500/15 text-sky-400 px-1 py-0.2 rounded font-sans font-bold">
                                        AUTO
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center text-zinc-500">
                                    {kpi.comp}
                                  </td>
                                  <td className="p-2 text-center text-white font-bold">
                                    {kpi.real}
                                  </td>
                                  <td className={`p-2 text-center font-bold ${cls}`}>
                                    {nota}
                                  </td>
                                </tr>
                              );
                            });
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>,
                "border-t-4 border-emerald-500"
              );

            case "radar":
              return renderWidget(
                "radar",
                "Expedição: Radar de Lojas",
                <Radio size={14} className="text-pink-400" />,
                `${radar.length} Lojas Expedindo`,
                <div className="w-full">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-black">
                      Cortes de Entrega
                    </p>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={handleRadarEditToggle}
                        className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        {radarEdit ? "Salvar" : "Editar Lojas"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {radarEdit ? (
                      <>
                        {localRadar.map((l, i) => (
                          <div
                            key={i}
                            className="border border-white/10 bg-black/40 rounded-xl p-3 space-y-2"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={l.corte}
                                onChange={(e) => {
                                  const copy = [...localRadar];
                                  copy[i].corte = e.target.value;
                                  setLocalRadar(copy);
                                }}
                                className="inp py-1 text-xs"
                                placeholder="Corte"
                              />
                              <input
                                type="number"
                                value={l.prog}
                                onChange={(e) => {
                                  const copy = [...localRadar];
                                  copy[i].prog = parseInt(e.target.value) || 0;
                                  setLocalRadar(copy);
                                }}
                                className="inp py-1 text-xs"
                                placeholder="Prog%"
                              />
                            </div>
                            <input
                              value={l.loja}
                              onChange={(e) => {
                                    const copy = [...localRadar];
                                    copy[i].loja = e.target.value;
                                    setLocalRadar(copy);
                              }}
                              className="inp py-1 text-xs"
                              placeholder="Loja"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={l.vol}
                                onChange={(e) => {
                                  const copy = [...localRadar];
                                  copy[i].vol = parseInt(e.target.value) || 0;
                                  setLocalRadar(copy);
                                }}
                                className="inp py-1 text-xs"
                                placeholder="Vol"
                              />
                              <input
                                type="number"
                                value={l.ativ}
                                onChange={(e) => {
                                  const copy = [...localRadar];
                                  copy[i].ativ = parseInt(e.target.value) || 0;
                                  setLocalRadar(copy);
                                }}
                                className="inp py-1 text-xs"
                                placeholder="Ativ"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLocalRadar(
                                  localRadar.filter((_, idx) => idx !== i)
                                );
                              }}
                              className="w-full bg-red-500/10 text-red-400 text-xs py-1 rounded hover:bg-red-500/20"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setLocalRadar([
                              ...localRadar,
                              {
                                corte: "00:00",
                                loja: "Nova Loja",
                                vol: 0,
                                ativ: 0,
                                prog: 0,
                              },
                            ])
                          }
                          className="w-full border border-dashed border-white/10 rounded-xl py-3 text-zinc-500 hover:text-white hover:border-white/20 text-xs font-bold transition"
                        >
                          + Adicionar Loja
                        </button>
                      </>
                    ) : (
                      radar.map((l, i) => {
                        const barColor =
                          l.prog >= 80
                            ? "bg-emerald-500"
                            : l.prog >= 50
                            ? "bg-amber-500"
                            : "bg-red-500";
                        const textColor =
                          l.prog >= 80
                            ? "text-emerald-400"
                            : l.prog >= 50
                            ? "text-amber-400"
                            : "text-red-400";

                        return (
                          <div
                            key={i}
                            className="border border-white/5 bg-black/30 rounded-xl p-3 flex flex-col gap-2"
                          >
                            <div className="flex justify-between">
                              <span className="text-[0.55rem] text-pink-400 font-bold uppercase">
                                Corte {l.corte}
                              </span>
                              <span className={`text-[0.6rem] font-black ${textColor}`}>
                                {l.prog}%
                              </span>
                            </div>
                            <p className="text-xs font-bold text-white truncate">
                              {l.loja}
                            </p>
                            <div className="flex gap-3 text-[0.55rem] text-zinc-500 font-mono">
                              <span>
                                Vol:{" "}
                                <b className="text-white">
                                  {l.vol.toLocaleString("pt-BR")}
                                </b>
                              </span>
                              <span>
                                Ativ:{" "}
                                <b className="text-sky-400">
                                  {l.ativ.toLocaleString("pt-BR")}
                                </b>
                              </span>
                            </div>
                            <div className="prog-track">
                              <div
                                className={`prog-fill ${barColor}`}
                                style={{ width: `${Math.min(100, l.prog)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>,
                "border-l-2 border-pink-500/50 bg-pink-950/5"
              );

            case "bolsao":
              return renderWidget(
                "bolsao",
                "Estratégia de Coleta (Bolsão D+1)",
                <Layers size={14} className="text-amber-400" />,
                `Hoje: ${bolsaoData.hojeFeito}/${bolsaoData.hojeMeta}`,
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-black">
                      Meta Coletas Diárias
                    </p>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={handleBolsaoEditToggle}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        {bolsaoEdit ? "Salvar" : "Editar Plano"}
                      </button>
                    )}
                  </div>
                  {bolsaoEdit ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[0.6rem] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                          Hoje Meta
                        </label>
                        <input
                          type="number"
                          value={localBolsao.hojeMeta}
                          onChange={(e) =>
                            setLocalBolsao({
                              ...localBolsao,
                              hojeMeta: parseInt(e.target.value) || 0,
                            })
                          }
                          className="inp py-2 font-mono text-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[0.6rem] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                          Hoje Feito
                        </label>
                        <input
                          type="number"
                          value={localBolsao.hojeFeito}
                          onChange={(e) =>
                            setLocalBolsao({
                              ...localBolsao,
                              hojeFeito: parseInt(e.target.value) || 0,
                            })
                          }
                          className="inp py-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[0.6rem] font-bold text-sky-400 uppercase tracking-widest block mb-1">
                          Amanhã Meta
                        </label>
                        <input
                          type="number"
                          value={localBolsao.amanhaMeta}
                          onChange={(e) =>
                            setLocalBolsao({
                              ...localBolsao,
                              amanhaMeta: parseInt(e.target.value) || 0,
                            })
                          }
                          className="inp py-2 font-mono text-sky-400"
                        />
                      </div>
                      <div>
                        <label className="text-[0.6rem] font-bold text-sky-400 uppercase tracking-widest block mb-1">
                          Amanhã Feito
                        </label>
                        <input
                          type="number"
                          value={localBolsao.amanhaFeito}
                          onChange={(e) =>
                            setLocalBolsao({
                              ...localBolsao,
                              amanhaFeito: parseInt(e.target.value) || 0,
                            })
                          }
                          className="inp py-2 font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-amber-400 font-bold">Hoje Coleta</span>
                          <span className="text-zinc-500">
                            {bolsaoData.hojeFeito.toLocaleString("pt-BR")} /{" "}
                            {bolsaoData.hojeMeta.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="prog-track">
                          <div
                            className="prog-fill bg-amber-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (bolsaoData.hojeFeito /
                                  (bolsaoData.hojeMeta || 1)) *
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-sky-400 font-bold">
                            Amanhã (D+1)
                          </span>
                          <span className="text-zinc-500">
                            {bolsaoData.amanhaFeito.toLocaleString("pt-BR")} /{" "}
                            {bolsaoData.amanhaMeta.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="prog-track">
                          <div
                            className="prog-fill bg-sky-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (bolsaoData.amanhaFeito /
                                  (bolsaoData.amanhaMeta || 1)) *
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>,
                "border-l-2 border-amber-500/50 bg-amber-950/5"
              );

            case "reapro":
              return renderWidget(
                "reapro",
                "Painel Operacional REAPRO",
                <RefreshCw size={14} className="text-sky-400" />,
                `Término: ${reaproData.terminoPrevisao}`,
                <div className="w-full">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-black">
                      Separação de Peças de Reabastecimento
                    </p>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={handleReaproEditToggle}
                        className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        {reaproEdit ? "Salvar" : "Editar Reapro"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/30 p-4 rounded-xl border border-sky-500/10 col-span-1 md:col-span-2">
                        <p className="text-[0.6rem] text-zinc-500 uppercase font-black mb-3">
                          Setores REAPRO
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {setores.map((s) => {
                            const sectorData =
                              (reaproEdit ? localReapro : reaproData).setores[
                                s.id
                              ] || { feitoDAll: 0, feitoElog: 0 };
                            return (
                              <div
                                key={s.id}
                                className="bg-black/40 p-3 rounded-lg border border-white/5"
                              >
                                <p className="text-xs font-black text-sky-400">
                                  S{s.id}
                                </p>
                                {reaproEdit ? (
                                  <div className="space-y-1 mt-2">
                                    <input
                                      type="number"
                                      value={sectorData.feitoDAll}
                                      onChange={(e) => {
                                        const copy = { ...localReapro };
                                        copy.setores[s.id] = {
                                          ...sectorData,
                                          feitoDAll:
                                            parseInt(e.target.value) || 0,
                                        };
                                        setLocalReapro(copy);
                                      }}
                                      className="inp py-1 text-[10px] font-mono"
                                      placeholder="D-ALL"
                                    />
                                    <input
                                      type="number"
                                      value={sectorData.feitoElog}
                                      onChange={(e) => {
                                        const copy = { ...localReapro };
                                        copy.setores[s.id] = {
                                          ...sectorData,
                                          feitoElog:
                                            parseInt(e.target.value) || 0,
                                        };
                                        setLocalReapro(copy);
                                      }}
                                      className="inp py-1 text-[10px] font-mono"
                                      placeholder="Elog"
                                    />
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">
                                        D-ALL:
                                      </span>
                                      <b className="text-white">
                                        {sectorData.feitoDAll}
                                      </b>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                      <span className="text-zinc-500">
                                        ELOG:
                                      </span>
                                      <b className="text-emerald-400">
                                        {sectorData.feitoElog}
                                      </b>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 col-span-1 md:col-span-2">
                        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold">
                            Preso D-ALL
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.indicadores.totalPresoDAll}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.indicadores.totalPresoDAll =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs mt-1"
                            />
                          ) : (
                            <p className="text-lg font-black text-amber-400 font-mono mt-1">
                              {reaproData.indicadores.totalPresoDAll}
                            </p>
                          )}
                        </div>
                        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold">
                            Em Curso Col.
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.indicadores.emCursoColetado}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.indicadores.emCursoColetado =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs mt-1"
                            />
                          ) : (
                            <p className="text-lg font-black text-white font-mono mt-1">
                              {reaproData.indicadores.emCursoColetado.toLocaleString(
                                "pt-BR"
                              )}
                            </p>
                          )}
                        </div>
                        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold">
                            Em Máquina
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.indicadores.totalEmMaquina}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.indicadores.totalEmMaquina =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs mt-1"
                            />
                          ) : (
                            <p className="text-lg font-black text-sky-400 font-mono mt-1">
                              {reaproData.indicadores.totalEmMaquina.toLocaleString(
                                "pt-BR"
                              )}
                            </p>
                          )}
                        </div>
                        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold">
                            Disponib.
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.indicadores.disponibilidade}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.indicadores.disponibilidade =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs mt-1"
                            />
                          ) : (
                            <p className="text-lg font-black text-emerald-400 font-mono mt-1">
                              {reaproData.indicadores.disponibilidade}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-3">
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                        <p className="text-[0.55rem] text-zinc-500 uppercase font-bold mb-1">
                          Término Previsto
                        </p>
                        {reaproEdit ? (
                          <input
                            type="text"
                            value={localReapro.terminoPrevisao}
                            onChange={(e) =>
                              setLocalReapro({
                                ...localReapro,
                                terminoPrevisao: e.target.value,
                              })
                            }
                            className="inp py-1 text-xs font-mono"
                          />
                        ) : (
                          <p className="text-2xl font-black text-emerald-400 font-mono">
                            {reaproData.terminoPrevisao}
                          </p>
                        )}
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                        <p className="text-[0.55rem] text-zinc-500 uppercase font-bold mb-1">
                          Cap. Fechamento Est.
                        </p>
                        {reaproEdit ? (
                          <input
                            type="number"
                            value={localReapro.capacidadeFechamentoEst}
                            onChange={(e) =>
                              setLocalReapro({
                                ...localReapro,
                                capacidadeFechamentoEst:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="inp py-1 text-xs font-mono"
                          />
                        ) : (
                          <p className="text-xl font-black text-indigo-400 font-mono">
                            {reaproData.capacidadeFechamentoEst}
                          </p>
                        )}
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold mb-1">
                            Artigos
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.listasFechadas.artigos}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.listasFechadas.artigos =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs font-mono"
                            />
                          ) : (
                            <p className="text-lg font-black text-white font-mono">
                              {reaproData.listasFechadas.artigos}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[0.55rem] text-zinc-500 uppercase font-bold mb-1">
                            Colis
                          </p>
                          {reaproEdit ? (
                            <input
                              type="number"
                              value={localReapro.listasFechadas.colis}
                              onChange={(e) => {
                                const copy = { ...localReapro };
                                copy.listasFechadas.colis =
                                  parseInt(e.target.value) || 0;
                                setLocalReapro(copy);
                              }}
                              className="inp py-1 text-xs font-mono"
                            />
                          ) : (
                            <p className="text-lg font-black text-white font-mono">
                              {reaproData.listasFechadas.colis}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>,
                "border-l-2 border-sky-500/50 bg-sky-950/5"
              );

            case "trend":
              return renderWidget(
                "trend",
                "Tendência de Atividade Diária",
                <BarChart2 size={14} className="text-gray-400" />,
                "Gráfico Histórico consolidado",
                <div className="h-[250px] w-full">
                  <TrendLineChart data={historico} />
                </div>
              );

            case "terminal":
              return renderWidget(
                "terminal",
                "AI COPIL LOGISTICS TERMINAL",
                <Terminal size={14} className="text-emerald-400" />,
                "Terminal Online",
                <div className="flex flex-col h-[280px] w-full">
                  <div className="flex-1 p-3 font-mono text-[10px] text-zinc-300 overflow-y-auto space-y-1.5 custom-scrollbar bg-black/40 rounded-lg border border-white/5">
                    <div>
                      <span className="text-emerald-400 font-bold">
                        root@volumosos:~$
                      </span>{" "}
                      AI COPIL V17.5 ONLINE.
                    </div>
                    <div className="text-zinc-500">
                      Sintaxe permitida:{" "}
                      <span className="text-emerald-400">
                        "S[Setor] [parâmetro] para [Valor]"
                      </span>
                    </div>
                    <div className="text-zinc-500">
                      Parâmetros:{" "}
                      <span className="text-sky-400">produtividade</span>,{" "}
                      <span className="text-sky-400">promessa</span>,{" "}
                      <span className="text-sky-400">5s</span>,{" "}
                      <span className="text-sky-400">bsi</span>,{" "}
                      <span className="text-sky-400">ativ</span>,{" "}
                      <span className="text-sky-400">repro</span>
                    </div>
                    {terminalLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed">
                        {log.startsWith("> ") ? (
                          <>
                            <span className="text-emerald-400 font-bold">$ </span>
                            {log.slice(2)}
                          </>
                        ) : (
                          <span
                            className={
                              log.includes("Erro") || log.includes("Incorreto")
                                ? "text-red-400"
                                : "text-emerald-300"
                            }
                          >
                            {log}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleTerminalSubmit}
                    className="mt-2.5 p-2.5 bg-black/50 border border-white/5 rounded-lg flex items-center gap-2"
                  >
                    <Cpu size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-mono text-xs font-bold mr-1">
                      &gt;_
                    </span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      disabled={!isEditable}
                      className="bg-transparent border-none text-emerald-100 font-mono text-xs w-full focus:outline-none placeholder-zinc-700 disabled:opacity-40"
                      placeholder={
                        isEditable
                          ? "Ex: S87 promessa para 99.8"
                          : "Login necessário para usar o terminal"
                      }
                    />
                    {!isEditable && (
                      <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">
                        Bloqueado
                      </span>
                    )}
                  </form>
                </div>,
                "border border-emerald-500/30 neon-border-green"
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
