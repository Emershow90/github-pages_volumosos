export interface StoreMaster {
  id: string; // The code/id of the store, e.g., "2350"
  nome: string;
  cidade: string;
  uf: string;
  transportadoraPadrao: string;
  observacoes?: string;
}

export interface StoreOperation {
  id: string; // e.g. "2350_2026-07-05_S87" (loja_date_setor)
  programacaoId: string; // e.g. "2026-07-05"
  lojaId: string; // reference to StoreMaster.id
  nomeLoja: string;
  setor: string; // e.g. "S87", "S88", "S89", "S90"
  transportadora: string;
  corte: string; // e.g. "12:00"
  carregamento: string; // e.g. "15:00"
  volumes: number;
  enderecos: number;
  atividadeRelacionada?: string;

  // Operational Steps
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
  perdeuCorte: boolean;

  updated_at: string;
  updated_by: string;
}

export interface AtividadeLoja {
  id: string; // e.g., "2350_2026-07-05_S87_picking"
  programacaoId: string;
  lojaId: string;
  setor: string;
  tipoAtividade: string; // "Picking", "Volumosos", etc.
  colisProgramados: number;
  colisColetados: number;
  updated_at: string;
}
