import { useState, useEffect, useCallback, useRef } from 'react';
import { CargoVolumeForecast } from '../types/AIForecast';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { generateLocalCargoForecast, fetchAICargoForecast } from '../services/aiForecastService';

export function useAIForecast() {
  const { historico } = useHistoryStore();
  const { setores, capacidade } = useSectorStore();
  const { colaboradores } = useCollaboratorStore();

  const [bufferPercentage, setBufferPercentage] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with deterministic instant calculation so UI is never blank
  const [forecast, setForecast] = useState<CargoVolumeForecast>(() => {
    return generateLocalCargoForecast({
      historico,
      setores,
      capacidade,
      colaboradores,
      bufferPercentage: 5,
    });
  });

  const lastFetchRef = useRef<number>(0);

  const refreshForecast = useCallback(async (customBuffer?: number) => {
    const buffer = typeof customBuffer === 'number' ? customBuffer : bufferPercentage;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAICargoForecast({
        historico,
        setores,
        capacidade,
        colaboradores,
        bufferPercentage: buffer,
      });
      setForecast(data);
    } catch (err: unknown) {
      console.error('[useAIForecast] Error generating forecast:', err);
      setError('Falha ao processar previsão por IA. Usando cálculo determinístico local.');
      const fallback = generateLocalCargoForecast({
        historico,
        setores,
        capacidade,
        colaboradores,
        bufferPercentage: buffer,
      });
      setForecast(fallback);
    } finally {
      setIsLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, [historico, setores, capacidade, colaboradores, bufferPercentage]);

  // Initial load
  useEffect(() => {
    // Only fetch from server once on startup or when substantial state changes
    if (Date.now() - lastFetchRef.current > 30000) {
      refreshForecast(bufferPercentage);
    }
  }, [historico.length, setores.length]);

  return {
    forecast,
    isLoading,
    error,
    bufferPercentage,
    setBufferPercentage,
    refreshForecast,
  };
}
