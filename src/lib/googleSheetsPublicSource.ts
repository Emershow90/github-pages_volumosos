import { IndexedDBService } from './indexedDb';

export interface SectorPublicMetrics {
  atividadeTotal: number | null;
  uph: number;
  promessa?: number | null;
  bsi?: number | null;
  errosPicking?: number | null;
}

export type PublicSpreadsheetMetricsMap = Record<string, SectorPublicMetrics>;

const PUBLIC_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=515870420&single=true&output=csv';

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
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.data;
    }
  } catch {
    // Ignore cache read errors and proceed to fetch
  }

  try {
    const response = await fetch(PUBLIC_SHEET_CSV_URL, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    const metricsMap: PublicSpreadsheetMetricsMap = {};

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = parseCsvLine(rawLine);
      if (cols.length < 2) continue;

      const sectorCol1 = cols[1];
      const atividadeStr = cols[7];
      const timeCol10 = cols[10];
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

      if (timeCol10 && timeCol10.toUpperCase().includes('E-LOG')) {
        const uph = prodStr ? parseInt(prodStr.replace(/\./g, ''), 10) : 0;
        const elogMetrics: SectorPublicMetrics = {
          atividadeTotal: null,
          uph: Number.isNaN(uph) ? 0 : uph,
          promessa: 95,
          bsi: 0,
          errosPicking: 0,
        };

        metricsMap['ELOG'] = elogMetrics;
        metricsMap['E-LOG'] = elogMetrics;
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
    if (cached && cached.data) {
      console.warn('[googleSheetsPublicSource] Falha na rede, utilizando dados em cache do IndexedDB:', err);
      return cached.data;
    }
    throw err;
  }
}
