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
 * Updates operational metrics in "VOLUMOSOS - ATIVIDADE" tab of Google Sheets
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

    const sheetName = 'VOLUMOSOS - ATIVIDADE';
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
      message: `Métricas do Setor ${sectorId} gravadas com sucesso na planilha (Linha ${targetRow})!`,
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
 * Reads operational metrics from "VOLUMOSOS - ATIVIDADE" tab
 */
export const readOperationalMetricsFromSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<{ success: boolean; message: string; data?: Record<string, { atividade: number; uph: number }> }> => {
  try {
    const sheetName = 'VOLUMOSOS - ATIVIDADE';
    const range = `'${sheetName}'!A1:L10`;
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
      throw new Error(err.error?.message || 'Erro ao ler aba VOLUMOSOS - ATIVIDADE');
    }

    const json = await res.json();
    const rows: string[][] = json.values || [];

    const result: Record<string, { atividade: number; uph: number }> = {};

    Object.entries(SECTOR_ROW_MAP).forEach(([sec, rowIdx]) => {
      const row = rows[rowIdx - 1]; // 0-indexed
      if (row) {
        const ativVal = parseFloat((row[7] || '0').replace(/\./g, '').replace(',', '.')) || 0; // Col H is index 7
        const uphVal = parseFloat((row[11] || '0').replace(/\./g, '').replace(',', '.')) || 0; // Col L is index 11
        result[sec] = { atividade: ativVal, uph: uphVal };
      }
    });

    return {
      success: true,
      message: 'Métricas da planilha lidas com sucesso!',
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
    // We will clear existing data first or just overwrite the top rows.
    // It's safer to clear first to avoid ghost rows, or just overwrite the exact range.
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

    // Write range Escala!A1:G${values.length}
    const range = `Escala!A1:G${values.length + 50}`; // Pad to clear any minor extra rows if list shrunk, or we can use clear API first

    // First, clear the sheet to be clean
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Escala!A1:G500:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Then write values
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Escala!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: 'Escala!A1',
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
      message: `Escala exportada com sucesso! ${colaboradores.length} operadores sincronizados.`,
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
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Escala!A1:G500`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Erro ao ler a planilha. Verifique se a aba "Escala" existe.');
    }

    const result = await response.json();
    const values: string[][] = result.values || [];

    if (values.length === 0) {
      return {
        success: false,
        message: 'A planilha está vazia ou não contém dados na aba "Escala".',
      };
    }

    // Skip headers row
    const headers = values[0];
    const dataRows = values.slice(1);

    const colaboradores: Colaborador[] = [];

    for (const r of dataRows) {
      if (!r[1]) continue; // Skip if no name

      // Map values
      const id = r[0] || `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const nome = r[1].trim();
      const setor = r[2] || 'Setor 87';
      
      // Safe status parsing
      let status = ColaboradorStatus.Operacao;
      const statusStr = (r[3] || '').trim().toLowerCase();
      if (statusStr.includes('poli')) {
        status = ColaboradorStatus.Poli;
      } else if (statusStr.includes('bh')) {
        status = ColaboradorStatus.BH;
      } else if (statusStr.includes('ausente') || statusStr.includes('aus')) {
        status = ColaboradorStatus.Ausente;
      }

      const cargo = r[4] || 'Operador';
      const horas = parseFloat(r[5]) || 7.2;
      const foto = r[6] || '';

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
      message: `Importado com sucesso! ${colaboradores.length} operadores carregados da planilha.`,
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
