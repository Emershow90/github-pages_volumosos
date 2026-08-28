export type PromiseSLA = 'D+2' | 'D+1' | 'D-0' | 'D-1' | 'D-2';

export interface PromiseBucketInfo {
  sla: PromiseSLA;
  label: string;
  descricao: string;
  volume: number;
  percentage: number;
  lojasCount: number;
  status: 'ideal' | 'normal' | 'atencao' | 'critico';
}

export interface SectorBalanceAdvice {
  sectorId: string;
  sectorName: string;
  volumeTotal: number;
  currentHeadcount: number;
  suggestedHeadcount: number;
  deltaHeadcount: number; // >0 precisa de reforço, <0 pode ceder
  currentUPH: number;
  targetUPH: number;
  estimatedHours: number;
  riskStatus: 'baixo' | 'moderado' | 'alto' | 'critico';
  advice: string;
}

export interface PriorityStoreItem {
  lojaId: string;
  nomeLoja: string;
  setor: string;
  corte: string;
  carregamento: string;
  volume: number;
  promessa: PromiseSLA;
  motivoPrioridade: string;
  acaoSugerida: string;
}

export interface AIStrategyPlan {
  timestamp: string;
  estrategiaPrincipal: 'PRIORIDADE_LOJAS' | 'COLETA_TOTAL';
  tituloEstrategia: string;
  diagnosticoGeral: string;
  scoreOperacional: number; // 0 a 100
  capacidadeTotalHoras: number;
  demandaTotalHoras: number;
  taxaOcupacao: number; // %
  promessas: {
    buckets: Record<PromiseSLA, PromiseBucketInfo>;
    resumoSLA: string;
    taxaNoPrazo: number;
  };
  balanceamento: {
    setores: SectorBalanceAdvice[];
    transferenciasSugeridas: Array<{
      origemSetor: string;
      destinoSetor: string;
      quantidadeOperadores: number;
      justificativa: string;
    }>;
  };
  plano4Etapas: {
    soltura: { status: string; acao: string; prioridades: string[] };
    coleta: { status: string; acao: string; modoOperacao: string };
    carga: { status: string; acao: string; docasRecomendadas?: string };
    expedicao: { status: string; acao: string; riscoAtrasoGeral: string };
  };
  lojasPrioritarias: PriorityStoreItem[];
  contingencia: string;
}
