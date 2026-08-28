import { useState, useEffect, useCallback } from 'react';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { useStoreOperations } from '../stores/useStoreOperations';
import { usePlanoCarregamentoRisk } from './usePlanoCarregamentoRisk';
import { fetchAIStrategyPlan, generateLocalStrategyPlan } from '../services/aiStrategyService';
import { AIStrategyPlan } from '../types/AIStrategy';

export function useAIStrategy() {
  const { setores } = useSectorStore();
  const { colaboradores } = useCollaboratorStore();
  const operationsRecord = useStoreOperations((state) => state.operations);
  const { planoCarregamento } = usePlanoCarregamentoRisk();

  const operations = Object.values(operationsRecord);

  const [strategy, setStrategy] = useState<AIStrategyPlan | null>(() => {
    // Generate instant baseline to avoid blank initial states
    return generateLocalStrategyPlan({
      setores,
      colaboradores,
      operations: Object.values(operationsRecord),
      planoCarregamento,
    });
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshStrategy = useCallback(async () => {
    setIsLoading(true);
    try {
      const plan = await fetchAIStrategyPlan({
        setores,
        colaboradores,
        operations,
        planoCarregamento,
      });
      setStrategy(plan);
    } catch (err) {
      console.warn('[useAIStrategy] Erro ao recalcular estratégia:', err);
      setStrategy(
        generateLocalStrategyPlan({
          setores,
          colaboradores,
          operations,
          planoCarregamento,
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [setores, colaboradores, operations, planoCarregamento]);

  // Recalculate whenever key dependencies change (e.g. sectors or operations load)
  useEffect(() => {
    refreshStrategy();
  }, [setores.length, operations.length, colaboradores.length, refreshStrategy]);

  return {
    strategy,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    refreshStrategy,
  };
}
