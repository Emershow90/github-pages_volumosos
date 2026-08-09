import React from 'react';
import { useCopilMetrics } from '../hooks/useCopilMetrics';
import { useConsoleStatus } from '../hooks/useConsoleStatus';
import { useColetaD1 } from '../hooks/useColetaD1';
import { Card, CardBody, CardHeader } from './ui/Card';
import { AlertTriangle, CheckCircle, Clock, Activity, BarChart3, Terminal } from 'lucide-react';

export const PainelTab: React.FC = () => {
  const { summaryStats: copilStats, loading: copilLoading } = useCopilMetrics();
  const { consoleSummary, loading: consoleLoading } = useConsoleStatus();
  const { sectorsProjections, totals: coletaTotals, loading: coletaLoading } = useColetaD1();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Painel Operacional</h2>
        <div className="flex space-x-2">
          {consoleSummary.isOnline ? (
            <span className="flex items-center text-sm text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Sistema Online
            </span>
          ) : (
            <span className="flex items-center text-sm text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-800">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              Sistema Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* COPIL Highlights */}
        <Card className="bg-slate-900 border-slate-800 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex flex-col">
              <h3 className="text-lg flex items-center text-slate-200">
                <BarChart3 className="w-5 h-5 mr-2 text-indigo-400" />
                Destaques COPIL
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Métricas consolidadas (Matriz Performance)
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1">
            {copilLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-slate-500">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-slate-400 text-sm">UPH Médio</span>
                  <span className="text-xl font-bold text-slate-100">{copilStats.avgUph}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-slate-400 text-sm">Promessa Média</span>
                  <span className="text-xl font-bold text-emerald-400">{copilStats.avgPromessa}%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-slate-400 text-sm">Aderência Média</span>
                  <span className="text-xl font-bold text-blue-400">{copilStats.avgAderencia}%</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Coleta D+1 */}
        <Card className="bg-slate-900 border-slate-800 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex flex-col">
              <h3 className="text-lg flex items-center text-slate-200">
                <Activity className="w-5 h-5 mr-2 text-amber-400" />
                Coleta D+1
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Projeções por setor (Planilha Operacional)
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1">
            {coletaLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-slate-500">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-3 mt-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {sectorsProjections.map((sector) => (
                  <div key={sector.setorId} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center space-x-2">
                      {sector.status === 'normal' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {sector.status === 'atencao' && <Clock className="w-4 h-4 text-amber-500" />}
                      {sector.status === 'critico' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      <span className="font-medium text-slate-200">Setor {sector.setorId}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-300">{sector.uph} UPH</div>
                      <div className="text-xs text-slate-500">{sector.promessa}% Prom.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Console Operacional */}
        <Card className="bg-slate-900 border-slate-800 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex flex-col">
              <h3 className="text-lg flex items-center text-slate-200">
                <Terminal className="w-5 h-5 mr-2 text-rose-400" />
                Console & Audit
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Atividades recentes (Audit Logs)
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex-1">
            {consoleLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-slate-500">Carregando...</span>
              </div>
            ) : (
              <div className="space-y-3 mt-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {consoleSummary.latestLogs.length > 0 ? (
                  consoleSummary.latestLogs.map((log) => (
                    <div key={log.id} className="text-sm p-2 rounded bg-slate-800/30 border-l-2 border-slate-600">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{new Date(log.data || new Date()).toLocaleTimeString()}</span>
                        <span>{log.usuario || 'Sistema'}</span>
                      </div>
                      <div className="text-slate-300">
                        <span className="font-semibold text-rose-400 mr-2">[{log.acao}]</span>
                        {log.detalhes}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 py-4">Nenhum log recente</div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
