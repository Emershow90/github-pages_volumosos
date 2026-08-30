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
  Activity
} from "lucide-react";

interface NavigationPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  pendingUsersCount: number;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  pendingUsersCount,
}) => {
  return (
    <nav className="bg-[#07070a] border-b border-white/5 px-3 md:px-5 py-2.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 relative z-40 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
      {/* MONITORAMENTO (3 Cols on XL) */}
      <div className="xl:col-span-3 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between px-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-indigo-400 tracking-wider">
            <Activity size={12} className="text-indigo-400" />
            <span>Monitoramento</span>
          </div>
          <OnlineIndicator />
        </div>
        <div className="grid grid-cols-3 gap-1">
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

      {/* LOGÍSTICA (5 Cols on XL - Plenty of breathing room and clear icons) */}
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
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "capacidade" ? "active border-cyan-500/50 text-cyan-300" : "hover:border-cyan-500/30"}`}
            title="Escala de Capacidade & Colaboradores"
          >
            <CalendarDays size={12} className="text-cyan-400" />
            <span className="truncate font-semibold">Escala</span>
          </button>
          <button
            id="nav-tab-produtividade"
            onClick={() => setActiveTab("produtividade")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "produtividade" ? "active border-emerald-500/50 text-emerald-300" : "hover:border-emerald-500/30"}`}
            title="Cálculo e Metas de Produtividade UPH"
          >
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="truncate font-semibold">Produtiv.</span>
          </button>
          <button
            id="nav-tab-apresentacao"
            onClick={() => setActiveTab("apresentacao")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "apresentacao" ? "active border-indigo-500/50 text-indigo-300" : "hover:border-indigo-500/30"}`}
            title="Console Operacional TV & Telão"
          >
            <Tv size={12} className="text-indigo-400" />
            <span className="truncate font-semibold">Console TV</span>
          </button>
          <button
            id="nav-tab-override"
            onClick={() => setActiveTab("override")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "override" ? "active border-amber-500/50 text-amber-300" : "hover:border-amber-500/30"}`}
            title="Override Operacional & Calibração"
          >
            <Zap size={12} className="text-amber-400 fill-amber-400/20" />
            <span className="truncate font-bold text-amber-300">Override</span>
          </button>
          <button
            id="nav-tab-copil"
            onClick={() => setActiveTab("copil")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "copil" ? "active border-purple-500/50 text-purple-300" : "hover:border-purple-500/30"}`}
            title="Matriz de Pilotagem COPIL"
          >
            <Sparkles size={12} className="text-purple-400" />
            <span className="truncate font-semibold">COPIL</span>
          </button>
          <button
            id="nav-tab-radar-live"
            onClick={() => setActiveTab("radar_lojas_live")}
            className={`nav-btn py-1.5 px-1 text-[10px] ${activeTab === "radar_lojas_live" ? "active border-rose-500/50 text-rose-300 bg-rose-950/30" : "hover:border-rose-500/30"}`}
            title="Radar de Lojas Live (Sincronizado em Tempo Real)"
          >
            <Radio size={12} className="text-rose-400 animate-pulse" />
            <span className="truncate font-bold text-rose-300">Radar Live</span>
          </button>
        </div>
      </div>

      {/* GESTÃO (3 Cols on XL) */}
      <div className="xl:col-span-2 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider">
          <Users size={12} className="text-amber-400" />
          <span>Gestão</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
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
          <button
            id="nav-tab-historico"
            onClick={() => setActiveTab("historico")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "historico" ? "active" : ""}`}
            title="Histórico de Consolidados"
          >
            <History size={12} className="text-amber-400 shrink-0" />
            <span className="truncate">Logs</span>
          </button>
          <button
            id="nav-tab-alerts"
            onClick={() => setActiveTab("alerts")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "alerts" ? "active" : ""}`}
            title="Central de Alertas Operacionais"
          >
            <Bell size={12} className="text-amber-400 shrink-0" />
            <span className="truncate">Alertas</span>
          </button>
        </div>
      </div>

      {/* SISTEMA (2 Cols on XL) */}
      <div className="xl:col-span-2 border border-white/5 bg-[#0b0b10] rounded-xl p-2 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-mono font-black uppercase text-purple-400 tracking-wider">
          <Settings size={12} className="text-purple-400" />
          <span>Sistema</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
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
            id="nav-tab-relatorios"
            onClick={() => setActiveTab("relatorios")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "relatorios" ? "active" : ""}`}
            title="Relatórios & Handovers"
          >
            <FileText size={12} className="text-purple-400 shrink-0" />
            <span className="truncate">Relatos</span>
          </button>
          <button
            id="nav-tab-config"
            onClick={() => setActiveTab("config")}
            className={`nav-btn py-1.5 px-0.5 text-[9.5px] ${activeTab === "config" ? "active" : ""}`}
            title="Ajustes do Sistema"
          >
            <Settings size={12} className="text-purple-400 shrink-0" />
            <span className="truncate">Ajustes</span>
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
