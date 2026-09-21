import { Setor, Colaborador, ReaproData, HistoricoRegistro, CapacidadeSetor } from '../types';

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
  historico?: HistoricoRegistro[];
  coordenador?: string;
  capacidade?: CapacidadeSetor[];
}

const STORAGE_KEY_SPREADSHEET_ID = 'google_sheets_master_id';

export async function exportToGoogleSheets(data: ExportDataPayload): Promise<string> {
  const token = await getAccessToken();
  const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const title = `Torre de Comando - Painel Consolidado Oficial`;

  let spreadsheetId = localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
  let existingSpreadsheet: any = null;

  if (spreadsheetId) {
    try {
      existingSpreadsheet = await fetchGoogleAPI(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        'GET',
        token
      );
    } catch (err) {
      console.warn('Planilha existente não encontrada ou sem acesso. Criando uma nova...', err);
      spreadsheetId = null;
      localStorage.removeItem(STORAGE_KEY_SPREADSHEET_ID);
    }
  }

  // 1. Create a new Spreadsheet with all tabs only if not exists
  if (!spreadsheetId || !existingSpreadsheet) {
    const createSpreadsheetBody = {
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Resumo Geral' } },
        { properties: { title: 'Setores (Consolidado & Efetivo)' } },
        { properties: { title: 'Consolidado Diário por Setor' } },
        { properties: { title: 'Colaboradores por Setor' } },
        { properties: { title: 'Atividade e UPH (Controladoria)' } },
        { properties: { title: 'Indicadores Reapro' } }
      ]
    };

    const spreadsheet = await fetchGoogleAPI(
      'https://sheets.googleapis.com/v4/spreadsheets',
      'POST',
      token,
      createSpreadsheetBody
    );

    spreadsheetId = spreadsheet.spreadsheetId;
    if (spreadsheetId) {
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, spreadsheetId);
    }
  } else {
    // If spreadsheet exists, verify if required sheets exist, add missing ones
    const existingTitles: string[] = (existingSpreadsheet.sheets || []).map(
      (s: any) => s.properties?.title
    );
    const requiredSheets = [
      'Resumo Geral',
      'Setores (Consolidado & Efetivo)',
      'Consolidado Diário por Setor',
      'Colaboradores por Setor',
      'Atividade e UPH (Controladoria)',
      'Indicadores Reapro'
    ];

    const requestsToAdd: any[] = [];
    for (const reqTitle of requiredSheets) {
      if (!existingTitles.includes(reqTitle)) {
        requestsToAdd.push({
          addSheet: {
            properties: { title: reqTitle }
          }
        });
      }
    }

    if (requestsToAdd.length > 0) {
      try {
        await fetchGoogleAPI(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          'POST',
          token,
          { requests: requestsToAdd }
        );
      } catch (err) {
        console.warn('Erro ao adicionar abas faltantes:', err);
      }
    }
  }

  // 2. Prepare Data Uploads (Batch Update Values)
  const totalVolume = data.setores.reduce((sum, s) => sum + (s.ativ || 0), 0);
  const totalColis = data.setores.reduce((sum, s) => sum + (s.colis || 0), 0);
  const totalRepro = data.setores.reduce((sum, s) => sum + (s.reproTotal || 0), 0);
  const mediaUPH = data.setores.length ? Math.round(data.setores.reduce((sum, s) => sum + (s.uph || 0), 0) / data.setores.length) : 0;
  const mediaSLA = data.setores.length ? (data.setores.reduce((sum, s) => sum + (s.promessa || 0), 0) / data.setores.length).toFixed(1) : '0';
  const totalPessoasOp = data.colaboradores.filter(c => c.status === 'Operacao' || (c.status as string) === 'Operação').length;

  // Sheet 1: Resumo Geral
  const resumoData = [
    ['Métrica / Indicador', 'Valor Consolidado'],
    ['Data do Relatório', new Date().toLocaleString('pt-BR')],
    ['Coordenador Responsável', data.coordenador || 'Geral / Coordenadoria'],
    ['Total Setores Ativos', data.setores.filter(s => s.situacao !== 'Inativo').length.toString()],
    ['Volume Total Atividade (ATIV)', totalVolume.toLocaleString('pt-BR')],
    ['Total Colis', totalColis.toLocaleString('pt-BR')],
    ['Total Repro (Caixas)', totalRepro.toLocaleString('pt-BR')],
    ['Produtividade Média (UPH)', mediaUPH.toString()],
    ['Eficiência Média (SLA %)', `${mediaSLA}%`],
    ['Total Colaboradores Escalados', data.colaboradores.length.toString()],
    ['Colaboradores em Operação Ativa', totalPessoasOp.toString()],
    ['D-ALL REAPRO Total (CX)', (data.reapro.listasFechadas?.colis || 0).toString()],
    ['Término Previsto REAPRO', data.reapro.terminoPrevisao || 'Auto'],
  ];

  // Sheet 2: Setores (Consolidado & Efetivo)
  const setoresData = [
    ['Setor', 'Nome / Tipo', 'Situação', 'Atividade (ATIV)', 'Colis', 'Repro (Caixas)', 'Pessoas Escaladas', 'Pessoas em Operação', 'UPH', 'SLA (Promessa %)', 'Líder / Responsável']
  ];
  data.setores.forEach(s => {
    const pessoasEscaladas = data.colaboradores.filter(c => c.setor === `Setor ${s.id}` || c.setor === s.id).length;
    const pessoasOperando = data.colaboradores.filter(c => (c.setor === `Setor ${s.id}` || c.setor === s.id) && (c.status === 'Operacao' || (c.status as string) === 'Operação')).length;

    setoresData.push([
      `S${s.id}`,
      s.nome || `Setor ${s.id}`,
      s.situacao || 'Ativo',
      (s.ativ ?? 0).toString(),
      (s.colis ?? 0).toString(),
      (s.reproTotal ?? 0).toString(),
      pessoasEscaladas.toString(),
      pessoasOperando.toString(),
      (s.uph ?? 0).toString(),
      `${s.promessa ?? 0}%`,
      s.resp || '-'
    ]);
  });

  // Sheet 3: Consolidado Diário por Setor (Registro por Dia)
  const historicoData = [
    ['Data', 'Hora', 'Setor', 'Atividade (ATIV)', 'Repro (Caixas)', 'Colis', 'Pessoas / Efetivo', 'UPH', 'SLA (Promessa %)', 'Nota 5S', 'Erros Picking', 'Coordenador / Obs']
  ];
  
  if (data.historico && data.historico.length > 0) {
    data.historico.forEach(h => {
      historicoData.push([
        h.data || '-',
        h.hora || '-',
        h.setor?.startsWith('S') ? h.setor : `S${h.setor}`,
        (h.ativ ?? 0).toString(),
        (h.repro ?? 0).toString(),
        (h.colis ?? 0).toString(),
        (h.pessoas ?? 0).toString(),
        (h.uph ?? 0).toString(),
        `${h.promessa ?? 0}%`,
        (h.nota5s ?? 0).toString(),
        (h.erros ?? 0).toString(),
        h.coordenador || h.obs || '-'
      ]);
    });
  } else {
    // Snapshot instantâneo do dia caso o histórico esteja vazio
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const agoraHora = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
    data.setores.forEach(s => {
      const pessoasSetor = data.colaboradores.filter(c => c.setor === `Setor ${s.id}` || c.setor === s.id).length;
      historicoData.push([
        hojeStr,
        agoraHora,
        `S${s.id}`,
        (s.ativ ?? 0).toString(),
        (s.reproTotal ?? 0).toString(),
        (s.colis ?? 0).toString(),
        pessoasSetor.toString(),
        (s.uph ?? 0).toString(),
        `${s.promessa ?? 0}%`,
        (s.nota5s ?? 0).toString(),
        (s.errosPicking ?? 0).toString(),
        data.coordenador || 'Fechamento do Dia'
      ]);
    });
  }

  // Sheet 4: Colaboradores por Setor
  const colabData = [
    ['Nome', 'Matrícula', 'Função / Cargo', 'Status Atual', 'Setor Vinculado', 'Turno', 'Horas']
  ];
  data.colaboradores.forEach(c => {
    colabData.push([
      c.nome,
      c.matricula || '-',
      c.funcao || c.cargo || 'Operador',
      c.status,
      c.setor || '-',
      c.turno || '1º Turno',
      (c.horas ?? 7.2).toString()
    ]);
  });

  // Sheet 5: Atividade Total e UPH (Controladoria)
  const ativUphData = [
    ['Setor', 'Nome', 'Atividade (ATIV)', 'UPH', 'Repro (Caixas)', 'Colis', 'Pessoas Ativas', 'Meta Abertura']
  ];
  data.setores.forEach(s => {
    const cap = data.capacidade?.find(c => c.id === s.id);
    const pessoasOp = data.colaboradores.filter(c => (c.setor === `Setor ${s.id}` || c.setor === s.id) && (c.status === 'Operacao' || (c.status as string) === 'Operação')).length;
    ativUphData.push([
      `S${s.id}`,
      s.nome || `Setor ${s.id}`,
      (s.ativ ?? 0).toString(),
      (s.uph ?? 0).toString(),
      (s.reproTotal ?? 0).toString(),
      (s.colis ?? 0).toString(),
      pessoasOp.toString(),
      (cap?.abertura ?? s.meta ?? 0).toString()
    ]);
  });

  // Sheet 6: Indicadores Reapro
  const reaproData = [
    ['Indicador Reapro', 'Valor'],
    ['Preso D-ALL', (data.reapro.indicadores?.totalPresoDAll ?? 0).toString()],
    ['Em Curso Coleta', (data.reapro.indicadores?.emCursoColetado ?? 0).toString()],
    ['Em Máquina', (data.reapro.indicadores?.totalEmMaquina ?? 0).toString()],
    ['Disponibilidade %', `${data.reapro.indicadores?.disponibilidade ?? 0}%`],
    ['Capacidade Est. Fechamento', (data.reapro.capacidadeFechamentoEst ?? 0).toString()]
  ];

  const updateValuesBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Resumo Geral!A1', values: resumoData },
      { range: 'Setores (Consolidado & Efetivo)!A1', values: setoresData },
      { range: 'Consolidado Diário por Setor!A1', values: historicoData },
      { range: 'Colaboradores por Setor!A1', values: colabData },
      { range: 'Atividade e UPH (Controladoria)!A1', values: ativUphData },
      { range: 'Indicadores Reapro!A1', values: reaproData },
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
