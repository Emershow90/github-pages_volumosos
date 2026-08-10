import { IndexedDBService } from './indexedDb';

export interface SectorPublicMetrics {
  atividadeTotal: number | null;
  uph: number;
  promessa?: number | null;
  bsi?: number | null;
  errosPicking?: number | null;
}

export type PublicSpreadsheetMetricsMap = Record<string, SectorPublicMetrics>;

const PUBLIC_SHEET_CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=515870420&single=true&output=csv',
];

const DEFAULT_FALLBACK_METRICS: PublicSpreadsheetMetricsMap = {
  '87': { atividadeTotal: 15899, uph: 550, promessa: 98, bsi: 0, errosPicking: 0 },
  '88': { atividadeTotal: 5965, uph: 450, promessa: 99.5, bsi: 0, errosPicking: 0.2 },
  '89': { atividadeTotal: 3800, uph: 300, promessa: 98, bsi: 0, errosPicking: 0.5 },
  '90': { atividadeTotal: 4200, uph: 450, promessa: 98, bsi: 0, errosPicking: 0.1 },
  'ELOG': { atividadeTotal: 2500, uph: 350, promessa: 96, bsi: 0, errosPicking: 0 },
  'E-LOG': { atividadeTotal: 2500, uph: 350, promessa: 96, bsi: 0, errosPicking: 0 },
};

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
    console.warn('[googleSheetsPublicSource] Nenhuma URL retornou CSV válido. Usando dados salvos/fallback.', lastErr);
    if (cached && cached.data && Object.keys(cached.data).length > 0) {
      return cached.data;
    }
    return DEFAULT_FALLBACK_METRICS;
  }

  try {
    const lines = csvText.split('\n');
    const metricsMap: PublicSpreadsheetMetricsMap = {};
    const accumulators: Record<string, { ativSum: number; uphSum: number; count: number }> = {};

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = parseCsvLine(rawLine);
      if (cols.length < 2) continue;

      // Format Option 1: Direct Sector ID in col 1, Atividade in col 7, UPH in col 11
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
          atividadeTotal: 2500,
          uph: Number.isNaN(uph) ? 350 : uph,
          promessa: 96,
          bsi: 0,
          errosPicking: 0,
        };

        metricsMap['ELOG'] = elogMetrics;
        metricsMap['E-LOG'] = elogMetrics;
      }

      // Format Option 2: Store rows where col 5 is VOLUMES, col 7 is Sector ID ("87", "88", "89", "90", "ELOG")
      const sectorCol7 = cols[7] ? cols[7].trim().toUpperCase() : '';
      const vol = cols[5] ? parseInt(cols[5].replace(/\./g, ''), 10) : NaN;
      const uphCol8 = cols[8] ? parseInt(cols[8].replace(/\./g, ''), 10) : NaN;

      const matchedSectorKey = sectorCol7.replace(/^S/, '');
      if (['87', '88', '89', '90', 'ELOG', 'E-LOG'].includes(matchedSectorKey)) {
        if (!accumulators[matchedSectorKey]) {
          accumulators[matchedSectorKey] = { ativSum: 0, uphSum: 0, count: 0 };
        }
        if (!isNaN(vol)) accumulators[matchedSectorKey].ativSum += vol;
        if (!isNaN(uphCol8) && uphCol8 > 0) {
          accumulators[matchedSectorKey].uphSum += uphCol8;
          accumulators[matchedSectorKey].count += 1;
        }
      }
    }

    // Merge accumulated store-level metrics into metricsMap if direct format didn't populate them
    for (const key of Object.keys(accumulators)) {
      const acc = accumulators[key];
      const avgUph = acc.count > 0 ? Math.round(acc.uphSum / acc.count) : 350;
      if (!metricsMap[key] || metricsMap[key].atividadeTotal === null || metricsMap[key].atividadeTotal === 0) {
        metricsMap[key] = {
          atividadeTotal: acc.ativSum || DEFAULT_FALLBACK_METRICS[key]?.atividadeTotal || 1000,
          uph: avgUph || DEFAULT_FALLBACK_METRICS[key]?.uph || 300,
          promessa: 95,
          bsi: 0,
          errosPicking: 0,
        };
      }
    }

    // Ensure all standard sectors exist with defaults if missing
    for (const secKey of ['87', '88', '89', '90', 'ELOG']) {
      if (!metricsMap[secKey] || metricsMap[secKey].atividadeTotal === null) {
        metricsMap[secKey] = DEFAULT_FALLBACK_METRICS[secKey] || {
          atividadeTotal: 1000,
          uph: 300,
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
    return DEFAULT_FALLBACK_METRICS;
  }
}
