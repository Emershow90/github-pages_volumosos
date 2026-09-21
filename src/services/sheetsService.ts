// src/services/sheetsService.ts
// =============================================================================
// Leitura de dados da Planilha Mestre publicada na web.
// SEM OAuth, SEM backend, SEM service account.
// Formato: /pub?gid={GID}&single=true&output=csv
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
} as const;

export type SheetKey = keyof typeof SHEET_GIDS;

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

function buildUrl(sheet: SheetKey): string {
  const gid = SHEET_GIDS[sheet];
  return `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
}

/** URL pública para abrir a planilha em nova aba (modo HTML) */
export function buildViewerUrl(sheet: SheetKey): string {
  const gid = SHEET_GIDS[sheet];
  return `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=html`;
}

// =============================================================================
// Fetch genérico (cabeçalho = chaves)
// =============================================================================

export async function fetchPublishedSheet<T = Record<string, string>>(
  sheet: SheetKey,
  opts: { force?: boolean } = {}
): Promise<T[]> {
  const url = buildUrl(sheet);
  const now = Date.now();

  if (!opts.force) {
    const hit = cache.get(url);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.data as T[];
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `Falha ao buscar "${sheet}" (HTTP ${res.status}). ` +
      `Verifique se a planilha está publicada em: Arquivo → Compartilhar → Publicar na web.`
    );
  }

  const csv = await res.text();
  const parsed = csvToObjects<T>(csv);
  cache.set(url, { at: now, data: parsed });
  return parsed;
}

export function clearSheetsCache(): void {
  cache.clear();
}

export async function fetchAllSheets<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<{
  [K in SheetKey]?: T[];
}> {
  const keys = Object.keys(SHEET_GIDS) as SheetKey[];
  const results = await Promise.allSettled(
    keys.map(async k => [k, await fetchPublishedSheet<T>(k)] as const)
  );

  const out: Partial<Record<SheetKey, T[]>> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [k, v] = r.value;
      out[k] = v;
    } else {
      console.warn('[sheetsService] aba falhou:', r.reason);
    }
  }
  return out;
}

// =============================================================================
// PARSER PIVÔ — Painel Operacional
// =============================================================================

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

/** Ordem e chave de cada métrica dentro de um bloco de setor */
const METRIC_ORDER: Array<keyof Omit<PainelDiaRow, 'setor' | 'data'>> = [
  'atividade',
  'caixasReapro',
  'uph',
  'promessa',
  'bsi',
  'colisColeta',
  'auditoria5s',
  'errosPicking',
];

const METRIC_MATCHERS: Array<{ key: keyof Omit<PainelDiaRow, 'setor' | 'data'>; re: RegExp }> = [
  { key: 'atividade',    re: /ATIVIDADE/i },
  { key: 'caixasReapro', re: /(CAIXAS\s*DISPON|REAPRO)/i },
  { key: 'uph',          re: /\bUPH\b/i },
  { key: 'promessa',     re: /PROMESSA/i },
  { key: 'bsi',          re: /\bBSI\b/i },
  { key: 'colisColeta',  re: /(COLIS|COLETA)/i },
  { key: 'auditoria5s',  re: /(AUDITORIA|5S)/i },
  { key: 'errosPicking', re: /ERROS/i },
];

function matchMetric(label: string): keyof Omit<PainelDiaRow, 'setor' | 'data'> | null {
  const clean = label.trim();
  for (const m of METRIC_MATCHERS) if (m.re.test(clean)) return m.key;
  return null;
}

export async function fetchPainelOperacional(opts: { force?: boolean } = {}): Promise<PainelDiaRow[]> {
  const url = buildUrl('controladoria');
  const now = Date.now();

  if (!opts.force) {
    const hit = cache.get(url);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.data as PainelDiaRow[];
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar Painel Operacional`);

  const csvText = await res.text();
  const parsed = parsePainelOperacional(csvText);
  cache.set(url, { at: now, data: parsed });
  return parsed;
}

/**
 * Parser do formato PIVÔ (Painel Operacional Diário).
 * Corrige o mapeamento coluna ↔ data e trata número BR/US corretamente.
 */
export function parsePainelOperacional(csvText: string): PainelDiaRow[] {
  const raw = parseCSV(csvText);
  if (raw.length === 0) return [];

  // 1) Localizar linha de datas — procura 2+ células em DD/MM/AAAA nas primeiras 20 linhas
  const dateRegex = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;
  let dateRowIdx = -1;
  let dateCols: number[] = [];

  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const cols = raw[i]
      .map((c, idx) => ({ c: c.trim(), idx }))
      .filter(x => dateRegex.test(x.c));
    if (cols.length >= 2) {
      dateRowIdx = i;
      dateCols = cols.map(x => x.idx);          // <- índices REAIS das colunas de data
      break;
    }
  }
  if (dateRowIdx === -1) return [];

  const datas = dateCols.map(i => raw[dateRowIdx][i].trim());

  // 2) Varre blocos de setor
  const buckets = new Map<string, PainelDiaRow>();

  let setorAtual = '';
  for (let r = dateRowIdx + 1; r < raw.length; r++) {
    const rowA = (raw[r][0] ?? '').trim();
    const rowB = (raw[r][1] ?? '').trim();

    // Detecta início de bloco: "Setor 87", "Setor 88"...
    const m = rowA.match(/Setor\s*(\d+)/i);
    if (m) setorAtual = m[1];

    if (!setorAtual) continue;
    if (!rowB) continue; // linha em branco ou sem métrica

    const key = matchMetric(rowB);
    if (!key) continue;

    // Para cada data, grava o valor
    for (let d = 0; d < datas.length; d++) {
      const colIdx = dateCols[d];
      const valor = parseNumberFlexible(raw[r][colIdx] ?? '');
      const bucketKey = `${setorAtual}__${datas[d]}`;

      let reg = buckets.get(bucketKey);
      if (!reg) {
        reg = {
          setor: setorAtual,
          data: datas[d],
          atividade: null,
          caixasReapro: null,
          uph: null,
          promessa: null,
          bsi: null,
          colisColeta: null,
          auditoria5s: null,
          errosPicking: null,
        };
        buckets.set(bucketKey, reg);
      }
      reg[key] = valor;
    }
  }

  // 3) Retorna na ordem cronológica por data e setor
  const arr = Array.from(buckets.values());
  arr.sort((a, b) => {
    const [da, ma, ya] = a.data.split('/').map(Number);
    const [db, mb, yb] = b.data.split('/').map(Number);
    const ta = new Date(ya, ma - 1, da).getTime();
    const tb = new Date(yb, mb - 1, db).getTime();
    if (ta !== tb) return ta - tb;
    return a.setor.localeCompare(b.setor);
  });
  return arr;
}

/**
 * Número flexível:
 *  - "1.234,56" (BR) → 1234.56
 *  - "1234.56"  (US) → 1234.56
 *  - "1.234"         → 1234 (milhar) se não houver vírgula
 *  - "55"            → 55
 *  - ""              → null
 */
function parseNumberFlexible(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  // Ambos: assume BR (ponto = milhar, vírgula = decimal)
  if (hasComma && hasDot) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // Só vírgula: decimal BR
  if (hasComma) {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // Só ponto: se tiver 3 dígitos após o ponto, provavelmente é milhar US ("1.234") — 
  // mas se tiver 1 ou 2 dígitos, é decimal. Heurística simples:
  if (hasDot) {
    const after = s.split('.')[1] ?? '';
    if (after.length === 3 && !s.startsWith('0')) {
      // pode ser milhar BR: 1.234 → 1234
      const n = Number(s.replace(/\./g, ''));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// =============================================================================
// CSV → Objetos (cabeçalho = chave)
// =============================================================================

function csvToObjects<T>(csv: string): T[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
    return obj as T;
  });
}

function parseCSV(text: string): string[][] {
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
      else if (c === '\r') { /* ignore */ }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// =============================================================================
// Tipos legados (compatibilidade)
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
  'QTD endereços'?: string;
  'Horas usadas'?: string;
  Produtividade?: string;
  [key: string]: string | undefined;
}
