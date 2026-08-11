import React from 'react';
import { useCopilMetrics } from '../hooks/useCopilMetrics';
import { useConsoleStatus } from '../hooks/useConsoleStatus';
import { useColetaD1 } from '../hooks/useColetaD1';
import { PlanoCarregamentoRiskCard } from './PlanoCarregamentoRiskCard';
import { Card, CardBody, CardHeader } from './ui/Card';
import { AlertTriangle, CheckCircle, Clock, Activity, BarChart3, Terminal, Database, RefreshCw, Pause, Radio } from 'lucide-react';
import { seedOperations } from '../scripts/seedOperations';

export const PainelTab: React.FC = () => {
  const { summaryStats: copilStats, loading: copilLoading } = useCopilMetrics();
  const { consoleSummary, loading: consoleLoading } = useConsoleStatus();
  const { sectorsProjections, totals: coletaTotals, loading: coletaLoading } = useColetaD1();
  const now = new Date();
  
  return (
    <div className="space-y-6">
      {/* Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 shadow-inner">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <Radio className="w-6 h-6 text-indigo-400" />
            Painel Operacional
            <button 
              onClick={() => seedOperations()}
              title="Seed Dados (Testes)"
              className="px-2 py-1 bg-slate-700 text-slate-400 border border-slate-600 rounded text-xs flex items-center gap-1 hover:bg-slate-600 hover:text-slate-200 transition"
            >
              <Database className="w-3 h-3" />
            </button>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {consoleSummary.isOnline ? (
            <span className="flex items-center text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Sistema Online
            </span>
          ) : (
            <span className="flex items-center text-sm font-medium text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>
              Sistema Offline
            </span>
          )}
          <button className="p-2 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600 transition" title="Atualizar dados">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {/* COPIL Highlights */}
        <Card className="bg-slate-800 border-slate-700/50 flex flex-col shadow-lg shadow-slate-950/50">
          <CardHeader className="pb-3 border-b border-slate-700/50">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold flex items-center text-slate-200">
                <BarChart3 className="w-5 h-5 mr-2 text-indigo-400" />
                Destaques COPIL
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Matriz Performance
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1 p-4">
            {copilLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <span className="text-slate-400 text-sm font-medium">UPH Médio</span>
                  <span className="text-xl font-bold text-slate-100">{copilStats.avgUph}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <span className="text-slate-400 text-sm font-medium">Promessa Média</span>
                  <span className="text-xl font-bold text-emerald-400">{copilStats.avgPromessa}%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <span className="text-slate-400 text-sm font-medium">Aderência Média</span>
                  <span className="text-xl font-bold text-blue-400">{copilStats.avgAderencia}%</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Coleta D+1 */}
        <Card className="bg-slate-800 border-slate-700/50 flex flex-col shadow-lg shadow-slate-950/50">
          <CardHeader className="pb-3 border-b border-slate-700/50">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold flex items-center text-slate-200">
                <Activity className="w-5 h-5 mr-2 text-amber-400" />
                Coleta D+1
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Projeções por setor
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1 p-2">
            {coletaLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 p-4">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto h-[220px] pr-1 custom-scrollbar">
                {sectorsProjections.map((sector) => (
                  <div key={sector.setorId} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/30 border border-slate-700/30 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {sector.status === 'normal' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {sector.status === 'atencao' && <Clock className="w-4 h-4 text-amber-500" />}
                      {sector.status === 'critico' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      <span className="font-semibold text-slate-200 text-sm">Setor {sector.setorId}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-100">{sector.atividadeTotal ? sector.atividadeTotal.toLocaleString('pt-BR') : 0} <span className="text-[10px] text-slate-500 uppercase font-normal">vol.</span></div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{sector.uph} UPH • {sector.promessa}% Prom.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Console Operacional */}
        <Card className="bg-slate-800 border-slate-700/50 flex flex-col shadow-lg shadow-slate-950/50 xl:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-700/50">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold flex items-center text-slate-200">
                <Terminal className="w-5 h-5 mr-2 text-rose-400" />
                Console & Audit
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Atividades recentes
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1 p-2">
            {consoleLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 p-4">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto h-[220px] pr-1 custom-scrollbar">
                {consoleSummary.latestLogs.length > 0 ? (
                  consoleSummary.latestLogs.map((log) => (
                    <div key={log.id} className="text-sm p-3 rounded-lg bg-slate-900/50 border-l-4 border-slate-600 shadow-sm flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(log.data || new Date()).toLocaleTimeString()}</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{log.usuario || 'Sistema'}</span>
                      </div>
                      <div className="text-slate-300 text-sm leading-relaxed">
                        <span className="font-semibold text-rose-400 mr-2 tracking-wide">[{log.acao}]</span>
                        {log.detalhes}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-4 space-y-2">
                    <Terminal className="w-8 h-8 text-slate-700" />
                    <span>Nenhum log recente</span>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      {/* Lojas em Risco (Ocupando a largura toda abaixo do grid) */}
      <div className="w-full">
        <PlanoCarregamentoRiskCard />
      </div>
    </div>
  );
};
