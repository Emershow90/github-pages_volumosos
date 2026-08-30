export interface SectorOverrideValues {
  ativ?: number | null;
  uph?: number | null;
  reproTotal?: number | null;
  colis?: number | null;
  promessa?: number | null;
  nota5s?: number | null;
  bsi?: number | null;
  errosPicking?: number | null;
}

export interface Setor {
  id: string; // e.g. "87" or "S87"
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
  fonteAtividade?: string;
  fonteColis?: string;
  exibirCaixas?: boolean;
  exibirReposicaoCaixas?: boolean;
  
  // Overrides e Valores Sugeridos
  overrides?: SectorOverrideValues;
  suggestedMetrics?: SectorOverrideValues;

  // Realtime computed or loaded metrics (Valores Finais Resolvidos)
  ativ: number;
  colis?: number;
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

export type SetorData = Setor & {
  metaHora?: number;
};
