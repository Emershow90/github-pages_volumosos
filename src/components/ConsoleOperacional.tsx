import React, { useState, useEffect, useRef } from 'react';
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
  Zap
} from 'lucide-react';
import { usePainelProducaoStore } from '../stores/usePainelProducaoStore';
import { useSectorStore } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { Setor } from '../types';
import { initialCapacidade } from '../initialData';

interface ConsoleOperacionalProps {
  setores?: Setor[];
  activeSectorId?: string;
  onChangeSector?: (id: string) => void;
}

const CONFIG_SETORES: Record<string, { nome: string; linha: number; cor: string }> = {
  '87': { nome: 'Picking 87', linha: 23, cor: '#8b5cf6' },
  '88': { nome: 'Picking 88', linha: 25, cor: '#3b82f6' },
  '89': { nome: 'Picking 89', linha: 27, cor: '#f59e0b' },
  '90': { nome: 'Picking 90', linha: 29, cor: '#10b981' }
};

export const ConsoleOperacional: React.FC<ConsoleOperacionalProps> = ({
  setores = [],
  activeSectorId = '88',
  onChangeSector
}) => {
  const { currentUser } = useUserStore();
  const { registros, upsertRegistro, fetchRegistrosHoje } = usePainelProducaoStore();
  const { activityEntries, capacidade } = useSectorStore();

  const [visaoAtual, setVisaoAtual] = useState<string>('TODOS');
  const [carrosselAtivo, setCarrosselAtivo] = useState(false);
  const [relogio, setRelogio] = useState('');
  const [fileInfo, setFileInfo] = useState('STATUS: ZERADO (AGUARDANDO UPLOAD)');
  const [isDropActive, setIsDropActive] = useState(false);

  // Modal de Carregamento
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loadStatusText, setLoadStatusText] = useState('Inicializando leitor...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

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
  let setoresAtivosCount = 0;

  Object.keys(CONFIG_SETORES).forEach(id => {
    const d = getSectorData(id);
    totalFeitoHoje += d.feitoHoje;
    totalFeitoOntem += d.feitoOntem;
    totalMaquina += d.maquina;
    totalRafale += d.rafale;
    totalCapacidade += d.cap;
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
    let csv = 'Setor,Nome,Feito Hoje,Feito Ontem,Falta Liberar (Máquina),Liberado (Rafale),Capacidade,Eficiência\n';
    Object.keys(CONFIG_SETORES).forEach(id => {
      const cfg = CONFIG_SETORES[id];
      const d = getSectorData(id);
      const ef = d.cap > 0 ? Math.round((d.feitoHoje / d.cap) * 100) : 0;
      csv += `${id},${cfg.nome},${d.feitoHoje},${d.feitoOntem},${d.maquina},${d.rafale},${d.cap},${ef}%\n`;
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
                  <FileText size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-Log Observações</p>
                <p className="text-base font-bold text-slate-300 mt-2">Nenhuma obs.</p>
                <p className="text-[10px] text-slate-500 mt-1">Última informação operacional</p>
              </div>

              <div className="bg-[#111118] border border-[#1e1e2a] border-t-2 border-t-purple-500 p-4 rounded-xl relative overflow-hidden shadow-sm">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 absolute top-3.5 right-3.5">
                  <RefreshCw size={16} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reapro Ativo</p>
                <p className="text-base font-bold text-slate-300 mt-2">Sem registro</p>
                <p className="text-[10px] text-slate-500 mt-1">Situação do reaproveitamento</p>
              </div>
            </div>

            {/* Grid de Cards de Setor */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
                Visão por Setor
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(CONFIG_SETORES).map(id => {
                  const cfg = CONFIG_SETORES[id];
                  const d = getSectorData(id);
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
                      className="bg-[#111118] border border-[#1e1e2a] hover:border-[#2a2a38] p-5 rounded-xl flex flex-col justify-between cursor-pointer transition-all shadow-sm group"
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
                            <h2 className="text-sm font-bold text-white tracking-tight">SETOR {id}</h2>
                            <p className="text-[11px] text-slate-400">{cfg.nome}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeStyle}`}>
                          {badgeText}
                        </span>
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

                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">Falta Liberar</span>
                          <span className="text-lg font-black font-mono text-rose-300">{d.maquina.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="bg-[#050507] p-3 rounded-lg border border-[#1e1e2a]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">Liberado (Rafale)</span>
                          <span className="text-lg font-black font-mono text-sky-300">{d.rafale.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Progress Track */}
                      <div className="space-y-1">
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
                <div className="bg-[#111118] border border-[#1e1e2a] border-l-4 p-5 rounded-xl flex justify-between items-center shadow-sm" style={{ borderLeftColor: cfg.cor }}>
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg text-white shadow-md"
                      style={{ backgroundColor: cfg.cor }}
                    >
                      S{id}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">{cfg.nome}</h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Setor {id} • Capacidade nominal: {d.cap.toLocaleString('pt-BR')} un</span>
                        {!d.isConfigured && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans" title="Capacidade não configurada no setor; utilizando matriz inicial padrão">
                            Padrão
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${badgeStyle}`}>
                    {badgeText}
                  </span>
                </div>

                {/* 4 Cards das Métricas */}
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
