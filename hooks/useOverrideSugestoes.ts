// src/hooks/useOverrideSugestoes.ts
import { useCallback, useEffect, useState } from 'react';
import { getSugestoesDoSetor, OverrideSugestoes } from '../services/overrideService';

export function useOverrideSugestoes(setor: string, data?: string) {
  const [sugestoes, setSugestoes] = useState<OverrideSugestoes | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (force = false) => {
    if (!setor) return;
    setLoading(true);
    setErro(null);
    try {
      const s = await getSugestoesDoSetor(setor, data);
      setSugestoes(s);
    } catch (e) {
      setErro((e as Error).message);
      setSugestoes(null);
    } finally {
      setLoading(false);
    }
    // `force` está aqui só para tipagem — a invalidação real é via clearSheetsCache()
    void force;
  }, [setor, data]);

  useEffect(() => { void carregar(); }, [carregar]);

  return { sugestoes, loading, erro, recarregar: () => carregar(true) };
}
