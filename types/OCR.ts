export interface ParsedProgramRow {
  lojaId: string; // "2350"
  nomeLoja: string; // "Decathlon Campinas"
  cidade: string;
  uf: string;
  setor: string; // "S87"
  corte: string; // "12:00"
  carregamento: string; // "15:00"
  transportadora: string;
  volumes: number;
  enderecos: number;
  atividadeRelacionada?: string;
  dataProgramacao: string; // "2026-07-05"
}

export interface OCRResult {
  rows: ParsedProgramRow[];
  timestamp: string;
  confidence: number;
}
