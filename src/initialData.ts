/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColaboradorStatus,
  SystemState,
  Setor,
  Colaborador,
  ReferenteSemana,
  CapacidadeSetor,
  RadarLoja,
  ReaproData,
  BolsaoData,
  CopilSetor,
  UserRole,
  MasterLoja,
} from "./types";

export const initialSetores: Setor[] = [
  {
    id: "87",
    resp: "HELOISA GONGALVES DE SALES",
    ativ: 15899,
    promessa: 100.0,
    varFin: 1540.2,
    bsi: 100,
    nota5s: 100,
    errosPicking: 0,
    reproTotal: 151,
    infracaoSeguranca: false,
    fotoLider: "",
    horasDKT: 14.4,
    poliRec: 0,
    rdl: 0,
    poliSaid: 0,
    coletado: 7920,
    uph: 550,
  },
  {
    id: "88",
    resp: "MATHEUS PINHEIRO",
    ativ: 5965,
    promessa: 99.5,
    varFin: 430.5,
    bsi: 100,
    nota5s: 100,
    errosPicking: 0.2,
    reproTotal: 127,
    infracaoSeguranca: false,
    fotoLider: "",
    horasDKT: 14.4,
    poliRec: 0,
    rdl: 0,
    poliSaid: 0,
    coletado: 6480,
    uph: 450,
  },
  {
    id: "89",
    resp: "JOSE ANDRE DEODATO DA SILVA",
    ativ: 84,
    promessa: 98.0,
    varFin: -120.0,
    bsi: 100,
    nota5s: 100,
    errosPicking: 0.5,
    reproTotal: 98,
    infracaoSeguranca: false,
    fotoLider: "",
    horasDKT: 7.2,
    poliRec: 0,
    rdl: 0,
    poliSaid: 0,
    coletado: 2160,
    uph: 300,
  },
  {
    id: "90",
    resp: "DIEGO GONCALVES",
    ativ: 591,
    promessa: 98.0,
    varFin: 85.0,
    bsi: 100,
    nota5s: 100,
    errosPicking: 0.1,
    reproTotal: 99,
    infracaoSeguranca: false,
    fotoLider: "",
    horasDKT: 7.2,
    poliRec: 0,
    rdl: 0,
    poliSaid: 0,
    coletado: 3240,
    uph: 450,
  },
];

export const initialColaboradores: Colaborador[] = [
  {
    id: "col-001",
    nome: "HELOISA GONGALVES DE SALES",
    setor: "Setor 87",
    status: ColaboradorStatus.Operacao,
    foto: "",
    horas: 7.2,
    matricula: "12345",
    cargo: "Líder de Equipe",
    lider: true,
    turno: "T1",
    funcao: "Picking",
    inicioTurno: "07:00",
    fimTurno: "15:00",
    produtividade: 550,
    historico: [],
  },
  {
    id: "col-002",
    nome: "MATHEUS PINHEIRO",
    setor: "Setor 88",
    status: ColaboradorStatus.Operacao,
    foto: "",
    horas: 7.2,
    matricula: "12346",
    cargo: "Operador",
    lider: false,
    turno: "T1",
    funcao: "Picking",
    inicioTurno: "07:00",
    fimTurno: "15:00",
    produtividade: 450,
    historico: [],
  },
  {
    id: "col-003",
    nome: "JOSE ANDRE DEODATO DA SILVA",
    setor: "Setor 89",
    status: ColaboradorStatus.Operacao,
    foto: "",
    horas: 7.2,
    matricula: "12347",
    cargo: "Operador",
    lider: false,
    turno: "T1",
    funcao: "Picking",
    inicioTurno: "07:00",
    fimTurno: "15:00",
    produtividade: 300,
    historico: [],
  },
  {
    id: "col-004",
    nome: "DIEGO GONCALVES",
    setor: "Setor 90",
    status: ColaboradorStatus.Operacao,
    foto: "",
    horas: 7.2,
    matricula: "12348",
    cargo: "Operador",
    lider: false,
    turno: "T1",
    funcao: "Picking",
    inicioTurno: "07:00",
    fimTurno: "15:00",
    produtividade: 450,
    historico: [],
  },
];

export const initialReferentesSemana: ReferenteSemana[] = [
  { dia: "segunda", ref87: "HELOISA GONGALVES DE SALES", refVol: "DIEGO GONCALVES", apoios: "Matheus" },
  { dia: "terca", ref87: "HELOISA GONGALVES DE SALES", refVol: "MATHEUS PINHEIRO", apoios: "Diego" },
  { dia: "quarta", ref87: "HELOISA GONGALVES DE SALES", refVol: "MATHEUS PINHEIRO", apoios: "" },
  { dia: "quinta", ref87: "HELOISA GONGALVES DE SALES", refVol: "JOSE ANDRE DEODATO", apoios: "Matheus" },
  { dia: "sexta", ref87: "HELOISA GONGALVES DE SALES", refVol: "DIEGO GONCALVES", apoios: "Jose Andre" },
  { dia: "sabado", ref87: "HELOISA GONGALVES DE SALES", refVol: "MATHEUS PINHEIRO", apoios: "" },
  { dia: "domingo", ref87: "HELOISA GONGALVES DE SALES", refVol: "DIEGO GONCALVES", apoios: "" },
];

export const initialCapacidade: CapacidadeSetor[] = [
  { id: "87", abertura: 5436, fechoHora: 47 },
  { id: "88", abertura: 7008, fechoHora: 23 },
  { id: "89", abertura: 161, fechoHora: 8 },
  { id: "90", abertura: 496, fechoHora: 8 },
];

export const masterCadastroLojas: MasterLoja[] = [
  { id: "2722", nome: "FLORIPA CONTINENTE", cortePadrao: "07:00", volEsperado: 3787 },
  { id: "2360", nome: "OSASCO", cortePadrao: "08:00", volEsperado: 6800 },
  { id: "1250", nome: "SÃO JOSÉ DOS CAMPOS", cortePadrao: "10:00", volEsperado: 4500 },
  { id: "1540", nome: "CURITIBA", cortePadrao: "12:00", volEsperado: 3100 },
  { id: "1990", nome: "PORTO ALEGRE", cortePadrao: "14:00", volEsperado: 5500 },
  { id: "3015", nome: "CAMPINAS", cortePadrao: "16:00", volEsperado: 2900 }
];

export const initialRadar: RadarLoja[] = [
  { corte: "07:00", loja: "2722 - FLORIPA CONTINENTE", vol: 3787, ativ: 52700, prog: 52, statusOCR: "registrada" },
  { corte: "08:00", loja: "2360 - OSASCO", vol: 6817, ativ: 5750, prog: 72, statusOCR: "divergente", erroDesc: "Volume real de 6817 difere do cadastrado de 6800" },
  { corte: "10:00", loja: "1250 - SÃO JOSÉ DOS CAMPOS", vol: 0, ativ: 0, prog: 0, statusOCR: "pendente", erroDesc: "Aguardando início da expedição" },
];

export const initialReapro: ReaproData = {
  setores: {
    "87": { feitoDAll: 1065, feitoElog: 84 },
    "88": { feitoDAll: 151, feitoElog: 0 },
    "89": { feitoDAll: 45, feitoElog: 0 },
    "90": { feitoDAll: 0, feitoElog: 0 },
  },
  indicadores: {
    totalPresoDAll: 31,
    emCursoColetado: 106067,
    totalEmMaquina: 9042,
    disponibilidade: 100,
  },
  terminoPrevisao: "15:42",
  capacidadeFechamentoEst: 1149,
  listasFechadas: {
    artigos: 509,
    colis: 29,
  },
};

export const initialBolsao: BolsaoData = {
  hojeMeta: 12000,
  hojeFeito: 8500,
  amanhaMeta: 4000,
  amanhaFeito: 1200,
};

export const initialCopil: Record<string, CopilSetor> = {
  "87": {
    operacionais: [
      { kpi: "Pilotagem", comp: "100", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Produtividade Picking", comp: "550", real: "550", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Picking", comp: "1000", real: "950", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Promessa", comp: "95", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Lead Time", comp: "120", real: "110", tolerancia: "±15%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Aderência ao Corte", comp: "98", real: "97", tolerancia: "±2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Erro de Picking", comp: "1", real: "0", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: true },
      { kpi: "PPM Erro de Picking", comp: "100", real: "80", tolerancia: "±10", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false },
      { kpi: "SAC Logístico", comp: "98.5", real: "99", tolerancia: "±1.5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Taxa de Inventário", comp: "99.8", real: "99.9", tolerancia: "±0.2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "5S Área", comp: "90", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true }
    ],
    economico: [
      { kpi: "Variação de Estoque (Demarca/Sumarca)", comp: "438", real: "250", tolerancia: "±Meta", regraCalculo: "Variação de Estoque", criterio: "Dentro da Meta (±Meta) = A", calcNota: true, inverso: false, auto: false }
    ],
    seguranca: [
      { kpi: "Segurança (Infrações)", comp: "0", real: "0", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false }
    ]
  },
  "88": {
    operacionais: [
      { kpi: "Pilotagem", comp: "100", real: "98", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Produtividade Picking", comp: "550", real: "450", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Picking", comp: "1000", real: "880", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Promessa", comp: "95", real: "99.5", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Lead Time", comp: "120", real: "125", tolerancia: "±15%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Aderência ao Corte", comp: "98", real: "95", tolerancia: "±2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Erro de Picking", comp: "1", real: "0.2", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: true },
      { kpi: "PPM Erro de Picking", comp: "100", real: "110", tolerancia: "±10", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false },
      { kpi: "SAC Logístico", comp: "98.5", real: "97.5", tolerancia: "±1.5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Taxa de Inventário", comp: "99.8", real: "99.5", tolerancia: "±0.2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "5S Área", comp: "90", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true }
    ],
    economico: [
      { kpi: "Variação de Estoque (Demarca/Sumarca)", comp: "438", real: "430.5", tolerancia: "±Meta", regraCalculo: "Variação de Estoque", criterio: "Dentro da Meta (±Meta) = A", calcNota: true, inverso: false, auto: false }
    ],
    seguranca: [
      { kpi: "Segurança (Infrações)", comp: "0", real: "0", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false }
    ]
  },
  "89": {
    operacionais: [
      { kpi: "Pilotagem", comp: "100", real: "90", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Produtividade Picking", comp: "550", real: "300", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Picking", comp: "1000", real: "700", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Promessa", comp: "95", real: "98", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Lead Time", comp: "120", real: "140", tolerancia: "±15%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Aderência ao Corte", comp: "98", real: "90", tolerancia: "±2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Erro de Picking", comp: "1", real: "0.5", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: true },
      { kpi: "PPM Erro de Picking", comp: "100", real: "150", tolerancia: "±10", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false },
      { kpi: "SAC Logístico", comp: "98.5", real: "96.2", tolerancia: "±1.5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Taxa de Inventário", comp: "99.8", real: "99.0", tolerancia: "±0.2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "5S Área", comp: "90", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true }
    ],
    economico: [
      { kpi: "Variação de Estoque (Demarca/Sumarca)", comp: "438", real: "-120", tolerancia: "±Meta", regraCalculo: "Variação de Estoque", criterio: "Dentro da Meta (±Meta) = A", calcNota: true, inverso: false, auto: false }
    ],
    seguranca: [
      { kpi: "Segurança (Infrações)", comp: "0", real: "1", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false }
    ]
  },
  "90": {
    operacionais: [
      { kpi: "Pilotagem", comp: "100", real: "99", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Produtividade Picking", comp: "550", real: "450", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Picking", comp: "1000", real: "910", tolerancia: "±10%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Promessa", comp: "95", real: "98", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true },
      { kpi: "Lead Time", comp: "120", real: "115", tolerancia: "±15%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Aderência ao Corte", comp: "98", real: "98", tolerancia: "±2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Erro de Picking", comp: "1", real: "0.1", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: true },
      { kpi: "PPM Erro de Picking", comp: "100", real: "90", tolerancia: "±10", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false },
      { kpi: "SAC Logístico", comp: "98.5", real: "98.8", tolerancia: "±1.5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "Taxa de Inventário", comp: "99.8", real: "99.7", tolerancia: "±0.2%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: false },
      { kpi: "5S Área", comp: "90", real: "100", tolerancia: "±5%", regraCalculo: "Padrão", criterio: "Real/Meta >= 1.00 = A", calcNota: true, inverso: false, auto: true }
    ],
    economico: [
      { kpi: "Variação de Estoque (Demarca/Sumarca)", comp: "438", real: "85", tolerancia: "±Meta", regraCalculo: "Variação de Estoque", criterio: "Dentro da Meta (±Meta) = A", calcNota: true, inverso: false, auto: false }
    ],
    seguranca: [
      { kpi: "Segurança (Infrações)", comp: "0", real: "0", tolerancia: "0", regraCalculo: "Inverso", criterio: "Real <= Meta = A", calcNota: true, inverso: true, auto: false }
    ]
  }
};

import { UniversoMix } from './types';

export const initialUniversos: Record<string, UniversoMix[]> = {
  "87": [
    { setor_id: "87", nome: "Expedição Montanha", meta: 1200, feito: 850 },
    { setor_id: "87", nome: "Picking Decote", meta: 800, feito: 800 },
    { setor_id: "87", nome: "Triagem Sul", meta: 2000, feito: 1200 },
  ],
  "88": [
    { setor_id: "88", nome: "Expedição Vale", meta: 1500, feito: 1200 },
    { setor_id: "88", nome: "Reabastecimento", meta: 500, feito: 150 },
  ],
  "89": [
    { setor_id: "89", nome: "Picking Especial", meta: 400, feito: 400 },
  ],
  "90": [
    { setor_id: "90", nome: "Recebimento Carga", meta: 1000, feito: 900 },
  ],
};

export const initialSystemState: SystemState = {
  setores: initialSetores,
  colaboradores: initialColaboradores,
  historico: [
    {
      data: "28/06/2026",
      hora: "14:30:00",
      semana: "S4",
      turno: "Manhã",
      setor: "87",
      ativ: 15899,
      uph: 550,
      repro: 151,
      promessa: 100,
      nota5s: 100,
      erros: 0,
    },
    {
      data: "28/06/2026",
      hora: "14:45:00",
      semana: "S4",
      turno: "Manhã",
      setor: "88",
      ativ: 5965,
      uph: 450,
      repro: 127,
      promessa: 99.5,
      nota5s: 100,
      erros: 0.2,
    },
  ],
  universos: initialUniversos,
  referentesSemana: initialReferentesSemana,
  copilData: initialCopil,
  radar: initialRadar,
  capacidade: initialCapacidade,
  reaproData: initialReapro,
  bolsaoData: initialBolsao,
  coordenador: "HELOISA GONGALVES DE SALES",
  fotoCoordenador: "",
  copilActiveSector: "87",
  prodActiveSector: "87",
  alerts: [
    {
      id: "alert-1",
      tipo: "segurança",
      prioridade: "alta",
      titulo: "S89: Atenção no BSI",
      descricao: "BSI abaixo do ideal de 99% verificado no checklist matinal.",
      setor: "89",
      hora: new Date().toISOString(),
      lido: false,
    }
  ],
  audit: [
    {
      data: new Date().toISOString(),
      usuario: "Sistema",
      acao: "Inicialização",
      campo: "Estado",
      valorAnterior: null,
      valorNovo: "Sucesso",
      dispositivo: "Servidor",
    }
  ],
  currentUser: "admin",
  currentRole: UserRole.Admin,
  screensaver: {
    enabled: true,
    timeout: 300, // 5 minutes
    duration: 30, // 30 seconds
    image: "",
  },
};
