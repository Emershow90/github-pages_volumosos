export type StatusPlanoAcao = "Aberto" | "Em Andamento" | "Concluido" | "Cancelado";

export interface PlanoAcao5W2H {
  id: string;
  gargaloId?: string;
  problema: string;
  causa: string;
  // 5W2H
  what: string;         // O quê fazer?
  why: string;          // Por quê? (Justificativa)
  where: string;        // Onde? (Setor / Rua / Linha)
  when: string;         // Quando? (Prazo limite YYYY-MM-DD)
  who: string;          // Quem? (Responsável)
  how: string;          // Como? (Procedimento)
  howMuch?: string;     // Quanto custa / Recursos?
  // Metas & Medição (Antes x Depois)
  indicador: string;    // ex: UPH, Retrabalho, Erros
  unidade: string;      // ex: cx/h, %, un
  valorAntes: number;
  metaEsperada: number;
  valorDepois?: number;
  percentualGanho?: number;
  metaAtingida?: boolean;
  impactoDescricao?: string;
  // Status & Governança
  status: StatusPlanoAcao;
  padronizado: boolean; // Se a melhoria virou POP / Padrão
  padronizacaoDescricao?: string;
  criadoPor: string;
  dataCriacao: string;
  dataConclusao?: string;
  observacoes?: string;
}

export interface CaseMelhoria {
  id: string;
  planoAcaoId?: string;
  titulo: string;
  categoria: "Produtividade" | "Qualidade" | "Ergonomia & Segurança" | "Processo" | "SLA";
  setor: string;
  problema: string;
  analiseCausa: string;
  acaoImplementada: string;
  responsavel: string;
  dataInicio: string;
  dataFim: string;
  valorAntes: number;
  valorDepois: number;
  unidade: string;
  ganhoPercentual: number;
  impactoOperacional: string;
  aprendizados: string;
  statusPadronizacao: "Em Validação" | "Padronizado no POP" | "Revisando";
}
