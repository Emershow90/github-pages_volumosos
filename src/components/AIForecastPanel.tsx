import React from 'react';
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Clock, Users, Gauge, Layers, Truck, Box, PackageCheck, FileSpreadsheet } from 'lucide-react';
import { useAIForecast } from '../hooks/useAIForecast';
import { OperationalStage } from '../types/AIForecast';

export const AIForecastPanel: React.FC = () => {
  const {
    forecast,
    isLoading,
    bufferPercentage,
    setBufferPercentage,
    refreshForecast,
  } = useAIForecast();

  if (!forecast) return null;

  const stageIcons: Record<OperationalStage, React.ReactNode> = {
    Soltura: <FileSpreadsheet size={16} className="text-sky-400" />,
    Coleta: <Box size={16} className="text-indigo-400" />,
    Carga: <Layers size={16} className="text-amber-400" />,
    Expedição: <Truck size={16} className="text-emerald-400" />,
  };

  const stageColors: Record<OperationalStage, { border: string; bg: string; text: string; badge: string }> = {
    Soltura: {
      border: 'border-sky-500/30 hover:border-sky-500/50',
      bg: 'bg-sky-950/20',
      text: 'text-sky-400',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    Coleta: {
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      bg: 'bg-indigo-950/20',
      text: 'text-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    Carga: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      bg: 'bg-amber-950/20',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    Expedição: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  };

  const isGrowth = forecast.historicalAverages.growthVsAvg >= 0;

  return (
    <div className="bg-[#0e0e14] border border-[#222234] rounded-2xl p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <Sparkles size={20} className={isLoading ? 'animate-spin' : 'animate-pulse'} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black text-white uppercase tracking-wider font-sans">
                Previsão Preditiva de Carga • Gemini AI
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {forecast.targetDate} ({forecast.dayOfWeek})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                {forecast.source === 'gemini_3.7_flash' ? '✨ Modelo Gemini 3.7' : '⚙️ Modelo Estatístico'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Modelagem preditiva baseada nas médias históricas das 4 etapas:{' '}
              <strong className="text-zinc-200">Soltura ➔ Coleta ➔ Carga ➔ Expedição</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Buffer selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-zinc-800 rounded-lg p-1 text-[11px]">
            <span className="text-zinc-500 px-1 font-semibold">Margem:</span>
            {[0, 5, 10, 15].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  setBufferPercentage(pct);
                  refreshForecast(pct);
                }}
                className={`px-2 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                  bufferPercentage === pct
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                +{pct}%
              </button>
            ))}
          </div>

          <button
            onClick={() => refreshForecast(bufferPercentage)}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Calculando com IA...' : 'Recalcular'}</span>
          </button>
        </div>
      </div>

      {/* HERO METRICS & CONFIDENCE INTERVAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Main Cargo Forecast Number */}
        <div className="bg-[#12121c] border border-indigo-500/30 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-inner">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Volume de Carga Previsto
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1 flex items-baseline gap-2">
                {forecast.totalCargoVolume.toLocaleString('pt-BR')}
                <span className="text-xs font-sans text-zinc-400 font-normal">caixas/colis</span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 ${
              isGrowth ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
            }`}>
              <TrendingUp size={13} className={!isGrowth ? 'rotate-180' : ''} />
              <span>{isGrowth ? `+${forecast.historicalAverages.growthVsAvg}%` : `${forecast.historicalAverages.growthVsAvg}%`}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Média Histórica Base:</span>
            <span className="font-mono font-bold text-zinc-200">
              {forecast.historicalAverages.avgCarga.toLocaleString('pt-BR')} cx
            </span>
          </div>
        </div>

        {/* Confidence Interval Slider Card */}
        <div className="bg-[#12121c] border border-[#1e1e2c] p-5 rounded-xl flex flex-col justify-between shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Intervalo de Confiança
            </span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {forecast.confidenceInterval.confidenceScore}% Confiabilidade
            </span>
          </div>

          {/* Min / Expected / Max Visual */}
          <div className="space-y-2 my-auto">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-zinc-500">Mín: {forecast.confidenceInterval.min.toLocaleString('pt-BR')}</span>
              <span className="text-white font-bold">Esperado: {forecast.confidenceInterval.expected.toLocaleString('pt-BR')}</span>
              <span className="text-zinc-500">Máx: {forecast.confidenceInterval.max.toLocaleString('pt-BR')}</span>
            </div>
            {/* Visual bar */}
            <div className="w-full bg-zinc-800 h-2.5 rounded-full relative overflow-hidden flex">
              <div className="bg-sky-500/40 h-full w-[30%]" />
              <div className="bg-indigo-500 h-full w-[40%] shadow-sm" />
              <div className="bg-purple-500/40 h-full w-[30%]" />
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Amostras Analisadas:</span>
            <span className="font-mono text-zinc-300 font-bold">
              {forecast.historicalAverages.totalRecordsAnalyzed} registros do histórico
            </span>
          </div>
        </div>

        {/* Operational Baseline KPI Summary */}
        <div className="bg-[#12121c] border border-[#1e1e2c] p-5 rounded-xl flex flex-col justify-between shadow-inner">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Padrão Histórico Consolidado
          </span>

          <div className="grid grid-cols-2 gap-3 my-auto">
            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Gauge size={11} className="text-sky-400" />
                UPH Médio
              </div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {forecast.historicalAverages.avgUPH} <span className="text-[10px] font-sans text-zinc-500">cx/h</span>
              </div>
            </div>

            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-400" />
                SLA Médio
              </div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                {forecast.historicalAverages.avgSLA}%
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[10px] text-zinc-400 truncate">
            Sintonia com planos de carregamento e rotas de lojas
          </div>
        </div>
      </div>

      {/* 4 STAGES PIPELINE FORECAST */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-indigo-400" />
            Matriz de Previsão e Recursos das 4 Etapas
          </h4>
          <span className="text-[10px] text-zinc-500 font-mono">
            Dimensionamento Sugerido de Headcount e UPH Alvo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(['soltura', 'coleta', 'carga', 'expedicao'] as const).map((stageKey, idx) => {
            const st = forecast.stages[stageKey];
            const cfg = stageColors[st.stage];
            return (
              <div
                key={stageKey}
                className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col justify-between transition-all shadow-md`}
              >
                <div>
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        {stageIcons[st.stage]}
                        {st.stage}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badge}`}>
                      {st.status}
                    </span>
                  </div>

                  {/* Volume Numbers */}
                  <div className="mb-3">
                    <span className="text-[10px] text-zinc-400 uppercase">Volume Previsto</span>
                    <div className="text-xl font-black text-white font-mono">
                      {st.predictedVolume.toLocaleString('pt-BR')} <span className="text-[10px] font-sans text-zinc-400">cx</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Média: {st.historicalAvgVolume.toLocaleString('pt-BR')} cx
                    </div>
                  </div>

                  {/* Sizing Grid */}
                  <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-2 rounded-lg border border-white/5 text-[11px] mb-2.5">
                    <div>
                      <span className="text-[9.5px] text-zinc-400 uppercase flex items-center gap-1">
                        <Users size={10} className="text-indigo-400" /> Operadores
                      </span>
                      <p className="font-mono font-bold text-white mt-0.5">
                        {st.requiredHeadcount} <span className="text-[9px] text-zinc-500">pessoas</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-zinc-400 uppercase flex items-center gap-1">
                        <Gauge size={10} className="text-sky-400" /> UPH Alvo
                      </span>
                      <p className="font-mono font-bold text-sky-400 mt-0.5">
                        {st.targetUPH} <span className="text-[9px] text-zinc-500">cx/h</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage AI Insight */}
                <p className="text-[10.5px] text-zinc-300/90 leading-snug line-clamp-2 pt-2 border-t border-white/5 italic">
                  "{st.insights}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTOR BREAKDOWN & SHIFT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
        {/* Sector Forecast Card */}
        <div className="bg-[#12121c] border border-[#1e1e2c] p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <PackageCheck size={14} className="text-indigo-400" />
              Previsão por Setor (S87, S88, S89, S90)
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Demanda vs Capacidade</span>
          </div>

          <div className="space-y-3.5">
            {forecast.sectors.map((sec) => (
              <div key={sec.setorId} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-white">S{sec.setorId}</span>
                    <span className="text-zinc-400 text-[11px] truncate max-w-[180px]">{sec.setorName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-white font-bold">{sec.volumePrevisto.toLocaleString('pt-BR')} cx</span>
                    <span className="text-zinc-500">({sec.percentualTotal}%)</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      sec.taxaOcupacao >= 90
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : sec.taxaOcupacao >= 75
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {sec.taxaOcupacao}% Ocupação
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sec.taxaOcupacao >= 90
                        ? 'bg-red-500'
                        : sec.taxaOcupacao >= 75
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                    }`}
                    style={{ width: `${Math.min(100, sec.taxaOcupacao)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-400 flex justify-between">
            <span>Capacidade Total Instalada:</span>
            <span className="font-mono font-bold text-zinc-200">
              {forecast.sectors.reduce((sum, s) => sum + s.capacidadeEstimada, 0).toLocaleString('pt-BR')} cx
            </span>
          </div>
        </div>

        {/* Shift Distribution Card */}
        <div className="bg-[#12121c] border border-[#1e1e2c] p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-purple-400" />
              Planejamento de Carga por Turno
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Alocação de Carga</span>
          </div>

          <div className="space-y-3">
            {forecast.turnos.map((t, idx) => (
              <div key={idx} className="bg-black/30 p-3 rounded-lg border border-white/5 hover:border-white/10 transition">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-zinc-200">{t.turno}</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {t.volumePrevisto.toLocaleString('pt-BR')} cx ({t.percentual}%)
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-400 line-clamp-1">{t.focoOperacional}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <Users size={10} className="text-zinc-400" />
                  <span>Escala sugerida: {t.operadoresSugeridos} operadores</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-400">
            Escalonamento dinâmico para evitar estrangulamento nas docas
          </div>
        </div>
      </div>

      {/* GEMINI AI RECOMMENDATIONS & ACTION PLAN */}
      <div className="bg-[#12121c] border border-indigo-500/20 p-5 rounded-xl relative z-10">
        <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-white/5">
          <Sparkles size={16} className="text-indigo-400" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            Diretrizes Estratégicas & Plano de Ação Gemini
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Executive Strategy */}
          <div className="space-y-3">
            <div className="bg-indigo-950/20 border border-indigo-500/30 p-3.5 rounded-lg">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                Estratégia Geral de Carga
              </span>
              <p className="text-zinc-300 text-[11.5px] leading-relaxed">
                {forecast.recomendacoesIA.estrategiaCarga}
              </p>
            </div>

            {/* Bottlenecks */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} /> Pontos de Atenção & Alertas
              </span>
              {forecast.recomendacoesIA.alertasGargalos.map((alerta, i) => (
                <div key={i} className="text-[11px] text-zinc-300 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-md flex items-start gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>{alerta}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Checklist */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Checklist Operacional para o Próximo Dia
            </span>
            <div className="space-y-2">
              {forecast.recomendacoesIA.planoAcao.map((acao, i) => (
                <div key={i} className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex items-start gap-2 text-[11.5px] text-zinc-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{acao}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
