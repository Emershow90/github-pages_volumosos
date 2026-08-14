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
  PieChart
} from 'lucide-react';
import { usePainelProducaoStore } from '../stores/usePainelProducaoStore';
import { useSectorStore } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { useCopilMetrics } from '../hooks/useCopilMetrics';
import { Setor, ActivityEntry } from '../types';
import { initialCapacidade } from '../initialData';

interface ConsoleOperacionalProps {
  setores?: Setor[];
  activeSectorId?: string;
  onChangeSector?: (id: string) => void;
}

const CONFIG_SETORES: Record<string, { nome: string; linha: number; cor: string; mixPadrao: { alimentoPct: number; montanhaPct: number; mochilaPct: number; colisPct: number } }> = {
  '87': { nome: 'Picking 87', linha: 23, cor: '#8b5cf6', mixPadrao: { alimentoPct: 30, montanhaPct: 55, mochilaPct: 10, colisPct: 5 } },
  '88': { nome: 'Picking 88', linha: 25, cor: '#3b82f6', mixPadrao: { alimentoPct: 60, montanhaPct: 30, mochilaPct: 6.4, colisPct: 3.6 } },
  '89': { nome: 'Picking 89', linha: 27, cor: '#f59e0b', mixPadrao: { alimentoPct: 55, montanhaPct: 35, mochilaPct: 10, colisPct: 0 } },
  '90': { nome: 'Picking 90', linha: 29, cor: '#10b981', mixPadrao: { alimentoPct: 62, montanhaPct: 28, mochilaPct: 10, colisPct: 0 } }
};

export const ConsoleOperacional: React.FC<ConsoleOperacionalProps> = ({
  setores = [],
  activeSectorId = '88',
  onChangeSector
}) => {
  const { currentUser, currentUserUid } = useUserStore();
  const { registros, upsertRegistro, fetchRegistrosHoje } = usePainelProducaoStore();
  const { activityEntries, capacidade, updateActivityCategoryValue } = useSectorStore();
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
  const [editMochila, setEditMochila] = useState<number>(0);
  const [editColis, setEditColis] = useState<number>(0);

  // Modal de Carregamento
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loadStatusText, setLoadStatusText] = useState('Inicializando leitor...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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

  // Helper to obtain sector universe breakdown (Alimento, Montanha, Mochila, Colis, Elog, Reapro)
  const getSectorUniversos = (sectorId: string) => {
    const cfg = CONFIG_SETORES[sectorId] || CONFIG_SETORES['88'];
    const sectorObj = setores.find(s => String(s.id) === String(sectorId) || String(s.numero) === String(sectorId));
    const totalAtiv = sectorObj?.ativ || (sectorId === '88' ? 5965 : sectorId === '87' ? 15899 : 5000);

    const entry = activityEntries.find(e => String(e.sectorId) === String(sectorId) && e.activityDate === todayStr) ||
                  activityEntries.find(e => String(e.sectorId) === String(sectorId));

    if (entry && (entry.alimento > 0 || entry.montanha > 0 || entry.l7Mochila > 0 || entry.colis > 0)) {
      const sum = (entry.alimento || 0) + (entry.montanha || 0) + (entry.l7Mochila || 0) + (entry.colis || 0);
      const total = sum > 0 ? sum : totalAtiv;
      return {
        total,
        alimento: entry.alimento || 0,
        montanha: entry.montanha || 0,
        mochila: entry.l7Mochila || 0,
        colis: entry.colis || 0,
        elog: entry.elog || '2J RA FALC (174)',
        reapro: entry.reapro || `${sectorObj?.reproTotal || 127} CX`,
        alimentoPct: total > 0 ? Math.round(((entry.alimento || 0) / total) * 100) : 0,
        montanhaPct: total > 0 ? Math.round(((entry.montanha || 0) / total) * 100) : 0,
        mochilaPct: total > 0 ? Math.round(((entry.l7Mochila || 0) / total) * 100) : 0,
        colisPct: total > 0 ? Math.round(((entry.colis || 0) / total) * 100) : 0,
        isCustom: true
      };
    }

    // Fallback derivado baseado nos parâmetros padrão do setor
    const mix = cfg.mixPadrao;
    const alimento = Math.round((totalAtiv * mix.alimentoPct) / 100);
    const montanha = Math.round((totalAtiv * mix.montanhaPct) / 100);
    const mochila = Math.round((totalAtiv * mix.mochilaPct) / 100);
    const colis = Math.max(0, totalAtiv - alimento - montanha - mochila);

    return {
      total: totalAtiv,
      alimento,
      montanha,
      mochila,
      colis,
      elog: '2J RA FALC (174)',
      reapro: `${sectorObj?.reproTotal || 127} CX`,
      alimentoPct: mix.alimentoPct,
      montanhaPct: mix.montanhaPct,
      mochilaPct: mix.mochilaPct,
      colisPct: mix.colisPct,
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
    setEditingSectorUniversos(secId);
    setEditAlimento(u.alimento);
    setEditMontanha(u.montanha);
    setEditMochila(u.mochila);
    setEditColis(u.colis);
  };

  // Salvar edição dos universos
  const handleSaveUniversos = async () => {
    if (!editingSectorUniversos) return;
    try {
      const uId = currentUserUid || currentUser || 'system';
      await updateActivityCategoryValue(editingSectorUniversos, todayStr, uId, 'alimento', editAlimento);
      await updateActivityCategoryValue(editingSectorUniversos, todayStr, uId, 'montanha', editMontanha);
      await updateActivityCategoryValue(editingSectorUniversos, todayStr, uId, 'l7Mochila', editMochila);
      await updateActivityCategoryValue(editingSectorUniversos, todayStr, uId, 'colis', editColis);
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
  let totalMochila = 0;
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
    totalMochila += u.mochila;
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
    let csv = 'Setor,Nome,Feito Hoje,Feito Ontem,Falta Liberar (Máquina),Liberado (Rafale),Capacidade,Eficiência,Alimento,Montanha,Mochila,Colis\n';
    Object.keys(CONFIG_SETORES).forEach(id => {
      const cfg = CONFIG_SETORES[id];
      const d = getSectorData(id);
      const u = getSectorUniversos(id);
      const ef = d.cap > 0 ? Math.round((d.feitoHoje / d.cap) * 100) : 0;
      csv += `${id},${cfg.nome},${d.feitoHoje},${d.feitoOntem},${d.maquina},${d.rafale},${d.cap},${ef}%,${u.alimento},${u.montanha},${u.mochila},${u.colis}\n`;
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

                      {/* DETALHE DOS UNIVERSOS: ALIMENTO & MONTANHA */}
                      <div className="bg-[#0b0b12] border border-[#1e1e2c] p-3 rounded-lg my-1 space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <PieChart size={13} className="text-indigo-400" />
                            <span>Atividade do Dia: <strong className="text-white font-mono">{u.total.toLocaleString('pt-BR')} un</strong></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {id === '88' ? 'Ref. ~6.000 un' : 'Ref. Setor'}
                          </span>
                        </div>

                        {/* Barra segmentada de proporção */}
                        <div className="w-full h-2 rounded-full overflow-hidden flex bg-zinc-900 border border-[#1e1e2a]">
                          <div style={{ width: `${u.alimentoPct}%` }} className="bg-amber-500 h-full" title={`Alimento: ${u.alimento} un (${u.alimentoPct}%)`}></div>
                          <div style={{ width: `${u.montanhaPct}%` }} className="bg-purple-500 h-full" title={`Montanha: ${u.montanha} un (${u.montanhaPct}%)`}></div>
                          <div style={{ width: `${u.mochilaPct}%` }} className="bg-sky-500 h-full" title={`Mochila: ${u.mochila} un (${u.mochilaPct}%)`}></div>
                          <div style={{ width: `${u.colisPct}%` }} className="bg-emerald-500 h-full" title={`Colis: ${u.colis} un (${u.colisPct}%)`}></div>
                        </div>

                        {/* Pílulas de Alimento e Montanha */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-[#14141e] px-2 py-1 rounded border border-amber-500/20 flex items-center justify-between">
                            <span className="text-amber-400 font-sans flex items-center gap-1">
                              <Apple size={11} /> Alimento
                            </span>
                            <span className="text-white font-bold">{u.alimento.toLocaleString('pt-BR')} <span className="text-amber-400/80 font-normal">({u.alimentoPct}%)</span></span>
                          </div>

                          <div className="bg-[#14141e] px-2 py-1 rounded border border-purple-500/20 flex items-center justify-between">
                            <span className="text-purple-400 font-sans flex items-center gap-1">
                              <Mountain size={11} /> Montanha
                            </span>
                            <span className="text-white font-bold">{u.montanha.toLocaleString('pt-BR')} <span className="text-purple-400/80 font-normal">({u.montanhaPct}%)</span></span>
                          </div>
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

                {/* BLOCO EM DESTAQUE: UNIVERSO DE ATIVIDADE DO SETOR (ALIMENTO & MONTANHA) */}
                <div className="bg-[#111118] border border-[#222234] rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#1e1e2a] pb-3">
                    <div className="flex items-center gap-2">
                      <PieChart size={18} className="text-indigo-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Parâmetros de Atividade por Universo • Setor {id}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {id === '88' ? 'Setor 88 com ~6.000 un (Alimento e Montanha em foco operacional)' : `Composição detalhada dos universos do Setor ${id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <div className="bg-[#050507] px-3 py-1.5 rounded-lg border border-[#1e1e2a]">
                        <span className="text-slate-400 mr-1.5 font-sans">Atividade Total:</span>
                        <strong className="text-white text-sm">{u.total.toLocaleString('pt-BR')} un</strong>
                      </div>
                    </div>
                  </div>

                  {/* 4 Cards de Universos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Alimento */}
                    <div className="bg-[#0b0b14] border border-amber-500/30 p-4 rounded-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Apple size={13} /> Universo Alimento
                          </span>
                          <p className="text-3xl font-black font-mono text-white mt-1.5">{u.alimento.toLocaleString('pt-BR')}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {u.alimentoPct}%
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400 flex justify-between">
                        <span>Status: <strong className="text-emerald-400">Normal</strong></span>
                        <span>Colis/Pkts</span>
                      </div>
                    </div>

                    {/* Montanha */}
                    <div className="bg-[#0b0b14] border border-purple-500/30 p-4 rounded-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <Mountain size={13} /> Universo Montanha
                          </span>
                          <p className="text-3xl font-black font-mono text-white mt-1.5">{u.montanha.toLocaleString('pt-BR')}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {u.montanhaPct}%
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400 flex justify-between">
                        <span>Status: <strong className="text-emerald-400">Regular</strong></span>
                        <span>Colis/Pkts</span>
                      </div>
                    </div>

                    {/* Mochila / L7 */}
                    <div className="bg-[#0b0b14] border border-sky-500/30 p-4 rounded-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                            <Package size={13} /> L7 Mochila / Colis
                          </span>
                          <p className="text-3xl font-black font-mono text-white mt-1.5">{(u.mochila + u.colis).toLocaleString('pt-BR')}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          {u.mochilaPct + u.colisPct}%
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400 flex justify-between">
                        <span>Mochila: {u.mochila}</span>
                        <span>Colis: {u.colis}</span>
                      </div>
                    </div>

                    {/* E-Log & Reapro */}
                    <div className="bg-[#0b0b14] border border-slate-700 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          E-Log & Reapro
                        </span>
                        <p className="text-sm font-bold font-mono text-amber-300 truncate" title={u.elog}>
                          {u.elog}
                        </p>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400 flex justify-between items-center border-t border-white/5 pt-2">
                        <span>Reapro:</span>
                        <span className="font-bold text-white font-mono">{u.reapro}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra visual de proporção completa */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Distribuição Visual do Mix de Atividade</span>
                      <span className="font-mono font-bold text-white">100% da Carga</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-900 border border-[#1e1e2a]">
                      <div style={{ width: `${u.alimentoPct}%` }} className="bg-amber-500 h-full flex items-center justify-center text-[9px] font-bold text-black" title={`Alimento: ${u.alimentoPct}%`}>
                        {u.alimentoPct > 15 ? `${u.alimentoPct}% Alimento` : ''}
                      </div>
                      <div style={{ width: `${u.montanhaPct}%` }} className="bg-purple-500 h-full flex items-center justify-center text-[9px] font-bold text-white" title={`Montanha: ${u.montanhaPct}%`}>
                        {u.montanhaPct > 15 ? `${u.montanhaPct}% Montanha` : ''}
                      </div>
                      <div style={{ width: `${u.mochilaPct}%` }} className="bg-sky-500 h-full flex items-center justify-center text-[9px] font-bold text-white" title={`Mochila: ${u.mochilaPct}%`}>
                        {u.mochilaPct > 10 ? `${u.mochilaPct}%` : ''}
                      </div>
                      <div style={{ width: `${u.colisPct}%` }} className="bg-emerald-500 h-full" title={`Colis: ${u.colisPct}%`}></div>
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

      {/* MODAL DE AJUSTE RÁPIDO DE UNIVERSOS (ALIMENTO & MONTANHA) */}
      {editingSectorUniversos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-[#2a2a3c] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#222234] pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Ajustar Universos • Setor {editingSectorUniversos}
                </h3>
              </div>
              <button 
                onClick={() => setEditingSectorUniversos(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ajuste as quantidades por categoria para calibrar os parâmetros de atividade e proporções operacionais do setor.
            </p>

            <div className="space-y-3">
              {/* Alimento */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Apple size={16} />
                  <span>Universo Alimento</span>
                </div>
                <input
                  type="number"
                  value={editAlimento}
                  onChange={(e) => setEditAlimento(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 text-right font-mono font-bold text-sm bg-black border border-amber-500/40 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Montanha */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-purple-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                  <Mountain size={16} />
                  <span>Universo Montanha</span>
                </div>
                <input
                  type="number"
                  value={editMontanha}
                  onChange={(e) => setEditMontanha(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 text-right font-mono font-bold text-sm bg-black border border-purple-500/40 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* L7 Mochila */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-sky-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                  <Package size={16} />
                  <span>L7 / Mochila</span>
                </div>
                <input
                  type="number"
                  value={editMochila}
                  onChange={(e) => setEditMochila(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 text-right font-mono font-bold text-sm bg-black border border-sky-500/40 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Colis */}
              <div className="bg-[#0b0b12] p-3 rounded-xl border border-[#222234] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                  <Package size={16} />
                  <span>Colis / Outros</span>
                </div>
                <input
                  type="number"
                  value={editColis}
                  onChange={(e) => setEditColis(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 text-right font-mono font-bold text-sm bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-[#222234]">
              <span className="text-slate-400">Total Calculado:</span>
              <span className="text-white font-bold text-sm">{(editAlimento + editMontanha + editMochila + editColis).toLocaleString('pt-BR')} un</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSectorUniversos(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUniversos}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Check size={14} />
                <span>Salvar Parâmetros</span>
              </button>
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
