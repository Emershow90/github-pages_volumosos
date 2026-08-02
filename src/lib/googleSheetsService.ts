import { Colaborador, ColaboradorStatus } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export const DEFAULT_SPREADSHEET_ID = '134K5N5HGchuSg3UA7oa75_BwIOiwcZRQQF9J32fkmWg';

export const SECTOR_ROW_MAP: Record<string, number> = {
  '87': 3,
  '88': 4,
  '89': 5,
  '90': 6,
  'ELOG': 7,
  'E-LOG': 7,
};

/**
 * Helper to safely extract numeric values from cell text or number.
 */

const parseCellNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (str.startsWith('#') || !str) return 0;
  // strip spaces
  str = str.replace(/[\s\u00A0]/g, '');
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Dynamically finds the best matching sheet title from a Google Spreadsheet.
 */
async function getBestSheetTitle(
  accessToken: string,
  spreadsheetId: string,
  preferredName: string,
  keywords: string[] = []
): Promise<string> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const titles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

      if (titles.length > 0) {
        // 1. Exact match (case insensitive)
        const exact = titles.find((t) => t.toLowerCase() === preferredName.toLowerCase());
        if (exact) return exact;

        // 2. Contains preferred name substring
        const partialPreferred = titles.find(
          (t) => t.toLowerCase().includes(preferredName.toLowerCase()) || preferredName.toLowerCase().includes(t.toLowerCase())
        );
        if (partialPreferred) return partialPreferred;

        // 3. Keyword match
        for (const kw of keywords) {
          const kwMatch = titles.find((t) => t.toLowerCase().includes(kw.toLowerCase()));
          if (kwMatch) return kwMatch;
        }

        // 4. Default to first available title
        return titles[0];
      }
    }
  } catch (err) {
    console.warn('Could not fetch sheet metadata, falling back to preferred title:', err);
  }
  return preferredName;
}

/**
 * Updates operational metrics in Google Sheets
 */
export const updateOperationalMetricsToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  sectorId: string,
  payload: { atividade?: number; uph?: number }
): Promise<SyncResult> => {
  try {
    const targetRow = SECTOR_ROW_MAP[sectorId] || SECTOR_ROW_MAP[sectorId.replace(/\D/g, '')];
    if (!targetRow) {
      return { success: false, message: `Setor ${sectorId} não mapeado na planilha.` };
    }

    const sheetName = await getBestSheetTitle(
      accessToken,
      spreadsheetId,
      'VOLUMOSOS - ATIVIDADE',
      ['atividade', 'volumosos', 'queries', 'su_queries', 'indicadores', 'painel']
    );

    const isElog = sectorId === 'ELOG' || sectorId === 'E-LOG';

    // 1. Update Atividade (Column H / Col 8) if not ELOG
    if (payload.atividade !== undefined && !isElog) {
      const rangeH = `'${sheetName}'!H${targetRow}`;
      const resH = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeH)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: rangeH,
            majorDimension: 'ROWS',
            values: [[payload.atividade]],
          }),
        }
      );
      if (!resH.ok) {
        const err = await resH.json();
        throw new Error(err.error?.message || 'Erro ao atualizar Coluna H (Atividade)');
      }
    }

    // 2. Update Produtividade / UPH (Column L / Col 12)
    if (payload.uph !== undefined) {
      const rangeL = `'${sheetName}'!L${targetRow}`;
      const resL = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeL)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: rangeL,
            majorDimension: 'ROWS',
            values: [[payload.uph]],
          }),
        }
      );
      if (!resL.ok) {
        const err = await resL.json();
        throw new Error(err.error?.message || 'Erro ao atualizar Coluna L (UPH)');
      }
    }

    return {
      success: true,
      message: `Métricas do Setor ${sectorId} gravadas com sucesso na aba "${sheetName}" (Linha ${targetRow})!`,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (error: any) {
    console.error('updateOperationalMetricsToSpreadsheet Error:', error);
    return {
      success: false,
      message: `Erro ao gravar na planilha: ${error.message || error}`,
    };
  }
};

/**
 * Reads operational metrics from Google Sheets with dynamic sheet and row resolution.
 */
export const readOperationalMetricsFromSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<{ success: boolean; message: string; data?: Record<string, { atividade: number; uph: number }> }> => {
  try {
    const sheetTitle = await getBestSheetTitle(
      accessToken,
      spreadsheetId,
      'VOLUMOSOS - ATIVIDADE',
      ['atividade', 'volumosos', 'queries', 'su_queries', 'indicadores', 'painel']
    );

    const range = `'${sheetTitle}'!A1:AZ100`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Erro ao ler aba "${sheetTitle}"`);
    }

    const json = await res.json();
    const rows: string[][] = json.values || [];

    const result: Record<string, { atividade: number; uph: number }> = {};
    const sectorKeys = ['87', '88', '89', '90', 'ELOG', 'E-LOG'];

    // Console/SU_Queries row mappings
    const altSectorRows: Record<string, number> = {
      '87': 23,
      '88': 25,
      '89': 27,
      '90': 29,
      'ELOG': 7,
      'E-LOG': 7,
    };

    sectorKeys.forEach((sec) => {
      let targetRowIdx = -1;

      // 1. Search by explicit text in cells
      const foundIdx = rows.findIndex((r) => {
        if (!r || r.length === 0) return false;
        const firstCols = r.slice(0, 6).map((c) => String(c || '').toUpperCase());
        return firstCols.some(
          (val) => val === sec || val === `SETOR ${sec}` || val === `S${sec}` || val.includes(`PICKING ${sec}`) || val.includes(`SETOR ${sec}`)
        );
      });

      if (foundIdx !== -1) {
        targetRowIdx = foundIdx;
      } else {
        // Fallback to primary or secondary mapped row index
        const primaryMapped = (SECTOR_ROW_MAP[sec] || 0) - 1;
        const secondaryMapped = (altSectorRows[sec] || 0) - 1;

        if (primaryMapped >= 0 && primaryMapped < rows.length) {
          targetRowIdx = primaryMapped;
        } else if (secondaryMapped >= 0 && secondaryMapped < rows.length) {
          targetRowIdx = secondaryMapped;
        }
      }

      if (targetRowIdx >= 0 && rows[targetRowIdx]) {
        const row = rows[targetRowIdx];

        // Parse Atividade (Col W / idx 22, then Col H / idx 7)
        let ativVal = 0;
        const colW = parseCellNumber(row[22]);
        const colH = parseCellNumber(row[7]);

        if (colW > 0) {
          ativVal = colW;
        } else if (colH > 0) {
          ativVal = colH;
        } else {
          for (let i = 1; i < row.length; i++) {
            const num = parseCellNumber(row[i]);
            if (num > 0) {
              ativVal = num;
              break;
            }
          }
        }

        // Parse UPH (Col L / idx 11, then Col Y / idx 24)
        let uphVal = 0;
        const colL = parseCellNumber(row[11]);
        const colY = parseCellNumber(row[24]);

        if (colL > 0) {
          uphVal = colL;
        } else if (colY > 0) {
          uphVal = colY;
        } else {
          let foundCount = 0;
          for (let i = 1; i < row.length; i++) {
            const num = parseCellNumber(row[i]);
            if (num > 0) {
              foundCount++;
              if (foundCount === 2) {
                uphVal = num;
                break;
              }
            }
          }
        }

        result[sec] = { atividade: ativVal, uph: uphVal };
      }
    });

    return {
      success: true,
      message: `Métricas da aba "${sheetTitle}" lidas com sucesso!`,
      data: result,
    };
  } catch (error: any) {
    console.error('readOperationalMetricsFromSpreadsheet Error:', error);
    return {
      success: false,
      message: `Erro ao ler métricas da planilha: ${error.message || error}`,
    };
  }
};

/**
 * Creates a new spreadsheet in the user's Google Drive.
 */
export const createScaleSpreadsheet = async (
  accessToken: string,
  colaboradores: Colaborador[]
): Promise<SyncResult> => {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Torre de Comando Volumosos - Escala de Operadores',
        },
        sheets: [
          {
            properties: {
              title: 'Escala',
              gridProperties: {
                rowCount: 500,
                columnCount: 10,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Erro ao criar planilha');
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl;

    // Immediately write current state to populate it
    await writeScaleToSpreadsheet(accessToken, spreadsheetId, colaboradores);

    return {
      success: true,
      message: 'Planilha criada e populada com sucesso!',
      spreadsheetId,
      spreadsheetUrl,
    };
  } catch (error: any) {
    console.error('createScaleSpreadsheet Error:', error);
    return {
      success: false,
      message: `Erro ao criar planilha: ${error.message || error}`,
    };
  }
};

/**
 * Writes (exports) current collaborators to a linked spreadsheet.
 */
export const writeScaleToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  colaboradores: Colaborador[]
): Promise<SyncResult> => {
  try {
    const sheetTitle = await getBestSheetTitle(
      accessToken,
      spreadsheetId,
      'Escala',
      ['escala', 'equipe', 'colaboradores', 'operadores', 'pessoal']
    );

    const headers = ['ID', 'Nome', 'Setor', 'Status', 'Cargo', 'Horas', 'Foto URL'];
    const rows = colaboradores.map((c) => [
      c.id,
      c.nome,
      c.setor,
      c.status,
      c.cargo || 'Operador',
      c.horas.toString(),
      c.foto || '',
    ]);

    const values = [headers, ...rows];

    // First clear sheet to prevent trailing rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:G500:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Then write values
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${sheetTitle}'!A1`,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Erro ao exportar dados para a planilha');
    }

    return {
      success: true,
      message: `Escala exportada com sucesso na aba "${sheetTitle}"! ${colaboradores.length} operadores sincronizados.`,
    };
  } catch (error: any) {
    console.error('writeScaleToSpreadsheet Error:', error);
    return {
      success: false,
      message: `Erro ao exportar dados: ${error.message || error}`,
    };
  }
};

/**
 * Reads (imports) collaborators from a linked spreadsheet.
 */
export const readScaleFromSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; message: string; data?: Colaborador[] }> => {
  try {
    const sheetTitle = await getBestSheetTitle(
      accessToken,
      spreadsheetId,
      'Escala',
      ['escala', 'equipe', 'colaboradores', 'operadores', 'pessoal']
    );

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:Z500`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro ao ler a planilha na aba "${sheetTitle}".`);
    }

    const result = await response.json();
    const values: string[][] = result.values || [];

    if (values.length === 0) {
      return {
        success: false,
        message: `A planilha está vazia ou não contém dados na aba "${sheetTitle}".`,
      };
    }

    // Header normalization and dynamic index mapping
    const rawHeaders = (values[0] || []).map((h) => String(h || '').trim());
    const headers = rawHeaders.map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
    );

    let idxId = headers.findIndex((h) => h.includes('id') || h.includes('codigo') || h === 'key');
    let idxNome = headers.findIndex((h) => h.includes('nome') || h.includes('colaborador') || h.includes('operador') || h.includes('funcionario') || h.includes('name'));
    let idxSetor = headers.findIndex((h) => h.includes('setor') || h === 'sec' || h.includes('sector'));
    let idxStatus = headers.findIndex((h) => h.includes('status') || h.includes('situacao') || h.includes('escala'));
    let idxCargo = headers.findIndex((h) => h.includes('cargo') || h.includes('funcao') || h.includes('role'));
    let idxHoras = headers.findIndex((h) => h.includes('horas') || h.includes('jornada') || h.includes('hours') || h === 'hrs');
    let idxFoto = headers.findIndex((h) => h.includes('foto') || h.includes('avatar') || h.includes('image') || h.includes('url'));

    // Fallbacks
    if (idxId === -1) idxId = 0;
    if (idxNome === -1) idxNome = 1;
    if (idxSetor === -1) idxSetor = 2;
    if (idxStatus === -1) idxStatus = 3;
    if (idxCargo === -1) idxCargo = 4;
    if (idxHoras === -1) idxHoras = 5;
    if (idxFoto === -1) idxFoto = 6;

    const dataRows = values.slice(1);
    const colaboradores: Colaborador[] = [];

    for (const r of dataRows) {
      const nameVal = r[idxNome] ? String(r[idxNome]).trim() : '';
      if (!nameVal) continue;

      const id = r[idxId] ? String(r[idxId]).trim() : `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const nome = nameVal;
      const setorRaw = r[idxSetor] ? String(r[idxSetor]).trim() : 'Setor 87';
      const setor = setorRaw.toLowerCase().startsWith('setor') ? setorRaw : `Setor ${setorRaw.replace(/\D/g, '') || '87'}`;

      let status = ColaboradorStatus.Operacao;
      const statusStr = r[idxStatus] ? String(r[idxStatus]).trim().toLowerCase() : '';
      if (statusStr.includes('poli')) {
        status = ColaboradorStatus.Poli;
      } else if (statusStr.includes('bh')) {
        status = ColaboradorStatus.BH;
      } else if (statusStr.includes('ausente') || statusStr.includes('aus') || statusStr.includes('falta')) {
        status = ColaboradorStatus.Ausente;
      }

      const cargo = r[idxCargo] ? String(r[idxCargo]).trim() : 'Operador';
      const horas = parseCellNumber(r[idxHoras]) || 7.2;
      const foto = r[idxFoto] ? String(r[idxFoto]).trim() : '';

      colaboradores.push({
        id,
        nome,
        setor,
        status,
        cargo,
        horas,
        foto,
      });
    }

    return {
      success: true,
      message: `Importado com sucesso! ${colaboradores.length} operadores carregados da aba "${sheetTitle}".`,
      data: colaboradores,
    };
  } catch (error: any) {
    console.error('readScaleFromSpreadsheet Error:', error);
    return {
      success: false,
      message: `Erro ao importar dados: ${error.message || error}`,
    };
  }
};
