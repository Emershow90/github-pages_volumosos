export type NivelPrioridade = "Critico" | "Atencao" | "Controlado";

export interface DiagnosticoGargalo {
  id: string;
  titulo: string;
  setorId?: string;
  setorNome: string;
  rua?: string;
  processo: string;
  indicador: string;
  valorAtual: number | string;
  meta: number | string;
  unidade: string;
  desvioPercentual: number;
  impactoHorasEstimado: number;
  urgencia: "Alta" | "Media" | "Baixa";
  frequenciaTurnos: number;
  prioridadeScore: number;
  prioridadeNivel: NivelPrioridade;
  causaProvavel: string;
  evidencia: string;
  acaoRecomendada: string;
  dataIdentificacao: string;
}
