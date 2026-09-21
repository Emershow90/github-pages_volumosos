import React, { useState } from "react";
import { ExternalLink, RefreshCw, Clock, Maximize2, Minimize2, CheckCircle2, FileText, Info } from "lucide-react";

interface LancamentoHorasTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const LancamentoHorasTab: React.FC<LancamentoHorasTabProps> = ({ onNavigateTab }) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSd51GMWifdJMXzFYe9YAoTeS2UIO3GvJL233iUPk_L5gqbVMA/viewform";
  const EMBED_URL = `${FORM_URL}?embedded=true`;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`space-y-4 ${isExpanded ? "fixed inset-0 z-50 bg-[#07070a] p-4 sm:p-6 overflow-y-auto" : ""}`}>
      {/* HEADER DO MÓDULO */}
      <div className="glass-card p-4 sm:p-5 border-l-4 border-indigo-500 bg-gradient-to-r from-indigo-950/30 via-black/40 to-black/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Lançamento de Horas
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase">
                  Google Forms Integrado
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Formulário oficial para apontamento de horas, transferências operacionais e jornada
              </p>
            </div>
          </div>
        </div>

        {/* AÇÕES RÁPIDAS */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            id="btn-recarregar-form-horas"
            onClick={handleReload}
            className="px-3 py-2 rounded-lg text-xs font-bold font-mono bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Recarregar formulário"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-indigo-400" : ""} />
            <span>Recarregar</span>
          </button>

          <button
            type="button"
            id="btn-expandir-form-horas"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 rounded-lg text-xs font-bold font-mono bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            title={isExpanded ? "Restaurar visualização" : "Expandir para tela cheia"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isExpanded ? "Restaurar" : "Tela Cheia"}</span>
          </button>

          <a
            id="btn-abrir-externo-form-horas"
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg text-xs font-bold font-mono bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            title="Abrir formulário em uma nova aba do navegador"
          >
            <span>Abrir no Google Forms</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* GUIA DE PREENCHIMENTO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-bold text-xs">
            1
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Identificação</span>
            <p className="text-xs text-white font-medium">Informe a data, o turno e o colaborador</p>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-bold text-xs">
            2
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Alocação e Setor</span>
            <p className="text-xs text-white font-medium">Selecione o setor de destino ou tipo de atividade</p>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-bold text-xs">
            3
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Confirmação</span>
            <p className="text-xs text-white font-medium">Envie a resposta para consolidar os dados</p>
          </div>
        </div>
      </div>

      {/* EMBEDDED IFRAME CONTAINER */}
      <div className="relative glass-card border border-white/10 rounded-2xl overflow-hidden bg-zinc-950/80 shadow-2xl min-h-[750px] flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 gap-3 backdrop-blur-xs">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-xs text-zinc-400 font-mono animate-pulse">Carregando formulário de lançamento de horas...</p>
          </div>
        )}

        <iframe
          key={iframeKey}
          id="iframe-google-form-horas"
          src={EMBED_URL}
          width="100%"
          height="850"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="Formulário de Lançamento de Horas"
          className="w-full flex-1 min-h-[750px] bg-white rounded-b-xl"
          onLoad={() => setIsLoading(false)}
        >
          Carregando formulário...
        </iframe>
      </div>
    </div>
  );
};
