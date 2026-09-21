export type OperationalStage = 'Soltura' | 'Coleta' | 'Carga' | 'Expedição';

export interface StageForecast {
  stage: OperationalStage;
  descricao: string;
  historicalAvgVolume: number;
  predictedVolume: number;
  targetUPH: number;
  requiredHeadcount: number;
  estimatedHours: number;
  status: 'adequado' | 'atencao' | 'critico';
  insights: string;
}

export interface SectorForecast {
  setorId: string;
  setorName: string;
  volumePrevisto: number;
  percentualTotal: number;
  headcountSugerido: number;
  uphAlvo: number;
  capacidadeEstimada: number;
  taxaOcupacao: number;
  gargaloPotencial: boolean;
}

export interface ShiftDistributionForecast {
  turno: string;
  volumePrevisto: number;
  percentual: number;
  operadoresSugeridos: number;
  focoOperacional: string;
}

export interface CargoVolumeForecast {
  timestamp: string;
  targetDate: string;
  dayOfWeek: string;
  
  // Totais Previstos
  totalCargoVolume: number;
  confidenceInterval: {
    min: number;
    expected: number;
    max: number;
    confidenceScore: number; // 0-100%
  };

  // Comparativo com Médias Históricas
  historicalAverages: {
    totalRecordsAnalyzed: number;
    avgDailyVolume: number;
    avgSoltura: number;
    avgColeta: number;
    avgCarga: number;
    avgExpedicao: number;
    avgUPH: number;
    avgSLA: number;
    growthVsAvg: number; // % crescimento estimado em relação à média
  };

  // Previsão detalhada pelas 4 Etapas
  stages: {
    soltura: StageForecast;
    coleta: StageForecast;
    carga: StageForecast;
    expedicao: StageForecast;
  };

  // Previsão por Setor (S87, S88, S89, S90)
  sectors: SectorForecast[];

  // Distribuição por Turnos
  turnos: ShiftDistributionForecast[];

  // Recomendações e Dimensionamento da IA Gemini
  recomendacoesIA: {
    resumoExecutivo: string;
    estrategiaCarga: string;
    alertasGargalos: string[];
    planoAcao: string[];
  };

  source: 'gemini_3.7_flash' | 'local_deterministic_forecast';
}
