import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseService } from '../lib/supabaseService';
import { PainelProducao } from '../types/PainelProducao';

export interface TotaisPorSetorEMaquina {
  [setorId: string]: {
    Rafale: number;
    L7: number;
    Mochila: number;
    [maquina: string]: number;
  };
}

export function usePainelProducao() {
  const [registros, setRegistros] = useState<PainelProducao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDados = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SupabaseService.fetchTable<PainelProducao>('painel_producao');
      setRegistros(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDados();

    const subscription = SupabaseService.subscribeToTable('painel_producao', () => {
      fetchDados();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchDados]);

  const totalsBySector = useMemo<TotaisPorSetorEMaquina>(() => {
    const map: TotaisPorSetorEMaquina = {};

    registros.forEach((reg) => {
      const setorId = reg.sector_id || (reg as unknown as Record<string, string>).setor_id || '87';
      if (!map[setorId]) {
        map[setorId] = {
          Rafale: 0,
          L7: 0,
          Mochila: 0,
        };
      }

      const rawMaquina = (reg as unknown as Record<string, string>).maquina;
      const qtdLiberada = (reg as unknown as Record<string, number>).quantidade_liberada;
      
      const liberados = qtdLiberada !== undefined ? Number(qtdLiberada) : (Number(reg.rafale_full) || Number(reg.feito_hoje) || 0);
      const maquinaKey = rawMaquina || 'Rafale';

      if (map[setorId][maquinaKey] !== undefined) {
        map[setorId][maquinaKey] += liberados;
      } else {
        map[setorId][maquinaKey] = liberados;
      }

      if (maquinaKey === 'Rafale') {
        // Already assigned above
      } else {
        map[setorId].Rafale += liberados;
      }
    });

    return map;
  }, [registros]);

  return {
    registros,
    totalsBySector,
    loading,
    error,
    refetch: fetchDados,
  };
}
