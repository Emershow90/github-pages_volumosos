import { create } from 'zustand';
import { AIStrategyPlan } from '../types/AIStrategy';
import { fetchAIStrategyPlan, generateLocalStrategyPlan, StrategyInputPayload } from '../services/aiStrategyService';

interface AIStrategyState {
  strategy: AIStrategyPlan | null;
  isLoading: boolean;
  isModalOpen: boolean;
  lastFetchedAt: number | null;
  inFlightPromise: Promise<void> | null;
  setIsModalOpen: (open: boolean) => void;
  refreshStrategy: (payload: StrategyInputPayload, force?: boolean) => Promise<void>;
  initializeBaseline: (payload: StrategyInputPayload) => void;
}

export const useAIStrategyStore = create<AIStrategyState>((set, get) => ({
  strategy: null,
  isLoading: false,
  isModalOpen: false,
  lastFetchedAt: null,
  inFlightPromise: null,

  setIsModalOpen: (open) => set({ isModalOpen: open }),

  initializeBaseline: (payload) => {
    if (!get().strategy) {
      const baseline = generateLocalStrategyPlan(payload);
      set({ strategy: baseline });
    }
  },

  refreshStrategy: async (payload, force = false) => {
    const { inFlightPromise, lastFetchedAt } = get();

    // Deduplicate in-flight requests across all mounted components
    if (inFlightPromise) {
      return inFlightPromise;
    }

    // TTL Cache check: skip if fetched within last 30 seconds unless explicitly forced
    const now = Date.now();
    if (!force && lastFetchedAt && now - lastFetchedAt < 30000 && get().strategy) {
      return;
    }

    set({ isLoading: true });

    const fetchPromise = (async () => {
      try {
        const plan = await fetchAIStrategyPlan(payload);
        set({ strategy: plan, lastFetchedAt: Date.now() });
      } catch (err) {
        console.warn('[useAIStrategyStore] Erro ao recalcular estratégia:', err);
        const baseline = generateLocalStrategyPlan(payload);
        set({ strategy: baseline });
      } finally {
        set({ isLoading: false, inFlightPromise: null });
      }
    })();

    set({ inFlightPromise: fetchPromise });
    return fetchPromise;
  },
}));
