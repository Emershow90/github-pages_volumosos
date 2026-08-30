import { create } from "zustand";
import { PlanoAcao5W2H, CaseMelhoria, StatusPlanoAcao } from "../types/ActionPlan";
import { IndexedDBService } from "../lib/indexedDb";
import { SupabaseService } from "../lib/supabaseService";

const STORAGE_KEY_PLANOS = "tower_os_planos_acao_v1";
const STORAGE_KEY_CASES = "tower_os_cases_melhoria_v1";

interface ActionPlanState {
  planos: PlanoAcao5W2H[];
  cases: CaseMelhoria[];
  isLoading: boolean;
  filtroStatus: StatusPlanoAcao | "Todos";
  filtroSetor: string;
  termoBusca: string;

  // Actions
  setFiltroStatus: (status: StatusPlanoAcao | "Todos") => void;
  setFiltroSetor: (setor: string) => void;
  setTermoBusca: (termo: string) => void;
  carregarDados: () => Promise<void>;
  addPlano: (plano: Omit<PlanoAcao5W2H, "id" | "dataCriacao">) => Promise<PlanoAcao5W2H>;
  updatePlano: (id: string, updates: Partial<PlanoAcao5W2H>) => Promise<void>;
  concluirPlano: (
    id: string,
    valorDepois: number,
    impactoDescricao?: string,
    padronizado?: boolean,
    padronizacaoDescricao?: string
  ) => Promise<void>;
  deletePlano: (id: string) => Promise<void>;
  addCase: (caseItem: Omit<CaseMelhoria, "id">) => Promise<CaseMelhoria>;
}

// Initial default seed cases to illustrate continuous improvement
const INITIAL_CASES: CaseMelhoria[] = [
  {
    id: "case-01",
    titulo: "Otimização de Rota de Reabastecimento no Setor 89",
    categoria: "Produtividade",
    setor: "Setor 89",
    problema: "Produtividade estagnada em 29,4 cx/h devido a excesso de deslocamento vazio de transpaleteiras.",
    analiseCausa: "Falta de ordenamento por zona e corredores estreitos bloqueando manobras.",
    acaoImplementada: "Revisão da sequência lógica de abastecimento e criação de pulmão intermediário.",
    responsavel: "Coordenação de Logística",
    dataInicio: "2026-08-01",
    dataFim: "2026-08-15",
    valorAntes: 29.4,
    valorDepois: 38.2,
    unidade: "cx/h",
    ganhoPercentual: 29.9,
    impactoOperacional: "Redução de 12 horas operacionais por dia no setor e eliminação de fila de espera.",
    aprendizados: "O balanceamento de pulmões intermediários reduz em 40% a necessidade de deslocamento longo.",
    statusPadronizacao: "Padronizado no POP",
  },
  {
    id: "case-02",
    titulo: "Redução de Divergência de Etiquetagem em Crossdocking",
    categoria: "Qualidade",
    setor: "Crossdocking",
    problema: "Índice de retrabalho atingindo 18% devido a leitura duplicada de códigos de barras antigos.",
    analiseCausa: "Etiquetas secundárias não cobertas no momento do descarregamento.",
    acaoImplementada: "Implementação de tarja preta de descarte e novo checklist no coletor Zebra.",
    responsavel: "Qualidade Operacional",
    dataInicio: "2026-08-10",
    dataFim: "2026-08-20",
    valorAntes: 18.0,
    valorDepois: 4.2,
    unidade: "%",
    ganhoPercentual: -76.6,
    impactoOperacional: "Queda drástica de reprocesso e carregamento 25 minutos mais rápido.",
    aprendizados: "Checklist visual no coletor antes da bipagem garante 99% de assertividade na conferência.",
    statusPadronizacao: "Padronizado no POP",
  },
];

export const useActionPlanStore = create<ActionPlanState>((set, get) => ({
  planos: [],
  cases: INITIAL_CASES,
  isLoading: false,
  filtroStatus: "Todos",
  filtroSetor: "Todos",
  termoBusca: "",

  setFiltroStatus: (filtroStatus) => set({ filtroStatus }),
  setFiltroSetor: (filtroSetor) => set({ filtroSetor }),
  setTermoBusca: (termoBusca) => set({ termoBusca }),

  carregarDados: async () => {
    set({ isLoading: true });
    try {
      // 1. Tentar ler do localStorage primeiro (cache rápido)
      const localPlanosStr = localStorage.getItem(STORAGE_KEY_PLANOS);
      const localCasesStr = localStorage.getItem(STORAGE_KEY_CASES);

      let planos = localPlanosStr ? JSON.parse(localPlanosStr) : [];
      let cases = localCasesStr ? JSON.parse(localCasesStr) : INITIAL_CASES;

      // 2. Tentar sincronizar do IndexedDB
      try {
        const idbPlanos = await IndexedDBService.getAll<PlanoAcao5W2H>("planos_acao");
        if (idbPlanos && idbPlanos.length > 0) {
          planos = idbPlanos;
        }
      } catch (err) {
        console.warn("[ActionPlanStore] IndexedDB fallback:", err);
      }

      // 3. Tentar sincronizar do Supabase
      try {
        if (navigator.onLine) {
          const { data, error } = await SupabaseService.supabase
            .from("planos_acao")
            .select("*")
            .order("dataCriacao", { ascending: false });

          if (!error && data && data.length > 0) {
            planos = data;
            localStorage.setItem(STORAGE_KEY_PLANOS, JSON.stringify(planos));
          }
        }
      } catch (err) {
        console.warn("[ActionPlanStore] Supabase fetch fallback:", err);
      }

      set({ planos, cases, isLoading: false });
    } catch (e) {
      console.error("[ActionPlanStore] Erro ao carregar dados:", e);
      set({ isLoading: false });
    }
  },

  addPlano: async (novoPlano) => {
    const id = `plano-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const dataCriacao = new Date().toISOString();
    
    const planoCompleto: PlanoAcao5W2H = {
      ...novoPlano,
      id,
      dataCriacao,
      status: novoPlano.status || "Aberto",
      padronizado: novoPlano.padronizado || false,
    };

    const novosPlanos = [planoCompleto, ...get().planos];
    set({ planos: novosPlanos });

    // Salvar Local
    localStorage.setItem(STORAGE_KEY_PLANOS, JSON.stringify(novosPlanos));

    // Salvar IndexedDB
    try {
      await IndexedDBService.put("planos_acao", planoCompleto);
    } catch (e) {
      console.warn("[ActionPlanStore] IDB save error:", e);
    }

    // Salvar Supabase
    try {
      if (navigator.onLine) {
        await SupabaseService.supabase.from("planos_acao").upsert(planoCompleto);
      }
    } catch (e) {
      console.warn("[ActionPlanStore] Supabase save error:", e);
    }

    return planoCompleto;
  },

  updatePlano: async (id, updates) => {
    const novosPlanos = get().planos.map((p) => (p.id === id ? { ...p, ...updates } : p));
    set({ planos: novosPlanos });

    localStorage.setItem(STORAGE_KEY_PLANOS, JSON.stringify(novosPlanos));

    const planoAtualizado = novosPlanos.find((p) => p.id === id);
    if (planoAtualizado) {
      try {
        await IndexedDBService.put("planos_acao", planoAtualizado);
        if (navigator.onLine) {
          await SupabaseService.supabase.from("planos_acao").upsert(planoAtualizado);
        }
      } catch (e) {
        console.warn("[ActionPlanStore] Update error:", e);
      }
    }
  },

  concluirPlano: async (id, valorDepois, impactoDescricao, padronizado = false, padronizacaoDescricao) => {
    const plano = get().planos.find((p) => p.id === id);
    if (!plano) return;

    const dataConclusao = new Date().toISOString();
    const percentualGanho = plano.valorAntes > 0
      ? Math.round(((valorDepois - plano.valorAntes) / plano.valorAntes) * 1000) / 10
      : 0;
    
    const metaAtingida = valorDepois >= plano.metaEsperada;

    const updates: Partial<PlanoAcao5W2H> = {
      status: "Concluido",
      valorDepois,
      percentualGanho,
      metaAtingida,
      dataConclusao,
      impactoDescricao: impactoDescricao || `Ganho de ${percentualGanho > 0 ? "+" : ""}${percentualGanho}% no indicador ${plano.indicador}`,
      padronizado,
      padronizacaoDescricao,
    };

    await get().updatePlano(id, updates);

    // Se a meta foi atingida e padronizada, sugerir criação automática de Case
    if (metaAtingida || Math.abs(percentualGanho) > 10) {
      const novoCase: CaseMelhoria = {
        id: `case-${Date.now()}`,
        planoAcaoId: plano.id,
        titulo: `Melhoria em ${plano.where}: ${plano.what}`,
        categoria: plano.indicador.includes("UPH") || plano.indicador.includes("Produtividade")
          ? "Produtividade"
          : plano.indicador.includes("Retrabalho") || plano.indicador.includes("Erro")
          ? "Qualidade"
          : "Processo",
        setor: plano.where,
        problema: plano.problema,
        analiseCausa: plano.causa,
        acaoImplementada: `${plano.what} (${plano.how})`,
        responsavel: plano.who,
        dataInicio: plano.dataCriacao.slice(0, 10),
        dataFim: dataConclusao.slice(0, 10),
        valorAntes: plano.valorAntes,
        valorDepois,
        unidade: plano.unidade,
        ganhoPercentual: percentualGanho,
        impactoOperacional: impactoDescricao || `Variação de ${percentualGanho}% no indicador ${plano.indicador}`,
        aprendizados: padronizacaoDescricao || "Padronizado no fluxo operacional diário.",
        statusPadronizacao: padronizado ? "Padronizado no POP" : "Em Validação",
      };

      await get().addCase(novoCase);
    }
  },

  deletePlano: async (id) => {
    const novosPlanos = get().planos.filter((p) => p.id !== id);
    set({ planos: novosPlanos });
    localStorage.setItem(STORAGE_KEY_PLANOS, JSON.stringify(novosPlanos));

    try {
      await IndexedDBService.delete("planos_acao", id);
      if (navigator.onLine) {
        await SupabaseService.supabase.from("planos_acao").delete().eq("id", id);
      }
    } catch (e) {
      console.warn("[ActionPlanStore] Delete error:", e);
    }
  },

  addCase: async (novoCase) => {
    const id = (novoCase as any).id || `case-${Date.now()}`;
    const caseCompleto: CaseMelhoria = { ...novoCase, id };
    const novosCases = [caseCompleto, ...get().cases];
    set({ cases: novosCases });
    localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(novosCases));
    return caseCompleto;
  },
}));
