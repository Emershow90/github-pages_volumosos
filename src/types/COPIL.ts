export interface MatrizPerformanceItem {
  id?: string;
  setor: string; // '87', '88', '89', '90', 'ELOG', etc.
  semana: number;
  ano: number;
  pilotagem: number;
  volume_que_caiu: number;
  percentual: number;
  horas_planning: number;
  horas_terceiros: number;
  poli_entrada: number;
  poli_saida: number;
  capacidade: number;
  total_coletado: number;
  produtividade: number; // UPH
  promessa: number; // %
  lead_time: number;
  aderencia: number; // %
  created_at?: string;
  updated_at?: string;
}

export interface CopilSectorData {
  setorId: string;
  operacionais: any[];
  economico: any[];
  seguranca: any[];
  lastUpdated: string;
}
