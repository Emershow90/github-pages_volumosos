import React, { useState, useMemo } from "react";
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
  Activity,
  CheckCircle2,
  Layers,
  Clock,
  Target,
} from "lucide-react";

interface CopilTabProps {
  setores: Setor[];
  currentRole: UserRole | string | null;
  activeSectorId: string;
  setActiveSectorId: (sid: string) => void;
}

export const CopilTab: React.FC<CopilTabProps> = ({
  setores,
  activeSectorId,
  setActiveSectorId,
}) => {
  const { metrics: matrizData, loading: isLoading, summaryStats, refetch } = useCopilMetrics();

  const [selectedSector, setSelectedSector] = useState<string>(activeSectorId || "todos");
  const [selectedSemana, setSelectedSemana] = useState<number>(0); // 0 = Todas as Semanas
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Sincronização manual com a planilha da Controladoria
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback("Iniciando sincronização com Controladoria...");
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

  // Filtragem dos dados conforme setor e semana
  const filteredData = useMemo(() => {
    return matrizData.filter((item) => {
      const matchSetor = selectedSector === "todos" || String(item.setor) === String(selectedSector);
      const matchSemana = selectedSemana === 0 || Number(item.semana) === Number(selectedSemana);
      return matchSetor && matchSemana;
    });
  }, [matrizData, selectedSector, selectedSemana]);

  // Cálculo da Nota COPIL de Atingimento
  const calculateNota = (real: number, meta: number, isLowerBetter: boolean = false): { grade: 'A' | 'B' | 'C' | 'D'; scorePct: number } => {
    if (!meta || meta === 0) return { grade: 'B', scorePct: 100 };
    const pct = isLowerBetter ? (meta / real) * 100 : (real / meta) * 100;

    if (pct >= 100) return { grade: 'A', scorePct: Math.round(pct) };
    if (pct >= 90) return { grade: 'B', scorePct: Math.round(pct) };
    if (pct >= 80) return { grade: 'C', scorePct: Math.round(pct) };
    return { grade: 'D', scorePct: Math.round(pct) };
  };

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
    let csv = "Setor;Semana;Ano;Pilotagem;Vol Caiu;% Caiu;Horas Plan;Horas Terc;Poli Entrada;Poli Saida;Capacidade;Total Coletado;Produtividade (UPH);Promessa (%);Lead Time;Aderencia (%)\n";
    filteredData.forEach((row) => {
      csv += `${row.setor};${row.semana};${row.ano};${row.pilotagem};${row.volume_que_caiu};${row.percentual};${row.horas_planning};${row.horas_terceiros};${row.poli_entrada};${row.poli_saida};${row.capacidade};${row.total_coletado};${row.produtividade};${row.promessa};${row.lead_time};${row.aderencia}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `relatorio_COPIL_S${selectedSector}_semana${selectedSemana}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER & PAINEL DE CONTROLE */}
      <div className="glass-card p-6 border-l-2 border-indigo-500/50 bg-[#07070a]/98">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="text-indigo-400" size={22} />
              COPIL — Comitê Operacional e Matriz de Performance
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Indicadores consolidados integrados diretamente da planilha da Controladoria - Volumosos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {syncFeedback && (
              <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg animate-pulse">
                {syncFeedback}
              </span>
            )}
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
            >
              <Download size={14} />
              Exportar Relatório
            </button>
          </div>
        </div>

        {/* FAIXA DE RESUMO EXECUTIVO (KPIS) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Total Pilotado</span>
            <span className="text-lg font-black text-white font-mono">{summaryStats.totalPilotagem.toLocaleString('pt-BR')}</span>
            <span className="text-[9px] text-zinc-500 block">Volume do Período</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Total Coletado</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{summaryStats.totalColetado.toLocaleString('pt-BR')}</span>
            <span className="text-[9px] text-zinc-500 block">Processado</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">UPH Média</span>
            <span className="text-lg font-black text-amber-400 font-mono">{summaryStats.avgUph}</span>
            <span className="text-[9px] text-zinc-500 block">Unidades/Hora</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Promessa Média</span>
            <span className="text-lg font-black text-sky-400 font-mono">{summaryStats.avgPromessa}%</span>
            <span className="text-[9px] text-zinc-500 block">Meta 98%</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl col-span-2 md:col-span-1">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Aderência Média</span>
            <span className="text-lg font-black text-purple-400 font-mono">{summaryStats.avgAderencia}%</span>
            <span className="text-[9px] text-zinc-500 block">Conformidade BSI</span>
          </div>
        </div>

        {/* BARRA DE FILTROS DINÂMICOS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-black/40 p-4 rounded-xl border border-white/5">
          <div className="md:col-span-5 flex items-center gap-3">
            <Filter size={16} className="text-indigo-400" />
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300">Setor:</label>
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                if (e.target.value !== "todos") setActiveSectorId(e.target.value);
              }}
              className="inp text-xs py-1.5 font-bold text-indigo-300 flex-1"
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

          <div className="md:col-span-4 flex items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300">Semana Operacional:</label>
            <select
              value={selectedSemana}
              onChange={(e) => setSelectedSemana(Number(e.target.value))}
              className="inp text-xs py-1.5 font-bold text-sky-300 flex-1"
            >
              <option value={0}>Todas as Semanas</option>
              {Array.from({ length: 27 }, (_, i) => 27 + i).map((sem) => (
                <option key={sem} value={sem}>
                  Semana {sem} / 2026
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 text-right text-xs font-mono text-zinc-400">
            Exibindo <span className="text-indigo-400 font-bold">{filteredData.length}</span> registro(s)
          </div>
        </div>
      </div>

      {/* MATRIZ DE INDICADORES (COMP X REAL) */}
      <div className="glass-card p-6 border-l-2 border-indigo-500/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-400" size={18} />
            Matriz de Performance por Setor e Semana (Comp x Real)
          </h3>
          <span className="text-[10px] text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full uppercase font-mono">
            Sincronização Ativa (Realtime)
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 font-mono text-xs animate-pulse">
            Carregando indicadores da Matriz COPIL...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-black/30 border border-white/5 p-8 rounded-xl text-center text-zinc-400">
            <AlertTriangle className="mx-auto text-amber-400 mb-2" size={28} />
            <p className="text-xs font-bold uppercase tracking-wider">Nenhum dado encontrado para o filtro selecionado.</p>
            <p className="text-[10px] text-zinc-500 mt-1">Clique em "Sincronizar Planilha" para importar a matriz da Controladoria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-3">Setor / Sem</th>
                  <th className="py-3 px-3 text-right">Pilotagem</th>
                  <th className="py-3 px-3 text-right">Vol Caiu</th>
                  <th className="py-3 px-3 text-right">% Caiu/Pil</th>
                  <th className="py-3 px-3 text-right">Hrs Plan</th>
                  <th className="py-3 px-3 text-right">Hrs Terc</th>
                  <th className="py-3 px-3 text-right">Poli Entr</th>
                  <th className="py-3 px-3 text-right">Poli Saí</th>
                  <th className="py-3 px-3 text-right">Capacidade</th>
                  <th className="py-3 px-3 text-right">Total Colet.</th>
                  <th className="py-3 px-3 text-right">Prod (UPH)</th>
                  <th className="py-3 px-3 text-right">Promessa (%)</th>
                  <th className="py-3 px-3 text-right">Lead Time</th>
                  <th className="py-3 px-3 text-right">Aderência</th>
                  <th className="py-3 px-3 text-center">Nota COPIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredData.map((row) => {
                  const targetUph = row.capacidade && row.capacidade > 0 ? Math.round(row.capacidade / 8) : 500;
                  const notaUph = calculateNota(row.produtividade || 0, targetUph);
                  const getGradeBadge = (grade: string) => {
                    switch (grade) {
                      case 'A': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                      case 'B': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                      case 'C': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
                      default: return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                    }
                  };

                  return (
                    <tr key={row.id || `${row.setor}_${row.semana}`} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-bold text-indigo-400 font-sans">
                        S{row.setor} <span className="text-[10px] text-zinc-500 font-mono">(Sem {row.semana})</span>
                      </td>
                      <td className="py-3 px-3 text-right">{row.pilotagem?.toLocaleString("pt-BR") || 0}</td>
                      <td className="py-3 px-3 text-right">{row.volume_que_caiu?.toLocaleString("pt-BR") || 0}</td>
                      <td className="py-3 px-3 text-right text-sky-400">{row.percentual || 100}%</td>
                      <td className="py-3 px-3 text-right">{row.horas_planning || 0}h</td>
                      <td className="py-3 px-3 text-right">{row.horas_terceiros || 0}h</td>
                      <td className="py-3 px-3 text-right">{row.poli_entrada || 0}</td>
                      <td className="py-3 px-3 text-right">{row.poli_saida || 0}</td>
                      <td className="py-3 px-3 text-right font-bold">{row.capacidade?.toLocaleString("pt-BR") || 0}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">{row.total_coletado?.toLocaleString("pt-BR") || 0}</td>
                      <td className="py-3 px-3 text-right font-black text-amber-400">{row.produtividade || 0}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">{row.promessa || 0}%</td>
                      <td className="py-3 px-3 text-right">{row.lead_time || 0}d</td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-300">{row.aderencia || 0}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black ${getGradeBadge(notaUph.grade)}`}>
                          Nota {notaUph.grade} ({notaUph.scorePct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
    </div>
  );
};
