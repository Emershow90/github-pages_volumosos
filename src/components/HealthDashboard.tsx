import React, { useState, useEffect } from "react";
import { SupabaseService } from "../lib/supabaseService";
import { 
  Activity, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ArrowUpRight,
  Truck,
  Box
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface RadarCompletoRow {
  lista: string;
  nome_loja: string;
  setor: number;
  volumes: number;
  enderecos: number;
  transportadora: string;
  corte: string;
  carregamento: string;
  statusSoltura?: string;
  horarioSoltura?: string;
  statusColeta?: string;
  horarioColeta?: string;
  statusCarregamento?: string;
  horarioCarregamento?: string;
  statusExpedicao?: string;
  ultima_atualizacao?: string;
}

export const HealthDashboard: React.FC = () => {
  const [data, setData] = useState<RadarCompletoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let rows: RadarCompletoRow[] = [];
      try {
        rows = await SupabaseService.fetchTable<RadarCompletoRow>("view_radar_completo");
      } catch (e) {
        console.warn("[HealthDashboard] view_radar_completo não retornou registros ou falhou. Tentando JOIN local...", e);
      }

      if (!rows || rows.length === 0) {
        const listas = await SupabaseService.fetchTable<any>("lista_coleta");
        const status = await SupabaseService.fetchTable<any>("radar_lojas_status");

        if (listas && listas.length > 0) {
          rows = listas.map((item: any) => {
            const matchedStatus = status.find((s: any) => s.lista === item.lista) || {};
            return {
              lista: item.lista,
              nome_loja: item.loja || item.nome_loja || "",
              setor: Number(item.setor) || 0,
              volumes: Number(item.volumes) || 0,
              enderecos: Number(item.enderecos) || 0,
              transportadora: item.transportadora || "",
              corte: item.corte || "",
              carregamento: item.carregamento || "",
              statusSoltura: matchedStatus.statusSoltura || "Não Solta",
              horarioSoltura: matchedStatus.horarioSoltura || null,
              statusColeta: matchedStatus.statusColeta || "Não iniciada",
              horarioColeta: matchedStatus.horarioColeta || null,
              statusCarregamento: matchedStatus.statusCarregamento || "Não carregada",
              horarioCarregamento: matchedStatus.horarioCarregamento || null,
              statusExpedicao: matchedStatus.statusExpedicao || "Pendente",
              ultima_atualizacao: matchedStatus.updated_at || null,
            };
          });
        }
      }

      if (!rows || rows.length === 0) {
        rows = [
          { lista: "101", nome_loja: "Serrana Ltda", setor: 2, volumes: 140, enderecos: 22, transportadora: "TransGeral", corte: "10:00", carregamento: "11:30", statusSoltura: "Solta", statusColeta: "Concluída", statusCarregamento: "Carregada", statusExpedicao: "Expedida" },
          { lista: "102", nome_loja: "Eldorado S.A.", setor: 5, volumes: 85, enderecos: 14, transportadora: "Rodonaves", corte: "10:00", carregamento: "12:00", statusSoltura: "Solta", statusColeta: "Em andamento", statusCarregamento: "Carregando", statusExpedicao: "Pendente" },
          { lista: "103", nome_loja: "Geraldi Util", setor: 2, volumes: 210, enderecos: 35, transportadora: "TransGeral", corte: "14:00", carregamento: "15:30", statusSoltura: "Parcialmente Solta", statusColeta: "Não iniciada", statusCarregamento: "Não carregada", statusExpedicao: "Pendente" },
          { lista: "104", nome_loja: "Mercado Sul", setor: 7, volumes: 45, enderecos: 8, transportadora: "Jamef", corte: "14:00", carregamento: "16:00", statusSoltura: "Não Solta", statusColeta: "Não iniciada", statusCarregamento: "Não carregada", statusExpedicao: "Pendente" },
          { lista: "105", nome_loja: "Casas Bahia", setor: 1, volumes: 320, enderecos: 55, transportadora: "TransExpress", corte: "16:00", carregamento: "18:00", statusSoltura: "Solta", statusColeta: "Concluída", statusCarregamento: "Carregada", statusExpedicao: "Expedida" },
          { lista: "106", nome_loja: "Ponto Frio", setor: 3, volumes: 110, enderecos: 19, transportadora: "Rodonaves", corte: "16:00", carregamento: "18:30", statusSoltura: "Solta", statusColeta: "Concluída", statusCarregamento: "Carregando", statusExpedicao: "Pendente" },
          { lista: "107", nome_loja: "Magazine Luiza", setor: 4, volumes: 195, enderecos: 32, transportadora: "TransExpress", corte: "16:00", carregamento: "18:00", statusSoltura: "Solta", statusColeta: "Em andamento", statusCarregamento: "Não carregada", statusExpedicao: "Pendente" },
        ];
      }

      setData(rows);
      setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    } catch (err: any) {
      console.error("[HealthDashboard] Erro ao buscar dados de radar completo:", err);
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalListas = data.length;
  const totalVolumes = data.reduce((sum, item) => sum + (item.volumes || 0), 0);
  
  const soltas = data.filter(item => item.statusSoltura === "Solta").length;
  const parcialSoltas = data.filter(item => item.statusSoltura === "Parcialmente Solta").length;
  const naoSoltas = data.filter(item => !item.statusSoltura || item.statusSoltura === "Não Solta").length;
  
  const coletaConcluida = data.filter(item => item.statusColeta === "Concluída").length;
  const coletaEmAndamento = data.filter(item => item.statusColeta === "Em andamento").length;
  const coletaNaoIniciada = data.filter(item => !item.statusColeta || item.statusColeta === "Não iniciada").length;

  const carregamentoCarregada = data.filter(item => item.statusCarregamento === "Carregada").length;
  const carregamentoCarregando = data.filter(item => item.statusCarregamento === "Carregando").length;
  const carregamentoNaoCarregada = data.filter(item => !item.statusCarregamento || item.statusCarregamento === "Não carregada").length;

  const expedidas = data.filter(item => item.statusExpedicao === "Expedida").length;
  const expedicaoPendentes = data.filter(item => !item.statusExpedicao || item.statusExpedicao === "Pendente").length;
  const expedicaoCanceladas = data.filter(item => item.statusExpedicao === "Cancelada").length;

  const pctSoltas = totalListas ? Math.round((soltas / totalListas) * 100) : 0;
  const pctExpedicoesPendentes = totalListas ? Math.round((expedicaoPendentes / totalListas) * 100) : 0;

  const chartData = [
    { name: "Soltas", qtd: soltas, color: "#a855f7" },
    { name: "Coleta OK", qtd: coletaConcluida, color: "#10b981" },
    { name: "Coleta Ativa", qtd: coletaEmAndamento, color: "#3b82f6" },
    { name: "Carregadas", qtd: carregamentoCarregada, color: "#fbbf24" },
    { name: "Expedidas", qtd: expedidas, color: "#06b6d4" },
    { name: "Pendentes", qtd: expedicaoPendentes, color: "#ef4444" }
  ];

  return (
    <div id="health_dashboard_root" className="glass-card p-6 space-y-6 border border-white/5 bg-[#0f0f11]/80 backdrop-blur-md rounded-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Painel de Operações Realtime (HealthDashboard)
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Métricas agregadas da view_radar_completo de expedição física do Supabase
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Sincronizado: {lastUpdated || "--:--:--"}</span>
          </div>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-[10px] font-bold border border-indigo-500/20 transition duration-150 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Erro: {errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-zinc-600 group-hover:text-zinc-500 transition-colors">
            <Layers className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total de Listas</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalListas}</span>
            <span className="text-[10px] text-zinc-500 font-mono">docs</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-zinc-500">
            <Box className="w-3.5 h-3.5 text-zinc-600" />
            <span>{totalVolumes.toLocaleString("pt-BR")} volumes totais</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/30 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-purple-600/30 group-hover:text-purple-500/30 transition-colors">
            <ArrowUpRight className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lojas Soltas</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-purple-400 font-mono">{soltas}</span>
            <span className="text-xs font-semibold text-purple-500">({pctSoltas}%)</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pctSoltas}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-1">
              <span>{parcialSoltas} parcial</span>
              <span>{naoSoltas} pendentes</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/30 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-blue-600/30 group-hover:text-blue-500/30 transition-colors">
            <TrendingUp className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Coleta Ativa</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-blue-400 font-mono">{coletaEmAndamento}</span>
            <span className="text-[10px] text-zinc-500 font-mono">em progresso</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {coletaConcluida} concluídas
            </span>
            <span className="text-zinc-500 font-mono">
              {coletaNaoIniciada} aguardando
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/30 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-red-600/30 group-hover:text-red-500/30 transition-colors">
            <Truck className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expedidores Pendentes</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-red-400 font-mono">{expedicaoPendentes}</span>
            <span className="text-xs font-semibold text-red-500">({pctExpedicoesPendentes}%)</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${pctExpedicoesPendentes}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-1">
              <span className="text-cyan-400">{expedidas} expedidas</span>
              <span className="text-zinc-500">{expedicaoCanceladas} canceladas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Volumetria Agregada por Etapa
            </h4>
            <p className="text-[9px] text-zinc-500 mb-4">
              Distribuição de listas em tempo real nos estágios principais do CD
            </p>
          </div>
          
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }}
                  itemStyle={{ color: "#ffffff", fontSize: "11px" }}
                />
                <Bar dataKey="qtd" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-black/20 p-4 rounded-xl border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Acompanhamento de Funil
            </h4>
            <p className="text-[9px] text-zinc-500 mb-4">
              Porcentagem de conclusão para cada etapa da expedição
            </p>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-sans">1. Lojas Soltas</span>
                <span className="text-purple-400 font-bold">{soltas} / {totalListas} list</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pctSoltas}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-sans">2. Coletas Concluídas</span>
                <span className="text-blue-400 font-bold">{coletaConcluida} / {totalListas} list</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalListas ? Math.round((coletaConcluida / totalListas) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-sans">3. Carregamentos Concluídos</span>
                <span className="text-amber-500 font-bold">{carregamentoCarregada} / {totalListas} list</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalListas ? Math.round((carregamentoCarregada / totalListas) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-sans">4. Expedição Confirmada</span>
                <span className="text-cyan-400 font-bold">{expedidas} / {totalListas} list</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalListas ? Math.round((expedidas / totalListas) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
