import { create } from 'zustand';
import { AtividadeLoja } from '../types/Store';

interface AtividadeLojaState {
  atividades: Record<string, AtividadeLoja>;
  upsertAtividade: (ativ: AtividadeLoja) => void;
  removeAtividade: (id: string) => void;
  setAtividades: (ativs: Record<string, AtividadeLoja>) => void;
}

export const useAtividadeLoja = create<AtividadeLojaState>((set) => ({
  atividades: {},
  upsertAtividade: (ativ) => set((state) => ({
    atividades: { ...state.atividades, [ativ.id]: ativ }
  })),
  removeAtividade: (id) => set((state) => {
    const next = { ...state.atividades };
    delete next[id];
    return { atividades: next };
  }),
  setAtividades: (ativs) => set({ atividades: ativs }),
}));
