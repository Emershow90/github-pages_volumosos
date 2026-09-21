// src/lib/schemas.ts
// =============================================================================
// Schemas Zod centralizados — fonte única de validação de dados externos.
// =============================================================================

import { z } from 'zod';

// =============================================================================
// PRIMITIVOS REUTILIZÁVEIS
// =============================================================================

/** Data em DD/MM/AAAA ou AAAA-MM-DD — normaliza para DD/MM/AAAA */
export const dataBR = z.string()
  .transform(s => s.trim())
  .refine(
    s => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s),
    { message: 'Data inválida. Esperado DD/MM/AAAA ou AAAA-MM-DD' }
  )
  .transform(s => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    }
    const [d, m, y] = s.split('/');
    const ano = y.length === 2 ? `20${y}` : y;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${ano}`;
  });

/** Número aceitando BR (1.234,56) e US (1234.56) — retorna null se vazio */
export const numeroFlex = z.union([
  z.number(),
  z.string().transform((s, ctx) => {
    const limpo = s.trim();
    if (!limpo) return null;

    const temVirgula = limpo.includes(',');
    const temPonto = limpo.includes('.');
    let n: number;

    if (temVirgula && temPonto) {
      // BR: ponto = milhar, virgula = decimal
      n = Number(limpo.replace(/\./g, '').replace(',', '.'));
    } else if (temVirgula) {
      n = Number(limpo.replace(',', '.'));
    } else {
      n = Number(limpo);
    }

    if (!Number.isFinite(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Numero invalido: "${s}"`,
      });
      return z.NEVER;
    }
    return n;
  }),
]).nullable();

/** String obrigatoria (trim + min 1 char) */
export const stringReq = z.string().trim().min(1);

/** String opcional (aceita vazio, default '') */
export const stringOpt = z.string().trim().optional().default('');

// =============================================================================
// ENUMS
// =============================================================================

export const CATEGORIAS_GEMBA = [
  'SEGURANCA',
  'LOCAL DE TRABALHO',
  'EFICIENCIA',
  'QUALIDADE',
  'COMUNICACAO',
  'OUTROS',
] as const;

export const STATUS_GEMBA = [
  'EM CURSO',
  'CONCLUIDO',
  'ATRASADO',
  'EM RISCO',
] as const;

export const categoriaGemba = z.enum(CATEGORIAS_GEMBA);
export const statusGemba = z.enum(STATUS_GEMBA);
export const arquivadoGemba = z.enum(['SIM', 'NAO']);

// =============================================================================
// SCHEMA — CONTROLADORIA (formato pivo)
// =============================================================================

export const painelDiaSchema = z.object({
  setor: z.string().trim().min(1, 'Setor vazio'),
  data: dataBR,
  atividade: numeroFlex,
  caixasReapro: numeroFlex,
  uph: numeroFlex,
  promessa: numeroFlex,
  bsi: numeroFlex,
  colisColeta: numeroFlex,
  auditoria5s: numeroFlex,
  errosPicking: numeroFlex,
});

export type PainelDia = z.infer<typeof painelDiaSchema>;

// =============================================================================
// SCHEMA — GEMBA
// =============================================================================

export const gembaSchema = z.object({
  CATEGORIA: categoriaGemba,
  DESCRICAO: stringReq,
  ACOES: stringOpt,
  RESPONSAVEL: stringReq,
  DATA_ALVO: dataBR,
  IDENTIFICADO_POR: stringReq,
  DATA_IDENTIFICACAO: dataBR,
  STATUS: statusGemba,
  URL_FOTO: z.string().url().or(z.literal('')).optional().default(''),
  ARQUIVADO: arquivadoGemba,
});

export type Gemba = z.infer<typeof gembaSchema>;

// =============================================================================
// SCHEMA — PLANO CARREGAMENTO
// =============================================================================

export const planoCarregamentoSchema = z.object({
  Data: dataBR,
  'Dia da Semana': stringReq,
  'Hora Carregamento': z.string().regex(/^\d{2}:\d{2}$/, 'Hora invalida (esperado HH:MM)'),
  'Cod Loja': stringReq,
  'Nome da Loja': stringReq,
  Setor: stringOpt,
  Tipologia: stringOpt,
  Transportadora: stringOpt,
});

export type PlanoCarregamento = z.infer<typeof planoCarregamentoSchema>;

// =============================================================================
// SCHEMA — BD (lojas master)
// =============================================================================

export const bdSchema = z.object({
  'Cod Loja': stringReq,
  'Nome da Loja': stringReq,
  Cidade: stringOpt,
  UF: z.string().trim().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
  Data: dataBR.optional(),
  'Hora Carregamento': stringOpt,
  Setor: stringOpt,
  'Transportadora Padrao': stringOpt,
});

export type BD = z.infer<typeof bdSchema>;

// =============================================================================
// RESULTADO DE PARSE (para auditoria)
// =============================================================================

export interface ParseIssue {
  sheet: string;
  rowIndex: number;
  rawValue: unknown;
  reason: string;
  severity: 'warning' | 'error' | 'critical';
}

export interface ParseResult<T> {
  data: T[];
  issues: ParseIssue[];
  totalRead: number;
  totalValid: number;
}
