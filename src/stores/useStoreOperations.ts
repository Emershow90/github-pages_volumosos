import { create } from 'zustand';
import { StoreOperation } from '../types/Store';

interface StoreOperationsState {
  operations: Record<string, StoreOperation>;
  upsertOperation: (op: StoreOperation) => void;
  removeOperation: (id: string) => void;
  setOperations: (ops: Record<string, StoreOperation>) => void;
}

export const useStoreOperations = create<StoreOperationsState>((set) => ({
  operations: {},
  upsertOperation: (op) => set((state) => ({
    operations: { ...state.operations, [op.id]: op }
  })),
  removeOperation: (id) => set((state) => {
    const next = { ...state.operations };
    delete next[id];
    return { operations: next };
  }),
  setOperations: (ops) => set({ operations: ops }),
}));
