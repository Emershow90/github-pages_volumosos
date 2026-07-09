import { create } from 'zustand';
import { Setor, CapacidadeSetor, RadarLoja, ReaproData, BolsaoData, CopilSetor } from '../types';
import {
  initialSetores,
  initialCapacidade,
  initialUniversos,
  initialCopil,
  initialRadar,
  initialReapro,
  initialBolsao
} from '../initialData';

interface SectorStoreState {
  setores: Setor[];
  capacidade: CapacidadeSetor[];
  universos: Record<string, { nome: string; meta: number; feito: number }[]>;
  copilData: Record<string, CopilSetor>;
  radar: RadarLoja[];
  reaproData: ReaproData;
  bolsaoData: BolsaoData;

  setSetores: (setores: Setor[] | ((prev: Setor[]) => Setor[])) => void;
  setCapacidade: (capacidade: CapacidadeSetor[] | ((prev: CapacidadeSetor[]) => CapacidadeSetor[])) => void;
  setUniversos: (universos: Record<string, { nome: string; meta: number; feito: number }[]> | ((prev: Record<string, { nome: string; meta: number; feito: number }[]>) => Record<string, { nome: string; meta: number; feito: number }[]>)) => void;
  setCopilData: (copilData: Record<string, CopilSetor> | ((prev: Record<string, CopilSetor>) => Record<string, CopilSetor>)) => void;
  setRadar: (radar: RadarLoja[] | ((prev: RadarLoja[]) => RadarLoja[])) => void;
  setReaproData: (reaproData: ReaproData | ((prev: ReaproData) => ReaproData)) => void;
  setBolsaoData: (bolsaoData: BolsaoData | ((prev: BolsaoData) => BolsaoData)) => void;
}

export const useSectorStore = create<SectorStoreState>((set) => ({
  setores: initialSetores,
  capacidade: initialCapacidade,
  universos: initialUniversos,
  copilData: initialCopil,
  radar: initialRadar,
  reaproData: initialReapro,
  bolsaoData: initialBolsao,

  setSetores: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.setores) : val;
    return { setores: next };
  }),

  setCapacidade: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.capacidade) : val;
    return { capacidade: next };
  }),

  setUniversos: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.universos) : val;
    return { universos: next };
  }),

  setCopilData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.copilData) : val;
    return { copilData: next };
  }),

  setRadar: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.radar) : val;
    return { radar: next };
  }),

  setReaproData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.reaproData) : val;
    return { reaproData: next };
  }),

  setBolsaoData: (val) => set((state) => {
    const next = typeof val === 'function' ? val(state.bolsaoData) : val;
    return { bolsaoData: next };
  }),
}));
