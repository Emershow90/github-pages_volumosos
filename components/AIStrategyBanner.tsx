import React from 'react';
import { Sparkles, Target, Zap, ArrowRight, RefreshCw, Boxes, Users, ChevronRight } from 'lucide-react';
import { AIStrategyPlan, PromiseSLA } from '../types/AIStrategy';

interface AIStrategyBannerProps {
  strategy: AIStrategyPlan | null;
  isLoading: boolean;
  onOpenModal: () => void;
  onRefresh: () => void;
}

export const AIStrategyBanner: React.FC<AIStrategyBannerProps> = ({
  strategy,
  isLoading,
  onOpenModal,
  onRefresh,
}) => {
  if (!strategy) return null;

  const isPriority = strategy.estrategiaPrincipal === 'PRIORIDADE_LOJAS';

  const getSlaColor = (sla: PromiseSLA) => {
    switch (sla) {
      case 'D+2':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'D+1':
        return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
      case 'D-0':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'D-1':
        return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
      case 'D-2':
        return 'text-red-400 bg-red-500/15 border-red-500/30 animate-pulse';
    }
  };

  const topTransfer = strategy.balanceamento.transferenciasSugeridas[0];

  return (
    <div
      id="radar-ai-strategy-banner"
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xl select-none ${
        isPriority
          ? 'bg-gradient-to-r from-amber-950/30 via-zinc-900/80 to-zinc-950 border-amber-500/30'
          : 'bg-gradient-to-r from-emerald-950/30 via-zinc-900/80 to-zinc-950 border-emerald-500/30'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left Side: Strategy Badge & AI Diagnostic */}
        <div className="flex items-start gap-3.5 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
              isPriority
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-amber-500/10'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
            }`}
          >
            {isPriority ? <Target className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Copiloto Logístico IA
              </span>

              <span
                className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isPriority
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isPriority ? 'Estratégia: Coleta por Lojas Prioritárias' : 'Estratégia: Coleta Total Contínua'}
              </span>

              <span className="text-[11px] font-mono text-zinc-400">
                Ocupação: <strong className="text-white">{strategy.taxaOcupacao}%</strong> ({strategy.demandaTotalHoras.toLocaleString('pt-BR')} cx)
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-snug line-clamp-2 max-w-3xl">
              {strategy.diagnosticoGeral}
            </p>

            {topTransfer && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  Sugestão de Efetivo:{' '}
                  <strong className="text-white">
                    Transferir {topTransfer.quantidadeOperadores} operador(es) de {topTransfer.origemSetor} para {topTransfer.destinoSetor}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: SLA Buckets Mini Strip */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-start sm:justify-end">
          {(['D+2', 'D+1', 'D-0', 'D-1', 'D-2'] as PromiseSLA[]).map((sla) => {
            const b = strategy.promessas.buckets[sla];
            return (
              <div
                key={sla}
                className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-center min-w-[58px] ${getSlaColor(sla)}`}
                title={`${sla}: ${b?.label} - ${b?.volume.toLocaleString('pt-BR')} cx (${b?.percentage}%)`}
              >
                <span className="text-[9px] font-black font-mono tracking-wider">{sla}</span>
                <span className="text-xs font-mono font-bold">{b?.percentage || 0}%</span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-50"
            title="Recalcular plano com a IA"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenModal}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              isPriority
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ver Estratégia Completa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
