import { useState, useEffect, useMemo } from 'react';
import { useStoreOperations } from '../stores/useStoreOperations';
import { SupabaseService as FirebaseService } from '../lib/supabaseService';
import { fetchPlanoCarregamento, PlanoCarregamentoRow } from '../lib/googleSheetsPublicSource';
import { StoreOperation } from '../types/Store';

export type RiskLevel = 'red' | 'yellow' | 'green' | 'gray';

export interface OperationRisk {
  op: StoreOperation;
  plano?: PlanoCarregamentoRow;
  risk: RiskLevel;
}

export const usePlanoCarregamentoRisk = () => {
  const operationsMap = useStoreOperations((state) => state.operations);
  const [planoCarregamento, setPlanoCarregamento] = useState<PlanoCarregamentoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlano = async () => {
      // Garantir que as operações estão populadas se vier direto pro dashboard
      try {
        const currentOps = useStoreOperations.getState().operations;
        if (Object.keys(currentOps).length === 0) {
          const dbOps = await FirebaseService.fetchTable<StoreOperation>('store_operations');
          if (dbOps && dbOps.length > 0) {
            const opsMap: Record<string, StoreOperation> = {};
            dbOps.forEach(op => {
              opsMap[op.id] = op;
            });
            useStoreOperations.getState().setOperations(opsMap);
          }
        }
      } catch (err) {
        console.warn('[usePlanoCarregamentoRisk] Erro ao carregar operações:', err);
      }
      try {
        const todayIso = new Date().toISOString().split('T')[0];
        const data = await fetchPlanoCarregamento();
        if (data && data.length > 0) {
          const todayPlan = data.filter(d => {
            const dStr = typeof d.data === 'string' ? d.data.split('T')[0] : String(d.data);
            return dStr === todayIso;
          });
          setPlanoCarregamento(todayPlan);
        }
      } catch (err) {
        console.warn('[usePlanoCarregamentoRisk] Erro ao carregar plano local:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPlano();
  }, []);

  const riskData = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    const ops = Object.values(operationsMap);
    
    // Only consider operations for today
    const todayOps = ops.filter(op => op.programacaoId === todayIso);

    const risks: OperationRisk[] = todayOps.map(op => {
      const plano = planoCarregamento.find(p => String(p.codLoja).trim() === String(op.lojaId).trim() && (typeof p.data === 'string' ? p.data.split('T')[0] : String(p.data)) === todayIso);
      
      let risk: RiskLevel = 'gray';

      if (op.statusCarregamento === 'Carregada' || op.statusExpedicao !== 'Pendente') {
        risk = 'green';
      } else if (plano) {
        const now = new Date();
        const [hora, min] = plano.horaCarregamento.split(':');
        const planoTime = new Date();
        planoTime.setHours(parseInt(hora, 10), parseInt(min || "0", 10), 0, 0);

        const diffHours = (planoTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours <= 1.0) {
          if (op.statusColeta !== 'Coletada') risk = 'red';
          else risk = 'yellow';
        } else if (diffHours <= 2.0) {
          if (op.statusColeta === 'Não iniciada') risk = 'red';
          else if (op.statusColeta === 'Em andamento') risk = 'yellow';
          else risk = 'green';
        } else {
          risk = 'green';
        }
      }

      return { op, plano, risk };
    });


    const summary = {
      total: risks.length,
      red: risks.filter(r => r.risk === 'red').length,
      yellow: risks.filter(r => r.risk === 'yellow').length,
      green: risks.filter(r => r.risk === 'green').length,
      gray: risks.filter(r => r.risk === 'gray').length,
    };

    const atRisk = risks.filter(r => r.risk === 'red' || r.risk === 'yellow').sort((a, b) => {
      // Sort by risk (red first, then yellow)
      if (a.risk === 'red' && b.risk === 'yellow') return -1;
      if (a.risk === 'yellow' && b.risk === 'red') return 1;
      
      // Then sort by time remaining
      if (a.plano && b.plano) {
        return a.plano.horaCarregamento.localeCompare(b.plano.horaCarregamento);
      }
      return 0;
    });

    return { operations: risks, summary, atRisk };
  }, [operationsMap, planoCarregamento]);

  return { ...riskData, loading, planoCarregamento };
};
