import { StoreOperation } from './Store';

export interface RadarFilterConfig {
  setor: string;
  statusSoltura: string;
  statusColeta: string;
  statusCarregamento: string;
  searchTerm: string;
}

export interface RadarSectorMetrics {
  setor: string;
  programado: number; // total programados in colis or volumes
  coletado: number; // total coletados
  restante: number;
  percentual: number;
  proximoCorte: string | null;
  proximaCarga: string | null;
  atrasadosCount: number;
}

export interface ListaColetaItem {
  lista: string; // Unique Identifier
  loja: string;
  setor: number; // 87, 88, 89, 90
  corte: string; // HH:MM
  carregamento: string; // HH:MM
  transportadora: string;
  volumes: number;
  enderecos: number;
  atividadeRelacionada?: string;
  updated_at?: string;
}

export interface RadarLojaStatus {
  lista: string; // Foreign key / join key
  statusSoltura: 'Não Solta' | 'Solta';
  horarioSoltura: string | null;
  soltoPor: string | null;
  statusColeta: 'Não iniciada' | 'Em andamento' | 'Coletada';
  horarioColeta: string | null;
  coletadoPor: string | null;
  statusCarregamento: 'Não carregada' | 'Em andamento' | 'Carregada';
  horarioCarregamento: string | null;
  carregadoPor: string | null;
  statusExpedicao: 'Pendente' | 'Dentro do horário' | 'Dentro da tolerância' | 'Fora do horário';
  updated_at: string; // ISO date string
  updated_by: string; // name / role
}
