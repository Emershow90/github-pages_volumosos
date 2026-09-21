export interface GembaCard {
  id: string;
  categoria: string;
  descricao: string;
  acoes: string;
  responsavel: string;
  data_alvo: string; // YYYY-MM-DD
  identificador: string;
  data_id: string; // YYYY-MM-DD
  status: 'EM CURSO' | 'CONCLUÍDO' | 'ATRASADO' | 'EM RISCO';
  foto_url: string;
  arquivado: boolean;
  created_at?: string;
  updated_at?: string;
  historico: { data: string; acao: string }[];
}
