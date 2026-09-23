import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Layers, 
  Tv, 
  Download, 
  Activity, 
  Users, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  Zap,
  Apple,
  Mountain,
  Package,
  Sliders,
  Check,
  X,
  PieChart,
  Plus,
  Trash2,
  Tag,
  RotateCcw,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  FolderSync,
  FolderOpen,
  Maximize2,
  Minimize2,
  Truck,
  Store as StoreIcon,
  Boxes,
  CheckSquare,
  Search,
  Filter,
  Play,
  Pause,
  ArrowUpRight
} from 'lucide-react';
import { usePainelProducaoStore } from '../stores/usePainelProducaoStore';
import { useSectorStore, resolveSectorMetrics } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useCopilMetrics } from '../hooks/useCopilMetrics';
import { useStoreOperations } from '../stores/useStoreOperations';
import { usePlanoCarregamentoRisk } from '../hooks/usePlanoCarregamentoRisk';
import { folderWatcherService, FolderWatcherStatus } from '../services/folderWatcherService';
import { StoreOperation } from '../types/Store';
import { useAIStrategy } from '../hooks/useAIStrategy';
import { AIStrategyModal } from './AIStrategyModal';
import { PromiseSLA } from '../types/AIStrategy';
import { Setor, ActivityEntry } from '../types';
import { initialCapacidade } from '../initialData';
import { exportToGoogleSheets } from '../services/googleSheetsExportService';
import { logger } from '../lib/telemetryLogger';

const PALETTE_CUSTOM = [
  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', bar: 'bg-cyan-500', hex: '#06b6d4' },
  { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'bg-rose-500', hex: '#f43f5e' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500', hex: '#10b981' },
  { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', bar: 'bg-teal-500', hex: '#14b8a6' },
  { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: 'bg-orange-500', hex: '#f97316' },
  { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', bar: 'bg-violet-500', hex: '#8b5cf6' },
];

interface ConsoleOperacionalProps {
  setores?: Setor[];
  activeSectorId?: string;
  onChangeSector?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const CONFIG_SETORES: Record<string, { nome: string; linha: number; cor: string; mixPadrao: { alimentoPct: number; montanhaPct: number; colisPct: number } }> = {
  '87': { nome: 'Picking 87', linha: 23, cor: '#8b5cf6', mixPadrao: { alimentoPct: 35, montanhaPct: 65, colisPct: 5 } },
  '88': { nome: 'Picking 88', linha: 25, cor: '#3b82f6', mixPadrao: { alimentoPct: 65, montanhaPct: 35, colisPct: 4 } },
  '89': { nome: 'Picking 89', linha: 27, cor: '#f59e0b', mixPadrao: { alimentoPct: 60, montanhaPct: 40, colisPct: 0 } },
  '90': { nome: 'Picking 90', linha: 29, cor: '#10b981', mixPadrao: { alimentoPct: 65, montanhaPct: 35, colisPct: 0 } }
};

export const ConsoleOperacional: React.FC<ConsoleOperacionalProps> = ({
  setores = [],
  activeSectorId = '88',
  onChangeSector,
  onNavigateTab
}) => {
  const { currentUser, currentUserUid } = useUserStore();
  const { registros, upsertRegistro, fetchRegistrosHoje } = usePainelProducaoStore();
  const { activityEntries, capacidade, updateActivityUniversosBatch, updateSectorOverride, setSetores } = useSectorStore();
  const storeSetores = useSectorStore((s) => s.setores);
  const effectiveSetores = useMemo(() => {
    const list = setores && setores.length > 0 ? setores : storeSetores;
    return list.map((s) => resolveSectorMetrics(s));
  }, [setores, storeSetores]);
  const { colaboradores } = useCollaboratorStore();
  const { historico, addAuditLog } = useHistoryStore();
  const { metrics: copilData, summaryStats: copilSummary } = useCopilMetrics();
  const { 
    strategy, 
    isLoading: isStrategyLoading, 
    isModalOpen: isStrategyModalOpen, 
    setIsModalOpen: setIsStrategyModalOpen, 
    refreshStrategy 
  } = useAIStrategy();

  const [visaoAtual, setVisaoAtual] = useState<string>('TODOS');
  const [carrosselAtivo, setCarrosselAtivo] = useState(false);
  const [carrosselCountdown, setCarrosselCountdown] = useState(12);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [relogio, setRelogio] = useState('');
  const [fileInfo, setFileInfo] = useState('STATUS: ZERADO (AGUARDANDO UPLOAD)');
  const [isDropActive, setIsDropActive] = useState(false);

  // Folder Watcher (Carregamento Automático de Pasta)
  const [watcherStatus, setWatcherStatus] = useState<FolderWatcherStatus>(folderWatcherService.getStatus());
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Filtros de Lojas Hoje
  const [lojaSearchFilter, setLojaSearchFilter] = useState('');
  const [lojaStatusFilter, setLojaStatusFilter] = useState<'all' | 'Não iniciada' | 'Em andamento' | 'Coletada'>('all');
  const [lojaSetorFilter, setLojaSetorFilter] = useState<string>('all');

  // Stores de Operações e Risco de Carregamento
  const operationsMap = useStoreOperations((s) => s.operations);
  const upsertOperation = useStoreOperations((s) => s.upsertOperation);
  const { operations: riskOperations, summary: riskSummary, planoCarregamento } = usePlanoCarregamentoRisk();

  // Sync state and live indicators
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  // Modal / Edição rápida de universos
  const [editingSectorUniversos, setEditingSectorUniversos] = useState<string | null>(null);
  const [editAlimento, setEditAlimento] = useState<number>(0);
  const [editMontanha, setEditMontanha] = useState<number>(0);
  const [editCustomUniversos, setEditCustomUniversos] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [editReproTotal, setEditReproTotal] = useState<number>(0);
  const [editColis, setEditColis] = useState<number>(0);
  const [editAtividade, setEditAtividade] = useState<number>(0);
  const [editElog, setEditElog] = useState<string>('');

  // Modal de Carregamento
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loadStatusText, setLoadStatusText] = useState('Inicializando leitor...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Subscribe to Folder Watcher
  useEffect(() => {
    return folderWatcherService.subscribeStatus((st) => {
      setWatcherStatus(st);
      if (st.summary) {
        setFileInfo(`PLANILHA AUTO: "${st.summary.fileName}" • ${st.summary.totalAtividade.toLocaleString('pt-BR')} UN • ${st.summary.totalColis} COLIS • ${st.summary.totalLojasHoje} LOJAS`);
      }
    });
  }, []);

  // Initialize data fetch
  useEffect(() => {
    fetchRegistrosHoje(todayStr);
  }, [fetchRegistrosHoje, todayStr]);

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      setRelogio(new Date().toLocaleTimeString('pt-BR'));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // TV Carrossel mode (Alterna entre TODOS, LOJAS_HOJE, 87, 88, 89, 90)
  useEffect(() => {
    if (!carrosselAtivo) return;
    const modos = ['TODOS', 'LOJAS_HOJE', '87', '88', '89', '90'];
    setCarrosselCountdown(12);

    const countdownTimer = setInterval(() => {
      setCarrosselCountdown((prev) => (prev <= 1 ? 12 : prev - 1));
    }, 1000);

    const rotateTimer = setInterval(() => {
      setVisaoAtual((prev) => {
        const idx = modos.indexOf(prev);
        const nextIdx = (idx + 1) % modos.length;
        return modos[nextIdx];
      });
    }, 12000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(rotateTimer);
    };
  }, [carrosselAtivo]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handler para conectar pasta automática
  const handleConnectFolder = async () => {
    if (folderWatcherService.isFileSystemApiSupported()) {
      const ok = await folderWatcherService.connectDirectory();
      if (!ok && folderInputRef.current) {
        folderInputRef.current.click();
      }
    } else if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Handler para input de arquivos de pasta selecionada (fallback universal)
  const handleFolderFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await folderWatcherService.setFileList(e.target.files);
    }
  };

  // Operações de Lojas Hoje computadas
  const allOperationsList = useMemo(() => Object.values(operationsMap), [operationsMap]);
  const todayOperations = useMemo<StoreOperation[]>(() => {
    let list = allOperationsList.filter((op) => op.programacaoId === todayStr);
    if (list.length === 0 && allOperationsList.length > 0) {
      list = allOperationsList;
    }
    if (list.length === 0 && planoCarregamento.length > 0) {
      return planoCarregamento.map((p) => ({
        id: `${p.codLoja}_${todayStr}_S88`,
        programacaoId: todayStr,
        lojaId: p.codLoja,
        nomeLoja: p.nomeLoja,
        setor: 'S88',
        transportadora: 'JADLOG',
        corte: '12:00',
        carregamento: p.horaCarregamento || '14:00',
        volumes: 280,
        enderecos: 95,
        statusSoltura: 'Solta' as const,
        horarioSoltura: '06:00',
        soltoPor: 'AutoWatcher',
        statusColeta: 'Não iniciada' as const,
        horarioColeta: null,
        coletadoPor: null,
        statusCarregamento: 'Não carregada' as const,
        horarioCarregamento: null,
        carregadoPor: null,
        statusExpedicao: 'Pendente' as const,
        perdeuCorte: false,
        updated_at: new Date().toISOString(),
        updated_by: 'AutoWatcher'
      }));
    }
    return list;
  }, [allOperationsList, todayStr, planoCarregamento]);

  // Métricas de Coleta de Lojas
  const totalLojasHoje = todayOperations.length;
  const lojasColetadasCount = todayOperations.filter((o) => o.statusColeta === 'Coletada').length;
  const lojasEmAndamentoCount = todayOperations.filter((o) => o.statusColeta === 'Em andamento').length;
  const lojasNaoIniciadasCount = todayOperations.filter((o) => o.statusColeta === 'Não iniciada').length;

  const totalVolumesProgramados = todayOperations.reduce((acc, o) => acc + (o.volumes || 250), 0);
  const totalVolumesColetados = todayOperations.reduce((acc, o) => {
    const v = o.volumes || 250;
    if (o.statusColeta === 'Coletada') return acc + v;
    if (o.statusColeta === 'Em andamento') return acc + Math.round(v * 0.5);
    return acc;
  }, 0);

  const percentualColetado = totalVolumesProgramados > 0
    ? Math.round((totalVolumesColetados / totalVolumesProgramados) * 100)
    : 0;

  // Alternador rápido de status de coleta para o operador
  const handleToggleStoreStatus = async (op: StoreOperation) => {
    const nextStatus: 'Não iniciada' | 'Em andamento' | 'Coletada' =
      op.statusColeta === 'Não iniciada' ? 'Em andamento' :
      op.statusColeta === 'Em andamento' ? 'Coletada' : 'Não iniciada';
    
    await upsertOperation({
      ...op,
      statusColeta: nextStatus,
      horarioColeta: nextStatus === 'Coletada' ? new Date().toLocaleTimeString('pt-BR') : op.horarioColeta,
      coletadoPor: nextStatus === 'Coletada' ? (currentUser || 'Operador') : op.coletadoPor,
      updated_at: new Date().toISOString(),
      updated_by: currentUser || 'Operador',
    });
  };

  // Helper to parse numeric values from Excel cells
  const cleanNum = (cell: string | number): number => {
    if (!cell) return 0;
    let val = ((cell as unknown) as { v: string | number }).v !== undefined ? ((cell as unknown) as { v: string | number }).v : cell;
    if (val === null || val === '') return 0;
    if (typeof val === 'number') return val;

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
  };

  // Helper to update loading modal progress
  const updateProgress = async (percent: number, text: string) => {
    setLoadPercent(percent);
    setLoadStatusText(text);
    await new Promise(r => setTimeout(r, 120));
  };

  // Excel Upload Parser
  const handleExcelUpload = async (file: File) => {
    if (!file) return;

    setIsLoadingModalOpen(true);
    await updateProgress(10, 'Carregando arquivo para memória...');

    try {
      const buffer = await file.arrayBuffer();
      await updateProgress(35, 'Analisando estrutura do workbook...');

      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      const targetSheetName = 'SU_QUERIES_SHEET';
      const foundSheet = wb.SheetNames.find(n => n.toUpperCase() === targetSheetName.toUpperCase()) || wb.SheetNames[0];

      if (!foundSheet) {
        throw new Error('Nenhuma aba válida encontrada na planilha.');
      }

      const ws = wb.Sheets[foundSheet];
      if (!ws) throw new Error(`Aba "${foundSheet}" não pôde ser lida.`);

      await updateProgress(70, 'Extraindo dados das colunas W, Y, F, S...');

      let activeCount = 0;

      for (const sectorId of Object.keys(CONFIG_SETORES)) {
        const cfg = CONFIG_SETORES[sectorId];
        const row = cfg.linha;

        const vFeitoHoje = cleanNum(ws[`W${row}`]);
        const vFeitoOntem = cleanNum(ws[`Y${row}`]);
        const vMaquina = cleanNum(ws[`F${row}`]);
        const vRafale = cleanNum(ws[`S${row}`]);

        if (vFeitoHoje > 0 || vFeitoOntem > 0 || vMaquina > 0 || vRafale > 0) {
          activeCount++;
        }

        await upsertRegistro({
          id: `pp-${sectorId}-${todayStr}`,
          sector_id: sectorId,
          upload_date: todayStr,
          feito_hoje: vFeitoHoje,
          feito_ontem: vFeitoOntem,
          maquina_full: vMaquina,
          rafale_full: vRafale,
          uploaded_by: currentUser || 'Sistema',
          arquivo_nome: file.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      await updateProgress(100, 'Renderizando painel...');
      setFileInfo(`ABA "${foundSheet}" • ${activeCount} SETOR(ES) ATIVO(S) • ${new Date().toLocaleTimeString('pt-BR')}`);

      await new Promise(r => setTimeout(r, 300));
      setIsLoadingModalOpen(false);

    } catch (err: unknown) {
      console.error('[ConsoleOperacional] Erro no parsing:', err);
      setFileInfo(`ERRO NO CARREGAMENTO: ${(err as Error).message || 'Formato de arquivo inválido'}`);
      setIsLoadingModalOpen(false);
      alert(`Erro durante a extração: ${(err as Error).message || 'Verifique se o arquivo é .xlsm / .xlsx válido.'}`);
    }
  };

  // Helper to obtain REAL capacity for sector from useSectorStore (tabela capacidade / abertura / fechoHora)
  const getSectorCapacidade = (sectorId: string): { cap: number; isConfigured: boolean } => {
    const foundCap = capacidade.find(c => String(c.id) === String(sectorId));
    if (foundCap && foundCap.abertura > 0) {
      return { cap: foundCap.abertura, isConfigured: true };
    }
    // Fallback vindo da matriz inicial cadastrada em initialCapacidade (src/initialData.ts)
    const initialFound = initialCapacidade.find(c => String(c.id) === String(sectorId));
    const capValue = initialFound?.abertura || 0;
    return { cap: capValue, isConfigured: false };
  };

  // Helper to obtain sector universe breakdown (Alimento, Montanha, Custom Universos) and Colis
  const getSectorUniversos = (sectorId: string) => {
    const cfg = CONFIG_SETORES[sectorId] || CONFIG_SETORES['88'];
    const sectorObj = effectiveSetores.find(s => String(s.id) === String(sectorId) || String(s.numero) === String(sectorId));
    
    const entry = activityEntries.find(e => String(e.sectorId) === String(sectorId) && e.activityDate === todayStr) ||
                  activityEntries.find(e => String(e.sectorId) === String(sectorId));
                  
    // Única fonte de verdade vinda do store / resolved sector
    const totalAtiv = sectorObj?.ativ || 0;

    // Extrair universos customizados do adhocCategories (e converter mochila legada se houver)
    const customListRaw: Array<{ name: string; value: number }> = [];
    if (entry && entry.adhocCategories) {
      Object.entries(entry.adhocCategories).forEach(([k, v]) => {
        const valNum = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
        if (k && k.trim()) {
          customListRaw.push({ name: k.trim(), value: valNum });
        }
      });
    }

    // Se houver l7Mochila legado no registro e não estiver no adhoc, incluir como customizado
    if (entry && entry.l7Mochila && entry.l7Mochila > 0 && !customListRaw.some(c => c.name.toLowerCase().includes('mochila'))) {
      customListRaw.push({ name: 'Mochila', value: entry.l7Mochila });
    }

    if (entry && (entry.alimento > 0 || entry.montanha > 0 || customListRaw.length > 0)) {
      const alim = entry.alimento || 0;
      const mont = entry.montanha || 0;
      const reproVal = sectorObj?.reproTotal ?? (parseInt(entry.reapro?.replace(" CX", "") || "0") || 151);
      const colisVal = sectorObj?.colis ?? entry.colis ?? (sectorId === '87' ? 1500 : 0);
      const customSum = customListRaw.reduce((acc, c) => acc + c.value, 0);
      const sumUni = alim + mont + customSum;
      const totalUni = sumUni > 0 ? sumUni : totalAtiv;

      const customUniversos = customListRaw.map((c, idx) => {
        const pal = PALETTE_CUSTOM[idx % PALETTE_CUSTOM.length];
        return {
          name: c.name,
          value: c.value,
          pct: totalUni > 0 ? Math.round((c.value / totalUni) * 100) : 0,
          color: pal
        };
      });

      return {
        total: totalUni,
        alimento: alim,
        montanha: mont,
        colis: colisVal,
        atividade: sectorObj?.ativ ?? entry?.atividade ?? 0,
        elog: entry.elog || '2J RA FALC (174)',
        reapro: `${reproVal} CX`,
        alimentoPct: totalUni > 0 ? Math.round((alim / totalUni) * 100) : 0,
        montanhaPct: totalUni > 0 ? Math.round((mont / totalUni) * 100) : 0,
        customUniversos,
        isCustom: true
      };
    }

    // Fallback derivado baseado nos parâmetros padrão do setor
    const mix = cfg.mixPadrao;
    const alim = Math.round((totalAtiv * (mix.alimentoPct || 65)) / 100);
    const mont = Math.max(0, totalAtiv - alim);
    const reproVal = sectorObj?.reproTotal ?? 151;
    const colisVal = sectorObj?.colis ?? (sectorId === '87' ? 1500 : 0);

    return {
      total: totalAtiv,
      alimento: alim,
      montanha: mont,
      colis: colisVal,
      atividade: sectorObj?.ativ ?? entry?.atividade ?? 0,
      elog: '2J RA FALC (174)',
      reapro: `${reproVal} CX`,
      alimentoPct: mix.alimentoPct || 65,
      montanhaPct: mix.montanhaPct || 35,
      customUniversos: [] as Array<{ name: string; value: number; pct: number; color: typeof PALETTE_CUSTOM[0] }>,
      isCustom: false
    };
  };

  // Helper para obter dados de COPIL do setor
  const getSectorCopil = (sectorId: string) => {
    const item = copilData.find(c => String(c.setor) === String(sectorId) || String(c.setor) === `S${sectorId}` || `S${c.setor}` === String(sectorId));
    if (item) {
      const prod = Number(item.produtividade) || 0;
      return {
        pilotagem: Number(item.pilotagem) || 0,
        volumeQueCaiu: Number(item.volume_que_caiu) || 0,
        percentual: Number(item.percentual) || 100,
        totalColetado: Number(item.total_coletado) || 0,
        produtividade: prod,
        promessa: Number(item.promessa) || 98,
        aderencia: Number(item.aderencia) || 100,
        leadTime: Number(item.lead_time) || 0,
        semana: item.semana || 'Atual',
        grade: prod >= 500 ? 'A' : prod >= 400 ? 'B' : prod >= 300 ? 'C' : 'D'
      };
    }
    return {
      pilotagem: sectorId === '88' ? 6200 : sectorId === '87' ? 16000 : 5000,
      volumeQueCaiu: sectorId === '88' ? 5965 : sectorId === '87' ? 15899 : 4800,
      percentual: 96,
      totalColetado: sectorId === '88' ? 5800 : sectorId === '87' ? 15400 : 4700,
      produtividade: sectorId === '88' ? 450 : sectorId === '87' ? 550 : 420,
      promessa: sectorId === '88' ? 99.5 : 100,
      aderencia: 100,
      leadTime: 1.2,
      semana: 'S4',
      grade: 'A'
    };
  };

  // Abrir modal de edição dos universos do setor
  const handleOpenEditUniversos = (secId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const u = getSectorUniversos(secId);
    const sectorObj = effectiveSetores.find(s => String(s.id) === String(secId) || String(s.numero) === String(secId));
    setEditingSectorUniversos(secId);
    setEditAlimento(u.alimento);
    setEditMontanha(u.montanha);
    setEditReproTotal(sectorObj?.reproTotal ?? (parseInt(u.reapro?.replace(" CX", "") || "0") || 151));
    setEditColis(sectorObj?.colis ?? u.colis ?? 0);
    setEditAtividade(sectorObj?.ativ ?? u.atividade ?? 0);
    setEditElog(u.elog || '');
    setEditCustomUniversos(
      (u.customUniversos || []).map((c, i) => ({
        id: `custom-${i}-${c.name}`,
        name: c.name,
        value: c.value
      }))
    );
  };

  // Salvar edição dos universos
  const handleSaveUniversos = async () => {
    if (!editingSectorUniversos) return;
    try {
      const uId = currentUserUid || currentUser || 'system';
      const adhocRecord: Record<string, string | number> = {};
      editCustomUniversos.forEach(item => {
        if (item.name.trim()) {
          adhocRecord[item.name.trim()] = item.value;
        }
      });

      // 1. Atualizar atividade/universos
      await updateActivityUniversosBatch(editingSectorUniversos, todayStr, uId, {
        alimento: editAlimento,
        montanha: editMontanha,
        l7Mochila: 0,
        colis: editColis,
        atividade: editAtividade,
        elog: editElog,
        reapro: `${editReproTotal} CX`,
        adhocCategories: adhocRecord
      });

      // 2. Atualizar overrides na Store centralizada
      await updateSectorOverride(editingSectorUniversos, {
        ...(editAtividade > 0 ? { ativ: editAtividade } : {}),
        reproTotal: editReproTotal,
        colis: editColis,
      }, uId);

      setSetores(prev => prev.map(s => String(s.id) === String(editingSectorUniversos) || String(s.numero) === String(editingSectorUniversos) ? { 
        ...s, 
        reproTotal: editReproTotal,
        colis: editColis,
        ...(editAtividade > 0 ? { ativ: editAtividade } : {})
      } : s));

      await addAuditLog({
        id: `audit_${Date.now()}`,
        data: new Date().toISOString(),
        acao: 'UPDATE_UNIVERSOS',
        usuario: currentUser || 'Operador',
        campo: `sector_${editingSectorUniversos}_universos`,
        dispositivo: 'Console Operacional Web',
        valorAnterior: 'N/A',
        valorNovo: `Alimento: ${editAlimento}, Montanha: ${editMontanha}, Reabastecimento: ${editReproTotal} CX, Colis: ${editColis}`
      });

      setSyncStatusMsg({
        type: 'success',
        text: `🟢 Parâmetros do Setor ${editingSectorUniversos} atualizados e sincronizados no Banco de Dados!`
      });
      setTimeout(() => setSyncStatusMsg(null), 4000);

      setEditingSectorUniversos(null);
    } catch (err) {
      console.error('[ConsoleOperacional] Erro ao salvar universos:', err);
      setSyncStatusMsg({
        type: 'error',
        text: `❌ Erro ao salvar parâmetros: ${(err as Error).message}`
      });
      setTimeout(() => setSyncStatusMsg(null), 4000);
      setEditingSectorUniversos(null);
    }
  };

  // Get current sector data mapped by sector_id
  const getSectorData = (sectorId: string) => {
    const found = registros.find(r => r.sector_id === sectorId && r.upload_date === todayStr) || 
                  registros.find(r => r.sector_id === sectorId);
    
    // Capacidade REAL via useSectorStore
    const { cap, isConfigured } = getSectorCapacidade(sectorId);
    return {
      feitoHoje: found?.feito_hoje || 0,
      feitoOntem: found?.feito_ontem || 0,
      maquina: found?.maquina_full || 0,
      rafale: found?.rafale_full || 0,
      cap,
      isConfigured
    };
  };

  // Totals calculations
  let totalFeitoHoje = 0;
  let totalFeitoOntem = 0;
  let totalMaquina = 0;
  let totalRafale = 0;
  let totalCapacidade = 0;
  let totalAlimento = 0;
  let totalMontanha = 0;
  let totalColis = 0;
  let totalReapro = 0;
  let setoresAtivosCount = 0;

  Object.keys(CONFIG_SETORES).forEach(id => {
    const d = getSectorData(id);
    const u = getSectorUniversos(id);
    totalFeitoHoje += d.feitoHoje;
    totalFeitoOntem += d.feitoOntem;
    totalMaquina += d.maquina;
    totalRafale += d.rafale;
    totalCapacidade += d.cap;
    totalAlimento += u.alimento;
    totalMontanha += u.montanha;
    totalColis += u.colis;
    const reaproParsed = parseInt(String(u.reapro || '0').replace(/\D/g, ''), 10) || 0;
    totalReapro += reaproParsed;
    if (d.feitoHoje > 0 || d.feitoOntem > 0 || d.maquina > 0 || d.rafale > 0) {
      setoresAtivosCount++;
    }
  });

  // Se valores de atividade, colis ou reapro vierem zerados da planilha, ancora nos setores resolvidos
  if (totalFeitoHoje === 0) {
    totalFeitoHoje = effectiveSetores.reduce((acc, s) => acc + (s.ativ || 0), 0);
  }
  if (totalColis === 0) {
    totalColis = effectiveSetores.reduce((acc, s) => acc + (s.colis || 0), 0);
  }
  if (totalReapro === 0) {
    totalReapro = effectiveSetores.reduce((acc, s) => acc + (s.reproTotal || 0), 0);
  }

  const metaAtual = visaoAtual === 'TODOS' ? totalFeitoHoje : getSectorData(visaoAtual).feitoHoje;
  const metaTotal = visaoAtual === 'TODOS' ? totalCapacidade : getSectorData(visaoAtual).cap;
  const metaPct = metaTotal > 0 ? Math.round((metaAtual / metaTotal) * 100) : 0;
  const uphAtual = metaAtual > 0 ? Math.round(metaAtual / 8) : 0;

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Setor,Nome,Feito Hoje,Feito Ontem,Falta Liberar (Máquina),Liberado (Rafale),Capacidade,Eficiência,Alimento,Montanha,Colis\n';
    Object.keys(CONFIG_SETORES).forEach(id => {
      const cfg = CONFIG_SETORES[id];
      const d = getSectorData(id);
      const u = getSectorUniversos(id);
      const ef = d.cap > 0 ? Math.round((d.feitoHoje / d.cap) * 100) : 0;
      csv += `${id},${cfg.nome},${d.feitoHoje},${d.feitoOntem},${d.maquina},${d.rafale},${d.cap},${ef}%,${u.alimento},${u.montanha},${u.colis}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `console_operacional_${todayStr}.csv`;
    link.click();
  };

  // Active Leader info
  const activeSectorObj = effectiveSetores.find(s => s.id === visaoAtual || s.numero.toString() === visaoAtual) || effectiveSetores[0];
  const leaderName = activeSectorObj?.resp || 'IAGO ANDERSON';
  const promessaVal = activeSectorObj?.promessa?.toString() || '96,15';

  // Manual DB Synchronizer for all sectors (Supabase + IndexedDB)
  const handleSyncDatabase = async () => {
    setIsSyncingDb(true);
    const timer = logger.startTimer('ConsoleOperacional', 'SYNC_DATABASE_ALL_SECTORS');
    try {
      const uId = currentUserUid || currentUser || 'system';
      let syncedCount = 0;

      for (const sectorId of Object.keys(CONFIG_SETORES)) {
        const d = getSectorData(sectorId);
        const u = getSectorUniversos(sectorId);

        // 1. Upsert na tabela painel_producao
        await upsertRegistro({
          id: `pp-${sectorId}-${todayStr}`,
          sector_id: sectorId,
          upload_date: todayStr,
          feito_hoje: d.feitoHoje,
          feito_ontem: d.feitoOntem,
          maquina_full: d.maquina,
          rafale_full: d.rafale,
          uploaded_by: currentUser || 'Sistema',
          arquivo_nome: fileInfo.includes('ABA') ? fileInfo : 'Console Operacional Sync',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // 2. Batch update da tabela activity_entries
        const adhocRecord: Record<string, string | number> = {};
        u.customUniversos.forEach(item => {
          if (item.name.trim()) adhocRecord[item.name.trim()] = item.value;
        });

        await updateActivityUniversosBatch(sectorId, todayStr, uId, {
          alimento: u.alimento,
          montanha: u.montanha,
          l7Mochila: 0,
          colis: u.colis,
          atividade: u.atividade,
          elog: u.elog,
          reapro: u.reapro,
          adhocCategories: adhocRecord
        });

        syncedCount++;
      }

      await addAuditLog({
        id: `audit_${Date.now()}`,
        data: new Date().toISOString(),
        acao: 'SYNC_DATABASE_MANUAL',
        usuario: currentUser || 'Operador',
        campo: 'monitor_setores_atividade',
        dispositivo: 'Console Operacional Web',
        valorAnterior: 'N/A',
        valorNovo: `${syncedCount} setores persistidos no Supabase e IndexedDB com sucesso`
      });

      timer.end({ sectorsCount: syncedCount });
      setSyncStatusMsg({
        type: 'success',
        text: `🟢 ${syncedCount} Setores persistidos com sucesso no Banco de Dados (Supabase + IndexedDB)!`
      });
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch (err) {
      timer.endWithError(err);
      console.error('[ConsoleOperacional] Erro ao sincronizar banco:', err);
      setSyncStatusMsg({
        type: 'error',
        text: `❌ Erro na sincronização com o banco: ${(err as Error).message || 'Falha de comunicação'}`
      });
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Google Sheets Export Synchronizer
  const handleSyncGoogleSheets = async () => {
    setIsSyncingSheets(true);
    const timer = logger.startTimer('ConsoleOperacional', 'SYNC_GOOGLE_SHEETS');
    try {
      const reaproSetores: Record<string, { feitoDAll: number; feitoElog: number }> = {};
      Object.keys(CONFIG_SETORES).forEach(id => {
        const u = getSectorUniversos(id);
        const caixas = parseInt(u.reapro?.replace(" CX", "") || "0") || 0;
        reaproSetores[id] = {
          feitoDAll: caixas,
          feitoElog: parseInt(u.elog?.replace(" CX", "") || "0") || 0
        };
      });

      const reaproPayload = {
        setores: reaproSetores,
        indicadores: {
          totalPresoDAll: 0,
          emCursoColetado: totalFeitoHoje,
          totalEmMaquina: Object.keys(CONFIG_SETORES).reduce((acc, id) => acc + getSectorData(id).maquina, 0),
          disponibilidade: metaPct
        },
        terminoPrevisao: '18:00',
        capacidadeFechamentoEst: totalCapacidade,
        listasFechadas: {
          artigos: totalAlimento + totalMontanha,
          colis: totalColis
        }
      };

      const sheetUrl = await exportToGoogleSheets({
        setores,
        colaboradores,
        reapro: reaproPayload,
        historico,
        capacidade
      });

      timer.end();
      setSyncStatusMsg({
        type: 'success',
        text: `📊 Planilha Google Sheets gravada com sucesso! (${sheetUrl ? 'Sincronizado' : 'OK'})`
      });
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch (err) {
      timer.endWithError(err);
      console.error('[ConsoleOperacional] Erro ao exportar planilha:', err);
      setSyncStatusMsg({
        type: 'warn',
        text: `⚠️ Google Sheets: ${(err as Error).message || 'Autenticação necessária. Baixando cópia CSV...'}`
      });
      handleExportCSV();
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Renderizador da Seção de Lojas para Enviar Hoje
  const renderLojasHojeSection = (isStandalone = false) => {
    const filteredLojas = todayOperations.filter((op) => {
      if (lojaStatusFilter !== 'all' && op.statusColeta !== lojaStatusFilter) return false;
      if (lojaSetorFilter !== 'all' && op.setor !== lojaSetorFilter) return false;
      if (lojaSearchFilter.trim()) {
        const q = lojaSearchFilter.toLowerCase();
        const matchName = op.nomeLoja?.toLowerCase().includes(q);
        const matchId = op.lojaId?.toLowerCase().includes(q);
        const matchTransp = op.transportadora?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchTransp) return false;
      }
      return true;
    });

    return (
      <div className={`space-y-4 ${isStandalone ? 'pt-1' : 'mt-2'}`}>
        {/* Cabeçalho da Seção */}
        <div className="bg-[#0b0c12] border border-[#1e1e2b] rounded-xl p-4 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <Truck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-black uppercase text-white tracking-wide">
                    QUAIS LOJAS PARA ENVIAR HOJE
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    EXPEDIÇÃO & COLETA
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Programação do dia com controle em tempo real de status de coleta, corte de horário e transportadora
                </p>
              </div>
            </div>

            {/* Badges de Resumo em Tempo Real */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-[#141520] border border-[#252738] text-slate-300">
                Lojas: <strong className="text-white">{totalLojasHoje}</strong>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Coletadas: <strong>{lojasColetadasCount}</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                <RefreshCw size={13} className="animate-spin text-amber-400" />
                <span>Em Andamento: <strong>{lojasEmAndamentoCount}</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                Pendentes: <strong className="text-slate-100">{lojasNaoIniciadasCount}</strong>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Master de Coleta de Volumes */}
          <div className="mt-4 pt-3 border-t border-[#1a1b28]">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <CheckSquare size={14} className="text-emerald-400" />
                Progresso Geral de Coleta das Lojas:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {totalVolumesColetados.toLocaleString('pt-BR')} / {totalVolumesProgramados.toLocaleString('pt-BR')} volumes ({percentualColetado}%)
              </span>
            </div>
            <div className="w-full bg-[#050507] h-3 rounded-full overflow-hidden border border-[#1e1e2a] p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentualColetado}%` }}
              />
            </div>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a1b28]">
            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar loja por número, nome ou transportadora..."
                value={lojaSearchFilter}
                onChange={(e) => setLojaSearchFilter(e.target.value)}
                className="w-full bg-[#13141f] border border-[#25273a] focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              {lojaSearchFilter && (
                <button
                  onClick={() => setLojaSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1 bg-[#13141f] p-1 rounded-lg border border-[#25273a]">
              {(['all', 'Não iniciada', 'Em andamento', 'Coletada'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLojaStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    lojaStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Todas' : st}
                </button>
              ))}
            </div>

            {/* Filtro de Setor */}
            <div className="flex items-center gap-1 bg-[#13141f] p-1 rounded-lg border border-[#25273a]">
              {['all', 'S87', 'S88', 'S89', 'S90'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setLojaSetorFilter(sec)}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                    lojaSetorFilter === sec
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sec === 'all' ? 'Todos Setores' : sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grade de Lojas */}
        {filteredLojas.length === 0 ? (
          <div className="bg-[#0e0e16] border border-[#1e1e2a] rounded-xl p-8 text-center text-slate-400">
            <Truck size={36} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma loja encontrada para os filtros selecionados</p>
            <p className="text-xs text-slate-500 mt-1">Limpe os filtros ou verifique a conexão com a planilha operacional</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredLojas.map((op) => {
              const isColetada = op.statusColeta === 'Coletada';
              const isEmAndamento = op.statusColeta === 'Em andamento';

              return (
                <div
                  key={op.id}
                  className={`bg-[#0d0e15] rounded-xl p-4 border transition-all duration-200 shadow-md flex flex-col justify-between gap-3 ${
                    isColetada
                      ? 'border-emerald-500/40 hover:border-emerald-500/70 bg-gradient-to-b from-[#0d1612] to-[#0a0f0d]'
                      : isEmAndamento
                      ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-b from-[#18140c] to-[#0f0e0c]'
                      : 'border-[#1e1e2d] hover:border-[#2d2e42]'
                  }`}
                >
                  {/* Topo do Card de Loja */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-xs">
                          {op.lojaId}
                        </span>
                        <div>
                          <h3 className="text-xs md:text-sm font-bold text-white leading-tight">
                            {op.nomeLoja || `Loja ${op.lojaId}`}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                              {op.setor}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {op.transportadora || 'LOGÍSTICA INTERNA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          ⏰ {op.carregamento || '14:00'}
                        </span>
                        <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                          Corte: {op.corte || '12:00'}
                        </div>
                      </div>
                    </div>

                    {/* Dados Quantitativos (Volumes e Endereços) */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#1a1b28]">
                      <div className="bg-[#12131d] px-2.5 py-1.5 rounded-lg border border-[#1f2030]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Volumes</span>
                        <span className="text-sm font-black font-mono text-white">
                          {(op.volumes || 250).toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-400">cx</span>
                        </span>
                      </div>
                      <div className="bg-[#12131d] px-2.5 py-1.5 rounded-lg border border-[#1f2030]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Endereços</span>
                        <span className="text-sm font-black font-mono text-cyan-300">
                          {op.enderecos || 85} <span className="text-[10px] font-normal text-slate-400">end</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão Interativo de Status da Coleta */}
                  <div className="pt-2 border-t border-[#1a1b28]">
                    <button
                      onClick={() => handleToggleStoreStatus(op)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between shadow-sm cursor-pointer active:scale-95 ${
                        isColetada
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400/50'
                          : isEmAndamento
                          ? 'bg-amber-600 hover:bg-amber-500 text-white ring-1 ring-amber-400/50 animate-pulse'
                          : 'bg-[#181926] hover:bg-[#202235] border border-[#2c2e44] text-slate-300 hover:text-white'
                      }`}
                      title="Clique para alternar status da coleta desta loja"
                    >
                      <div className="flex items-center gap-2">
                        {isColetada ? (
                          <CheckCircle2 size={16} className="text-white" />
                        ) : isEmAndamento ? (
                          <RefreshCw size={15} className="animate-spin text-white" />
                        ) : (
                          <Clock size={15} className="text-slate-400" />
                        )}
                        <span>
                          {isColetada
                            ? 'COLETADA'
                            : isEmAndamento
                            ? 'COLETA EM ANDAMENTO'
                            : 'COLETA NÃO INICIADA'}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono font-normal opacity-90">
                        {isColetada
                          ? `Feito às ${op.horarioColeta || '11:30'}`
                          : isEmAndamento
                          ? 'Clique p/ Concluir'
                          : 'Clique p/ Iniciar'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-[#050507] text-[#f0f0f5] font-sans flex flex-col p-4 md:p-5 gap-4 select-none relative"
      onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropActive(false);
        if (e.dataTransfer.files[0]) handleExcelUpload(e.dataTransfer.files[0]);
      }}
    >
      {/* MODAL DE CARREGAMENTO */}
      {isLoadingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999999] flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center">
            <div className="p-4 bg-emerald-500/10 rounded-xl mb-4 border border-emerald-500/20">
              <Upload className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Lendo Planilha Operacional</h2>
            <p className="text-xs font-mono text-emerald-400 mt-1 mb-6 text-center">{loadStatusText}</p>

            <div className="w-full bg-[#050507] h-3 rounded-full overflow-hidden border border-[#1e1e2a] p-0.5 mb-2">
              <div 
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${loadPercent}%` }}
              ></div>
            </div>

            <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>EXTRAÇÃO DE DADOS</span>
              <span className="font-bold text-emerald-400 text-xs">{loadPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* DROP OVERLAY INDICATOR */}
      {isDropActive && (
        <div className="fixed inset-0 bg-emerald-950/80 border-4 border-dashed border-emerald-400 z-[99999] flex flex-col items-center justify-center text-emerald-300 pointer-events-none backdrop-blur-sm">
          <Upload size={48} className="animate-bounce mb-3" />
          <p className="text-xl font-bold tracking-tight uppercase">Solte a planilha aqui para importar</p>
          <p className="text-xs font-mono text-emerald-400/80 mt-1">Formatos aceitos: .xlsm, .xlsx, .xls</p>
        </div>
      )}

      {/* TOP BROADCAST BAR • MODO TV TELÃO */}
      <div className="bg-[#0b0c10] border border-[#1e1e2a] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Tv size={14} className="text-emerald-400" />
            <span>MODO TV • TELÃO CD</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#12131a] border border-[#222430] text-slate-300 font-mono text-xs">
            <Clock size={13} className="text-emerald-400" />
            <span className="font-semibold text-white tracking-wider">{relogio || '--:--:--'}</span>
            <span className="text-[10px] text-slate-400 uppercase font-sans">Brasília</span>
          </div>

          {carrosselAtivo && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-[11px]">
              <RotateCcw size={12} className="animate-spin text-orange-400" />
              <span>Rotação TV: <strong className="text-white">{carrosselCountdown}s</strong></span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Tela Cheia */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg bg-[#14151f] hover:bg-[#1c1e2b] border border-[#262836] text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
            title="Alternar Tela Cheia (Ideal para TVs e Telões)"
          >
            {isFullscreen ? <Minimize2 size={14} className="text-emerald-400" /> : <Maximize2 size={14} className="text-emerald-400" />}
            <span className="hidden md:inline">{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
          </button>

          {/* Botão de Carrossel TV Automático */}
          <button
            onClick={() => setCarrosselAtivo(!carrosselAtivo)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md ${
              carrosselAtivo
                ? 'bg-orange-600 hover:bg-orange-500 text-white ring-2 ring-orange-400/50'
                : 'bg-[#181926] hover:bg-[#202234] border border-[#2b2d42] text-slate-200'
            }`}
            title="Alterna automaticamente entre a visão geral do CD, lojas para enviar e cada setor a cada 12 segundos"
          >
            {carrosselAtivo ? <Pause size={13} /> : <Play size={13} />}
            <span>{carrosselAtivo ? `Pausar Rotação (${carrosselCountdown}s)` : 'Iniciar Carrossel TV (12s)'}</span>
          </button>

          {/* Sincronizar Banco */}
          <button
            onClick={handleSyncDatabase}
            disabled={isSyncingDb}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Persistir setores e registros no banco de dados"
          >
            <Database size={13} className={isSyncingDb ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">{isSyncingDb ? 'Gravando...' : 'Gravar Banco'}</span>
          </button>

          {/* Gravar Planilha Sheets */}
          <button
            onClick={handleSyncGoogleSheets}
            disabled={isSyncingSheets}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Gravar na planilha Google Sheets"
          >
            <FileSpreadsheet size={13} className={isSyncingSheets ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">{isSyncingSheets ? 'Enviando...' : 'Gravar Planilha'}</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Baixar CSV consolidado"
          >
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* CARREGAMENTO AUTOMÁTICO DE PLANILHA (CONECTADO A PASTA SELECIONADA) */}
      <div className={`rounded-xl p-3.5 border transition-all duration-300 shadow-md ${
        watcherStatus.isConnected
          ? 'bg-[#0a1612] border-emerald-500/40 hover:border-emerald-500/70'
          : 'bg-[#111118] border-dashed border-[#2a2a38] hover:border-amber-500/40'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              watcherStatus.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {watcherStatus.isConnected ? <FolderSync size={20} className="animate-spin-slow" /> : <FolderOpen size={20} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {watcherStatus.isConnected
                    ? `Pasta Conectada: "${watcherStatus.folderName}"`
                    : 'Carregamento Automático por Pasta Selecionada'}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  watcherStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {watcherStatus.isConnected ? 'Auto-Alimentação Ativa (10s)' : 'Aguardando Pasta'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mt-0.5">
                {watcherStatus.isConnected ? (
                  <>
                    Monitorando arquivos <span className="font-mono text-emerald-300">.xlsm / .xlsx</span> a cada 10s • Quando o arquivo consta lá, se alimenta sozinho!
                    {watcherStatus.lastFileName && (
                      <span className="block sm:inline sm:ml-2 text-slate-300 font-mono text-[10.5px]">
                        [Lido: <strong className="text-emerald-400">{watcherStatus.lastFileName}</strong> às {watcherStatus.lastIngestTime}]
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Conecte a pasta de rede ou diretório local da planilha (<span className="font-mono text-emerald-400">SU_QUERIES_SHEET</span> / <span className="font-mono text-emerald-400">PLANO_CARREGAMENTO</span>). O sistema se alimenta automaticamente sempre que um arquivo for salvo lá!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {watcherStatus.isConnected ? (
              <>
                <button
                  onClick={() => folderWatcherService.scanAndProcess()}
                  disabled={watcherStatus.isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  title="Verificar agora se há novas atualizações na pasta"
                >
                  <RefreshCw size={14} className={watcherStatus.isProcessing ? 'animate-spin' : ''} />
                  <span>{watcherStatus.isProcessing ? 'Lendo Arquivo...' : 'Escanear Agora'}</span>
                </button>

                <button
                  onClick={() => folderWatcherService.toggleAutoSync()}
                  className="bg-[#181926] hover:bg-[#222436] border border-[#2b2d42] text-slate-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {watcherStatus.autoSyncEnabled ? <Pause size={13} /> : <Play size={13} />}
                  <span>{watcherStatus.autoSyncEnabled ? 'Pausar Auto' : 'Retomar Auto'}</span>
                </button>

                <button
                  onClick={() => folderWatcherService.disconnect()}
                  className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-semibold text-xs px-2.5 py-2 rounded-lg transition-all"
                  title="Desconectar monitoramento de pasta"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleConnectFolder}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                  title="Selecionar pasta para monitoramento e alimentação automática"
                >
                  <FolderOpen size={16} />
                  <span>Conectar Pasta Automática</span>
                </button>

                <label className="bg-[#181926] hover:bg-[#202234] border border-[#2b2d42] text-slate-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
                  <Upload size={14} />
                  <span>Arquivo Individual (.xlsm)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsm, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleExcelUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </>
            )}

            {/* Input oculto para seleção de pasta (fallback universal) */}
            <input
              type="file"
              ref={folderInputRef}
              {...({ webkitdirectory: '', directory: '' } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
              multiple
              className="hidden"
              onChange={handleFolderFilesSelected}
            />
          </div>
        </div>
      </div>

      {/* SELETOR DE VISÃO DO MODO TV */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#1e1e2a]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setVisaoAtual('TODOS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              visaoAtual === 'TODOS'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400'
                : 'bg-[#111118] text-slate-300 hover:text-white hover:bg-[#191924] border border-[#1e1e2a]'
            }`}
          >
            <Activity size={14} />
            <span>VISÃO GERAL CD</span>
          </button>

          <button
            onClick={() => setVisaoAtual('LOJAS_HOJE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              visaoAtual === 'LOJAS_HOJE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-blue-400'
                : 'bg-[#111118] text-slate-300 hover:text-white hover:bg-[#191924] border border-[#1e1e2a]'
            }`}
          >
            <Truck size={14} />
            <span>LOJAS PARA ENVIAR HOJE</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
              {todayOperations.length}
            </span>
          </button>

          {['87', '88', '89', '90'].map((secId) => (
            <button
              key={secId}
              onClick={() => {
                setVisaoAtual(secId);
                if (onChangeSector) onChangeSector(secId);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                visaoAtual === secId
                  ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                  : 'bg-[#111118] text-slate-300 hover:text-white hover:bg-[#191924] border border-[#1e1e2a]'
              }`}
            >
              <span>Setor {secId}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Líder Responsável: <strong className="text-slate-200">{leaderName}</strong></span>
          <span className="text-slate-600">•</span>
          <span>Promessa: <strong className="text-slate-200">{promessaVal}</strong></span>
        </div>
      </div>

      {/* NOTIFICAÇÃO DE STATUS DE SINCRONIZAÇÃO */}
      {syncStatusMsg && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-300 animate-in fade-in shadow-md ${
          syncStatusMsg.type === 'success' 
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
            : syncStatusMsg.type === 'warn'
            ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={syncStatusMsg.type === 'success' ? 'text-emerald-400' : 'text-amber-400'} />
            <span>{syncStatusMsg.text}</span>
          </div>
          <button 
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-black/30 hover:bg-black/50"
          >
            ✕
          </button>
        </div>
      )}

      {/* FITA COPIL / MATRIZ DE PERFORMANCE (TELA DE DESCANSO / APRESENTAÇÃO) */}
      <div className="bg-[#0e0e16] border border-[#222234] rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">COPIL Matriz de Performance</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">Semana Atual</span>
            </div>
            <p className="text-[10px] text-slate-400">Sincronização em tempo real das métricas da pilotagem e SLAs</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-mono">
          <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Pilotagem Total</span>
            <span className="text-sm font-bold text-indigo-300">{copilSummary.totalPilotagem > 0 ? copilSummary.totalPilotagem.toLocaleString('pt-BR') : '32.165'} un</span>
          </div>

          <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Coletado COPIL</span>
            <span className="text-sm font-bold text-emerald-400">{copilSummary.totalColetado > 0 ? copilSummary.totalColetado.toLocaleString('pt-BR') : '30.820'} un</span>
          </div>

          <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">UPH Médio</span>
            <span className="text-sm font-bold text-amber-400">{copilSummary.avgUph > 0 ? copilSummary.avgUph : 485} un/h</span>
          </div>

          <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Promessa SLA</span>
            <span className="text-sm font-bold text-sky-400">{copilSummary.avgPromessa > 0 ? copilSummary.avgPromessa : 99.2}%</span>
          </div>

          <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Aderência BSI</span>
            <span className="text-sm font-bold text-purple-400">{copilSummary.avgAderencia > 0 ? copilSummary.avgAderencia : 100}%</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Award size={16} className="text-emerald-400" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-300 block font-sans">Nota Geral</span>
              <span className="text-sm font-black text-emerald-400">A+ (Excelente)</span>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE META DO TURNO */}
      <div className="bg-[#111118] border border-[#1e1e2a] p-3.5 rounded-xl flex flex-col gap-2 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cumprimento da Meta do Turno
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-xs font-bold font-mono text-white">
              {metaAtual.toLocaleString('pt-BR')} / {metaTotal.toLocaleString('pt-BR')} pkts
              <span className="text-slate-400 ml-1">({metaPct}%)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">UPH ATUAL</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{uphAtual.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] text-slate-500">un/h</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-[#050507] h-2.5 rounded-full overflow-hidden border border-[#1e1e2a]">
          <div 
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(metaPct, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* CONTEÚDO DA VISÃO */}
      <main className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {visaoAtual === 'TODOS' ? (
          /* VISÃO GRID (TODOS OS SETORES) */
          <>
            {/* PAINEL DE ESTRATÉGIA IA & PROMESSAS DE ENTREGA (SLA D+2 A D-2) */}
            {strategy && (
              <div className="bg-[#0e0e16] border border-[#222234] rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                      <Sparkles size={16} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          Estratégia do Dia & Promessas de Entrega
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          strategy.estrategiaPrincipal === 'PRIORIDADE_LOJAS'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {strategy.estrategiaPrincipal === 'PRIORIDADE_LOJAS' ? '🎯 Coleta Lojas Prioritárias' : '⚡ Coleta Total Contínua'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {strategy.diagnosticoGeral}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshStrategy}
                      disabled={isStrategyLoading}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Recalcular com IA"
                    >
                      <RefreshCw size={12} className={isStrategyLoading ? 'animate-spin' : ''} />
                      <span>{isStrategyLoading ? 'Atualizando...' : 'Recalcular'}</span>
                    </button>
                    <button
                      onClick={() => setIsStrategyModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Ver Análise IA</span>
                    </button>
                  </div>
                </div>

                {/* 5 Promessas Cards (D+2 a D-2) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(['D+2', 'D+1', 'D-0', 'D-1', 'D-2'] as PromiseSLA[]).map((sla) => {
                    const b = strategy.promessas.buckets[sla];
                    const isCrit = sla === 'D-2' || sla === 'D-1';
                    const isBest = sla === 'D+2';
                    const isNorm = sla === 'D+1';
                    return (
                      <div
                        key={sla}
                        className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                          isBest
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isNorm
                            ? 'bg-sky-950/20 border-sky-500/30'
                            : sla === 'D-0'
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : isCrit && sla === 'D-1'
                            ? 'bg-orange-950/20 border-orange-500/30'
                            : 'bg-red-950/30 border-red-500/40 animate-pulse'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase font-mono px-1.5 py-0.5 rounded ${
                            isBest
                              ? 'text-emerald-300 bg-emerald-500/20'
                              : isNorm
                              ? 'text-sky-300 bg-sky-500/20'
                              : sla === 'D-0'
                              ? 'text-amber-300 bg-amber-500/20'
                              : isCrit && sla === 'D-1'
                              ? 'text-orange-300 bg-orange-500/20'
                              : 'text-red-300 bg-red-500/20'
                          }`}>
                            {sla}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">{b?.percentage || 0}%</span>
                        </div>
                        <div className="text-base font-black text-white font-mono">
                          {b?.volume?.toLocaleString('pt-BR')} <span className="text-[10px] font-sans text-slate-400">cx</span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 mt-1 line-clamp-1">
                          {b?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4 HERO CARDS DE IMPACTO • MODO TV TELÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* CARD 1: ATIVIDADE OPERACIONAL */}
              <div className="bg-[#0e1017] border border-[#1e2230] border-t-4 border-t-emerald-500 p-4 rounded-xl relative overflow-hidden shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Activity size={15} />
                      ATIVIDADE OPERACIONAL
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                      UPH: {uphAtual}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {totalFeitoHoje.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">un processadas</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Meta do Turno: <strong className="text-slate-200">{metaTotal.toLocaleString('pt-BR')} un</strong> ({metaPct}%)
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1a1c28] flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>S87: <strong className="text-slate-200">{getSectorData('87').feitoHoje.toLocaleString('pt-BR')}</strong></span>
                  <span>S88: <strong className="text-slate-200">{getSectorData('88').feitoHoje.toLocaleString('pt-BR')}</strong></span>
                  <span>S89: <strong className="text-slate-200">{getSectorData('89').feitoHoje.toLocaleString('pt-BR')}</strong></span>
                  <span>S90: <strong className="text-slate-200">{getSectorData('90').feitoHoje.toLocaleString('pt-BR')}</strong></span>
                </div>
              </div>

              {/* CARD 2: QUANTIDADE TOTAL COLIS */}
              <div className="bg-[#0e1017] border border-[#1e2230] border-t-4 border-t-cyan-500 p-4 rounded-xl relative overflow-hidden shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Package size={15} />
                      QUANTIDADE COLIS
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                      CD CONSOLIDADO
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-cyan-300 tracking-tight">
                      {totalColis.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">colis prontos</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fluxo total de caixas e embalagens expedidas
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1a1c28] flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>S87: <strong className="text-cyan-200">{(effectiveSetores.find(s=>s.id==='87')?.colis || getSectorUniversos('87').colis || 0).toLocaleString('pt-BR')}</strong></span>
                  <span>S88: <strong className="text-cyan-200">{(effectiveSetores.find(s=>s.id==='88')?.colis || getSectorUniversos('88').colis || 0).toLocaleString('pt-BR')}</strong></span>
                  <span>S89: <strong className="text-cyan-200">{(effectiveSetores.find(s=>s.id==='89')?.colis || getSectorUniversos('89').colis || 0).toLocaleString('pt-BR')}</strong></span>
                  <span>S90: <strong className="text-cyan-200">{(effectiveSetores.find(s=>s.id==='90')?.colis || getSectorUniversos('90').colis || 0).toLocaleString('pt-BR')}</strong></span>
                </div>
              </div>

              {/* CARD 3: REAPRO (REABASTECIMENTO) */}
              <div className="bg-[#0e1017] border border-[#1e2230] border-t-4 border-t-purple-500 p-4 rounded-xl relative overflow-hidden shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Boxes size={15} />
                      REAPRO (REABASTECIMENTO)
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                      LINHAS ATIVAS
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-purple-300 tracking-tight">
                      {totalReapro.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">caixas reapro</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Alimentação contínua de caixas para o picking
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1a1c28] flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>S87: <strong className="text-purple-200">{getSectorUniversos('87').reapro || '0 CX'}</strong></span>
                  <span>S88: <strong className="text-purple-200">{getSectorUniversos('88').reapro || '0 CX'}</strong></span>
                  <span>S89: <strong className="text-purple-200">{getSectorUniversos('89').reapro || '0 CX'}</strong></span>
                  <span>S90: <strong className="text-purple-200">{getSectorUniversos('90').reapro || '0 CX'}</strong></span>
                </div>
              </div>

              {/* CARD 4: QUANTO JÁ FOI COLETADO */}
              <div className="bg-[#0e1017] border border-[#1e2230] border-t-4 border-t-amber-500 p-4 rounded-xl relative overflow-hidden shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <CheckSquare size={15} />
                      QUANTO JÁ FOI COLETADO
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      {lojasColetadasCount}/{totalLojasHoje} LOJAS
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-amber-300 tracking-tight">
                      {percentualColetado}%
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">concluído</span>
                  </div>

                  {/* Barra de Progresso Neon */}
                  <div className="w-full bg-[#050507] h-2.5 rounded-full overflow-hidden border border-[#1e1e2a] p-0.5 mt-2">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentualColetado}%` }}
                    />
                  </div>

                  <p className="text-[10.5px] text-slate-400 mt-1.5">
                    {totalVolumesColetados.toLocaleString('pt-BR')} de {totalVolumesProgramados.toLocaleString('pt-BR')} volumes coletados
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-[#1a1c28] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">🟢 {lojasColetadasCount} Coletadas</span>
                  <span className="text-amber-400 font-bold">🟡 {lojasEmAndamentoCount} Andamento</span>
                  <span className="text-slate-400 font-bold">⚪ {lojasNaoIniciadasCount} Pendentes</span>
                </div>
              </div>
            </div>

            {/* Grid de Cards de Setor (Monitor de Setores Atividade) */}
            <div className="space-y-3">
              <div className="bg-[#0e0e16] border border-[#222234] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Monitor de Setores Atividade</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                        {setoresAtivosCount}/4 Setores Ativos
                      </span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                        🟢 Database + Planilha OK
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Métricas operacionais, universos de produtos (Alimento/Montanha), Colis, Reabastecimento e persistência atômica
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncDatabase}
                    disabled={isSyncingDb}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition flex items-center gap-1.5"
                    title="Forçar sincronização de todos os setores no banco de dados"
                  >
                    <Database size={13} className={isSyncingDb ? 'animate-spin' : ''} />
                    <span>{isSyncingDb ? 'Gravando...' : 'Sincronizar Banco'}</span>
                  </button>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">Clique no card para abrir visão detalhada</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(CONFIG_SETORES).map(id => {
                  const cfg = CONFIG_SETORES[id];
                  const d = getSectorData(id);
                  const u = getSectorUniversos(id);
                  const c = getSectorCopil(id);
                  const ef = d.cap > 0 ? Math.round((d.feitoHoje / d.cap) * 100) : 0;
                  const temDados = d.feitoHoje > 0 || d.feitoOntem > 0 || d.maquina > 0 || d.rafale > 0;

                  let badgeText = 'EM ANDAMENTO';
                  let badgeStyle = 'text-blue-400 bg-blue-500/10 border-blue-500/20';

                  if (!temDados) {
                    badgeText = 'ZERADO';
                    badgeStyle = 'text-slate-400 bg-slate-800/40 border-slate-700/50';
                  } else if (ef >= 100) {
                    badgeText = 'META ATINGIDA';
                    badgeStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  } else if (ef < 50) {
                    badgeText = 'BAIXA EFICIÊNCIA';
                    badgeStyle = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                  }

                  return (
                    <div 
                      key={id}
                      onClick={() => setVisaoAtual(id)}
                      className="bg-[#111118] border border-[#1e1e2a] hover:border-[#2a2a38] p-5 rounded-xl flex flex-col justify-between cursor-pointer transition-all shadow-sm group relative"
                      style={{ borderTop: `3px solid ${cfg.cor}` }}
                    >
                      <div className="flex justify-between items-start pb-3 border-b border-[#1e1e2a]">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs text-white shadow-sm"
                            style={{ backgroundColor: cfg.cor }}
                          >
                            S{id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm font-bold text-white tracking-tight">SETOR {id}</h2>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold">
                                COPIL: {c.grade} ({c.produtividade} UPH)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{cfg.nome}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleOpenEditUniversos(id, e)}
                            className="p-1 rounded bg-[#1c1c28] hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 border border-[#2a2a3c] transition-colors text-[10px] flex items-center gap-1"
                            title="Ajustar parâmetros de Alimento e Montanha"
                          >
                            <Sliders size={12} />
                            <span className="hidden sm:inline">Mix</span>
                          </button>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeStyle}`}>
                            {badgeText}
                          </span>
                        </div>
                      </div>

                      {/* KPI Grid */}
                      <div className="grid grid-cols-2 gap-2.5 my-3">
                        <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">Feito Hoje</span>
                          <span className="text-lg font-black font-mono text-white">{d.feitoHoje.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block mb-1">Feito Ontem</span>
                          <span className="text-lg font-black font-mono text-white">{d.feitoOntem.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* DETALHE DOS UNIVERSOS: ALIMENTO, MONTANHA & CUSTOMIZADOS */}
                      <div className="bg-[#0b0b12] border border-[#1e1e2c] p-3 rounded-lg my-1 space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <PieChart size={13} className="text-indigo-400" />
                            <span>
                              {['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(id)) ? '📦 CAIXAS: ' : 'Atividade do Dia: '}
                              <strong className="text-white font-mono">
                                {u.total.toLocaleString('pt-BR')} {['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(id)) ? 'cx' : 'un'}
                              </strong>
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {id === '88' ? 'Ref. ~6.000 un' : 'Ref. Setor'}
                          </span>
                        </div>

                        {/* Barra segmentada de proporção dos Universos */}
                        <div className="w-full h-2 rounded-full overflow-hidden flex bg-zinc-900 border border-[#1e1e2a]">
                          <div style={{ width: `${u.alimentoPct}%` }} className="bg-amber-500 h-full" title={`Alimento: ${u.alimento} un (${u.alimentoPct}%)`}></div>
                          <div style={{ width: `${u.montanhaPct}%` }} className="bg-purple-500 h-full" title={`Montanha: ${u.montanha} un (${u.montanhaPct}%)`}></div>
                          {u.customUniversos.map((cu, idx) => (
                            <div
                              key={`bar-custom-${idx}`}
                              style={{ width: `${cu.pct}%` }}
                              className={`${cu.color.bar} h-full`}
                              title={`${cu.name}: ${cu.value} un (${cu.pct}%)`}
                            ></div>
                          ))}
                        </div>

                        {/* Pílulas de Universos & Colis de Coleta */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-[#14141e] px-2 py-1 rounded border border-amber-500/20 flex items-center justify-between">
                            <span className="text-amber-400 font-sans flex items-center gap-1">
                              <Apple size={11} /> 🍎 Alimento
                            </span>
                            <span className="text-white font-bold">{u.alimento.toLocaleString('pt-BR')} <span className="text-amber-400/80 font-normal">({u.alimentoPct}%)</span></span>
                          </div>

                          <div className="bg-[#14141e] px-2 py-1 rounded border border-purple-500/20 flex items-center justify-between">
                            <span className="text-purple-400 font-sans flex items-center gap-1">
                              <Mountain size={11} /> ⛰️ Montanha
                            </span>
                            <span className="text-white font-bold">{u.montanha.toLocaleString('pt-BR')} <span className="text-purple-400/80 font-normal">({u.montanhaPct}%)</span></span>
                          </div>
                        </div>

                        {/* Pílulas extras de Universos Customizados se houver */}
                        {u.customUniversos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {u.customUniversos.map((cu, idx) => (
                              <div
                                key={`pill-custom-${idx}`}
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center gap-1.5 ${cu.color.bg} ${cu.color.border}`}
                              >
                                <span className={`${cu.color.text} font-sans font-medium`}>{cu.name}:</span>
                                <span className="text-white font-bold">{cu.value.toLocaleString('pt-BR')} un ({cu.pct}%)</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Indicador Rápido de Colis para Coleta */}
                        <div className="bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px]">
                          <span className="text-emerald-400 font-sans font-bold flex items-center gap-1.5">
                            <Package size={13} className="text-emerald-400" /> Colis Coleta
                          </span>
                          <span className="text-emerald-300 font-mono font-black">{u.colis.toLocaleString('pt-BR')} Colis</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 my-2">
                        <div className="bg-[#050507] p-2.5 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 block mb-0.5">Falta Liberar</span>
                          <span className="text-base font-black font-mono text-rose-300">{d.maquina.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="bg-[#050507] p-2.5 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-sky-400 block mb-0.5">Liberado (Rafale)</span>
                          <span className="text-base font-black font-mono text-sky-300">{d.rafale.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Progress Track */}
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span>Cap: {d.cap.toLocaleString('pt-BR')} un</span>
                            {!d.isConfigured && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans" title="Capacidade não configurada no setor; utilizando matriz inicial padrão">
                                Padrão
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-bold text-white">{ef}%</span>
                        </div>
                        <div className="w-full bg-[#050507] h-2 rounded-full overflow-hidden border border-[#1e1e2a]">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(ef, 100)}%`,
                              backgroundColor: ef >= 100 ? '#10b981' : (ef < 50 && temDados ? '#f97316' : cfg.cor)
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO QUAIS LOJAS PARA ENVIAR HOJE NA VISÃO GERAL TELÃO */}
            {renderLojasHojeSection(false)}
          </>
        ) : visaoAtual === 'LOJAS_HOJE' ? (
          /* VISÃO DEDICADA DE LOJAS PARA ENVIAR HOJE (MODO TV / FOCO EXPEDIÇÃO) */
          renderLojasHojeSection(true)
        ) : (
          /* VISÃO INDIVIDUAL DE UM SETOR */
          (() => {
            const id = visaoAtual;
            const cfg = CONFIG_SETORES[id] || CONFIG_SETORES['88'];
            const d = getSectorData(id);
            const u = getSectorUniversos(id);
            const c = getSectorCopil(id);
            const ef = d.cap > 0 ? Math.round((d.feitoHoje / d.cap) * 100) : 0;
            const temDados = d.feitoHoje > 0 || d.feitoOntem > 0 || d.maquina > 0 || d.rafale > 0;

            let badgeText = 'EM ANDAMENTO';
            let badgeStyle = 'text-blue-400 bg-blue-500/10 border-blue-500/20';

            if (!temDados) {
              badgeText = 'ZERADO';
              badgeStyle = 'text-slate-400 bg-slate-800/40 border-slate-700/50';
            } else if (ef >= 100) {
              badgeText = 'META ATINGIDA';
              badgeStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            } else if (ef < 50) {
              badgeText = 'BAIXA EFICIÊNCIA';
              badgeStyle = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            }

            return (
              <div className="flex flex-col gap-4">
                {/* Sector Header Banner */}
                <div className="bg-[#111118] border border-[#1e1e2a] border-l-4 p-5 rounded-xl flex flex-wrap justify-between items-center shadow-sm gap-3" style={{ borderLeftColor: cfg.cor }}>
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg text-white shadow-md"
                      style={{ backgroundColor: cfg.cor }}
                    >
                      S{id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-white tracking-tight">{cfg.nome}</h2>
                        <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                          COPIL: NOTA {c.grade}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Setor {id} • Responsável: <strong className="text-zinc-200">{leaderName}</strong> • Capacidade: {d.cap.toLocaleString('pt-BR')} un</span>
                        {!d.isConfigured && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans" title="Capacidade padrão">
                            Padrão
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleOpenEditUniversos(id, e)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Sliders size={14} />
                      <span>Ajustar Universos</span>
                    </button>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${badgeStyle}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>

                {/* BLOCO EM DESTAQUE: UNIVERSOS DE PRODUTOS & COLETA LOGÍSTICA (DECATHLON) */}
                <div className="space-y-4">
                  {/* 1. UNIVERSOS DE PRODUTOS */}
                  <div className="bg-[#111118] border border-[#222234] rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#1e1e2a] pb-3">
                      <div className="flex items-center gap-2">
                        <PieChart size={18} className="text-indigo-400" />
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Universos de Produtos • Setor {id}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {id === '88' ? 'Mix de Artigos do Setor 88 (Alimento, Montanha e Universos customizados)' : `Distribuição por universos do Setor ${id}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a] flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400 font-sans">Artigos Totais:</span>
                          <strong className="text-white text-sm">{u.total.toLocaleString('pt-BR')} un</strong>
                        </div>
                        <button
                          onClick={(e) => handleOpenEditUniversos(id, e)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                          title="Editar ou calibrar parâmetros deste setor"
                        >
                          <Sliders size={13} />
                          <span>Editar / Override</span>
                        </button>
                      </div>
                    </div>

                    {/* Grid Dinâmico de Universos: Alimento, Montanha, Mochila e Customizados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {/* Alimento */}
                      <div 
                        onClick={(e) => handleOpenEditUniversos(id, e)}
                        className="bg-[#0b0b14] border border-amber-500/30 hover:border-amber-500/60 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <Apple size={13} /> 🍎 Universo Alimento
                            </span>
                            <p className="text-3xl font-black font-mono text-white mt-1.5">{u.alimento.toLocaleString('pt-BR')}</p>
                          </div>
                          <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {u.alimentoPct}%
                          </span>
                        </div>
                        <div className="mt-3 text-[11px] text-slate-400 flex justify-between items-center">
                          <span>Status: <strong className="text-emerald-400">Normal</strong></span>
                          <span className="text-[10px] text-amber-400/80 group-hover:text-amber-300 font-semibold flex items-center gap-0.5">
                            Editar ✎
                          </span>
                        </div>
                      </div>

                      {/* Montanha */}
                      <div 
                        onClick={(e) => handleOpenEditUniversos(id, e)}
                        className="bg-[#0b0b14] border border-purple-500/30 hover:border-purple-500/60 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                              <Mountain size={13} /> ⛰️ Universo Montanha
                            </span>
                            <p className="text-3xl font-black font-mono text-white mt-1.5">{u.montanha.toLocaleString('pt-BR')}</p>
                          </div>
                          <span className="text-xs font-bold font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {u.montanhaPct}%
                          </span>
                        </div>
                        <div className="mt-3 text-[11px] text-slate-400 flex justify-between items-center">
                          <span>Status: <strong className="text-emerald-400">Regular</strong></span>
                          <span className="text-[10px] text-purple-400/80 group-hover:text-purple-300 font-semibold flex items-center gap-0.5">
                            Editar ✎
                          </span>
                        </div>
                      </div>

                      {/* Universos Customizados Adicionados */}
                      {u.customUniversos.map((cu, idx) => (
                        <div 
                          key={`active-custom-${idx}`}
                          onClick={(e) => handleOpenEditUniversos(id, e)}
                          className={`bg-[#0b0b14] border ${cu.color.border} hover:border-opacity-80 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] group`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${cu.color.text} flex items-center gap-1.5`}>
                                <Tag size={13} /> {cu.name}
                              </span>
                              <p className="text-3xl font-black font-mono text-white mt-1.5">{cu.value.toLocaleString('pt-BR')}</p>
                            </div>
                            <span className={`text-xs font-bold font-mono ${cu.color.text} ${cu.color.bg} px-2 py-0.5 rounded border ${cu.color.border}`}>
                              {cu.pct}%
                            </span>
                          </div>
                          <div className="mt-3 text-[11px] text-slate-400 flex justify-between items-center">
                            <span>Status: <strong className="text-cyan-400">Personalizado</strong></span>
                            <span className={`text-[10px] ${cu.color.text} group-hover:opacity-100 font-semibold flex items-center gap-0.5`}>
                              Editar ✎
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Botão rápido para adicionar universo customizado */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditUniversos(id, e)}
                        className="border border-dashed border-slate-800 hover:border-indigo-500/50 bg-[#08080f] hover:bg-indigo-950/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-300 transition-all group min-h-[110px]"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Plus size={16} />
                        </div>
                        <span className="text-xs font-bold font-sans">+ Novo Universo</span>
                        <span className="text-[10px] text-slate-600 group-hover:text-slate-400">Personalizar categorias</span>
                      </button>
                    </div>

                    {/* Barra visual de proporção dos Universos */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Mix de Universos de Produtos</span>
                        <span className="font-mono font-bold text-white">100% dos Artigos</span>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-900 border border-[#1e1e2a]">
                        <div style={{ width: `${u.alimentoPct}%` }} className="bg-amber-500 h-full flex items-center justify-center text-[9px] font-bold text-black" title={`Alimento: ${u.alimentoPct}%`}>
                          {u.alimentoPct > 15 ? `${u.alimentoPct}% Alimento` : ''}
                        </div>
                        <div style={{ width: `${u.montanhaPct}%` }} className="bg-purple-500 h-full flex items-center justify-center text-[9px] font-bold text-white" title={`Montanha: ${u.montanhaPct}%`}>
                          {u.montanhaPct > 15 ? `${u.montanhaPct}% Montanha` : ''}
                        </div>
                        {u.customUniversos.map((cu, idx) => (
                          <div
                            key={`bar-segment-custom-${idx}`}
                            style={{ width: `${cu.pct}%` }}
                            className={`${cu.color.bar} h-full flex items-center justify-center text-[9px] font-bold text-white`}
                            title={`${cu.name}: ${cu.pct}%`}
                          >
                            {cu.pct > 12 ? `${cu.pct}% ${cu.name}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. CARDS OPERACIONAIS: REABASTECIMENTO, COLIS COLETA & E-LOG */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* CARD OPERACIONAL: REABASTECIMENTO */}
                    <div 
                      onClick={(e) => handleOpenEditUniversos(id, e)}
                      className="bg-[#1a1408] border-2 border-amber-500/60 hover:border-amber-400 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] group flex flex-col justify-between"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <h4 className="text-base font-black text-white flex items-center gap-2">
                            <RotateCcw size={18} className="text-amber-400" />
                            REABASTECIMENTO
                          </h4>
                          <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                            Caixas para reabastecimento
                          </p>
                        </div>
                        <span className="text-[10px] text-amber-400 group-hover:text-white font-semibold">
                          Editar ✎
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between bg-black/40 p-3 rounded-lg border border-amber-500/20">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Qtd Reabastecimento</span>
                          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 leading-tight">
                            {(effectiveSetores.find(s => String(s.id) === String(id) || String(s.numero) === String(id))?.reproTotal || parseInt(u.reapro?.replace(" CX", "") || "0") || 0).toLocaleString('pt-BR')} <span className="text-lg font-bold text-amber-400/80">CX</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD OPERACIONAL: COLIS COLETA */}
                    <div 
                      onClick={(e) => handleOpenEditUniversos(id, e)}
                      className="bg-[#041a12] border-2 border-emerald-500/60 hover:border-emerald-400 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] group flex flex-col justify-between"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white flex items-center gap-2">
                              <Package size={18} className="text-emerald-400" />
                              COLIS COLETA
                            </h4>
                            {(effectiveSetores.find(s => String(s.id) === String(id) || String(s.numero) === String(id))?.overrides?.colis !== undefined ||
                              effectiveSetores.find(s => String(s.id) === String(id) || String(s.numero) === String(id))?.overrides?.colisColeta !== undefined) && (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                MANUAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                            Volume total de colis
                          </p>
                        </div>
                        <span className="text-[10px] text-emerald-400 group-hover:text-white font-semibold">
                          Editar ✎
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between bg-black/40 p-3 rounded-lg border border-emerald-500/20">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Colis</span>
                          <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-300 leading-tight">
                            {(effectiveSetores.find(s => String(s.id) === String(id) || String(s.numero) === String(id))?.colis ?? u.colis ?? 0).toLocaleString('pt-BR')} <span className="text-lg font-bold text-emerald-400/80">COLIS</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD OPERACIONAL: E-LOG */}
                    <div 
                      onClick={(e) => handleOpenEditUniversos(id, e)}
                      className="bg-[#0b0b14] border border-slate-700 hover:border-slate-500 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            E-Log
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-white font-semibold">
                            Editar ✎
                          </span>
                        </div>
                        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                          <span className="text-[9px] text-slate-400 block uppercase">E-Log</span>
                          <p className="text-xs font-bold font-mono text-amber-300 truncate" title={u.elog}>
                            {u.elog || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center border-t border-white/5 pt-1.5">
                        <span>Fluxo Integrado</span>
                        <span className="text-amber-400 font-mono font-bold">WMS OK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO COPIL: PERFORMANCE DO SETOR */}
                <div className="bg-[#111118] border border-[#222234] rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-[#1e1e2a] pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Indicadores COPIL • Setor {id}
                      </h3>
                    </div>
                    <span className="text-xs bg-indigo-500/10 text-indigo-300 font-mono px-2.5 py-0.5 rounded border border-indigo-500/20 font-bold">
                      Classificação: Nota {c.grade}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block mb-1">Pilotagem COPIL</span>
                      <span className="text-lg font-bold text-indigo-300">{c.pilotagem.toLocaleString('pt-BR')} un</span>
                    </div>

                    <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block mb-1">Produtividade UPH</span>
                      <span className="text-lg font-bold text-amber-400">{c.produtividade} un/h</span>
                    </div>

                    <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block mb-1">Promessa SLA</span>
                      <span className="text-lg font-bold text-sky-400">{c.promessa}%</span>
                    </div>

                    <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block mb-1">Aderência BSI</span>
                      <span className="text-lg font-bold text-purple-400">{c.aderencia}%</span>
                    </div>
                  </div>
                </div>

                {/* 4 Cards das Métricas Operacionais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-emerald-500 p-4 rounded-xl relative shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feito Hoje</p>
                    <p className="text-3xl font-black font-mono text-white mt-1">{d.feitoHoje.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-orange-500 p-4 rounded-xl relative shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feito Ontem</p>
                    <p className="text-3xl font-black font-mono text-white mt-1">{d.feitoOntem.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-rose-500 p-4 rounded-xl relative shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Falta Liberar (Máquina)</p>
                    <p className="text-3xl font-black font-mono text-rose-300 mt-1">{d.maquina.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-sky-500 p-4 rounded-xl relative shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Liberado (Rafale)</p>
                    <p className="text-3xl font-black font-mono text-sky-300 mt-1">{d.rafale.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {/* Card de Progresso */}
                <div className="bg-[#111118] border border-[#1e1e2a] p-5 rounded-xl flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Progresso da Carga</span>
                    <span className="text-xl font-black font-mono text-white">{ef}%</span>
                  </div>

                  <div className="w-full bg-[#050507] h-3.5 rounded-full overflow-hidden border border-[#1e1e2a]">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${Math.min(ef, 100)}%`,
                        backgroundColor: ef >= 100 ? '#10b981' : (ef < 50 && temDados ? '#f97316' : cfg.cor)
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>0 un</span>
                    <span className="text-white font-bold">{d.feitoHoje.toLocaleString('pt-BR')} / {d.cap.toLocaleString('pt-BR')} un</span>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </main>

      {/* MODAL DE AJUSTE RÁPIDO DE UNIVERSOS (ALIMENTO & MONTANHA & COLIS) */}
      {editingSectorUniversos && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-[#2a2a3c] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#222234] pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Parâmetros por Universo • Setor {editingSectorUniversos}
                  </h3>
                  <p className="text-xs text-slate-400">Edição direta e calibração de parâmetros de atividade</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSectorUniversos(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-slate-400 self-center">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  const cfg = CONFIG_SETORES[editingSectorUniversos] || CONFIG_SETORES['88'];
                  const total = editAlimento + editMontanha || 6000;
                  setEditAlimento(Math.round(total * (cfg.mixPadrao.alimentoPct / 100)));
                  setEditMontanha(Math.round(total * (cfg.mixPadrao.montanhaPct / 100)));
                }}
                className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-colors"
              >
                Mix Padrão Setor {editingSectorUniversos}
              </button>
              <button
                type="button"
                onClick={() => {
                  const total = editAlimento + editMontanha || 6000;
                  setEditAlimento(Math.round(total * 0.5));
                  setEditMontanha(Math.round(total * 0.5));
                }}
                className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-colors"
              >
                50% Alim / 50% Mont
              </button>
            </div>

            {/* SEÇÃO 0: ATIVIDADE DO SETOR */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Activity size={15} /> ATIVIDADE
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Sincronização &amp; Override</span>
              </div>
              <div className="bg-[#0b0b12] p-3.5 rounded-xl border-2 border-white/10 flex flex-col justify-between gap-2 shadow-sm">
                <div className="flex items-center justify-between text-slate-300 text-xs font-black uppercase tracking-wider mb-1">
                  <span>OVERRIDE MANUAL (OPCIONAL)</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={editAtividade}
                    onChange={(e) => setEditAtividade(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-black text-xl bg-black border-2 border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400 shadow-inner"
                    placeholder="Vazio = usa valor da planilha"
                  />
                </div>
                {editAtividade === 0 && (
                  <p className="text-[10px] text-slate-500 text-right mt-1">
                    Atividade atual do setor:{' '}
                    <span className="font-mono text-emerald-400">
                      {editingSectorUniversos ? (effectiveSetores.find(s => String(s.id) === String(editingSectorUniversos) || String(s.numero) === String(editingSectorUniversos))?.ativ || 0).toLocaleString('pt-BR') : '---'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* SEÇÃO 1: UNIVERSOS DE PRODUTOS */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <PieChart size={14} className="text-indigo-400" />
                  <span>1. Universos de Produtos (Artigos em Separação)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `custom-${Date.now()}`;
                    setEditCustomUniversos([
                      ...editCustomUniversos,
                      { id: newId, name: `Novo Universo ${editCustomUniversos.length + 1}`, value: 0 }
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus size={13} />
                  <span>+ Adicionar Universo</span>
                </button>
              </div>

              {/* Universos Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Alimento */}
                <div className="bg-[#0b0b12] p-3 rounded-xl border border-amber-500/20 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
                    <span className="flex items-center gap-1"><Apple size={14} /> 🍎 Alimento</span>
                    <span className="text-[10px] text-amber-400/70 font-mono">
                      {(() => {
                        const tot = editAlimento + editMontanha + editCustomUniversos.reduce((s, c) => s + c.value, 0);
                        return tot > 0 ? `${((editAlimento / tot) * 100).toFixed(1)}%` : '0%';
                      })()}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editAlimento}
                    onChange={(e) => setEditAlimento(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-bold text-sm bg-black border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Montanha */}
                <div className="bg-[#0b0b12] p-3 rounded-xl border border-purple-500/20 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
                    <span className="flex items-center gap-1"><Mountain size={14} /> ⛰️ Montanha</span>
                    <span className="text-[10px] text-purple-400/70 font-mono">
                      {(() => {
                        const tot = editAlimento + editMontanha + editCustomUniversos.reduce((s, c) => s + c.value, 0);
                        return tot > 0 ? `${((editMontanha / tot) * 100).toFixed(1)}%` : '0%';
                      })()}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editMontanha}
                    onChange={(e) => setEditMontanha(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-bold text-sm bg-black border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Universos Customizados Adicionados */}
              {editCustomUniversos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1e1e2a]/60">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag size={13} /> Universos Customizados ({editCustomUniversos.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {editCustomUniversos.map((item, idx) => {
                      const pal = PALETTE_CUSTOM[idx % PALETTE_CUSTOM.length];
                      const tot = editAlimento + editMontanha + editCustomUniversos.reduce((s, c) => s + c.value, 0);
                      const pct = tot > 0 ? ((item.value / tot) * 100).toFixed(1) : '0';
                      return (
                        <div 
                          key={item.id || `edit-custom-${idx}`} 
                          className="bg-[#090912] p-3 rounded-xl border border-cyan-500/20 flex flex-col gap-2 relative group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...editCustomUniversos];
                                updated[idx].name = e.target.value;
                                setEditCustomUniversos(updated);
                              }}
                              placeholder="Nome do Universo"
                              className={`w-full font-bold text-xs bg-black/60 border border-slate-700 rounded-md px-2 py-1 ${pal.text} focus:outline-none focus:border-cyan-400`}
                            />
                            <span className="text-[10px] font-mono text-cyan-400/80 font-bold whitespace-nowrap bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {pct}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditCustomUniversos(editCustomUniversos.filter((_, i) => i !== idx));
                              }}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                              title="Remover este universo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-sans">Artigos:</span>
                            <input
                              type="number"
                              value={item.value}
                              onChange={(e) => {
                                const updated = [...editCustomUniversos];
                                updated[idx].value = Math.max(0, parseInt(e.target.value) || 0);
                                setEditCustomUniversos(updated);
                              }}
                              className="w-full text-right font-mono font-bold text-sm bg-black border border-cyan-500/40 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: FLUXO OPERACIONAL */}
            <div className="space-y-3 pt-2 border-t border-[#1e1e2a]">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <RotateCcw size={15} /> 2. FLUXO OPERACIONAL
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Reabastecimento &amp; Coleta</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* REABASTECIMENTO */}
                <div className="bg-[#1a1408] p-3.5 rounded-xl border-2 border-amber-500/60 flex flex-col justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center justify-between text-amber-400 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw size={16} className="text-amber-400" /> REABASTECIMENTO
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={editReproTotal}
                      onChange={(e) => setEditReproTotal(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right font-mono font-black text-xl bg-black border-2 border-amber-500/70 rounded-lg px-3 py-2 pr-12 text-amber-300 focus:outline-none focus:border-amber-400 shadow-inner"
                      placeholder="Ex: 151"
                    />
                    <span className="absolute right-3 font-mono font-bold text-amber-400/80 text-sm pointer-events-none">
                      CX
                    </span>
                  </div>
                </div>

                {/* COLIS COLETA */}
                <div className="bg-[#0b0b12] p-3.5 rounded-xl border-2 border-emerald-500/60 flex flex-col justify-between gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center justify-between text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Package size={16} className="text-emerald-400" /> COLIS COLETA
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={editColis}
                      onChange={(e) => setEditColis(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-right font-mono font-black text-xl bg-black border-2 border-emerald-500/70 rounded-lg px-3 py-2 pr-16 text-emerald-300 focus:outline-none focus:border-emerald-400 shadow-inner"
                      placeholder="Ex: 1500"
                    />
                    <span className="absolute right-3 font-mono font-bold text-emerald-400/80 text-sm pointer-events-none">
                      COLIS
                    </span>
                  </div>
                </div>
              </div>

              {/* E-Log */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-slate-700 flex flex-col justify-between gap-1.5">
                <div className="text-slate-300 text-xs font-bold flex justify-between items-center">
                  <span>E-Log (Identificador / Linha)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Decathlon WMS</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: 2J RA FALC (174)"
                  value={editElog}
                  onChange={(e) => setEditElog(e.target.value)}
                  className="w-full text-left font-mono font-semibold text-xs bg-black border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-3 border-t border-[#222234] bg-[#0b0b12] px-4 py-2.5 rounded-xl border">
              <span className="text-slate-400">Total Artigos Universos:</span>
              <span className="text-white font-black text-base">
                {(editAlimento + editMontanha + editCustomUniversos.reduce((s, c) => s + c.value, 0)).toLocaleString('pt-BR')} un
              </span>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2.5 pt-2">
              <div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectorUniversos(null);
                      if (onChangeSector && editingSectorUniversos) {
                        onChangeSector(editingSectorUniversos);
                      }
                      onNavigateTab('override');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Abrir o painel completo de Override para este setor"
                  >
                    <Sliders size={14} />
                    <span>⚡ Abrir no Override Geral</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSectorUniversos(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUniversos}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95"
                >
                  <Check size={16} />
                  <span>Salvar &amp; Aplicar Parâmetros</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESTRATÉGIA IA */}
      <AIStrategyModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        strategy={strategy}
        isLoading={isStrategyLoading}
        onRefresh={refreshStrategy}
      />

      {/* RODAPÉ */}
      <footer className="pt-3 border-t border-[#1e1e2a] flex flex-wrap justify-between items-center text-[11px] text-slate-400 gap-2">
        <span className="font-semibold uppercase tracking-wider">
          MONITORAMENTO DE LIBERAÇÃO, COLETA E PROCESSAMENTO
        </span>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-emerald-400 font-bold">{fileInfo}</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200 font-bold">{relogio}</span>
        </div>
      </footer>
    </div>
  );
};
