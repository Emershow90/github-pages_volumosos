/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ColaboradorStatus {
  Operacao = "Operacao",
  Poli = "Poli",
  BH = "BH",
  Ausente = "Ausente",
}
import { UserRole } from './types/Usuario';

export interface Setor {
  id: string;
  resp: string;
  ativ: number;
  promessa: number;
  varFin: number;
  bsi: number;
  nota5s: number;
  errosPicking: number;
  reproTotal: number;
  infracaoSeguranca: boolean;
  fotoLider?: string;
  horasDKT: number;
  poliRec: number;
  rdl: number;
  poliSaid: number;
  coletado: number;
  uph: number;
}

export interface Colaborador {
  id: string;
  nome: string;
  setor: string; // e.g. "Setor 87"
  status: ColaboradorStatus;
  foto?: string;
  horas: number;
  matricula?: string;
  cargo?: string;
  lider?: boolean;
  turno?: string;
  funcao?: string;
  inicioTurno?: string;
  fimTurno?: string;
  produtividade?: number;
  historico?: any[];
}

export interface ReferenteSemana {
  dia: string; // e.g. "segunda", "terca", "quarta"...
  ref87: string;
  refVol: string;
  apoios?: string;
}

export interface EscalaColaborador {
  id: string;
  colaborador_id: string;
  data: string;
  turno: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface UniversoMix {
  id?: string;
  setor_id: string;
  nome: string;
  meta: number;
  feito: number;
}

export interface CopilMatrizRow {
  id?: string;
  setor_id: string;
  grupo: 'operacionais' | 'economico' | 'seguranca';
  kpi: string;
  comp: string;
  real: string;
  inverso?: boolean;
  auto?: boolean;
  tolerancia?: string;
  regraCalculo?: string;
  criterio?: string;
  notaManual?: string;
  calcNota?: boolean;
}

export interface CapacidadeSetor {
  id: string;
  abertura: number;
  fechoHora: number;
}

export interface RadarLoja {
  corte: string;
  loja: string;
  vol: number;
  ativ: number;
  prog: number; // percentage
}

export interface MasterLoja {
  id: string;
  nome: string;
  cortePadrao: string;
  volEsperado: number;
}

export interface ReaproSetor {
  feitoDAll: number;
  feitoElog: number;
}

export interface ReaproData {
  setores: Record<string, ReaproSetor>;
  indicadores: {
    totalPresoDAll: number;
    emCursoColetado: number;
    totalEmMaquina: number;
    disponibilidade: number;
  };
  terminoPrevisao: string;
  capacidadeFechamentoEst: number;
  listasFechadas: {
    artigos: number;
    colis: number;
  };
}

export interface BolsaoData {
  hojeMeta: number;
  hojeFeito: number;
  amanhaMeta: number;
  amanhaFeito: number;
}

export interface CopilKPI {
  kpi: string;
  comp: string; // Target / Comparison value
  real: string; // Current real value
  tolerancia?: string;
  regraCalculo?: string;
  criterio?: string;
  notaManual?: string;
  calcNota: boolean;
  inverso: boolean;
  auto: boolean;
}

export interface CopilSetor {
  operacionais: CopilKPI[];
  economico: CopilKPI[];
  seguranca: CopilKPI[];
}

export interface HistoricoRegistro {
  data: string;
  hora: string;
  semana: string;
  turno: string;
  setor: string;
  ativ: number;
  uph: number;
  repro: number;
  promessa: number;
  nota5s: number;
  erros: number;
}

export interface AlertLog {
  id: string;
  tipo?: string;
  prioridade: "critica" | "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  setor: string;
  hora: string;
  lido: boolean;
}

export interface AuditLog {
  id?: string;
  data: string;
  usuario: string;
  acao: string;
  campo: string;
  valorAnterior: string | number | null | boolean;
  valorNovo: string | number | null | boolean;
  dispositivo: string;
}

export interface UserAccount {
  user: string;
  pass: string;
  role: UserRole;
}

export interface ScreensaverConfig {
  enabled: boolean;
  timeout: number; // in seconds
  duration: number; // in seconds
  image?: string;
}

export interface SystemState {
  setores: Setor[];
  colaboradores: Colaborador[];
  historico: HistoricoRegistro[];
  universos: Record<string, UniversoMix[]>; // Mix activities by sector
  referentesSemana: ReferenteSemana[];
  copilData: Record<string, CopilSetor>;
  radar: RadarLoja[];
  capacidade: CapacidadeSetor[];
  reaproData: ReaproData;
  bolsaoData: BolsaoData;
  coordenador: string;
  fotoCoordenador: string;
  copilActiveSector: string;
  prodActiveSector: string;
  alerts: AlertLog[];
  audit: AuditLog[];
  currentUser: string | null;
  currentRole: UserRole | null;
  screensaver: ScreensaverConfig;
}

export * from './types/Store';
export * from './types/Radar';
export * from './types/KPI';
export * from './types/Setor';
export * from './types/Usuario';
export * from './types/OCR';
export * from './types/COPIL';
