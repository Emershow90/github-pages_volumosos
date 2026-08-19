export interface Setor {
  id: string; // e.g. "S87"
  numero: number; // e.g. 87
  nome: string; // e.g. "Picking"
  resp: string; // Responsável / Líder
  fotoLider?: string;
  equipe?: string[];
  meta: number;
  horario?: string;
  situacao?: 'Ativo' | 'Inativo';
  
  // Configuração por tipo de operação/setor
  tipoOperacao?: 'PADRAO' | 'CAIXAS' | 'VOLUMOSOS';
  fonteAtividade?: 'monitor_setores_ativos' | 'atividade_h3';
  fonteColis?: 'kpi_semana' | 'sistema';
  exibirCaixas?: boolean;
  exibirReposicaoCaixas?: boolean;
  
  // Realtime computed or loaded metrics
  ativ: number;
  promessa: number;
  varFin: number;
  bsi: number;
  nota5s: number;
  errosPicking: number;
  reproTotal: number;
  infracaoSeguranca: boolean;
  horasDKT: number;
  poliRec: number;
  rdl: number;
  poliSaid: number;
  coletado: number;
  uph: number;
}

export interface CapacidadeSetor {
  id: string; // e.g. "S87"
  abertura: number;
  fechoHora: number;
}
