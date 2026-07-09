import { create } from 'zustand';
import { Colaborador } from '../types';
import { initialColaboradores } from '../initialData';

interface CollaboratorStoreState {
  colaboradores: Colaborador[];
  setColaboradores: (colaboradores: Colaborador[] | ((prev: Colaborador[]) => Colaborador[])) => void;
}

export const useCollaboratorStore = create<CollaboratorStoreState>((set) => ({
  colaboradores: initialColaboradores,
  setColaboradores: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.colaboradores) : val;
    return { colaboradores: next };
  }),
}));
