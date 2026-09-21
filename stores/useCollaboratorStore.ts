import { create } from 'zustand';
import { Colaborador, EscalaColaborador } from '../types';
import { initialColaboradores } from '../initialData';

interface CollaboratorStoreState {
  colaboradores: Colaborador[];
  escalas: EscalaColaborador[];
  setColaboradores: (colaboradores: Colaborador[] | ((prev: Colaborador[]) => Colaborador[])) => void;
  setEscalas: (escalas: EscalaColaborador[] | ((prev: EscalaColaborador[]) => EscalaColaborador[])) => void;
}

export const useCollaboratorStore = create<CollaboratorStoreState>((set) => ({
  colaboradores: initialColaboradores,
  escalas: [],
  setColaboradores: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.colaboradores) : val;
    return { colaboradores: next };
  }),
  setEscalas: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.escalas) : val;
    return { escalas: next };
  }),
}));
