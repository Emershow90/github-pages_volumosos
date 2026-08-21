import { Setor, Colaborador, ReaproData, HistoricoRegistro } from '../types';

const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: google.accounts.oauth2.TokenClient;

// Initialize the Google Identity Services token client
export function initGoogleIdentity() {
  if (typeof google === 'undefined') {
    console.error('Google Identity Services script not loaded');
    return;
  }
  
  if (!CLIENT_ID) {
    console.error('Missing VITE_GOOGLE_CLIENT_ID environment variable.');
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // Defined dynamically during request
  });
}

// Request an access token
async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    try {
      tokenClient.callback = (resp) => {
        if (resp.error) {
          reject(resp);
        }
        resolve(resp.access_token);
      };
      
      // Request the token, prompting the user if necessary
      if (gapi?.client?.getToken()?.access_token) {
        tokenClient.requestAccessToken({ prompt: '' }); // use existing
      } else {
        tokenClient.requestAccessToken({ prompt: 'consent' }); // force consent on first run
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Helper for making API calls
async function fetchGoogleAPI(url: string, method: string, token: string, body?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Google API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export interface ExportDataPayload {
  setores: Setor[];
  colaboradores: Colaborador[];
  reapro: ReaproData;
}

export async function exportToGoogleSheets(data: ExportDataPayload): Promise<string> {
  const token = await getAccessToken();
  const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const title = `Relatório Consolidado Torre - ${dateStr}`;

  // 1. Create a new Spreadsheet
  const createSpreadsheetBody = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Resumo Geral' } },
      { properties: { title: 'Setores (D-ALL / Peças)' } },
      { properties: { title: 'Colaboradores' } },
      { properties: { title: 'Indicadores Reapro' } },
      { properties: { title: 'Atividade Total e UPH (Controladoria)' } }
    ]
  };

  const spreadsheet = await fetchGoogleAPI(
    'https://sheets.googleapis.com/v4/spreadsheets',
    'POST',
    token,
    createSpreadsheetBody
  );

  const spreadsheetId = spreadsheet.spreadsheetId;

  // 2. Prepare Data Uploads (Batch Update Values)
  
  // Sheet 1: Resumo
  const resumoData = [
    ['Métrica', 'Valor'],
    ['Data do Relatório', new Date().toLocaleString('pt-BR')],
    ['Total Setores Ativos', data.setores.filter(s => s.situacao !== 'Inativo').length],
    ['Total Colaboradores Escalados', data.colaboradores.length],
    ['D-ALL REAPRO Total (CX)', data.reapro.listasFechadas.colis],
    ['Término Previsto REAPRO', data.reapro.terminoPrevisao || 'Auto'],
  ];

  // Sheet 2: Setores
  const setoresData = [
    ['Setor', 'Situação', 'Atividade (ATIV)', 'Colis', 'Repro (Caixas)', 'SLA (Promessa) %']
  ];
  data.setores.forEach(s => {
    setoresData.push([
      s.id,
      s.situacao || 'Ativo',
      s.ativ?.toString() || '0',
      s.colis?.toString() || '0',
      s.reproTotal?.toString() || '0',
      s.promessa?.toString() || '0'
    ]);
  });

  // Sheet 3: Colaboradores
  const colabData = [
    ['Nome', 'Matrícula', 'Função', 'Status Atual', 'Setor Vinculado']
  ];
  data.colaboradores.forEach(c => {
    colabData.push([
      c.nome,
      c.matricula || '-',
      c.funcao || '-',
      c.status,
      c.setor || '-'
    ]);
  });

  // Sheet 4: Reapro KPIs
  const reaproData = [
    ['Indicador', 'Valor'],
    ['Preso D-ALL', data.reapro.indicadores.totalPresoDAll.toString()],
    ['Em Curso Coleta', data.reapro.indicadores.emCursoColetado.toString()],
    ['Em Máquina', data.reapro.indicadores.totalEmMaquina.toString()],
    ['Disponibilidade %', data.reapro.indicadores.disponibilidade.toString()],
    ['Capacidade Est. Fechamento', data.reapro.capacidadeFechamentoEst.toString()]
  ];

  // Sheet 5: Atividade Total e UPH
  const ativUphData = [
    ['Setor', 'Atividade (ATIV)', 'UPH']
  ];
  data.setores.forEach(s => {
    ativUphData.push([
      s.id,
      s.ativ?.toString() || '0',
      s.uph?.toString() || '0'
    ]);
  });

  const updateValuesBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Resumo Geral!A1', values: resumoData },
      { range: 'Setores (D-ALL / Peças)!A1', values: setoresData },
      { range: 'Colaboradores!A1', values: colabData },
      { range: 'Indicadores Reapro!A1', values: reaproData },
      { range: 'Atividade Total e UPH (Controladoria)!A1', values: ativUphData },
    ]
  };

  // 3. Send Batch Update Values
  await fetchGoogleAPI(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    'POST',
    token,
    updateValuesBody
  );

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
