import React, { useState, useMemo } from 'react';
import { usePlanoCarregamentoRisk, OperationRisk } from '../hooks/usePlanoCarregamentoRisk';
import { Card, CardHeader, CardBody } from './ui/Card';
import { AlertTriangle, Loader2, Clock, MapPin, Search, CheckCircle, Package, Truck, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'all' | 'critical' | 'alert' | 'ok';

export const PlanoCarregamentoRiskCard: React.FC = React.memo(() => {
  const { operations, summary, loading } = usePlanoCarregamentoRisk();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredOps = useMemo(() => {
    let list = operations;
    if (filter === 'critical') list = operations.filter(r => r.risk === 'red');
    if (filter === 'alert') list = operations.filter(r => r.risk === 'yellow');
    if (filter === 'ok') list = operations.filter(r => r.risk === 'green');

    return list.sort((a, b) => {
      // Sort by risk (red first, then yellow, then green)
      const riskScore = { red: 3, yellow: 2, green: 1, gray: 0 };
      if (riskScore[a.risk] !== riskScore[b.risk]) {
        return riskScore[b.risk] - riskScore[a.risk];
      }
      // Then sort by time remaining
      if (a.plano && b.plano) {
        return a.plano.horaCarregamento.localeCompare(b.plano.horaCarregamento);
      }
      return 0;
    });
  }, [operations, filter]);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700/50 flex flex-col h-full min-h-[400px] shadow-lg shadow-slate-950/50">
        <CardHeader>
          <h3 className="text-lg flex items-center text-slate-200">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Lojas em Risco (Plano de Carga)
          </h3>
        </CardHeader>
        <CardBody className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          <span className="text-sm font-mono">Analisando cruzamento de dados...</span>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700/50 flex flex-col h-full shadow-lg shadow-slate-950/50">
      <CardHeader className="pb-3 border-b border-slate-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-lg flex items-center text-slate-200 font-semibold">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Plano de Carga & Risco
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Acompanhamento de horário programado vs. status real
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === 'all' ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              Todos ({summary.total})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              Críticos ({summary.red})
            </button>
            <button
              onClick={() => setFilter('alert')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === 'alert' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              Alertas ({summary.yellow})
            </button>
            <button
              onClick={() => setFilter('ok')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === 'ok' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              No Prazo ({summary.green})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0 overflow-hidden flex flex-col h-[400px]">
        {filteredOps.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3"
          >
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-inner">
              <CheckCircle className="w-8 h-8 text-emerald-500/70" />
            </div>
            <div>
              <p className="text-slate-300 font-medium">Tudo sob controle</p>
              <p className="text-slate-500 text-sm mt-1 max-w-[250px] mx-auto">
                Não há operações neste filtro ou todos os processos estão no prazo planejado.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar h-full p-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence>
                {filteredOps.map((item) => (
                  <OperationRiskItem key={`risk-${item.op.id}`} item={item} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
});

PlanoCarregamentoRiskCard.displayName = 'PlanoCarregamentoRiskCard';

const OperationRiskItem: React.FC<{ item: OperationRisk }> = React.memo(({ item }) => {
  const { op, plano, risk } = item;
  
  const isRed = risk === 'red';
  const isYellow = risk === 'yellow';
  const isGreen = risk === 'green';

  let borderColor = 'border-slate-700/50';
  let bgColor = 'bg-slate-800/40';
  let indicatorColor = 'bg-slate-600';
  let badgeColor = 'bg-slate-700 text-slate-300';
  let riskLabel = 'NORMAL';

  if (isRed) {
    borderColor = 'border-red-500/30';
    bgColor = 'bg-red-500/5 hover:bg-red-500/10';
    indicatorColor = 'bg-red-500';
    badgeColor = 'bg-red-500/20 text-red-400';
    riskLabel = 'CRÍTICO';
  } else if (isYellow) {
    borderColor = 'border-amber-500/30';
    bgColor = 'bg-amber-500/5 hover:bg-amber-500/10';
    indicatorColor = 'bg-amber-500';
    badgeColor = 'bg-amber-500/20 text-amber-400';
    riskLabel = 'ALERTA';
  } else if (isGreen) {
    borderColor = 'border-emerald-500/30';
    bgColor = 'bg-emerald-500/5 hover:bg-emerald-500/10';
    indicatorColor = 'bg-emerald-500';
    badgeColor = 'bg-emerald-500/20 text-emerald-400';
    riskLabel = 'NO PRAZO';
  }

  // Calculate flow progress
  const flowSteps = [
    { name: 'Soltura', done: op.statusSoltura === 'Solta' },
    { name: 'Coleta', done: op.statusColeta === 'Coletada', active: op.statusColeta === 'Em andamento' },
    { name: 'Carga', done: op.statusCarregamento === 'Carregada', active: op.statusCarregamento === 'Em andamento' },
    { name: 'Exped.', done: op.statusExpedicao === 'Dentro do horário' || op.statusExpedicao === 'Dentro da tolerância' || op.statusExpedicao === 'Fora do horário' }
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-xl border ${borderColor} ${bgColor} transition-colors relative overflow-hidden flex flex-col md:flex-row gap-4 justify-between items-start md:items-center`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicatorColor}`} />

      <div className="pl-2 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-200 font-bold font-mono text-lg tracking-tight">{op.lojaId}</span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold border border-indigo-500/30">
              {op.setor}
            </span>
            <span className="text-slate-400 text-sm font-medium truncate max-w-[200px]">{op.nomeLoja}</span>
          </div>
          
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${badgeColor}`}>
            {riskLabel}
          </span>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-8">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Horários</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center text-slate-300 text-sm">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {plano?.horaCarregamento || op.carregamento}
              </span>
              {(isRed || isYellow) && (
                <span className="text-xs font-medium text-slate-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5" />
                  Alvo
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar Flow */}
          <div className="flex-1 max-w-md w-full">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2 block">Progresso Operacional</span>
            <div className="flex items-center w-full justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700/50 -z-10" />
              
              {flowSteps.map((step, idx) => {
                let nodeColor = 'bg-slate-700 border-slate-600 text-slate-500';
                if (step.done) {
                  nodeColor = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
                } else if (step.active) {
                  nodeColor = 'bg-amber-500/20 border-amber-500/50 text-amber-400';
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 z-10 bg-transparent px-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${nodeColor}`}>
                      {step.done ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : step.active ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${step.done ? 'text-emerald-400' : step.active ? 'text-amber-400' : 'text-slate-500'}`}>
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

OperationRiskItem.displayName = 'OperationRiskItem';
