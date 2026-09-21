import React from "react";
import { Terminal as TerminalIcon } from "lucide-react";

interface TerminalDrawerProps {
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  terminalLogs: string[];
  terminalInput: string;
  setTerminalInput: (val: string) => void;
  handleTerminalSubmit: (e: React.FormEvent) => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  showTerminal,
  setShowTerminal,
  terminalLogs,
  terminalInput,
  setTerminalInput,
  handleTerminalSubmit,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-[60000] flex flex-col items-end gap-3">
      {showTerminal && (
        <div className="w-80 md:w-96 bg-[#070709]/98 border border-indigo-500/30 rounded-2xl p-4 flex flex-col h-96 shadow-[0_0_40px_rgba(79,70,229,0.25)] backdrop-blur-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2 mb-2 text-xs font-black uppercase text-indigo-400 font-mono">
            <span className="flex items-center gap-1.5 tracking-wider">
              <TerminalIcon size={12} className="pulse-anim text-indigo-400" /> Co-Pilot OS Console
            </span>
            <button
              onClick={() => setShowTerminal(false)}
              className="text-zinc-500 hover:text-white cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar space-y-1.5 mb-2 pr-1">
            {terminalLogs.map((log, i) => {
              let colorClass = "text-zinc-400";
              if (log.startsWith("> ")) {
                colorClass = "text-sky-400 font-semibold";
              } else if (log.includes("[Sucesso]")) {
                colorClass = "text-emerald-400";
              } else if (log.includes("[Erro]")) {
                colorClass = "text-red-400 font-medium";
              } else if (
                log.includes("[REAPRO]") ||
                log.includes("[BOLSAO]") ||
                log.includes("[RADAR]")
              ) {
                colorClass = "text-amber-400 font-medium";
              } else if (log.includes("[IA Copil]") || log.includes("DIAGNÓSTICO")) {
                colorClass = "text-indigo-400 font-semibold text-[11.5px]";
              }
              return (
                <div key={i} className={`whitespace-pre-wrap ${colorClass}`}>
                  {log}
                </div>
              );
            })}
          </div>
          <form onSubmit={handleTerminalSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: /sugerir, /setor 87 ativ 25000..."
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              className="flex-1 bg-black text-emerald-400 font-mono text-xs border border-indigo-500/20 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest px-3 rounded cursor-pointer transition-colors"
            >
              Exec
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setShowTerminal(!showTerminal)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center hover:opacity-95 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-transform duration-300 active:scale-95 cursor-pointer"
      >
        <TerminalIcon size={20} />
      </button>
    </div>
  );
};
