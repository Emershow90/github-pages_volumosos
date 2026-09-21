import { useEffect, useMemo, useCallback } from 'react';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { useStoreOperations } from '../stores/useStoreOperations';
import { usePlanoCarregamentoRisk } from './usePlanoCarregamentoRisk';
import { useAIStrategyStore } from '../stores/useAIStrategyStore';

export function useAIStrategy() {
  const { setores } = useSectorStore();
  const { colaboradores } = useCollaboratorStore();
  const operationsRecord = useStoreOperations((state) => state.operations);
  const { planoCarregamento } = usePlanoCarregamentoRisk();

  const strategy = useAIStrategyStore((state) => state.strategy);
  const isLoading = useAIStrategyStore((state) => state.isLoading);
  const isModalOpen = useAIStrategyStore((state) => state.isModalOpen);
  const setIsModalOpen = useAIStrategyStore((state) => state.setIsModalOpen);
  const refreshStrategyStore = useAIStrategyStore((state) => state.refreshStrategy);
  const initializeBaseline = useAIStrategyStore((state) => state.initializeBaseline);

  const operations = useMemo(() => Object.values(operationsRecord), [operationsRecord]);

  const payload = useMemo(
    () => ({
      setores,
      colaboradores,
      operations,
      planoCarregamento,
    }),
    [setores, colaboradores, operations, planoCarregamento]
  );

  // Initial baseline calculation if not yet set
  useEffect(() => {
    initializeBaseline(payload);
  }, [initializeBaseline, payload]);

  // Manual refresh wrapper (forces API call, bypassing 30s TTL cache)
  const refreshStrategy = useCallback(
    (force = true) => refreshStrategyStore(payload, force),
    [refreshStrategyStore, payload]
  );

  // Trigger strategy sync (store handles 30s TTL cache and request deduplication across component instances)
  useEffect(() => {
    refreshStrategyStore(payload, false);
  }, [setores.length, operations.length, colaboradores.length, refreshStrategyStore, payload]);

  return {
    strategy,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    refreshStrategy,
  };
}
