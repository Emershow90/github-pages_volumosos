import React from "react";
import { UserRole } from "../types";
import { OnlineIndicator } from "./OnlineIndicator";
import {
  Layers,
  Shield,
  BarChart3,
  TrendingUp,
  Tv,
  Zap,
  Sparkles,
  Radio,
  Users,
  Bell,
  FileText,
  Link2,
  Truck,
  History,
  Settings,
  ShieldAlert,
  CalendarDays,
  Activity,
  Flame,
  Wrench,
  Award,
  Barcode
} from "lucide-react";

interface NavigationPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  pendingUsersCount: number;
  onOpenInsight?: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  pendingUsersCount,
  onOpenInsight,
}) => {
  return (
    <nav className="bg-[#07070a] border-b border-white/5 px-3 md:px-5 py-2.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 relative z-40 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
      {/* MONITORAMENTO (3 Cols on XL) */}
      <div className="xl:col-span-3 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between px-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-indigo-400 tracking-wider">
            <Activity size={12} className="text-indigo-400" />
            <span>Torre de Comando</span>
          </div>
          <OnlineIndicator />
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "dashboard" ? "active" : ""}`}
            title="Dashboard Principal do CD"
          >
            <Layers size={12} className="text-indigo-400" />
            <span className="truncate">Painel</span>
          </button>
          <button
            id="nav-tab-gargalos"
            onClick={() => setActiveTab("gargalos")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "gargalos" ? "active border-rose-500/50 text-rose-300 bg-rose-950/30" : "hover:border-rose-500/30 text-rose-400"}`}
            title="Matriz de Gargalos & Diagnóstico de Causa Raiz"
          >
            <Flame size={12} className="text-rose-400" />
            <span className="truncate font-bold">Gargalos</span>
          </button>
          <button
            id="nav-tab-executivo"
            onClick={() => setActiveTab("executivo")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "executivo" ? "active" : ""}`}
            title="Visão Executiva & Diretoria"
          >
            <Shield size={12} className="text-indigo-400" />
            <span className="truncate">Executivo</span>
          </button>
          <button
            id="nav-tab-analytics"
            onClick={() => setActiveTab("analytics")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "analytics" ? "active" : ""}`}
            title="Analytics, SLAs e Histórico"
          >
            <BarChart3 size={12} className="text-indigo-400" />
            <span className="truncate">SLAs</span>
          </button>
        </div>
      </div>

      {/* LOGÍSTICA & OPERAÇÃO (5 Cols on XL) */}
      <div className="xl:col-span-5 border border-cyan-500/20 bg-[#070d14] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between px-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-cyan-400 tracking-wider">
            <Truck size={13} className="text-cyan-400 animate-pulse" />
            <span>Logística &amp; Operação</span>
          </div>
          <span className="text-[8.5px] font-mono text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-bold">
            6 Módulos
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          <button
            id="nav-tab-capacidade"
            onClick={() => setActiveTab("capacidade")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "capacidade" ? "active border-cyan-500/50 text-cyan-300" : "hover:border-cyan-500/30"}`}
            title="Escala de Capacidade & Colaboradores"
          >
            <CalendarDays size={12} className="text-cyan-400" />
            <span className="truncate font-semibold">Escala</span>
          </button>
          <button
            id="nav-tab-produtividade"
            onClick={() => setActiveTab("produtividade")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "produtividade" ? "active border-emerald-500/50 text-emerald-300" : "hover:border-emerald-500/30"}`}
            title="Cálculo e Metas de Produtividade UPH"
          >
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="truncate font-semibold">Produtiv.</span>
          </button>
          <button
            id="nav-tab-radar-live"
            onClick={() => setActiveTab("radar_lojas_live")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "radar_lojas_live" ? "active border-rose-500/50 text-rose-300 bg-rose-950/30" : "hover:border-rose-500/30"}`}
            title="Radar de Lojas Live (Sincronizado em Tempo Real)"
          >
            <Radio size={12} className="text-rose-400 animate-pulse" />
            <span className="truncate font-bold text-rose-300">Radar</span>
          </button>
          <button
            id="nav-tab-override"
            onClick={() => setActiveTab("override")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "override" ? "active border-amber-500/50 text-amber-300" : "hover:border-amber-500/30"}`}
            title="Override Operacional & Calibração"
          >
            <Zap size={12} className="text-amber-400 fill-amber-400/20" />
            <span className="truncate font-bold text-amber-300">Override</span>
          </button>
          <button
            id="nav-tab-copil"
            onClick={() => setActiveTab("copil")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "copil" ? "active border-purple-500/50 text-purple-300" : "hover:border-purple-500/30"}`}
            title="Matriz de Pilotagem COPIL"
          >
            <Sparkles size={12} className="text-purple-400" />
            <span className="truncate font-semibold">COPIL</span>
          </button>
          <button
            id="nav-tab-apresentacao"
            onClick={() => setActiveTab("apresentacao")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "apresentacao" ? "active border-indigo-500/50 text-indigo-300" : "hover:border-indigo-500/30"}`}
            title="Console Operacional TV & Telão"
          >
            <Tv size={12} className="text-indigo-400" />
            <span className="truncate font-semibold">Console TV</span>
          </button>
        </div>
      </div>

      {/* GESTÃO & RESULTADOS (2.5 Cols on XL) */}
      <div className="xl:col-span-2 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider">
          <Users size={12} className="text-amber-400" />
          <span>Gestão &amp; Ação</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            id="nav-tab-plano-acao"
            onClick={() => setActiveTab("plano_acao")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "plano_acao" ? "active border-amber-500/50 text-amber-300 bg-amber-950/30" : "hover:border-amber-500/30 text-amber-400"}`}
            title="Planos de Ação 5W2H"
          >
            <Wrench size={12} className="text-amber-400 shrink-0" />
            <span className="truncate font-bold">5W2H</span>
          </button>
          <button
            id="nav-tab-cases"
            onClick={() => setActiveTab("cases")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "cases" ? "active border-purple-500/50 text-purple-300 bg-purple-950/30" : "hover:border-purple-500/30 text-purple-400"}`}
            title="Central de Resultados & Portfólio de Melhorias"
          >
            <Award size={12} className="text-purple-400 shrink-0" />
            <span className="truncate font-bold">Cases</span>
          </button>
          <button
            id="nav-tab-equipa"
            onClick={() => setActiveTab("equipa")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "equipa" ? "active" : ""}`}
            title="Equipe & Volumosos"
          >
            <Users size={12} className="text-amber-400 shrink-0" />
            <span className="truncate">Equipe</span>
          </button>
          <button
            id="nav-tab-consolidacao"
            onClick={() => setActiveTab("consolidacao")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "consolidacao" ? "active border-amber-500/50 text-amber-300" : ""}`}
            title="Consolidação Diária e Exportação"
          >
            <CalendarDays size={12} className="text-amber-400 shrink-0" />
            <span className="truncate font-semibold">Consolid.</span>
          </button>
        </div>
      </div>

      {/* SISTEMA & IA (1.5 Cols on XL) */}
      <div className="xl:col-span-2 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between px-1.5 py-0.5 text-[10px] font-mono font-black uppercase text-purple-400 tracking-wider">
          <div className="flex items-center gap-1.5">
            <Settings size={12} className="text-purple-400" />
            <span>Sistema</span>
          </div>
          {onOpenInsight && (
            <button
              onClick={onOpenInsight}
              className="text-[9px] font-bold text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 transition-all"
            >
              <Sparkles size={10} />
              <span>INSIGHT</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            id="nav-tab-historico"
            onClick={() => setActiveTab("historico")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "historico" ? "active" : ""}`}
            title="Histórico de Consolidados"
          >
            <History size={12} className="text-purple-400 shrink-0" />
            <span className="truncate">Logs</span>
          </button>
          <button
            id="nav-tab-alerts"
            onClick={() => setActiveTab("alerts")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "alerts" ? "active" : ""}`}
            title="Central de Alertas Operacionais"
          >
            <Bell size={12} className="text-purple-400 shrink-0" />
            <span className="truncate">Alertas</span>
          </button>
          <button
            id="nav-tab-audit"
            onClick={() => setActiveTab("audit")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "audit" ? "active" : ""}`}
            title="Auditoria & Aprovações"
          >
            <ShieldAlert size={12} className="text-purple-400 shrink-0" />
            <span className="truncate">Auditoria</span>
            {currentRole === UserRole.Admin && pendingUsersCount > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[8px] font-black px-1 rounded-full animate-bounce">
                {pendingUsersCount}
              </span>
            )}
          </button>
          <button
            id="nav-tab-conexoes"
            onClick={() => setActiveTab("conexoes")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "conexoes" ? "active border-purple-500/50 text-purple-300" : ""}`}
            title="Conexões & Integrações Externas"
          >
            <Link2 size={12} className="text-purple-400 shrink-0" />
            <span className="truncate font-bold text-purple-300">Conexões</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
