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
  RotateCcw
} from 'lucide-react';
import { usePainelProducaoStore } from '../stores/usePainelProducaoStore';
import { useSectorStore } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { useCopilMetrics } from '../hooks/useCopilMetrics';
import { fetchKpiSemanaMetrics, KpiSemanaMetrics } from '../lib/googleSheetsPublicSource';
import { Setor, ActivityEntry } from '../types';
import { initialCapacidade } from '../initialData';

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
  const { activityEntries, capacidade, updateActivityUniversosBatch, setSetores } = useSectorStore();
  const { metrics: copilData, summaryStats: copilSummary } = useCopilMetrics();

  const [visaoAtual, setVisaoAtual] = useState<string>('TODOS');
  const [carrosselAtivo, setCarrosselAtivo] = useState(false);
  const [relogio, setRelogio] = useState('');
  const [fileInfo, setFileInfo] = useState('STATUS: ZERADO (AGUARDANDO UPLOAD)');
  const [isDropActive, setIsDropActive] = useState(false);

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
  const [kpiMetrics, setKpiMetrics] = useState<KpiSemanaMetrics | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Initialize data fetch
  useEffect(() => {
    fetchRegistrosHoje(todayStr);
    fetchKpiSemanaMetrics().then(setKpiMetrics);
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

  // TV Carrossel mode
  useEffect(() => {
    if (!carrosselAtivo) return;
    const modos = ['TODOS', '87', '88', '89', '90'];
    let idx = modos.indexOf(visaoAtual);
    const timer = setInterval(() => {
      idx = (idx + 1) % modos.length;
      setVisaoAtual(modos[idx]);
    }, 8000);
    return () => clearInterval(timer);
  }, [carrosselAtivo, visaoAtual]);

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
    const sectorObj = setores.find(s => String(s.id) === String(sectorId) || String(s.numero) === String(sectorId));
    
    const isCaixasSector = ['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(sectorId));
    const kpiVal = kpiMetrics ? (kpiMetrics as any)[`s${parseInt(sectorId)}`] : 0;
    const entry = activityEntries.find(e => String(e.sectorId) === String(sectorId) && e.activityDate === todayStr) ||
                  activityEntries.find(e => String(e.sectorId) === String(sectorId));
                  
    const manualAtividade = entry?.atividade || 0;
    const totalAtiv = isCaixasSector 
      ? (manualAtividade > 0 ? manualAtividade : (kpiVal || sectorObj?.ativ || 0))
      : (sectorObj?.ativ || 0);

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
      const colisVal = entry.colis || (sectorId === '87' ? 1500 : 0);
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
        atividade: entry?.atividade || 0,
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
    const colisVal = sectorId === '87' ? 1500 : 0;

    return {
      total: totalAtiv,
      alimento: alim,
      montanha: mont,
      colis: colisVal,
        atividade: entry?.atividade || 0,
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
    const sectorObj = setores.find(s => String(s.id) === String(secId) || String(s.numero) === String(secId));
    setEditingSectorUniversos(secId);
    setEditAlimento(u.alimento);
    setEditMontanha(u.montanha);
    setEditReproTotal(sectorObj?.reproTotal ?? (parseInt(u.reapro?.replace(" CX", "") || "0") || 151));
    setEditColis(u.colis || 0);
    setEditAtividade(u.atividade || 0);
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

      setSetores(prev => prev.map(s => String(s.id) === String(editingSectorUniversos) || String(s.numero) === String(editingSectorUniversos) ? { ...s, reproTotal: editReproTotal } : s));

      setEditingSectorUniversos(null);
    } catch (err) {
      console.error('[ConsoleOperacional] Erro ao salvar universos:', err);
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
    if (d.feitoHoje > 0 || d.feitoOntem > 0 || d.maquina > 0 || d.rafale > 0) {
      setoresAtivosCount++;
    }
  });

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
  const activeSectorObj = setores.find(s => s.id === visaoAtual || s.numero.toString() === visaoAtual) || setores[0];
  const leaderName = activeSectorObj?.resp || 'IAGO ANDERSON';
  const promessaVal = activeSectorObj?.promessa?.toString() || '96,15';

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

      {/* UPLOAD BAR */}
      <div className="bg-[#111118] border border-dashed border-[#2a2a38] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Upload size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Upload da Planilha Operacional (.xlsm)</p>
            <p className="text-[11px] text-slate-400">
              Aba obrigatória: <span className="font-mono font-bold text-emerald-400">SU_QUERIES_SHEET</span> | Colunas: W, Y, F, S
            </p>
          </div>
        </div>

        <label className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 shadow-sm shrink-0">
          <Upload size={14} />
          <span>Carregar Planilha</span>
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
      </div>

      {/* HEADER PRINCIPAL */}
      <header className="flex flex-wrap justify-between items-center pb-3 border-b border-[#1e1e2a] gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-mono font-black text-white text-sm shadow-md shrink-0">
            S{visaoAtual === 'TODOS' ? '88' : visaoAtual}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black tracking-tight text-white uppercase">
                CONSOLE OPERACIONAL {visaoAtual !== 'TODOS' && `— PICKING ${visaoAtual}`}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ATIVO/ATIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Líder Responsável: <span className="font-semibold text-slate-200">{leaderName}</span>
              <span className="mx-2 text-slate-700">•</span>
              Promessa: <span className="font-mono font-semibold text-slate-200">{promessaVal}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111118] border border-[#1e1e2a]">
            <Layers size={14} className="text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400">SETOR:</span>
            <select 
              value={visaoAtual} 
              onChange={(e) => {
                setVisaoAtual(e.target.value);
                if (onChangeSector && e.target.value !== 'TODOS') onChangeSector(e.target.value);
              }} 
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-[#111118] text-white">Todos os Setores</option>
              <option value="87" className="bg-[#111118] text-white">Setor 87 — Picking 87</option>
              <option value="88" className="bg-[#111118] text-white">Setor 88 — Picking 88</option>
              <option value="89" className="bg-[#111118] text-white">Setor 89 — Picking 89</option>
              <option value="90" className="bg-[#111118] text-white">Setor 90 — Picking 90</option>
            </select>
          </div>

          {/* TV Mode Carousel Button */}
          <button 
            onClick={() => setCarrosselAtivo(!carrosselAtivo)} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              carrosselAtivo 
                ? 'bg-orange-600 text-white shadow-lg animate-pulse' 
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <Tv size={14} />
            <span>{carrosselAtivo ? 'Pausar TV (Auto 8s)' : 'Modo Apresentação (TV)'}</span>
          </button>

          {/* CSV Export Button */}
          <button 
            onClick={handleExportCSV}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

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
            {/* Top 4 Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-emerald-500 p-4 rounded-xl relative overflow-hidden shadow-sm">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 absolute top-3.5 right-3.5">
                  <Activity size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Processado</p>
                <p className="text-2xl font-black font-mono text-white mt-1">{totalFeitoHoje.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-500 mt-1">Soma de todas as categorias hoje</p>
              </div>

              <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-blue-500 p-4 rounded-xl relative overflow-hidden shadow-sm">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 absolute top-3.5 right-3.5">
                  <Users size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operadores Ativos</p>
                <p className="text-2xl font-black font-mono text-white mt-1">{setoresAtivosCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Setores com apontamentos hoje</p>
              </div>

              <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-orange-500 p-4 rounded-xl relative overflow-hidden shadow-sm">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 absolute top-3.5 right-3.5">
                  <Apple size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Universo Alimento (Total)</p>
                <p className="text-2xl font-black font-mono text-amber-300 mt-1">{totalAlimento.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-500 mt-1">Volumes de Alimento no CD</p>
              </div>

              <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-purple-500 p-4 rounded-xl relative overflow-hidden shadow-sm">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 absolute top-3.5 right-3.5">
                  <Mountain size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Universo Montanha (Total)</p>
                <p className="text-2xl font-black font-mono text-purple-300 mt-1">{totalMontanha.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-500 mt-1">Volumes de Montanha no CD</p>
              </div>
            </div>

            {/* Grid de Cards de Setor */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
                  <span>Visão por Setor • Atividade e Universos (Alimento / Montanha)</span>
                </div>
                <span className="text-[10px] text-slate-500">Clique no card para abrir visão detalhada</span>
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
          </>
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

                  {/* 2. CARD DEDICADO DE CAIXAS PARA COLETA & SUPORTE */}
                  <div className={`grid grid-cols-1 ${['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(id)) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5`}>
                    {/* CARD OPERACIONAL: REABASTECIMENTO */}
                    <div 
                      onClick={(e) => handleOpenEditUniversos(id, e)}
                      className={`bg-[#1a1408] border-2 border-amber-500/60 hover:border-amber-400 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] group flex flex-col justify-between ${['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(id)) ? 'lg:col-span-2' : 'lg:col-span-2'}`}
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
                      </div>

                      <div className="mt-3 flex items-baseline justify-between bg-black/40 p-3 rounded-lg border border-amber-500/20">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Qtd Reabastecimento</span>
                          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 leading-tight">
                            {(setores.find(s => String(s.id) === String(id) || String(s.numero) === String(id))?.reproTotal || parseInt(u.reapro?.replace(" CX", "") || "0") || 0).toLocaleString('pt-BR')} <span className="text-lg font-bold text-amber-400/80">CX</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* APENAS S87, S88, S89, S90 */}
                    {['87', '087', '88', '088', '89', '089', '90', '090'].includes(String(id)) && (
                      <>
                        {/* CARD COLIS (COM VALIDAÇÃO) */}
                        <div className="bg-[#0b0b14] border-2 border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                              COLIS COLETA
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="bg-black/40 p-2 rounded-lg border border-emerald-500/20 flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 uppercase">SISTEMA:</span>
                              <p className="text-lg font-black font-mono text-emerald-300">
                                {(u.colis || 0).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            
                            <div className="bg-black/40 p-2 rounded-lg border border-emerald-500/20 flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 uppercase">PLANILHA:</span>
                              <p className="text-lg font-black font-mono text-slate-300">
                                {kpiMetrics ? ((kpiMetrics as any)[`s${parseInt(String(id))}`]?.toLocaleString('pt-BR') || '---') : '---'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            {(() => {
                              const kpiColis = kpiMetrics ? (kpiMetrics as any)[`s${parseInt(String(id))}`] : null;
                              if (!kpiColis || u.colis === kpiColis) {
                                return (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                                    ✓ CONFERIDO
                                  </span>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                    ⚠ DIVERGÊNCIA
                                  </span>
                                  <button
                                    onClick={(e) => handleOpenEditUniversos(id, e)}
                                    className="text-[9px] font-bold text-white bg-indigo-500/80 hover:bg-indigo-500 px-2 py-1 rounded border border-indigo-400 transition-colors"
                                  >
                                    REFATURAR
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </>
                    )}

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
                    Atualmente puxando da planilha:{' '}
                    <span className="font-mono text-emerald-400">
                      {kpiMetrics ? ((kpiMetrics as any)[`s${parseInt(editingSectorUniversos || "0")}`]?.toLocaleString('pt-BR') || '---') : '---'}
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
