import { Setor, Colaborador, ReaproData, HistoricoRegistro } from '../types';

const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '75894189562-7moh2aqmsh8e6s42ukpvh895ag82jkn0.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

// Initialize the Google Identity Services token client
export function initGoogleIdentity() {
  if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
    console.warn('Google Identity Services script not loaded yet');
    return;
  }
  
  if (!CLIENT_ID) {
    console.error('Missing VITE_GOOGLE_CLIENT_ID environment variable.');
    return;
  }

  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {}, // Defined dynamically during request
    });
  } catch (err) {
    console.error('Error initializing Google Token Client:', err);
  }
}

// Helper to ensure gsi script is loaded
async function ensureGoogleIdentityLoaded(): Promise<void> {
  if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
    return;
  }

  return new Promise((resolve, reject) => {
    // Check if script element already exists
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (attempts > 30) { // 3 seconds timeout
        clearInterval(interval);
        reject(new Error('Tempo esgotado ao carregar a biblioteca de autenticação do Google (GSI).'));
      }
    }, 100);
  });
}

// Request an access token
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  await ensureGoogleIdentityLoaded();

  if (!tokenClient) {
    initGoogleIdentity();
  }

  if (!tokenClient) {
    throw new Error('Google Identity Services não foi inicializado. Verifique se o Client ID está configurado.');
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClient!.callback = (resp: google.accounts.oauth2.TokenResponse & { error_description?: string }) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error || 'Erro na autenticação do Google'));
          return;
        }
        if (!resp.access_token) {
          reject(new Error('Nenhum token de acesso retornado pelo Google.'));
          return;
        }
        cachedAccessToken = resp.access_token;
        const expiresInSec = resp.expires_in ? Number(resp.expires_in) : 3500;
        tokenExpiresAt = Date.now() + (expiresInSec - 60) * 1000;
        resolve(resp.access_token);
      };
      
      tokenClient!.requestAccessToken({ prompt: cachedAccessToken ? '' : 'consent' });
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
