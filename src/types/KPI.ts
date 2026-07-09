export interface KPI {
  id: string;
  nome: string;
  meta: number | string;
  real: number | string;
  nota: string; // e.g. "A", "B", "C", "D"
  tipo: 'operacional' | 'economico' | 'seguranca';
  setor: string; // e.g. "S87", "S88", "S89", "S90"
  ultimaAtualizacao: string;
  responsavel: string;
  tolerancia?: string;
  regraCalculo?: string;
  criterio?: string;
  notaManual?: string;
  calcNota: boolean;
  inverso: boolean;
  auto: boolean;
}

export interface HistoricoKPI {
  id: string;
  data: string;
  setor: string;
  kpiId: string;
  nomeKpi: string;
  valorReal: number | string;
  valorMeta: number | string;
  nota: string;
}
