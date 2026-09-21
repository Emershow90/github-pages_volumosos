// src/services/sheetsService.ts
// =============================================================================
// Leitura da Planilha Mestre publicada na web, com validacao rigorosa via Zod.
// Sem OAuth, sem backend. Formato: /pub?gid={GID}&single=true&output=csv
// =============================================================================

import { z } from 'zod';
import {
  painelDiaSchema,
  gembaSchema,
  planoCarregamentoSchema,
  bdSchema,
  type PainelDia,
  type Gemba,
  type PlanoCarregamento,
  type BD,
  type ParseIssue,
  type ParseResult,
} from '../lib/schemas';

// =============================================================================
// CONFIGURACAO
// =============================================================================

const PUBLISHED_ID =
  '2PACX-1vTy_lfMaDqE48mRuMZJ_nBP2R4qbDG7wYEA3vtIeHOhMTTxjYHPZzGPcJrWvaIokP0EaRrMGf_1UoP2';

export const SHEET_GIDS = {
  formulario: '357189506',
  kpiSemana: '923146476',
  kpiMensal: '954908232',
  auditoria: '792495223',
  controleHoras: '670888141',
  controladoria: '76919113',
  planoCarregamento: '376916622',
  copiaKpiMes: '189423698',
  bd: '1732964393',
  gemba: 'GID_GEMBA_AQUI', // Substitua pelo GID real da aba GEMBA
} as const;

export type SheetKey = keyof typeof SHEET_GIDS;

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

function buildUrl(sheet: SheetKey): string {
  const gid = SHEET_GIDS[sheet];
  return `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
}

/** URL publica para abrir a planilha em nova aba (modo HTML) */
export function buildViewerUrl(sheet: SheetKey): string {
  const gid = SHEET_GIDS[sheet];
  return `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=html`;
}

// =============================================================================
// FETCH + CACHE
// =============================================================================

async function fetchCsv(sheet: SheetKey, force = false): Promise<string> {
  const url = buildUrl(sheet);
  const now = Date.now();

  if (!force) {
    const hit = cache.get(url);
    if (hit && now - hit.at < CACHE_TTL_MS) {
      return hit.data as string;
    }
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ao buscar "${sheet}". ` +
      `Verifique se a aba esta publicada em: Arquivo > Compartilhar > Publicar na web.`
    );
  }

  const text = await res.text();
  cache.set(url, { at: now, data: text });
  return text;
}

/** Compatibilidade retroativa: fetch generico retornando objetos */
export async function fetchPublishedSheet<T = Record<string, string>>(
  sheet: SheetKey,
  opts: { force?: boolean } = {}
): Promise<T[]> {
  const csv = await fetchCsv(sheet, opts.force);
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
    return obj as T;
  });
}

export function clearSheetsCache(): void {
  cache.clear();
}

// =============================================================================
// CSV PARSER (robusto — suporta aspas duplas escapadas)
// =============================================================================

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r') { /* ignorar \r */ }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// =============================================================================
// VALIDACAO EM LOTE — generico
// =============================================================================

function validateRows<T>(
  rows: unknown[],
  schema: z.ZodType<T>,
  sheetName: string
): ParseResult<T> {
  const data: T[] = [];
  const issues: ParseIssue[] = [];

  rows.forEach((raw, idx) => {
    const result = schema.safeParse(raw);

    if (result.success) {
      data.push(result.data);
    } else {
      result.error.issues.forEach(issue => {
        const reason = `${issue.path.join('.')}: ${issue.message}`;
        console.warn(`[sheetsService] Falha no parse`, {
          sheet: sheetName,
          rowIndex: idx,
          raw,
          reason,
        });
        issues.push({
          sheet: sheetName,
          rowIndex: idx,
          rawValue: raw,
          reason,
          severity: 'warning',
        });
      });
    }
  });

  return {
    data,
    issues,
    totalRead: rows.length,
    totalValid: data.length,
  };
}

// =============================================================================
// 1) CONTROLADORIA — parser do formato pivo
// =============================================================================

/** Interface de resultado estendida com metadados de pivo */
export interface PainelResult extends ParseResult<PainelDia> {
  datasEncontradas: string[];
  setoresEncontrados: string[];
}

/** Interface legada para retrocompatibilidade */
export interface PainelDiaRow {
  setor: string;
  data: string;
  atividade: number | null;
  caixasReapro: number | null;
  uph: number | null;
  promessa: number | null;
  bsi: number | null;
  colisColeta: number | null;
  auditoria5s: number | null;
  errosPicking: number | null;
}

const METRIC_MATCHERS: Array<{
  key: keyof Omit<PainelDiaRow, 'setor' | 'data'>;
  re: RegExp;
}> = [
  { key: 'atividade',    re: /ATIVIDADE/i },
  { key: 'caixasReapro', re: /(CAIXAS\s*DISPON|REAPRO)/i },
  { key: 'uph',          re: /\bUPH\b/i },
  { key: 'promessa',     re: /PROMESSA/i },
  { key: 'bsi',          re: /\bBSI\b/i },
  { key: 'colisColeta',  re: /(COLIS|COLETA)/i },
  { key: 'auditoria5s',  re: /(AUDITORIA|5S)/i },
  { key: 'errosPicking', re: /ERROS/i },
];

/**
 * Fetch + parse do Painel Operacional com resultado tipado (data + issues).
 * Substitui a versao legada que retornava PainelDiaRow[] diretamente.
 */
export async function fetchPainelOperacional(
  opts: { force?: boolean } = {}
): Promise<PainelResult> {
  const csv = await fetchCsv('controladoria', opts.force);
  return parsePainelOperacional(csv);
}

export function parsePainelOperacional(csvText: string): PainelResult {
  const raw = parseCSV(csvText);
  const issues: ParseIssue[] = [];

  // 1) Localiza linha de datas — aceita 1+ celula no formato DD/MM/AAAA nas primeiras 50 linhas
  const dateRegex = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;
  let dateRowIdx = -1;
  let dateCols: number[] = [];

  for (let i = 0; i < Math.min(raw.length, 50); i++) {
    const cols = raw[i]
      .map((c, idx) => ({ c: (c ?? '').trim(), idx }))
      .filter(x => dateRegex.test(x.c));
    if (cols.length >= 1) {
      dateRowIdx = i;
      dateCols = cols.map(x => x.idx);
      break;
    }
  }

  if (dateRowIdx === -1) {
    const criticalIssue: ParseIssue = {
      sheet: 'controladoria',
      rowIndex: -1,
      rawValue: null,
      reason: 'Linha de datas nao encontrada nas primeiras 50 linhas',
      severity: 'critical',
    };
    console.error('[sheetsService]', criticalIssue.reason);
    return {
      data: [],
      issues: [criticalIssue],
      totalRead: raw.length,
      totalValid: 0,
      datasEncontradas: [],
      setoresEncontrados: [],
    };
  }

  const datas = dateCols.map(i => (raw[dateRowIdx][i] ?? '').trim());

  // 2) Percorre blocos de setor e coleta valores
  const buckets = new Map<string, Record<string, unknown>>();
  const setores = new Set<string>();
  let setorAtual = '';

  for (let r = dateRowIdx + 1; r < raw.length; r++) {
    const rowA = (raw[r][0] ?? '').trim();
    const rowB = (raw[r][1] ?? '').trim();

    // Detecta inicio de bloco: "Setor 87", "87", "ELOG", "Setor ELOG"
    if (rowA) {
      const mSetor = rowA.match(/^Setor\s+(.+)$/i);
      if (mSetor) {
        const v = mSetor[1].trim();
        setorAtual = /^\d+$/.test(v) ? v : v.toUpperCase();
      } else if (/^\d{1,4}$/.test(rowA)) {
        setorAtual = rowA;
      } else if (/^ELOG$/i.test(rowA)) {
        setorAtual = 'ELOG';
      }
      if (setorAtual) setores.add(setorAtual);
    }

    if (!setorAtual || !rowB) continue;

    const matcher = METRIC_MATCHERS.find(m => m.re.test(rowB));
    if (!matcher) continue;

    for (let d = 0; d < datas.length; d++) {
      const colIdx = dateCols[d];
      const rawVal = raw[r][colIdx] ?? '';
      const chave = `${setorAtual}__${datas[d]}`;

      if (!buckets.has(chave)) {
        buckets.set(chave, {
          setor: setorAtual,
          data: datas[d],
          atividade: null, caixasReapro: null, uph: null, promessa: null,
          bsi: null, colisColeta: null, auditoria5s: null, errosPicking: null,
        });
      }
      (buckets.get(chave) as Record<string, unknown>)[matcher.key] = rawVal;
    }
  }

  // 3) Valida cada bucket com o schema Zod
  const rowsToValidate = Array.from(buckets.values());
  const parsed = validateRows<PainelDia>(rowsToValidate, painelDiaSchema, 'controladoria');

  return {
    ...parsed,
    issues: [...issues, ...parsed.issues],
    datasEncontradas: datas,
    setoresEncontrados: Array.from(setores).sort(),
  };
}

// =============================================================================
// 2) GEMBA
// =============================================================================

export async function fetchGemba(
  opts: { force?: boolean } = {}
): Promise<ParseResult<Gemba>> {
  const csv = await fetchCsv('gemba', opts.force);
  return parseGemba(csv);
}

export function parseGemba(csvText: string): ParseResult<Gemba> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { data: [], issues: [], totalRead: 0, totalValid: 0 };
  }

  const headers = rows[0].map(h => h.trim());
  const objetos = rows.slice(1)
    .filter(row => row.some(c => (c ?? '').trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });

  return validateRows<Gemba>(objetos, gembaSchema, 'gemba');
}

// =============================================================================
// 3) PLANO CARREGAMENTO
// =============================================================================

export async function fetchPlanoCarregamento(
  opts: { force?: boolean } = {}
): Promise<ParseResult<PlanoCarregamento>> {
  const csv = await fetchCsv('planoCarregamento', opts.force);
  return parsePlanoCarregamento(csv);
}

export function parsePlanoCarregamento(csvText: string): ParseResult<PlanoCarregamento> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { data: [], issues: [], totalRead: 0, totalValid: 0 };
  }

  const headers = rows[0].map(h => h.trim());
  const objetos = rows.slice(1)
    .filter(row => row.some(c => (c ?? '').trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });

  return validateRows<PlanoCarregamento>(objetos, planoCarregamentoSchema, 'planoCarregamento');
}

// =============================================================================
// 4) BD (Lojas)
// =============================================================================

export async function fetchBD(
  opts: { force?: boolean } = {}
): Promise<ParseResult<BD>> {
  const csv = await fetchCsv('bd', opts.force);
  return parseBD(csv);
}

export function parseBD(csvText: string): ParseResult<BD> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { data: [], issues: [], totalRead: 0, totalValid: 0 };
  }

  const headers = rows[0].map(h => h.trim());
  const objetos = rows.slice(1)
    .filter(row => row.some(c => (c ?? '').trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });

  return validateRows<BD>(objetos, bdSchema, 'bd');
}

// =============================================================================
// TIPOS LEGADOS (retrocompatibilidade)
// =============================================================================

export interface PlanoCarregamentoRow {
  Data: string;
  'Dia da Semana': string;
  'Hora Carregamento': string;
  'Cod Loja': string;
  'Nome da Loja': string;
  Setor?: string;
  Tipologia?: string;
  Transportadora?: string;
}

export interface ControladoriaRow {
  Setor?: string;
  Data?: string;
  Semana?: string;
  'O que foi feito no Repo'?: string;
  Colaborador?: string;
  'QTD enderecos'?: string;
  'Horas usadas'?: string;
  Produtividade?: string;
  [key: string]: string | undefined;
}
