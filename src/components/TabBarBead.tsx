import React from "react";
import { motion } from "framer-motion";
import { useUIStore } from "../stores/useUIStore";
import { Radio, Sparkles, History, ShieldAlert } from "lucide-react";
import "./torre-theme.css";

/**
 * TabBarBead
 * ----------
 * Barra de navegação flutuante estilo "Bead/Dock" que permite alternância
 * ultrarrápida entre os 4 módulos operacionais principais da Torre:
 *  1. Radar de Lojas Live (radar_lojas_live)
 *  2. Matriz COPIL (copil)
 *  3. Histórico de Turnos / Logs (historico)
 *  4. Auditoria & Segurança (audit)
 */

interface ModuleTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}

const MODULE_TABS: ModuleTab[] = [
  {
    id: "radar_lojas_live",
    label: "Radar de Lojas Live",
    shortLabel: "Radar",
    icon: Radio,
    color: "text-rose-400/80",
    activeColor: "text-rose-400",
  },
  {
    id: "copil",
    label: "Matriz COPIL",
    shortLabel: "COPIL",
    icon: Sparkles,
    color: "text-purple-400/80",
    activeColor: "text-purple-400",
  },
  {
    id: "historico",
    label: "Histórico de Turnos",
    shortLabel: "Histórico",
    icon: History,
    color: "text-cyan-400/80",
    activeColor: "text-cyan-400",
  },
  {
    id: "audit",
    label: "Auditoria & Logs",
    shortLabel: "Auditoria",
    icon: ShieldAlert,
    color: "text-amber-400/80",
    activeColor: "text-amber-400",
  },
];

export const TabBarBead: React.FC = () => {
  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);

  const isModuleActive = MODULE_TABS.some((tab) => tab.id === activeTab);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        {MODULE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tab-bead-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={tab.label}
            >
              {/* Bead ativo animado com Framer Motion */}
              {isActive && (
                <motion.div
                  layoutId="active-bead-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 via-indigo-500/20 to-white/10 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <Icon
                size={14}
                className={`relative z-10 transition-colors ${
                  isActive ? tab.activeColor : tab.color
                } ${tab.id === "radar_lojas_live" && isActive ? "animate-pulse" : ""}`}
              />
              <span className="relative z-10 font-mono text-[11px] tracking-wide">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
