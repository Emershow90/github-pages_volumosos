import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, RefreshCw, Calendar, Users, Layers, ArrowRight, CloudDownload } from 'lucide-react';
import { Setor, Colaborador, HistoricoRegistro, ReaproData, CapacidadeSetor } from '../types';
import { useDailyActivityHealth } from '../hooks/useDailyActivityHealth';
import { exportToGoogleSheets, initGoogleIdentity } from '../services/googleSheetsExportService';
import { useNotificationStore } from '../stores/useNotificationStore';

interface DailyActivityAlertBannerProps {
  setores: Setor[];
  colaboradores: Colaborador[];
  reaproData: ReaproData;
  historico: HistoricoRegistro[];
  capacidade: CapacidadeSetor[];
  coordenador?: string;
  onNavigateTab?: (tab: string) => void;
}

export const DailyActivityAlertBanner: React.FC<DailyActivityAlertBannerProps> = ({
  setores,
  colaboradores,
  reaproData,
  historico,
  capacidade,
  coordenador,
  onNavigateTab,
}) => {
  const {
    dataHoje,
    setoresPendentes,
    hasPendingDailyRecord,
    registrosHojeCount,
    ultimoRegistroHora,
    consolidarRegistrosDoDia,
  } = useDailyActivityHealth(setores, colaboradores, coordenador);

  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useNotificationStore();

  const handleConsolidar = async () => {
    setIsConsolidating(true);
    try {
      await consolidarRegistrosDoDia(setores, colaboradores, coordenador);
    } catch (err: unknown) {
      console.error(err);
      addToast({
        title: 'Erro na Consolidação',
        message: 'Ocorreu uma falha ao gravar os registros diários.',
        type: 'danger',
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      initGoogleIdentity();
      const url = await exportToGoogleSheets({
        setores,
        colaboradores,
        reapro: reaproData,
        historico,
        coordenador,
        capacidade,
      });
      window.open(url, '_blank');
      addToast({
        title: 'Google Sheets Exportado',
        message: 'Planilha completa gerada com abas de Setores, Histórico Diário e Efetivo!',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na exportação';
      addToast({
        title: 'Erro ao Salvar no Google Sheets',
        message: msg,
        type: 'danger',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
        hasPendingDailyRecord
          ? 'bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-950/20'
          : 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Status Info */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
              hasPendingDailyRecord
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {hasPendingDailyRecord ? (
              <AlertTriangle size={20} className="animate-pulse" />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                Aviso de Atividade do Dia
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    hasPendingDailyRecord
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {dataHoje}
                </span>
              </h3>

              {hasPendingDailyRecord ? (
                <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 px-2 py-0.5 rounded font-bold uppercase">
                  Pendente de Registro
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {registrosHojeCount} registros consolidados
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              {hasPendingDailyRecord ? (
                <>
                  <span className="text-amber-300 font-semibold">Atenção Coordenadoria:</span>{' '}
                  {registrosHojeCount === 0
                    ? 'Ainda não foi realizada nenhuma consolidação de atividade no dia de hoje.'
                    : `Existem ${setoresPendentes.length} setor(es) ativo(s) sem registro hoje: `}
                  {setoresPendentes.length > 0 && (
                    <span className="font-mono text-amber-200 font-bold ml-1">
                      {setoresPendentes.map((s) => `S${s.id}`).join(', ')}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Todos os setores operacionais possuem apontamento registrado para a data atual.{' '}
                  {ultimoRegistroHora && (
                    <span className="text-zinc-400 font-mono">
                      (Última atualização registrada às {ultimoRegistroHora})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
          <button
            id="btn-consolidar-dia-atual"
            onClick={handleConsolidar}
            disabled={isConsolidating}
            className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              hasPendingDailyRecord
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10'
            } disabled:opacity-50`}
            title="Consolidar e gravar dados do dia atual no histórico"
          >
            {isConsolidating ? (
              <RefreshCw size={14} className="animate-spin text-white" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isConsolidating
              ? 'Consolidando...'
              : hasPendingDailyRecord
              ? '⚡ Atualizar Registros de Hoje'
              : '🔄 Nova Foto do Dia'}
          </button>

          <button
            id="btn-exportar-sheets-banner"
            onClick={handleExport}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Exportar todas as abas para o Google Sheets"
          >
            {isExporting ? (
              <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <CloudDownload size={14} />
            )}
            {isExporting ? 'Exportando...' : '☁️ Salvar no Google Sheets'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
