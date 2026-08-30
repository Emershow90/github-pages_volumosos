import React, { useState, useEffect, useMemo } from "react";
import { Setor, UserRole } from "../types";
import { useCopilMetrics } from "../hooks/useCopilMetrics";
import { ConexoesService } from "../services/conexoesService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { useUndoableDelete, DeleteUndoToast } from "./DeleteUndoToast";

interface CopilTabProps {
  setores: Setor[];
  currentRole: UserRole | string | null;
  activeSectorId: string;
  setActiveSectorId: (sid: string) => void;
}

type SortField =
  | "setor"
  | "semana"
  | "pilotagem"
  | "volume_que_caiu"
  | "percentual"
  | "horas_planning"
  | "horas_terceiros"
  | "total_horas"
  | "poli_entrada"
  | "poli_saida"
  | "capacidade"
  | "total_coletado"
  | "produtividade"
  | "promessa"
  | "lead_time"
  | "aderencia";

export const CopilTab: React.FC<CopilTabProps> = ({
  setores,
  activeSectorId,
  setActiveSectorId,
}) => {
  const { metrics: matrizData, loading: isLoading, summaryStats, refetch, deleteMetric } = useCopilMetrics();
  const { pending, requestDelete, undo, windowMs } = useUndoableDelete((id) => deleteMetric(id));

  const [selectedSector, setSelectedSector] = useState<string>(activeSectorId || "todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"completo" | "executivo">("completo");

  // Ordenação de colunas
  const [sortField, setSortField] = useState<SortField>("semana");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // ISO Week Calculator
  const currentWeekNum = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  // Extrai semanas disponíveis dos dados
  const availableWeeks = useMemo(() => {
    const weeksFromData = Array.from(new Set(matrizData.map((d) => Number(d.semana)))).filter(Boolean).sort((a: number, b: number) => b - a);
    if (weeksFromData.length > 0) return weeksFromData;
    const fallback = [currentWeekNum, currentWeekNum - 1, currentWeekNum - 2, currentWeekNum - 3].filter(w => w > 0);
    return fallback;
  }, [matrizData, currentWeekNum]);

  // Estado da semana (0 = Todas, ou padrão na semana atual/mais recente)
  const [selectedSemana, setSelectedSemana] = useState<number>(() => {
    return availableWeeks.includes(currentWeekNum) ? currentWeekNum : (availableWeeks[0] || currentWeekNum);
  });

  // Atualiza a semana padrão caso os dados carreguem depois
  useEffect(() => {
    if (availableWeeks.length > 0 && (selectedSemana === 0 || !availableWeeks.includes(selectedSemana))) {
      const defaultW = availableWeeks.includes(currentWeekNum) ? currentWeekNum : availableWeeks[0];
      if (defaultW) setSelectedSemana(defaultW);
    }
  }, [availableWeeks, currentWeekNum]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Sincronização manual com a planilha da Controladoria
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback("Sincronizando planilha de Controladoria...");
    try {
      const result = await ConexoesService.syncControladoriaSheet();
      if (result.success) {
        setSyncFeedback(`Sincronizado! ${result.importedCount} registros atualizados.`);
        await refetch();
      } else {
        setSyncFeedback(`Erro na sincronização: ${result.error || 'Falha ao importar'}`);
      }
    } catch {
      setSyncFeedback("Erro ao conectar com servidor de dados.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Cálculo da Nota COPIL de Atingimento
  const calculateNota = (real: number, meta: number, isLowerBetter: boolean = false): { grade: 'A' | 'B' | 'C' | 'D'; scorePct: number } => {
    if (!meta || meta === 0) return { grade: 'B', scorePct: 100 };
    const pct = isLowerBetter ? (meta / real) * 100 : (real / meta) * 100;

    if (pct >= 100) return { grade: 'A', scorePct: Math.round(pct) };
    if (pct >= 90) return { grade: 'B', scorePct: Math.round(pct) };
    if (pct >= 80) return { grade: 'C', scorePct: Math.round(pct) };
    return { grade: 'D', scorePct: Math.round(pct) };
  };

  // Filtragem e ordenação estrita dos dados
  const filteredData = useMemo(() => {
    const filtered = matrizData.filter((item) => {
      if (pending?.id && item.id === pending.id) return false;
      const matchSetor = selectedSector === "todos" || 
        String(item.setor).toLowerCase() === String(selectedSector).toLowerCase() ||
        String(item.setor) === `S${selectedSector}` ||
        `S${item.setor}` === String(selectedSector);
      const matchSemana = selectedSemana === 0 || Number(item.semana) === Number(selectedSemana);
      
      const searchMatch = !searchQuery || 
        String(item.setor).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.semana).includes(searchQuery);

      return matchSetor && matchSemana && searchMatch;
    });

    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === "total_horas") {
        valA = (Number(a.horas_planning) || 0) + (Number(a.horas_terceiros) || 0);
        valB = (Number(b.horas_planning) || 0) + (Number(b.horas_terceiros) || 0);
      }

      if (typeof valA === "string" || typeof valB === "string") {
        const comp = String(valA || "").localeCompare(String(valB || ""));
        return sortDirection === "asc" ? comp : -comp;
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [matrizData, selectedSector, selectedSemana, searchQuery, sortField, sortDirection, pending]);

  // Cálculos consolidados para a linha de Totais (tfoot)
  const totals = useMemo(() => {
    const totalPilotagem = filteredData.reduce((acc, row) => acc + (Number(row.pilotagem) || 0), 0);
    const totalVolCaiu = filteredData.reduce((acc, row) => acc + (Number(row.volume_que_caiu) || 0), 0);
    const avgPercentual = totalPilotagem > 0 ? Math.round((totalVolCaiu / totalPilotagem) * 100) : 100;
    
    const totalHrsPlan = filteredData.reduce((acc, row) => acc + (Number(row.horas_planning) || 0), 0);
    const totalHrsTerc = filteredData.reduce((acc, row) => acc + (Number(row.horas_terceiros) || 0), 0);
    const totalHorasAll = totalHrsPlan + totalHrsTerc;

    const totalPoliEntr = filteredData.reduce((acc, row) => acc + (Number(row.poli_entrada) || 0), 0);
    const totalPoliSai = filteredData.reduce((acc, row) => acc + (Number(row.poli_saida) || 0), 0);

    const totalCapacidade = filteredData.reduce((acc, row) => acc + (Number(row.capacidade) || 0), 0);
    const totalColetado = filteredData.reduce((acc, row) => acc + (Number(row.total_coletado) || 0), 0);

    const avgUph = totalHorasAll > 0 
      ? Math.round(totalColetado / totalHorasAll)
      : (filteredData.length > 0 ? Math.round(filteredData.reduce((acc, r) => acc + (Number(r.produtividade) || 0), 0) / filteredData.length) : 0);

    const avgPromessa = filteredData.length > 0 
      ? Number((filteredData.reduce((acc, r) => acc + (Number(r.promessa) || 0), 0) / filteredData.length).toFixed(1))
      : 0;

    const avgLeadTime = filteredData.length > 0 
      ? Number((filteredData.reduce((acc, r) => acc + (Number(r.lead_time) || 0), 0) / filteredData.length).toFixed(1))
      : 0;

    const avgAderencia = filteredData.length > 0 
      ? Number((filteredData.reduce((acc, r) => acc + (Number(r.aderencia) || 0), 0) / filteredData.length).toFixed(1))
      : 0;

    const targetCapUph = totalCapacidade > 0 ? Math.round(totalCapacidade / (totalHorasAll || 8)) : 500;
    const notaGeral = calculateNota(avgUph, targetCapUph);

    return {
      totalPilotagem,
      totalVolCaiu,
      avgPercentual,
      totalHrsPlan,
      totalHrsTerc,
      totalHorasAll,
      totalPoliEntr,
      totalPoliSai,
      totalCapacidade,
      totalColetado,
      avgUph,
      avgPromessa,
      avgLeadTime,
      avgAderencia,
      notaGeral,
    };
  }, [filteredData]);

  // Setores únicos encontrados nos dados para renderização dos gráficos
  const availableSectors = useMemo(() => {
    const list = Array.from(new Set(matrizData.map((d) => String(d.setor)))).filter(Boolean);
    return list.length > 0 ? list : ['87', '88', '89', '90', 'E-LOG'];
  }, [matrizData]);

  // Dados para o gráfico de evolução de UPH por Semana
  const chartDataUPH = useMemo(() => {
    const semanas = Array.from(new Set(matrizData.map((d) => Number(d.semana)))).filter(Boolean).sort((a: number, b: number) => a - b);
    const resultSemanas = semanas.length > 0 ? semanas : [30, 31, 32];
    
    return resultSemanas.map((sem) => {
      const row: Record<string, unknown> = { semana: `Semana ${sem}` };
      availableSectors.forEach((st) => {
        const item = matrizData.find((d) => Number(d.semana) === sem && String(d.setor) === st);
        row[`Setor ${st}`] = item ? item.produtividade || 0 : 0;
      });
      return row;
    });
  }, [matrizData, availableSectors]);

  // Cores dinâmicas para cada setor
  const sectorColors: Record<string, string> = {
    '87': '#818cf8',
    '88': '#34d399',
    '89': '#fbbf24',
    '90': '#38bdf8',
    'E-LOG': '#c084fc',
    'ELOG': '#c084fc',
  };

  const chartDataPromessa = useMemo(() => {
    return filteredData.map((item) => ({
      setor: `S${item.setor}`,
      Promessa: item.promessa || 0,
      Meta: 98.0,
    }));
  }, [filteredData]);

  const handleExportRelatorio = () => {
    let csv = "Setor;Semana;Ano;Pilotagem;Vol Caiu;% Caiu/Pil;Horas Plan;Horas Terc;Total Horas;Poli Entrada;Poli Saida;Capacidade;Total Coletado;Produtividade (UPH);Promessa (%);Lead Time;Aderencia (%)\n";
    filteredData.forEach((row) => {
      const totH = (Number(row.horas_planning) || 0) + (Number(row.horas_terceiros) || 0);
      csv += `${row.setor};${row.semana};${row.ano};${row.pilotagem};${row.volume_que_caiu};${row.percentual};${row.horas_planning};${row.horas_terceiros};${totH};${row.poli_entrada};${row.poli_saida};${row.capacidade};${row.total_coletado};${row.produtividade};${row.promessa};${row.lead_time};${row.aderencia}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `planilha_COPIL_S${selectedSector}_semana${selectedSemana}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'B': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'C': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default: return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={11} className="text-indigo-400" />
    ) : (
      <ArrowDown size={11} className="text-indigo-400" />
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER & PAINEL DE CONTROLE */}
      <div className="glass-card p-6 border-l-2 border-indigo-500/50 bg-[#07070a]/98">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileSpreadsheet size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Planilha COPIL — Matriz de Performance
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Realinhamento de colunas, indicadores operacionais, capacidade, horas e controle de SLA.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {syncFeedback && (
              <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg animate-pulse">
                {syncFeedback}
              </span>
            )}
            <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setViewMode("completo")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "completo" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Exibir todas as colunas operacionais e recursos"
              >
                <Maximize2 size={13} />
                <span>Completa</span>
              </button>
              <button
                onClick={() => setViewMode("executivo")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "executivo" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Exibir apenas colunas-chave de resultado executivo"
              >
                <Minimize2 size={13} />
                <span>Executiva</span>
              </button>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn-primary text-xs flex items-center gap-2 cursor-pointer"
              title="Forçar Sincronização com Controladoria"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Planilha"}
            </button>
            <button
              onClick={handleExportRelatorio}
              className="btn-secondary text-xs flex items-center gap-2 cursor-pointer"
              title="Exportar dados formatados para planilha CSV"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* FAIXA DE RESUMO EXECUTIVO (KPIS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Total Pilotagem</span>
            <span className="text-lg font-black text-white font-mono">{summaryStats.totalPilotagem.toLocaleString('pt-BR')}</span>
            <span className="text-[9px] text-zinc-500 block">Previsto no Plano</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Total Coletado</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{summaryStats.totalColetado.toLocaleString('pt-BR')}</span>
            <span className="text-[9px] text-zinc-500 block">Realizado</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">UPH Média</span>
            <span className="text-lg font-black text-amber-400 font-mono">{summaryStats.avgUph}</span>
            <span className="text-[9px] text-zinc-500 block">Unidades / Hora</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Promessa SLA</span>
            <span className="text-lg font-black text-sky-400 font-mono">{summaryStats.avgPromessa}%</span>
            <span className="text-[9px] text-zinc-500 block">Meta 98%</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Aderência BSI</span>
            <span className="text-lg font-black text-purple-400 font-mono">{summaryStats.avgAderencia}%</span>
            <span className="text-[9px] text-zinc-500 block">Conformidade</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Nota Consolidada</span>
            <div className="mt-0.5">
              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-black ${getGradeBadge(totals.notaGeral.grade)}`}>
                Nota {totals.notaGeral.grade} ({totals.notaGeral.scorePct}%)
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-black/40 p-3.5 rounded-xl border border-white/5">
          <div className="md:col-span-4 flex items-center gap-2">
            <Filter size={15} className="text-indigo-400 flex-shrink-0" />
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">Setor:</label>
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                if (e.target.value !== "todos") setActiveSectorId(e.target.value);
              }}
              className="inp text-xs py-1.5 font-bold text-indigo-300 w-full"
            >
              <option value="todos">Todos os Setores (Geral)</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  Setor S{s.id} ({s.nome})
                </option>
              ))}
              <option value="E-LOG">Setor E-LOG</option>
              <option value="ELOG">Setor ELOG</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">Semana:</label>
            <select
              value={selectedSemana}
              onChange={(e) => setSelectedSemana(Number(e.target.value))}
              className="inp text-xs py-1.5 font-bold text-sky-300 w-full"
            >
              <option value={0}>Todas as Semanas (Consolidado)</option>
              {availableWeeks.map((sem) => (
                <option key={sem} value={sem}>
                  Semana {sem} / 2026 {sem === currentWeekNum ? ' (Semana Atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative w-full">
              <Search size={14} className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por setor ou semana..."
                className="inp text-xs py-1.5 pl-8 font-medium w-full text-zinc-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABELA PRINCIPAL DA PLANILHA COPIL */}
      <div className="glass-card p-6 border-l-2 border-indigo-500/50 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Award className="text-indigo-400" size={18} />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Grade Operacional COPIL ({filteredData.length} linha{filteredData.length !== 1 ? 's' : ''})
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Realtime Ativo</span>
            <span className="text-zinc-600">|</span>
            <span>Clique nos cabeçalhos para ordenar</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-zinc-500 font-mono text-xs animate-pulse">
            Carregando e alinhando dados da planilha COPIL...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-black/30 border border-white/5 p-8 rounded-xl text-center text-zinc-400">
            <AlertTriangle className="mx-auto text-amber-400 mb-2" size={28} />
            <p className="text-xs font-bold uppercase tracking-wider">Nenhum registro encontrado para os filtros selecionados.</p>
            <p className="text-[10px] text-zinc-500 mt-1">Experimente alterar a semana ou clique em "Sincronizar Planilha".</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse font-sans">
              {/* SUPER HEADERS AGRUPADOS */}
              <thead>
                <tr className="bg-zinc-900/90 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-white/10">
                  <th colSpan={2} className="py-2 px-3 text-left border-r border-white/10 bg-indigo-950/20 text-indigo-300">
                    1. Identificação
                  </th>
                  <th colSpan={3} className="py-2 px-3 text-center border-r border-white/10 bg-blue-950/20 text-blue-300">
                    2. Planejamento & Demanda
                  </th>
                  {viewMode === "completo" && (
                    <th colSpan={5} className="py-2 px-3 text-center border-r border-white/10 bg-zinc-950/40 text-zinc-300">
                      3. Recursos & Jornada (Horas)
                    </th>
                  )}
                  <th colSpan={viewMode === "completo" ? 3 : 2} className="py-2 px-3 text-center border-r border-white/10 bg-emerald-950/20 text-emerald-300">
                    {viewMode === "completo" ? "4. Capacidade & Execução" : "3. Execução"}
                  </th>
                  <th colSpan={viewMode === "completo" ? 3 : 2} className="py-2 px-3 text-center border-r border-white/10 bg-purple-950/20 text-purple-300">
                    {viewMode === "completo" ? "5. Qualidade & SLA" : "4. Qualidade & SLA"}
                  </th>
                  <th className="py-2 px-3 text-center bg-amber-950/20 text-amber-300">
                    {viewMode === "completo" ? "6. Avaliação" : "5. Nota"}
                  </th>
                </tr>

                {/* COLUNAS INDIVIDUAIS COM ORDENAÇÃO */}
                <tr className="border-b border-white/10 bg-black/60 text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none">
                  {/* Identificação */}
                  <th
                    onClick={() => handleSort("setor")}
                    className="py-2.5 px-3 text-left cursor-pointer hover:text-white group border-r border-white/5 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Setor</span>
                      {renderSortIndicator("setor")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("semana")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-white group border-r border-white/10 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Sem / Ano</span>
                      {renderSortIndicator("semana")}
                    </div>
                  </th>

                  {/* Planejamento & Demanda */}
                  <th
                    onClick={() => handleSort("pilotagem")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Pilotagem</span>
                      {renderSortIndicator("pilotagem")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("volume_que_caiu")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Vol. Caiu</span>
                      {renderSortIndicator("volume_que_caiu")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("percentual")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group border-r border-white/10 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>% Caiu/Pil</span>
                      {renderSortIndicator("percentual")}
                    </div>
                  </th>

                  {/* Recursos & Horas (Somente modo Completo) */}
                  {viewMode === "completo" && (
                    <>
                      <th
                        onClick={() => handleSort("horas_planning")}
                        className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Hrs Plan</span>
                          {renderSortIndicator("horas_planning")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("horas_terceiros")}
                        className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Hrs Terc</span>
                          {renderSortIndicator("horas_terceiros")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("total_horas")}
                        className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap font-bold text-zinc-300"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Tot Horas</span>
                          {renderSortIndicator("total_horas")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("poli_entrada")}
                        className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Poli Entr</span>
                          {renderSortIndicator("poli_entrada")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("poli_saida")}
                        className="py-2.5 px-3 text-right cursor-pointer hover:text-white group border-r border-white/10 whitespace-nowrap"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Poli Saí</span>
                          {renderSortIndicator("poli_saida")}
                        </div>
                      </th>
                    </>
                  )}

                  {/* Capacidade & Execução */}
                  {viewMode === "completo" && (
                    <th
                      onClick={() => handleSort("capacidade")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Capacidade</span>
                        {renderSortIndicator("capacidade")}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort("total_coletado")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap font-bold text-emerald-400"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Colet.</span>
                      {renderSortIndicator("total_coletado")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("produtividade")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group border-r border-white/10 whitespace-nowrap font-bold text-amber-400"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Prod (UPH)</span>
                      {renderSortIndicator("produtividade")}
                    </div>
                  </th>

                  {/* Qualidade & SLA */}
                  <th
                    onClick={() => handleSort("promessa")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap font-bold"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Promessa (%)</span>
                      {renderSortIndicator("promessa")}
                    </div>
                  </th>
                  {viewMode === "completo" && (
                    <th
                      onClick={() => handleSort("lead_time")}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Lead Time</span>
                        {renderSortIndicator("lead_time")}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort("aderencia")}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white group border-r border-white/10 whitespace-nowrap font-bold"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Aderência (%)</span>
                      {renderSortIndicator("aderencia")}
                    </div>
                  </th>

                  {/* Nota COPIL */}
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span>Nota COPIL</span>
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">
                    <span>Ação</span>
                  </th>
                </tr>
              </thead>

              {/* CORPO DE LINHAS DA TABELA */}
              <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                {filteredData.map((row, idx) => {
                  const targetUph = row.capacidade && row.capacidade > 0 ? Math.round(row.capacidade / 8) : 500;
                  const notaUph = calculateNota(row.produtividade || 0, targetUph);
                  const totHorasRow = (Number(row.horas_planning) || 0) + (Number(row.horas_terceiros) || 0);

                  const promessaVal = Number(row.promessa) || 0;
                  const promessaColor = promessaVal >= 98 ? "text-emerald-400" : promessaVal >= 90 ? "text-amber-400" : "text-rose-400";

                  const aderenciaVal = Number(row.aderencia) || 0;
                  const aderenciaColor = aderenciaVal >= 95 ? "text-indigo-300" : aderenciaVal >= 85 ? "text-amber-400" : "text-rose-400";

                  return (
                    <tr
                      key={row.id || `${row.setor}_${row.semana}_${idx}`}
                      className="hover:bg-indigo-500/[0.04] transition-colors tabular-nums"
                    >
                      {/* Setor */}
                      <td className="py-2.5 px-3 font-bold text-indigo-400 font-sans border-r border-white/5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-xs">
                          S{row.setor}
                        </span>
                      </td>

                      {/* Semana / Ano */}
                      <td className="py-2.5 px-3 text-center text-zinc-400 border-r border-white/10 font-mono text-[11px]">
                        Sem {row.semana} <span className="text-zinc-600">/{row.ano || 2026}</span>
                      </td>

                      {/* Pilotagem */}
                      <td className="py-2.5 px-3 text-right text-zinc-200">
                        {row.pilotagem?.toLocaleString("pt-BR") || 0}
                      </td>

                      {/* Vol Caiu */}
                      <td className="py-2.5 px-3 text-right text-zinc-200">
                        {row.volume_que_caiu?.toLocaleString("pt-BR") || 0}
                      </td>

                      {/* % Caiu / Pil */}
                      <td className="py-2.5 px-3 text-right text-sky-400 border-r border-white/10 font-bold">
                        {row.percentual || 100}%
                      </td>

                      {/* Recursos & Horas */}
                      {viewMode === "completo" && (
                        <>
                          <td className="py-2.5 px-3 text-right text-zinc-400">
                            {row.horas_planning ? `${row.horas_planning}h` : "0h"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-400">
                            {row.horas_terceiros ? `${row.horas_terceiros}h` : "0h"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-200 font-semibold">
                            {totHorasRow > 0 ? `${totHorasRow}h` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-400">
                            {row.poli_entrada || 0}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-400 border-r border-white/10">
                            {row.poli_saida || 0}
                          </td>
                        </>
                      )}

                      {/* Capacidade */}
                      {viewMode === "completo" && (
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-300">
                          {row.capacidade?.toLocaleString("pt-BR") || 0}
                        </td>
                      )}

                      {/* Total Coletado */}
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {row.total_coletado?.toLocaleString("pt-BR") || 0}
                      </td>

                      {/* Produtividade (UPH) */}
                      <td className="py-2.5 px-3 text-right font-black text-amber-400 border-r border-white/10">
                        {row.produtividade || 0}
                      </td>

                      {/* Promessa */}
                      <td className={`py-2.5 px-3 text-right font-bold ${promessaColor}`}>
                        {promessaVal}%
                      </td>

                      {/* Lead Time */}
                      {viewMode === "completo" && (
                        <td className="py-2.5 px-3 text-right text-zinc-400">
                          {row.lead_time ? `${row.lead_time}d` : "0d"}
                        </td>
                      )}

                      {/* Aderência */}
                      <td className={`py-2.5 px-3 text-right font-bold border-r border-white/10 ${aderenciaColor}`}>
                        {aderenciaVal}%
                      </td>

                      {/* Nota COPIL */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black ${getGradeBadge(notaUph.grade)}`}>
                          {notaUph.grade} ({notaUph.scorePct}%)
                        </span>
                      </td>

                      {/* Ação: Excluir com Undo */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          id={`btn-delete-copil-${row.id || idx}`}
                          onClick={() => requestDelete(row.id, `Setor S${row.setor} (Sem ${row.semana})`)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10 cursor-pointer"
                          title="Excluir este registro com desfazer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* LINHA DE TOTAIS / CONSOLIDAÇÃO GERAL */}
              <tfoot>
                <tr className="bg-zinc-900/95 font-bold text-xs border-t-2 border-indigo-500/40 text-white font-mono">
                  {/* Totais: Setor e Semana */}
                  <td className="py-3 px-3 font-sans text-indigo-300 font-black border-r border-white/5 uppercase tracking-wider">
                    TOTAL / MÉDIA
                  </td>
                  <td className="py-3 px-3 text-center text-zinc-400 border-r border-white/10 text-[10px]">
                    {filteredData.length} registros
                  </td>

                  {/* Soma: Pilotagem e Vol Caiu */}
                  <td className="py-3 px-3 text-right text-white">
                    {totals.totalPilotagem.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {totals.totalVolCaiu.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 px-3 text-right text-sky-300 border-r border-white/10">
                    {totals.avgPercentual}%
                  </td>

                  {/* Soma: Recursos & Horas */}
                  {viewMode === "completo" && (
                    <>
                      <td className="py-3 px-3 text-right text-zinc-300">
                        {totals.totalHrsPlan > 0 ? `${totals.totalHrsPlan}h` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300">
                        {totals.totalHrsTerc > 0 ? `${totals.totalHrsTerc}h` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-white font-black">
                        {totals.totalHorasAll > 0 ? `${totals.totalHorasAll}h` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300">
                        {totals.totalPoliEntr}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300 border-r border-white/10">
                        {totals.totalPoliSai}
                      </td>
                    </>
                  )}

                  {/* Soma: Capacidade e Coletado */}
                  {viewMode === "completo" && (
                    <td className="py-3 px-3 text-right text-zinc-200">
                      {totals.totalCapacidade.toLocaleString("pt-BR")}
                    </td>
                  )}
                  <td className="py-3 px-3 text-right text-emerald-300 font-black">
                    {totals.totalColetado.toLocaleString("pt-BR")}
                  </td>

                  {/* UPH Média */}
                  <td className="py-3 px-3 text-right text-amber-300 font-black border-r border-white/10">
                    {totals.avgUph}
                  </td>

                  {/* Promessa Média */}
                  <td className="py-3 px-3 text-right text-emerald-300 font-black">
                    {totals.avgPromessa}%
                  </td>

                  {/* Lead Time Médio */}
                  {viewMode === "completo" && (
                    <td className="py-3 px-3 text-right text-zinc-300">
                      {totals.avgLeadTime}d
                    </td>
                  )}

                  {/* Aderência Média */}
                  <td className="py-3 px-3 text-right text-indigo-300 font-black border-r border-white/10">
                    {totals.avgAderencia}%
                  </td>

                  {/* Nota Geral Consolidada */}
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black ${getGradeBadge(totals.notaGeral.grade)}`}>
                      {totals.notaGeral.grade} ({totals.notaGeral.scorePct}%)
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* GRÁFICOS DE TENDÊNCIA E PERFORMANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: EVOLUÇÃO DE PRODUTIVIDADE (UPH) POR SEMANA */}
        <div className="glass-card p-5 border-l-2 border-indigo-500/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              Evolução de Produtividade (UPH) por Setor
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Histórico Semanal</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataUPH}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="semana" stroke="#666" style={{ fontSize: "10px" }} />
                <YAxis stroke="#666" style={{ fontSize: "10px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090d", borderColor: "#333", borderRadius: "8px" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                {availableSectors.map((st) => (
                  <Line
                    key={st}
                    type="monotone"
                    dataKey={`Setor ${st}`}
                    stroke={sectorColors[st] || "#a855f7"}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: PROMESSA VS META POR SETOR */}
        <div className="glass-card p-5 border-l-2 border-emerald-500/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Promessa de Entrega (%) por Setor
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Atingimento</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataPromessa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="setor" stroke="#666" style={{ fontSize: "10px" }} />
                <YAxis domain={[80, 100]} stroke="#666" style={{ fontSize: "10px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090d", borderColor: "#333", borderRadius: "8px" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Promessa" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Meta" fill="#333" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <DeleteUndoToast pending={pending} onUndo={undo} windowMs={windowMs} />
    </div>
  );
};

