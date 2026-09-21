import { useState, useEffect, useCallback, useMemo } from 'react';
import { MatrizPerformanceItem } from '../types';
import { SupabaseService } from '../lib/supabaseService';
import { ConexoesService } from '../services/conexoesService';

export function useCopilMetrics() {
  const [data, setData] = useState<MatrizPerformanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let items = await SupabaseService.fetchTable<MatrizPerformanceItem>('matriz_performance');
      if (!items || items.length === 0) {
        const syncRes = await ConexoesService.syncControladoriaSheet();
        if (syncRes.success) {
          items = await SupabaseService.fetchTable<MatrizPerformanceItem>('matriz_performance');
        }
      }
      setData(items || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const subscription = SupabaseService.subscribeToTable('matriz_performance', () => {
      fetchMetrics();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchMetrics]);

  const summaryStats = useMemo(() => {
    if (data.length === 0) {
      return {
        totalPilotagem: 0,
        totalColetado: 0,
        avgUph: 0,
        avgPromessa: 0,
        avgAderencia: 0,
        sectorCount: 0,
      };
    }

    const totalPilotagem = data.reduce((acc, curr) => acc + (Number(curr.pilotagem) || 0), 0);
    const totalColetado = data.reduce((acc, curr) => acc + (Number(curr.total_coletado) || 0), 0);
    const avgUph = Math.round(
      data.reduce((acc, curr) => acc + (Number(curr.produtividade) || 0), 0) / data.length
    );
    const avgPromessa = Math.round(
      data.reduce((acc, curr) => acc + (Number(curr.promessa) || 0), 0) / data.length
    );
    const avgAderencia = Math.round(
      data.reduce((acc, curr) => acc + (Number(curr.aderencia) || 0), 0) / data.length
    );

    const sectors = Array.from(new Set(data.map((d) => d.setor)));

    return {
      totalPilotagem,
      totalColetado,
      avgUph,
      avgPromessa,
      avgAderencia,
      sectorCount: sectors.length,
    };
  }, [data]);

  const deleteMetric = useCallback(async (id: string) => {
    try {
      await SupabaseService.deleteRecord('matriz_performance', id);
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Falha ao excluir métrica COPIL do banco:', err);
    }
  }, []);

  return {
    metrics: data,
    loading,
    error,
    summaryStats,
    refetch: fetchMetrics,
    deleteMetric,
  };
}
