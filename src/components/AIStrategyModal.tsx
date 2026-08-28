import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Boxes,
  Zap,
  Target,
  FileSpreadsheet
} from 'lucide-react';
import { AIStrategyPlan, PromiseSLA } from '../types/AIStrategy';

interface AIStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: AIStrategyPlan | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AIStrategyModal: React.FC<AIStrategyModalProps> = ({
  isOpen,
  onClose,
  strategy,
  isLoading,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'promessas' | 'balanceamento' | 'etapas' | 'lojas'>('geral');

  if (!isOpen || !strategy) return null;

  const isPriority = strategy.estrategiaPrincipal === 'PRIORIDADE_LOJAS';

  const getSlaBadge = (sla: PromiseSLA) => {
    switch (sla) {
      case 'D+2':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'D+1':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'D-0':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'D-1':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'D-2':
        return 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#0c0d12] border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Copiloto IA — Planejamento de Coleta & Balanceamento
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {strategy.timestamp}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Otimização contínua com base na Atividade Total, Efetivo de Operadores, UPH e Promessas (D+2 a D-2)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recalcular plano com a IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Calculando...' : 'Recalcular'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Strategy Decision Banner */}
        <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isPriority ? 'bg-amber-950/20 border-amber-500/30' : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isPriority ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}>
              {isPriority ? <Target className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isPriority ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}>
                  {isPriority ? 'Estratégia: Coleta por Lojas Prioritárias' : 'Estratégia: Coleta Total Contínua'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Score de Eficiência: <strong className="text-white">{strategy.scoreOperacional}/100</strong>
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                {strategy.diagnosticoGeral}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-right">
              <div className="text-[10px] text-zinc-500 uppercase">Demanda / Capacidade</div>
              <div className="font-bold text-white">
                {strategy.demandaTotalHoras.toLocaleString('pt-BR')} / {strategy.capacidadeTotalHoras.toLocaleString('pt-BR')} cx
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-right">
              <div className="text-[10px] text-zinc-500 uppercase">Ocupação do Turno</div>
              <div className={`font-bold ${strategy.taxaOcupacao > 95 ? 'text-red-400' : 'text-emerald-400'}`}>
                {strategy.taxaOcupacao}%
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-950/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('promessas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'promessas'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Promessas de Entrega (D+2 a D-2)
          </button>
          <button
            onClick={() => setActiveTab('balanceamento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'balanceamento'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Balanceamento de Efetivo ({strategy.balanceamento.setores.length} Setores)
          </button>
          <button
            onClick={() => setActiveTab('etapas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'etapas'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Fluxo 4 Etapas (Soltura → Expedição)
          </button>
          <button
            onClick={() => setActiveTab('lojas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lojas'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Fila de Lojas Prioritárias ({strategy.lojasPrioritarias.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              {/* Resumo dos Cenários de Promessa */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-indigo-400" />
                  Distribuição das Promessas de Entrega (SLA)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(['D+2', 'D+1', 'D-0', 'D-1', 'D-2'] as PromiseSLA[]).map((sla) => {
                    const b = strategy.promessas.buckets[sla];
                    return (
                      <div key={sla} className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getSlaBadge(sla)}`}>
                            {sla}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {b?.percentage || 0}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-white font-mono">
                          {b?.volume?.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-400 font-sans">cx</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                          {b?.lojasCount} loja(s) vinculadas
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destaque das Transferências de Efetivo */}
              {strategy.balanceamento.transferenciasSugeridas.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Ações de Remanejamento Imediato de Operadores
                  </h3>
                  <div className="space-y-2">
                    {strategy.balanceamento.transferenciasSugeridas.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">{t.origemSetor}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">{t.destinoSetor}</span>
                          <span className="text-emerald-400 font-bold ml-1">+{t.quantidadeOperadores} operador(es)</span>
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {t.justificativa}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plano de Contingência */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Protocolo de Contingência da Coordenação
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {strategy.contingencia}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PROMESSAS (D+2 a D-2) */}
          {activeTab === 'promessas' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
                A matriz de promessas classifica cada lote de separação pelo SLA de entrega. O cenário <strong>D+2</strong> é o mais confortável (ideal para soltura em massa), enquanto <strong>D-2</strong> representa o pior cenário (pedidos com risco de ruptura de caminhão).
              </div>

              <div className="space-y-3">
                {(['D+2', 'D+1', 'D-0', 'D-1', 'D-2'] as PromiseSLA[]).map((sla) => {
                  const b = strategy.promessas.buckets[sla];
                  return (
                    <div key={sla} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 md:max-w-md">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded border ${getSlaBadge(sla)}`}>
                            {sla}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {b?.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {b?.descricao}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto font-mono">
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500 uppercase">Volume</div>
                          <div className="text-sm font-bold text-white">{b?.volume.toLocaleString('pt-BR')} cx</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500 uppercase">% do Total</div>
                          <div className="text-sm font-bold text-indigo-400">{b?.percentage}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500 uppercase">Lojas</div>
                          <div className="text-sm font-bold text-zinc-300">{b?.lojasCount}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BALANCEAMENTO DE EFETIVO */}
          {activeTab === 'balanceamento' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3">Setor</th>
                      <th className="py-2.5 px-3">Volume ATIV</th>
                      <th className="py-2.5 px-3">Efetivo Atual</th>
                      <th className="py-2.5 px-3">Efetivo Sugerido</th>
                      <th className="py-2.5 px-3">UPH Atual</th>
                      <th className="py-2.5 px-3">Horas Est.</th>
                      <th className="py-2.5 px-3">Status de Risco</th>
                      <th className="py-2.5 px-3">Recomendação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {strategy.balanceamento.setores.map((s) => (
                      <tr key={s.sectorId} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white font-mono">{s.sectorName}</td>
                        <td className="py-3 px-3 font-mono">{s.volumeTotal.toLocaleString('pt-BR')} cx</td>
                        <td className="py-3 px-3 font-mono text-zinc-300">{s.currentHeadcount} op.</td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                          {s.suggestedHeadcount} op.
                          {s.deltaHeadcount > 0 && <span className="text-red-400 ml-1">(+{s.deltaHeadcount})</span>}
                          {s.deltaHeadcount < 0 && <span className="text-emerald-400 ml-1">({s.deltaHeadcount})</span>}
                        </td>
                        <td className="py-3 px-3 font-mono">{s.currentUPH}</td>
                        <td className="py-3 px-3 font-mono font-bold text-white">{s.estimatedHours}h</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            s.riskStatus === 'critico'
                              ? 'bg-red-500/20 border-red-500/40 text-red-300'
                              : s.riskStatus === 'alto'
                              ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                              : s.riskStatus === 'moderado'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          }`}>
                            {s.riskStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-400 max-w-xs">{s.advice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FLUXO 4 ETAPAS */}
          {activeTab === 'etapas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Etapa 1: Soltura */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[10px]">1</span>
                  Soltura de Listas
                </div>
                <div className="text-xs font-semibold text-white">{strategy.plano4Etapas.soltura.status}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{strategy.plano4Etapas.soltura.acao}</p>
                {strategy.plano4Etapas.soltura.prioridades.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">Prioridades Imediatas:</span>
                    <ul className="text-xs text-amber-300 list-disc list-inside mt-1 font-mono">
                      {strategy.plano4Etapas.soltura.prioridades.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Etapa 2: Coleta */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-[10px]">2</span>
                  Coleta & Picking
                </div>
                <div className="text-xs font-semibold text-white">{strategy.plano4Etapas.coleta.status}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{strategy.plano4Etapas.coleta.acao}</p>
                <div className="pt-2 border-t border-zinc-800 text-[11px] text-sky-300 font-mono">
                  Modo Operacional: <strong>{strategy.plano4Etapas.coleta.modoOperacao}</strong>
                </div>
              </div>

              {/* Etapa 3: Carga */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px]">3</span>
                  Carga & Conferência
                </div>
                <div className="text-xs font-semibold text-white">{strategy.plano4Etapas.carga.status}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{strategy.plano4Etapas.carga.acao}</p>
                {strategy.plano4Etapas.carga.docasRecomendadas && (
                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-amber-300 font-mono">
                    {strategy.plano4Etapas.carga.docasRecomendadas}
                  </div>
                )}
              </div>

              {/* Etapa 4: Expedição */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">4</span>
                  Expedição & Partida
                </div>
                <div className="text-xs font-semibold text-white">{strategy.plano4Etapas.expedicao.status}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{strategy.plano4Etapas.expedicao.acao}</p>
                <div className="pt-2 border-t border-zinc-800 text-[11px] text-emerald-300 font-mono">
                  Risco Global de Atraso: <strong>{strategy.plano4Etapas.expedicao.riscoAtrasoGeral}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOJAS PRIORITÁRIAS */}
          {activeTab === 'lojas' && (
            <div className="space-y-3">
              {strategy.lojasPrioritarias.map((loja) => (
                <div key={loja.lojaId} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white font-mono">Loja {loja.lojaId}</span>
                      <span className="text-xs text-zinc-300 font-semibold">{loja.nomeLoja}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSlaBadge(loja.promessa)}`}>
                        {loja.promessa}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {loja.setor}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/90 font-medium">
                      Motivo: {loja.motivoPrioridade}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Ação Recomendada: {loja.acaoSugerida}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto font-mono text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Corte</div>
                      <div className="font-bold text-red-300">{loja.corte}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Carga</div>
                      <div className="font-bold text-zinc-300">{loja.carregamento}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Volume</div>
                      <div className="font-bold text-white">{loja.volume} cx</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Torre de Comando Volumosos • Motor de IA Gemini 3.7 Flash
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
