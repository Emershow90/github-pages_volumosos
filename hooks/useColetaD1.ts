import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchPublicSpreadsheetMetrics,
  PublicSpreadsheetMetricsMap,
} from '../lib/googleSheetsPublicSource';

export interface SectorColetaD1 {
  setorId: string;
  atividadeTotal: number;
  uph: number;
  promessa: number;
  bsi: number;
  errosPicking: number;
  status: 'atencao' | 'normal' | 'critico';
}

export function useColetaD1() {
  const [metrics, setMetrics] = useState<PublicSpreadsheetMetricsMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pubMetrics = await fetchPublicSpreadsheetMetrics().catch(() => ({}));
      setMetrics(pubMetrics);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sectorsProjections = useMemo(() => {
    const sectorIds = ['87', '88', '89', '90', 'ELOG'];
    return sectorIds.map((sid) => {
      const base = metrics?.[sid];

      const atividadeTotal = base?.atividadeTotal ?? 0;
      const uph = base?.uph ?? 0;
      const promessa = 95;
      const bsi = 0;
      const errosPicking = 0;

      let status: 'atencao' | 'normal' | 'critico' = 'normal';
      if (promessa < 90 || errosPicking > 50) {
        status = 'critico';
      } else if (promessa < 95 || bsi > 10) {
        status = 'atencao';
      }

      return {
        setorId: sid,
        atividadeTotal,
        uph,
        promessa,
        bsi,
        errosPicking,
        status,
      } as SectorColetaD1;
    });
  }, [metrics]);

  const totals = useMemo(() => {
    const totalAtividade = sectorsProjections.reduce((acc, s) => acc + s.atividadeTotal, 0);
    const avgUph = Math.round(
      sectorsProjections.reduce((acc, s) => acc + s.uph, 0) / (sectorsProjections.length || 1)
    );
    const avgPromessa = Math.round(
      sectorsProjections.reduce((acc, s) => acc + s.promessa, 0) / (sectorsProjections.length || 1)
    );

    return {
      totalAtividade,
      avgUph,
      avgPromessa,
    };
  }, [sectorsProjections]);

  return {
    sectorsProjections,
    totals,
    loading,
    error,
    refetch: loadData,
  };
}
