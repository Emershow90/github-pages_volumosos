import { create } from 'zustand';
import { GembaCard } from '../types/GembaCard';
import { SupabaseService } from '../lib/supabaseService';
import { IndexedDBService } from '../lib/indexedDb';

export const INITIAL_GEMBA_CARDS: GembaCard[] = [
  {
    id: 'gmb-01',
    categoria: 'SEGURANÇA',
    descricao: 'Pallets com tábuas soltas no corredor 14 do Setor 87 apresentando risco de queda.',
    acoes: 'Isolar a área com cones, substituir os pallets avariados e orientar operadores sobre inspeção prévia.',
    responsavel: 'Carlos Silva (Técnico Seg.)',
    data_alvo: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    identificador: 'Setor 87',
    data_id: new Date().toISOString().split('T')[0],
    status: 'EM CURSO',
    foto_url: '',
    arquivado: false,
    historico: [{ data: new Date().toLocaleDateString('pt-BR'), acao: 'Ação registrada durante ronda Gemba' }],
  },
  {
    id: 'gmb-02',
    categoria: 'LOCAL DE TRABALHO',
    descricao: 'Falta de demarcação visual para caixas de reaproveitamento e reciclagem no Setor 89.',
    acoes: 'Pintura de demarcação amarela e sinalização das baias de separação 5S.',
    responsavel: 'Mariana Souza (Líder 89)',
    data_alvo: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    identificador: 'Setor 89',
    data_id: new Date().toISOString().split('T')[0],
    status: 'CONCLUÍDO',
    foto_url: '',
    arquivado: false,
    historico: [{ data: new Date().toLocaleDateString('pt-BR'), acao: 'Pintura finalizada e validada pela liderança' }],
  },
  {
    id: 'gmb-03',
    categoria: 'PROCESSO',
    descricao: 'Gargalo no fluxo de coleta de caixas reabastecimento na entrada do mezanino do Setor 88.',
    acoes: 'Redefinir rota dos transpaletes manuais e ajustar horários de abastecimento dos lotes.',
    responsavel: 'Rafael Santos (Supervisor)',
    data_alvo: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    identificador: 'Setor 88',
    data_id: new Date().toISOString().split('T')[0],
    status: 'EM RISCO',
    foto_url: '',
    arquivado: false,
    historico: [{ data: new Date().toLocaleDateString('pt-BR'), acao: 'Atraso na entrega dos novos transpaletes' }],
  },
  {
    id: 'gmb-04',
    categoria: 'QUALIDADE',
    descricao: 'Etiquetas de código de barras amassadas nas gaiolas de transferência para o Setor 90.',
    acoes: 'Recalibrar cabeçote da impressora térmica Zebra e treinar expedidores na colagem correta.',
    responsavel: 'Aline Costa (Qualidade)',
    data_alvo: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    identificador: 'Setor 90',
    data_id: new Date().toISOString().split('T')[0],
    status: 'EM CURSO',
    foto_url: '',
    arquivado: false,
    historico: [{ data: new Date().toLocaleDateString('pt-BR'), acao: 'Impressora enviada para manutenção preventiva' }],
  }
];

interface GembaStoreState {
  cards: GembaCard[];
  loading: boolean;
  selectedCategory: string;
  selectedStatus: string;
  selectedSector: string;
  searchQuery: string;
  showArchived: boolean;

  setCards: (cards: GembaCard[] | ((prev: GembaCard[]) => GembaCard[])) => void;
  setSelectedCategory: (cat: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedSector: (sector: string) => void;
  setSearchQuery: (query: string) => void;
  setShowArchived: (show: boolean) => void;

  loadCards: () => Promise<void>;
  addCard: (card: Omit<GembaCard, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCard: (id: string, updates: Partial<GembaCard>) => Promise<void>;
  archiveCard: (id: string, arquivado?: boolean) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  subscribeToUpdates: () => () => void;
}

export const useGembaStore = create<GembaStoreState>((set, get) => ({
  cards: INITIAL_GEMBA_CARDS,
  loading: false,
  selectedCategory: 'Todos',
  selectedStatus: 'Todos',
  selectedSector: 'Todos',
  searchQuery: '',
  showArchived: false,

  setCards: (val) => set((state) => ({
    cards: typeof val === 'function' ? val(state.cards) : val
  })),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedSector: (selectedSector) => set({ selectedSector }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowArchived: (showArchived) => set({ showArchived }),

  loadCards: async () => {
    set({ loading: true });
    try {
      const data = await SupabaseService.fetchTable<GembaCard>('gemba_cards', INITIAL_GEMBA_CARDS);
      if (data && data.length > 0) {
        set({ cards: data });
      } else {
        set({ cards: INITIAL_GEMBA_CARDS });
      }
    } catch (err) {
      console.warn('[useGembaStore] Falha ao carregar gemba_cards do Supabase, usando cache local:', err);
      try {
        const cached = await IndexedDBService.getAll<GembaCard>('gemba_cards');
        if (cached && cached.length > 0) {
          set({ cards: cached });
        }
      } catch {}
    } finally {
      set({ loading: false });
    }
  },

  addCard: async (cardData) => {
    const newId = 'gmb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();
    const newCard: GembaCard = {
      ...cardData,
      id: newId,
      created_at: nowIso,
      updated_at: nowIso,
      historico: cardData.historico || [{ data: new Date().toLocaleDateString('pt-BR'), acao: 'Card criado no Gemba' }]
    };

    set((state) => {
      const updated = [newCard, ...state.cards];
      return { cards: updated };
    });

    try {
      await IndexedDBService.put('gemba_cards', newCard);
      await SupabaseService.upsertRecord('gemba_cards', newCard, 'id');
      
      // Registrar log de auditoria
      await SupabaseService.upsertRecord('audit_logs', {
        id: 'aud-' + Date.now(),
        acao: 'CREATE_GEMBA_CARD',
        usuario: newCard.responsavel || 'Operador',
        campo: 'gemba_cards',
        valor_anterior: '',
        valor_novo: `Card ${newCard.categoria}: ${newCard.descricao.slice(0, 60)}`
      }, 'id');
    } catch (err) {
      console.error('[useGembaStore] Erro ao persistir novo card:', err);
    }
  },

  updateCard: async (id, updates) => {
    let previousCard: GembaCard | undefined;
    set((state) => {
      const updated = state.cards.map((c) => {
        if (c.id === id) {
          previousCard = c;
          return { ...c, ...updates, updated_at: new Date().toISOString() };
        }
        return c;
      });
      return { cards: updated };
    });

    const currentCards = get().cards;
    const targetCard = currentCards.find((c) => c.id === id);
    if (targetCard) {
      try {
        await IndexedDBService.put('gemba_cards', targetCard);
        await SupabaseService.upsertRecord('gemba_cards', targetCard, 'id');

        if (updates.status && previousCard && previousCard.status !== updates.status) {
          await SupabaseService.upsertRecord('audit_logs', {
            id: 'aud-' + Date.now(),
            acao: 'UPDATE_GEMBA_STATUS',
            usuario: targetCard.responsavel || 'Operador',
            campo: 'status',
            valor_anterior: previousCard.status,
            valor_novo: updates.status
          }, 'id');
        }
      } catch (err) {
        console.error('[useGembaStore] Erro ao atualizar card:', err);
      }
    }
  },

  archiveCard: async (id, arquivado = true) => {
    set((state) => ({
      cards: state.cards.map((c) => c.id === id ? { ...c, arquivado, updated_at: new Date().toISOString() } : c)
    }));

    const targetCard = get().cards.find((c) => c.id === id);
    if (targetCard) {
      try {
        await IndexedDBService.put('gemba_cards', targetCard);
        await SupabaseService.upsertRecord('gemba_cards', targetCard, 'id');
      } catch (err) {
        console.error('[useGembaStore] Erro ao arquivar card:', err);
      }
    }
  },

  deleteCard: async (id) => {
    const cardToDelete = get().cards.find((c) => c.id === id);
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id)
    }));

    try {
      await IndexedDBService.delete('gemba_cards', id);
      await SupabaseService.deleteRecord('gemba_cards', id);

      if (cardToDelete) {
        await SupabaseService.upsertRecord('audit_logs', {
          id: 'aud-' + Date.now(),
          acao: 'DELETE_GEMBA_CARD',
          usuario: cardToDelete.responsavel || 'Operador',
          campo: 'gemba_cards',
          valor_anterior: cardToDelete.descricao.slice(0, 60),
          valor_novo: 'Excluído'
        }, 'id');
      }
    } catch (err) {
      console.error('[useGembaStore] Erro ao excluir card:', err);
    }
  },

  subscribeToUpdates: () => {
    const sub = SupabaseService.subscribeToTable('gemba_cards', async () => {
      const freshData = await SupabaseService.fetchTable<GembaCard>('gemba_cards', []);
      if (freshData && freshData.length > 0) {
        set({ cards: freshData });
      }
    });
    return () => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    };
  }
}));
