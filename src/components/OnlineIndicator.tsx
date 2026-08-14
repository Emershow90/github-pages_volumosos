import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { SupabaseService } from '../lib/supabaseService';
import { useStoreOperations } from '../stores/useStoreOperations';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useToast } from '../hooks/useToast';

export const OnlineIndicator: React.FC = () => {
  const { isOnline, latencyMs, isChecking, recheck } = useOnlineStatus();
  const [isFlushing, setIsFlushing] = useState(false);
  const toast = useToast();

  const opsPendingCount = useStoreOperations((s) => s.pendingCount);
  const syncOpsPending = useStoreOperations((s) => s.syncPending);

  const historyPendingCount = useHistoryStore((s) => s.pendingCount);
  const syncHistoryPending = useHistoryStore((s) => s.syncPending);

  const supabaseQueueCount = SupabaseService.getQueueLength();
  const totalPending = opsPendingCount + historyPendingCount + supabaseQueueCount;

  const handleManualRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlushing(true);
    try {
      await recheck();
      const [resOps, resHist] = await Promise.all([
        syncOpsPending().catch(() => ({ success: false, synced: 0 })),
        syncHistoryPending().catch(() => ({ success: false, synced: 0 })),
        SupabaseService.syncOfflineQueue().catch(() => null),
      ]);

      const totalSynced = (resOps?.synced || 0) + (resHist?.synced || 0);
      if (totalSynced > 0) {
        toast.success(`${totalSynced} registro(s) sincronizado(s) com o banco de dados.`);
      } else {
        toast.info('Verificação de conexão concluída.');
      }
    } catch {
      toast.error('Erro ao sincronizar dados locais.');
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pending Sync Visual Indicator */}
      {totalPending > 0 && (
        <button
          onClick={handleManualRetry}
          disabled={isFlushing}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer animate-pulse"
          title={`${totalPending} alteração(ões) pendente(s) localmente. Clique para sincronizar agora.`}
        >
          <CloudUpload size={11} className={isFlushing ? 'animate-bounce' : ''} />
          <span>{totalPending} pendente{totalPending > 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Online / Offline + Latency Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border transition-all ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}
        title={
          isOnline
            ? `Supabase Conectado | Latência: ${latencyMs !== null ? `${latencyMs}ms` : 'medindo...'} | Total pendente: ${totalPending}`
            : `Sem conexão com servidor Supabase | Total pendente: ${totalPending}`
        }
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOnline ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          ></span>
        </span>
        {isOnline ? (
          <span className="flex items-center gap-1">
            <Wifi size={10} />
            <span>Online</span>
            {latencyMs !== null && (
              <span className="text-[9px] opacity-80 font-normal">
                {latencyMs}ms
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff size={10} />
            <span>Offline</span>
          </span>
        )}
      </div>

      {/* Manual Retry Button */}
      <button
        onClick={handleManualRetry}
        disabled={isChecking || isFlushing}
        title="Re-tentar conexão com Supabase e sincronizar fila local"
        className="p-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
      >
        <RefreshCw size={11} className={`${isChecking || isFlushing ? 'animate-spin text-sky-400' : ''}`} />
      </button>
    </div>
  );
};


