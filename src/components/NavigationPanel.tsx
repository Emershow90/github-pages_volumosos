import React from "react";
import { UserRole } from "../types";
import { OnlineIndicator } from "./OnlineIndicator";
import {
  Layers,
  Shield,
  BarChart,
  Activity,
  ClipboardList,
  Zap,
  UserCheck,
  Radio,
  User,
  Bell,
  FileText,
  Link2,
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
    <nav className="bg-[#08080a] border-b border-white/5 px-4 md:px-6 py-2.5 grid grid-cols-1 md:grid-cols-4 gap-3 relative z-40 shadow-[0_4px_15px_rgba(0,0,0,0.6)]">
      {/* MONITORAMENTO */}
      <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between px-2 py-0.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-black uppercase text-indigo-400 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Monitoramento
          </div>
          <OnlineIndicator />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "dashboard" ? "active" : ""}`}
            title="Dashboard Principal"
          >
            <Layers size={11} />
            <span className="truncate">Painel</span>
          </button>
          <button
            onClick={() => setActiveTab("executivo")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "executivo" ? "active" : ""}`}
            title="Vista Executiva"
          >
            <Shield size={11} />
            <span className="truncate">Executivo</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "analytics" ? "active" : ""}`}
            title="Analytics &amp; SLAs"
          >
            <BarChart size={11} />
            <span className="truncate">SLA</span>
          </button>
        </div>
      </div>

      {/* LOGÍSTICA */}
      <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-cyan-400 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
          Logística
        </div>
        <div className="grid grid-cols-6 gap-1">
          <button
            onClick={() => setActiveTab("capacidade")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "capacidade" ? "active" : ""}`}
            title="Escala Capacidade"
          >
            <Layers size={10} />
            <span className="truncate">Escala</span>
          </button>
          <button
            onClick={() => setActiveTab("produtividade")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "produtividade" ? "active" : ""}`}
            title="Cálculo Produtividade"
          >
            <Activity size={10} />
            <span className="truncate">Prod</span>
          </button>
          <button
            onClick={() => setActiveTab("apresentacao")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "apresentacao" ? "active" : ""}`}
            title="Console Operacional"
          >
            <ClipboardList size={10} />
            <span className="truncate">Console Op.</span>
          </button>
          <button
            onClick={() => setActiveTab("override")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "override" ? "active" : ""}`}
            title="Override Operacional"
          >
            <Zap size={10} className="text-amber-400" />
            <span className="truncate font-bold text-amber-300">Override</span>
          </button>
          <button
            onClick={() => setActiveTab("copil")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "copil" ? "active" : ""}`}
            title="Matriz COPIL"
          >
            <UserCheck size={10} />
            <span className="truncate">COPIL</span>
          </button>
          <button
            onClick={() => setActiveTab("radar_lojas_live")}
            className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "radar_lojas_live" ? "active" : ""}`}
            title="Radar de Lojas Live (Sincronizado)"
          >
            <Radio size={10} className="text-rose-400 animate-pulse" />
            <span className="truncate font-bold text-rose-300">Radar Live</span>
          </button>
        </div>
      </div>

      {/* GESTÃO */}
      <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-amber-500 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Gestão
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab("equipa")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "equipa" ? "active" : ""}`}
            title="Equipe / Volumosos"
          >
            <User size={11} />
            <span className="truncate">Equipe</span>
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "historico" ? "active" : ""}`}
            title="Histórico Consolidados"
          >
            <Layers size={11} />
            <span className="truncate">Logs</span>
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "alerts" ? "active" : ""}`}
            title="Central de Alertas"
          >
            <Bell size={11} />
            <span className="truncate">Alertas</span>
          </button>
        </div>
      </div>

      {/* SISTEMA */}
      <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-purple-400 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Sistema
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab("audit")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "audit" ? "active" : ""}`}
            title="Auditoria &amp; Aprovações"
          >
            <Shield size={11} />
            <span className="truncate flex items-center justify-between w-full">
              <span>Auditoria</span>
              {currentRole === UserRole.Admin && pendingUsersCount > 0 && (
                <span className="bg-amber-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce ml-1">
                  {pendingUsersCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("relatorios")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "relatorios" ? "active" : ""}`}
            title="Relatórios &amp; Handovers"
          >
            <FileText size={11} />
            <span className="truncate">Relatos</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "config" ? "active" : ""}`}
            title="Ajustes OS"
          >
            <Layers size={11} />
            <span className="truncate">Ajustes</span>
          </button>
          <button
            onClick={() => setActiveTab("conexoes")}
            className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "conexoes" ? "active" : ""}`}
            title="Conexões & Integrações Externa"
          >
            <Link2 size={11} className="text-purple-400" />
            <span className="truncate font-bold text-purple-300">Conexões</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
