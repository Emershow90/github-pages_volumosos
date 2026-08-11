import { IndexedDBService } from './indexedDb';

export interface SectorPublicMetrics {
  atividadeTotal: number | null;
  uph: number;
  promessa?: number | null;
  bsi?: number | null;
  errosPicking?: number | null;
}

export type PublicSpreadsheetMetricsMap = Record<string, SectorPublicMetrics>;

export interface PlanoCarregamentoRow {
  data: string; // ISO format YYYY-MM-DD
  diaSemana: string;
  horaCarregamento: string;
  codLoja: string;
  nomeLoja: string;
}

const PUBLIC_SHEET_CSV_URLS = [
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=515870420&single=true&output=csv',
];

const CACHE_KEY = 'cache_public_sheet_metrics';
const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  id: string;
  timestamp: number;
  data: PublicSpreadsheetMetricsMap;
}

/**
 * Robustly parses a single CSV line accounting for quoted strings (e.g. "3,8").
 */
function parseCsvLine(line: string): string[] {
  let str = line.trim();
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1);
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Limpa o cache da planilha pública armazenado no IndexedDB.
 */
export async function clearPlanilhaCache(): Promise<void> {
  try {
    await IndexedDBService.delete('planilha_cache', CACHE_KEY);
  } catch (err) {
    console.warn('[googleSheetsPublicSource] Erro ao limpar cache da planilha:', err);
  }
}

/**
 * Fetches and parses the public Google Sheets CSV for operational metrics (Atividade & UPH),
 * wrapped with IndexedDB caching (5 min TTL) for offline resilience.
 */
export async function fetchPublicSpreadsheetMetrics(): Promise<PublicSpreadsheetMetricsMap> {
  // Check IndexedDB Cache first
  let cached: CacheEntry | null = null;
  try {
    cached = await IndexedDBService.get<CacheEntry>('planilha_cache', CACHE_KEY);
    if (cached && Date.now() - cached.timestamp < TTL_MS && Object.keys(cached.data || {}).length > 0) {
      return cached.data;
    }
  } catch {
    // Ignore cache read errors and proceed to fetch
  }

  let csvText = '';
  let lastErr: Error | null = null;

  for (const url of PUBLIC_SHEET_CSV_URLS) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) continue;

      const text = await response.text();
      // Check if response is HTML error page instead of CSV
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        continue;
      }
      csvText = text;
      break;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!csvText) {
    console.warn('[googleSheetsPublicSource] Nenhuma URL retornou CSV válido. Retornando Map vazio.', lastErr);
    if (cached && cached.data && Object.keys(cached.data).length > 0) {
      return cached.data;
    }
    return {};
  }

  try {
    const lines = csvText.split('\n');
    const metricsMap: PublicSpreadsheetMetricsMap = {};
    
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = parseCsvLine(rawLine);
      if (cols.length < 2) continue;

      const sectorCol1 = cols[1];
      const atividadeStr = cols[7];
      const prodStr = cols[11];

      if (sectorCol1 && /^\d+$/.test(sectorCol1)) {
        const sectorId = sectorCol1;
        const ativ = atividadeStr ? parseInt(atividadeStr.replace(/\./g, ''), 10) : null;
        const uph = prodStr ? parseInt(prodStr.replace(/\./g, ''), 10) : 0;
        
        metricsMap[sectorId] = {
          atividadeTotal: Number.isNaN(ativ) ? null : ativ,
          uph: Number.isNaN(uph) ? 0 : uph,
          promessa: 95,
          bsi: 0,
          errosPicking: 0,
        };
      }
    }
    
    // Save fresh metrics to IndexedDB Cache
    try {
      await IndexedDBService.put('planilha_cache', {
        id: CACHE_KEY,
        timestamp: Date.now(),
        data: metricsMap,
      });
    } catch {
      // Ignore cache write errors
    }

    return metricsMap;
  } catch (err) {
    if (cached && cached.data && Object.keys(cached.data).length > 0) {
      console.warn('[googleSheetsPublicSource] Erro ao processar planilha, utilizando cache:', err);
      return cached.data;
    }
    return {};
  }
}

const CACHE_PLANO_KEY = 'cache_plano_carregamento';

/**
 * Fetches and parses the public Google Sheets CSV for Plano de Carregamento.
 * URL: .../pub?gid=1141245157&single=true&output=csv
 */
export async function fetchPlanoCarregamento(): Promise<PlanoCarregamentoRow[]> {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=1141245157&single=true&output=csv';
  
  // Try loading from IndexedDB cache first if offline/quick fallback needed
  let cachedRows: PlanoCarregamentoRow[] = [];
  try {
    const cachedEntry = await IndexedDBService.get<{ id: string; timestamp: number; rows: PlanoCarregamentoRow[] }>('planilha_cache', CACHE_PLANO_KEY);
    if (cachedEntry && Array.isArray(cachedEntry.rows)) {
      cachedRows = cachedEntry.rows;
    }
  } catch {
    // Ignore cache read errors
  }

  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const text = await response.text();
    // Validate it's not HTML
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
      throw new Error('Retornou HTML ao invés de CSV');
    }

    const lines = text.split(/\r?\n/);
    const result: PlanoCarregamentoRow[] = [];

    // Skip header line (i=0)
    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = parseCsvLine(rawLine);
      if (cols.length < 5) continue;

      // Extract columns
      const dataRaw = cols[0];
      const diaSemana = cols[1];
      const horaCarregamento = cols[2];
      const codLoja = cols[3];
      const nomeLoja = cols[4];

      // Format Date DD/MM/YYYY -> YYYY-MM-DD
      let dataIso = '';
      if (dataRaw.includes('/')) {
        const parts = dataRaw.split('/');
        if (parts.length === 3) {
          dataIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          continue;
        }
      } else {
        continue;
      }

      result.push({
        data: dataIso,
        diaSemana,
        horaCarregamento,
        codLoja,
        nomeLoja
      });
    }

    if (result.length > 0) {
      try {
        await IndexedDBService.put('planilha_cache', {
          id: CACHE_PLANO_KEY,
          timestamp: Date.now(),
          rows: result,
        });
      } catch {
        // Ignore cache write errors
      }
    }

    return result.length > 0 ? result : cachedRows;
  } catch (err) {
    console.warn('[fetchPlanoCarregamento] Erro ao buscar/processar CSV online. Usando cache local:', err);
    return cachedRows;
  }
}
