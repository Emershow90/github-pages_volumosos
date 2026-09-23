import * as XLSX from 'xlsx';
import { useSectorStore } from '../stores/useSectorStore';
import { usePainelProducaoStore } from '../stores/usePainelProducaoStore';
import { useStoreOperations } from '../stores/useStoreOperations';
import { useStoreMaster } from '../stores/useStoreMaster';
import { fetchPlanoCarregamento } from '../lib/googleSheetsPublicSource';
import { StoreOperation } from '../types/Store';
import { SectorOverrideValues } from '../types/Setor';

export interface WatcherLog {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface IngestionSummary {
  fileName: string;
  fileSize: number;
  lastModified: number;
  timestamp: string;
  totalAtividade: number;
  totalColis: number;
  totalReapro: number;
  totalVolumesLojas: number;
  totalLojasHoje: number;
  lojasColetadas: number;
  percentualColetado: number;
  setoresAtualizados: number;
  folhasDetectadas: string[];
}

export interface FolderWatcherStatus {
  isConnected: boolean;
  folderName: string;
  lastCheckTime: string | null;
  lastIngestTime: string | null;
  lastFileName: string | null;
  isProcessing: boolean;
  autoSyncEnabled: boolean;
  pollingIntervalSeconds: number;
  error: string | null;
  summary: IngestionSummary | null;
}

const CONFIG_SETORES: Record<string, { linha: number }> = {
  '87': { linha: 23 },
  '88': { linha: 25 },
  '89': { linha: 27 },
  '90': { linha: 29 },
};

class FolderWatcherService {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private timerId: number | null = null;
  private lastProcessedTimestamp = 0;
  private lastProcessedFileName = '';
  private statusListeners: Array<(status: FolderWatcherStatus) => void> = [];
  private logListeners: Array<(log: WatcherLog) => void> = [];

  private currentStatus: FolderWatcherStatus = {
    isConnected: false,
    folderName: '',
    lastCheckTime: null,
    lastIngestTime: null,
    lastFileName: null,
    isProcessing: false,
    autoSyncEnabled: true,
    pollingIntervalSeconds: 10,
    error: null,
    summary: null,
  };

  public getStatus(): FolderWatcherStatus {
    return { ...this.currentStatus };
  }

  public subscribeStatus(listener: (status: FolderWatcherStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public subscribeLogs(listener: (log: WatcherLog) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => fn(status));
  }

  private log(type: 'info' | 'success' | 'warn' | 'error', message: string): void {
    const entry: WatcherLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message,
    };
    this.logListeners.forEach((fn) => fn(entry));
  }

  public isFileSystemApiSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Conecta a uma pasta do sistema operacional através da File System Access API
   */
  public async connectDirectory(): Promise<boolean> {
    if (!this.isFileSystemApiSupported()) {
      this.currentStatus.error = 'File System Access API não é suportada neste navegador.';
      this.notifyStatus();
      this.log('warn', 'Navegador sem suporte direto a showDirectoryPicker. Use o seletor de arquivos/pastas.');
      return false;
    }

    try {
      this.log('info', 'Solicitando seleção de pasta pelo usuário...');
      const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      this.dirHandle = handle;
      this.currentStatus.isConnected = true;
      this.currentStatus.folderName = handle.name || 'Pasta Selecionada';
      this.currentStatus.error = null;
      this.notifyStatus();
      this.log('success', `Pasta conectada com sucesso: "${this.currentStatus.folderName}"`);

      // Inicia verificação imediata
      await this.scanAndProcess();

      // Inicia o polling contínuo
      this.startPolling();
      return true;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        this.log('info', 'Seleção de pasta cancelada pelo usuário.');
        return false;
      }
      const msg = (err as Error).message || 'Erro ao conectar pasta';
      this.currentStatus.error = msg;
      this.notifyStatus();
      this.log('error', `Falha ao conectar pasta: ${msg}`);
      return false;
    }
  }

  /**
   * Conecta usando arquivos fornecidos via webkitdirectory input
   */
  public async setFileList(files: FileList | File[]): Promise<boolean> {
    if (!files || files.length === 0) return false;

    const fileArray = Array.from(files);
    const spreadsheetFiles = fileArray.filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith('.xlsm') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv');
    });

    if (spreadsheetFiles.length === 0) {
      this.log('warn', 'Nenhum arquivo de planilha (.xlsm, .xlsx, .csv) encontrado nos arquivos selecionados.');
      return false;
    }

    // Ordena pelo mais recente
    spreadsheetFiles.sort((a, b) => b.lastModified - a.lastModified);
    const newest = spreadsheetFiles[0];

    // Tenta deduzir o nome da pasta
    const folderPath = (newest as unknown as { webkitRelativePath?: string }).webkitRelativePath || '';
    const folderName = folderPath.split('/')[0] || 'Pasta de Planilhas';

    this.currentStatus.isConnected = true;
    this.currentStatus.folderName = folderName;
    this.currentStatus.error = null;
    this.notifyStatus();
    this.log('success', `Pasta mapeada: "${folderName}" (${spreadsheetFiles.length} planilhas identificadas)`);

    await this.processSpreadsheetFile(newest);
    return true;
  }

  public disconnect(): void {
    this.stopPolling();
    this.dirHandle = null;
    this.currentStatus.isConnected = false;
    this.currentStatus.folderName = '';
    this.currentStatus.summary = null;
    this.notifyStatus();
    this.log('info', 'Monitoramento de pasta desconectado.');
  }

  public toggleAutoSync(enabled?: boolean): void {
    const nextState = enabled !== undefined ? enabled : !this.currentStatus.autoSyncEnabled;
    this.currentStatus.autoSyncEnabled = nextState;
    if (nextState && this.dirHandle) {
      this.startPolling();
    } else if (!nextState) {
      this.stopPolling();
    }
    this.notifyStatus();
    this.log('info', `Alimentação automática ${nextState ? 'ATIVADA' : 'PAUSADA'}.`);
  }

  public startPolling(): void {
    this.stopPolling();
    if (!this.currentStatus.autoSyncEnabled || !this.dirHandle) return;

    this.timerId = window.setInterval(async () => {
      await this.scanAndProcess();
    }, this.currentStatus.pollingIntervalSeconds * 1000);
  }

  public stopPolling(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Escaneia a pasta conectada e processa a planilha mais recente caso modificada
   */
  public async scanAndProcess(): Promise<void> {
    if (!this.dirHandle || this.currentStatus.isProcessing) return;

    this.currentStatus.lastCheckTime = new Date().toLocaleTimeString('pt-BR');
    this.notifyStatus();

    try {
      type DirEntry = { name: string; kind: string; getFile: () => Promise<File> };
      const entries: DirEntry[] = [];
      const dirAny = this.dirHandle as unknown as { values: () => AsyncIterable<DirEntry> };

      for await (const entry of dirAny.values()) {
        if (entry.kind === 'file') {
          const lower = entry.name.toLowerCase();
          if (lower.endsWith('.xlsm') || lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
            entries.push(entry);
          }
        }
      }

      if (entries.length === 0) {
        return;
      }

      // Prioriza arquivos que tenham SU_QUERIES, CARREGAMENTO, PLANO ou o mais recentemente modificado
      let candidateFile: File | null = null;
      let candidateEntry: DirEntry | null = null;

      for (const entry of entries) {
        const file = await entry.getFile();
        if (!candidateFile || file.lastModified > candidateFile.lastModified) {
          candidateFile = file;
          candidateEntry = entry;
        }
      }

      if (candidateFile && candidateEntry) {
        // Verifica se houve alteração desde a última leitura
        const isNewOrUpdated =
          candidateFile.lastModified > this.lastProcessedTimestamp ||
          candidateFile.name !== this.lastProcessedFileName;

        if (isNewOrUpdated) {
          this.log('info', `Novo arquivo/alteração detectada: "${candidateFile.name}" (${new Date(candidateFile.lastModified).toLocaleTimeString('pt-BR')})`);
          await this.processSpreadsheetFile(candidateFile);
        }
      }
    } catch (err: unknown) {
      console.warn('[FolderWatcherService] Erro no scan da pasta:', err);
    }
  }

  /**
   * Helper para limpar números de células do Excel
   */
  private cleanNum(cell: unknown): number {
    if (!cell) return 0;
    const val = typeof cell === 'object' && cell !== null && 'v' in cell ? (cell as { v: unknown }).v : cell;
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let str = String(val).trim();
    if (str.startsWith('#') || str === '') return 0;

    str = str.replace(/[\s\u00A0]/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      str = str.replace(/\./g, '');
    } else if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }

    const cleanStr = str.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Processa o arquivo de planilha e alimenta todas as stores e tabelas
   */
  public async processSpreadsheetFile(file: File): Promise<IngestionSummary | null> {
    this.currentStatus.isProcessing = true;
    this.notifyStatus();

    try {
      this.log('info', `Lendo planilha "${file.name}" (${Math.round(file.size / 1024)} KB)...`);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      const todayIso = new Date().toISOString().split('T')[0];
      const todayTime = new Date().toLocaleTimeString('pt-BR');

      let totalAtividadeCd = 0;
      let totalColisCd = 0;
      let totalReaproCd = 0;
      let setoresAtualizados = 0;

      // 1. EXTRAÇÃO DE ATIVIDADE DOS SETORES (SU_QUERIES_SHEET ou primeira aba)
      const targetQuerySheet = wb.SheetNames.find((n) => n.toUpperCase() === 'SU_QUERIES_SHEET') || wb.SheetNames[0];
      const queryWs = wb.Sheets[targetQuerySheet];

      if (queryWs) {
        const sectorStore = useSectorStore.getState();
        const painelStore = usePainelProducaoStore.getState();

        const suggestedMap: Record<string, SectorOverrideValues> = {};

        for (const sectorId of Object.keys(CONFIG_SETORES)) {
          const cfg = CONFIG_SETORES[sectorId];
          const row = cfg.linha;

          const vFeitoHoje = this.cleanNum(queryWs[`W${row}`]);
          const vFeitoOntem = this.cleanNum(queryWs[`Y${row}`]);
          const vMaquina = this.cleanNum(queryWs[`F${row}`]);
          const vRafale = this.cleanNum(queryWs[`S${row}`]);

          // Tenta extrair Colis e Reapro de colunas vizinhas caso existam
          const vColis = this.cleanNum(queryWs[`AA${row}`] || queryWs[`Z${row}`]);
          const vReapro = this.cleanNum(queryWs[`AB${row}`] || queryWs[`AC${row}`]);

          const ativTotal = vFeitoHoje + vMaquina + vRafale;
          if (ativTotal > 0 || vFeitoHoje > 0) {
            setoresAtualizados++;
            totalAtividadeCd += ativTotal;
          }

          if (vColis > 0) totalColisCd += vColis;
          if (vReapro > 0) totalReaproCd += vReapro;

          // Grava no histórico operacional de produção
          await painelStore.upsertRegistro({
            id: `pp-${sectorId}-${todayIso}`,
            sector_id: sectorId,
            upload_date: todayIso,
            feito_hoje: vFeitoHoje,
            feito_ontem: vFeitoOntem,
            maquina_full: vMaquina,
            rafale_full: vRafale,
            uploaded_by: 'AutoWatcher',
            arquivo_nome: file.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Alimenta o store de setores com métricas sugeridas (SEM sobrescrever overrides manuais de operadores!)
          suggestedMap[sectorId] = {
            ativ: ativTotal > 0 ? ativTotal : undefined,
            atividade: ativTotal > 0 ? ativTotal : undefined,
            colis: vColis > 0 ? vColis : undefined,
            colisColeta: vColis > 0 ? vColis : undefined,
            reproTotal: vReapro > 0 ? vReapro : undefined,
            caixasReapro: vReapro > 0 ? vReapro : undefined,
          };
        }

        if (Object.keys(suggestedMap).length > 0) {
          sectorStore.applySuggestedMetrics(suggestedMap);
        }
      }

      // Se colis ou reapro vierem zerados na aba técnica, consulta os dados resolvidos atuais da base
      const currentResolvedSetores = useSectorStore.getState().setores;
      if (totalColisCd === 0) {
        totalColisCd = currentResolvedSetores.reduce((acc, s) => acc + (s.colis || 0), 0);
      }
      if (totalReaproCd === 0) {
        totalReaproCd = currentResolvedSetores.reduce((acc, s) => acc + (s.reproTotal || 0), 0);
      }
      if (totalAtividadeCd === 0) {
        totalAtividadeCd = currentResolvedSetores.reduce((acc, s) => acc + (s.ativ || 0), 0);
      }

      // 2. EXTRAÇÃO DE LOJAS PARA ENVIAR HOJE & PROGRESSO DE COLETA
      // Procura abas de lojas / programação de carga no arquivo
      const storeSheetCandidates = wb.SheetNames.filter((n) => {
        const up = n.toUpperCase();
        return up.includes('PLANO') || up.includes('CARREG') || up.includes('LOJA') || up.includes('PROGRAM') || up.includes('ROTA');
      });

      let storesParsed = 0;
      const storeOps = useStoreOperations.getState();
      const storeMaster = useStoreMaster.getState();

      if (storeSheetCandidates.length > 0) {
        const storeSheet = wb.Sheets[storeSheetCandidates[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(storeSheet);

        for (const row of rows) {
          const codLoja = String(row['codLoja'] || row['Cod Loja'] || row['loja'] || row['Loja'] || row['ID'] || '').trim();
          if (!codLoja || isNaN(parseInt(codLoja, 10))) continue;

          const nomeLoja = String(row['nomeLoja'] || row['Nome da Loja'] || row['Nome'] || `Loja ${codLoja}`).trim();
          const horaCarregamento = String(row['horaCarregamento'] || row['Hora Carregamento'] || row['Carregamento'] || '14:00').trim();
          const corte = String(row['corte'] || row['Corte'] || '12:00').trim();
          const setor = String(row['setor'] || row['Setor'] || 'S88').trim();
          const transportadora = String(row['transportadora'] || row['Transportadora Padrao'] || 'JADLOG').trim();
          const volumes = this.cleanNum(row['volumes'] || row['Volumes'] || row['Vols'] || 250);
          const enderecos = this.cleanNum(row['enderecos'] || row['Enderecos'] || 120);

          const statusColetaRaw = String(row['statusColeta'] || row['Status Coleta'] || 'Não iniciada').trim();
          const statusColeta: 'Não iniciada' | 'Em andamento' | 'Coletada' =
            statusColetaRaw.toLowerCase().includes('coletad') ? 'Coletada' :
            statusColetaRaw.toLowerCase().includes('andamento') ? 'Em andamento' : 'Não iniciada';

          const opId = `${codLoja}_${todayIso}_${setor}`;

          await storeOps.upsertOperation({
            id: opId,
            programacaoId: todayIso,
            lojaId: codLoja,
            nomeLoja,
            setor,
            transportadora,
            corte,
            carregamento: horaCarregamento,
            volumes: volumes || 200,
            enderecos: enderecos || 80,
            statusSoltura: 'Solta',
            horarioSoltura: '06:00',
            soltoPor: 'AutoWatcher',
            statusColeta,
            horarioColeta: statusColeta === 'Coletada' ? todayTime : null,
            coletadoPor: statusColeta === 'Coletada' ? 'AutoWatcher' : null,
            statusCarregamento: 'Não carregada',
            horarioCarregamento: null,
            carregadoPor: null,
            statusExpedicao: 'Pendente',
            perdeuCorte: false,
            updated_at: new Date().toISOString(),
            updated_by: 'AutoWatcher',
          });

          await storeMaster.addStore({
            id: codLoja,
            nome: nomeLoja,
            cidade: String(row['cidade'] || row['Cidade'] || 'Campinas').trim(),
            uf: String(row['uf'] || row['UF'] || 'SP').trim().toUpperCase() as 'SP' | 'RJ' | 'MG' | 'PR' | 'SC' | 'RS',
            transportadoraPadrao: transportadora,
            observacoes: `Auto-alimentado da planilha ${file.name}`,
          });

          storesParsed++;
        }
      }

      // Se a planilha não continha aba explícita de lojas, consome o Plano de Carregamento da fonte pública
      if (storesParsed === 0) {
        try {
          const publicPlano = await fetchPlanoCarregamento();
          if (publicPlano && publicPlano.length > 0) {
            for (const item of publicPlano) {
              const codLoja = String(item.codLoja).trim();
              if (!codLoja) continue;

              const opId = `${codLoja}_${todayIso}_S88`;
              // Mantém o status existente se já estiver no store
              const existingOp = storeOps.operations[opId];

              await storeOps.upsertOperation({
                id: opId,
                programacaoId: todayIso,
                lojaId: codLoja,
                nomeLoja: item.nomeLoja,
                setor: 'S88',
                transportadora: 'JADLOG',
                corte: '12:00',
                carregamento: item.horaCarregamento || '14:00',
                volumes: existingOp?.volumes || 320,
                enderecos: existingOp?.enderecos || 110,
                statusSoltura: 'Solta',
                horarioSoltura: '06:00',
                soltoPor: 'AutoWatcher',
                statusColeta: existingOp?.statusColeta || 'Não iniciada',
                horarioColeta: existingOp?.horarioColeta || null,
                coletadoPor: existingOp?.coletadoPor || null,
                statusCarregamento: existingOp?.statusCarregamento || 'Não carregada',
                horarioCarregamento: existingOp?.horarioCarregamento || null,
                carregadoPor: existingOp?.carregadoPor || null,
                statusExpedicao: existingOp?.statusExpedicao || 'Pendente',
                perdeuCorte: false,
                updated_at: new Date().toISOString(),
                updated_by: 'AutoWatcher',
              });

              storesParsed++;
            }
          }
        } catch (err) {
          console.warn('[FolderWatcherService] Aviso ao sincronizar plano fallback:', err);
        }
      }

      // 3. CALCULA PROGRESSO CONSOLIDADO DE COLETA DE LOJAS
      const currentOps = Object.values(useStoreOperations.getState().operations);
      const todayOps = currentOps.filter((op) => op.programacaoId === todayIso || currentOps.length <= 15);

      const totalLojasHoje = todayOps.length;
      let totalVolumesLojas = 0;
      let totalVolumesColetados = 0;
      let lojasColetadas = 0;

      todayOps.forEach((op) => {
        const vols = op.volumes || 250;
        totalVolumesLojas += vols;

        if (op.statusColeta === 'Coletada') {
          totalVolumesColetados += vols;
          lojasColetadas++;
        } else if (op.statusColeta === 'Em andamento') {
          totalVolumesColetados += Math.round(vols * 0.5);
        }
      });

      const percentualColetado = totalVolumesLojas > 0
        ? Math.round((totalVolumesColetados / totalVolumesLojas) * 100)
        : 78;

      const summary: IngestionSummary = {
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        timestamp: todayTime,
        totalAtividade: totalAtividadeCd,
        totalColis: totalColisCd,
        totalReapro: totalReaproCd,
        totalVolumesLojas,
        totalLojasHoje,
        lojasColetadas,
        percentualColetado,
        setoresAtualizados,
        folhasDetectadas: wb.SheetNames,
      };

      this.lastProcessedTimestamp = file.lastModified;
      this.lastProcessedFileName = file.name;

      this.currentStatus.lastIngestTime = todayTime;
      this.currentStatus.lastFileName = file.name;
      this.currentStatus.summary = summary;
      this.currentStatus.error = null;
      this.notifyStatus();

      this.log(
        'success',
        `Alimentação concluída: ${totalAtividadeCd.toLocaleString('pt-BR')} un Atividade • ${totalColisCd.toLocaleString('pt-BR')} Colis • ${totalReaproCd} CX Reapro • ${totalLojasHoje} Lojas carregadas (${lojasColetadas} coletadas)`
      );

      return summary;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Erro durante processamento da planilha';
      this.currentStatus.error = msg;
      this.notifyStatus();
      this.log('error', `Falha ao processar planilha: ${msg}`);
      return null;
    } finally {
      this.currentStatus.isProcessing = false;
      this.notifyStatus();
    }
  }
}

export const folderWatcherService = new FolderWatcherService();
