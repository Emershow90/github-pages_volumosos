export interface SectorPublicMetrics {
  atividadeTotal: number | null;
  uph: number;
}

export type PublicSpreadsheetMetricsMap = Record<string, SectorPublicMetrics>;

const PUBLIC_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=515870420&single=true&output=csv';

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
 * Fetches and parses the public Google Sheets CSV for operational metrics (Atividade & UPH).
 */
export async function fetchPublicSpreadsheetMetrics(): Promise<PublicSpreadsheetMetricsMap> {
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

    // Col 1: Setor DASH (87, 88, 89, 90)
    // Col 7: Atividade Total
    // Col 10: TIME (87, 88, 89, 90, E-LOG - PICKING)
    // Col 11: Prod (UPH)

    const sectorCol1 = cols[1];
    const atividadeStr = cols[7];
    const timeCol10 = cols[10];
    const prodStr = cols[11];

    // Check main sector rows (col 1: 87, 88, 89, 90)
    if (sectorCol1 && /^\d+$/.test(sectorCol1)) {
      const sectorId = sectorCol1;
      const ativ = atividadeStr ? parseInt(atividadeStr.replace(/\./g, ''), 10) : null;
      const uph = prodStr ? parseInt(prodStr.replace(/\./g, ''), 10) : 0;

      metricsMap[sectorId] = {
        atividadeTotal: Number.isNaN(ativ) ? null : ativ,
        uph: Number.isNaN(uph) ? 0 : uph,
      };
    }

    // Check E-LOG row (Col 10: "E-LOG - PICKING")
    if (timeCol10 && timeCol10.toUpperCase().includes('E-LOG')) {
      const uph = prodStr ? parseInt(prodStr.replace(/\./g, ''), 10) : 0;
      const elogMetrics: SectorPublicMetrics = {
        atividadeTotal: null,
        uph: Number.isNaN(uph) ? 0 : uph,
      };

      metricsMap['ELOG'] = elogMetrics;
      metricsMap['E-LOG'] = elogMetrics;
    }
  }

  return metricsMap;
}
