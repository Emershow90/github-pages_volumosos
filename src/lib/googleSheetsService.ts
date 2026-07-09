import { Colaborador, ColaboradorStatus } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

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
