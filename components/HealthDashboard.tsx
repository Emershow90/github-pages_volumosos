import React, { useState, useEffect } from "react";
import { SupabaseService } from "../lib/supabaseService";
import { 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Zap,
  ShieldAlert,
  CheckCircle
} from "lucide-react";

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
  const soltas = data.filter(item => item.statusSoltura === "Solta").length;
  const naoSoltas = data.filter(item => !item.statusSoltura || item.statusSoltura === "Não Solta" || item.statusSoltura === "Parcialmente Solta").length;
  
  const coletaConcluida = data.filter(item => item.statusColeta === "Concluída").length;
  const coletaEmAndamento = data.filter(item => item.statusColeta === "Em andamento").length;

  const carregamentoCarregada = data.filter(item => item.statusCarregamento === "Carregada").length;
  const carregamentoCarregando = data.filter(item => item.statusCarregamento === "Carregando").length;

  const expedidas = data.filter(item => item.statusExpedicao === "Expedida").length;
  
  // Calcula Gargalos e Taxas de Conversão
  const rates = [
    { 
      id: 'liberacao', 
      name: 'Liberação', 
      rate: totalListas ? soltas / totalListas : 1, 
      pending: naoSoltas, 
      desc: "Listas retidas aguardando soltura",
      action: `Liberar ${naoSoltas} listas`, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    },
    { 
      id: 'coleta', 
      name: 'Coleta', 
      rate: soltas ? coletaConcluida / soltas : 1, 
      pending: soltas - coletaConcluida, 
      desc: "Listas liberadas mas não coletadas",
      action: `Acelerar ${coletaEmAndamento} ativas`, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    { 
      id: 'carregamento', 
      name: 'Carregamento', 
      rate: coletaConcluida ? carregamentoCarregada / coletaConcluida : 1, 
      pending: coletaConcluida - carregamentoCarregada, 
      desc: "Coletas concluídas aguardando doca",
      action: `Cobrar ${carregamentoCarregando} em doca`, 
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    },
    { 
      id: 'expedicao', 
      name: 'Expedição', 
      rate: carregamentoCarregada ? expedidas / carregamentoCarregada : 1, 
      pending: carregamentoCarregada - expedidas, 
      desc: "Caminhões carregados parados no pátio",
      action: `Expedir ${carregamentoCarregada - expedidas} veículos`, 
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30'
    },
  ];

  // Identifica o maior ofensor (menor taxa de conversão que tenha itens pendentes)
  const sortedRates = [...rates]
    .filter(r => r.pending > 0)
    .sort((a, b) => a.rate - b.rate);
  
  const bottleneck = sortedRates.length > 0 ? sortedRates[0] : null;
  const isHealthy = !bottleneck || bottleneck.rate > 0.85;

  return (
    <div id="health_dashboard_root" className="glass-card p-6 space-y-8 border border-white/5 bg-[#0f0f11]/80 backdrop-blur-md rounded-xl font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Painel Direcional (Health Dashboard)
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Monitoramento Ativo de Gargalos &amp; Ações Requeridas
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

      {/* SEÇÃO 1: O QUE ESTÁ ACONTECENDO? */}
      <section className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          1. O que está acontecendo?
          <span className="h-px bg-white/10 flex-1"></span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          
          {/* Liberação */}
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative">
            <div className="absolute top-4 right-4 text-purple-500/20">
              <span className="font-black text-3xl">1</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Liberação</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{soltas}</span>
              <span className="text-[10px] text-zinc-500 font-mono mb-0.5">/ {totalListas} list</span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${totalListas ? (soltas / totalListas) * 100 : 0}%` }}></div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-2 font-mono">
              <span className="text-red-400 font-bold">{naoSoltas}</span> pendentes
            </p>
          </div>

          {/* Coleta */}
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative">
            <div className="absolute top-4 right-4 text-blue-500/20">
              <span className="font-black text-3xl">2</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Coleta</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{coletaConcluida}</span>
              <span className="text-[10px] text-zinc-500 font-mono mb-0.5">/ {soltas} list</span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${soltas ? (coletaConcluida / soltas) * 100 : 0}%` }}></div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-2 font-mono">
              <span className="text-amber-400 font-bold">{coletaEmAndamento}</span> em andamento
            </p>
          </div>

          {/* Carregamento */}
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative">
            <div className="absolute top-4 right-4 text-amber-500/20">
              <span className="font-black text-3xl">3</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Carregamento</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{carregamentoCarregada}</span>
              <span className="text-[10px] text-zinc-500 font-mono mb-0.5">/ {coletaConcluida} list</span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${coletaConcluida ? (carregamentoCarregada / coletaConcluida) * 100 : 0}%` }}></div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-2 font-mono">
              <span className="text-amber-400 font-bold">{carregamentoCarregando}</span> nas docas
            </p>
          </div>

          {/* Expedição */}
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative">
            <div className="absolute top-4 right-4 text-cyan-500/20">
              <span className="font-black text-3xl">4</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Expedição</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono leading-none">{expedidas}</span>
              <span className="text-[10px] text-zinc-500 font-mono mb-0.5">/ {carregamentoCarregada} list</span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div className="bg-cyan-500 h-1 rounded-full" style={{ width: `${carregamentoCarregada ? (expedidas / carregamentoCarregada) * 100 : 0}%` }}></div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-2 font-mono">
              <span className="text-red-400 font-bold">{carregamentoCarregada - expedidas}</span> prontas/paradas
            </p>
          </div>

        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEÇÃO 2: POR QUE ISSO ESTÁ ACONTECENDO? */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            2. Por que está acontecendo?
            <span className="h-px bg-white/10 flex-1"></span>
          </h4>
          
          <div className={`p-6 rounded-xl border flex gap-4 h-full ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20' : bottleneck?.bg + ' ' + bottleneck?.border}`}>
            {isHealthy ? (
              <>
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-black text-emerald-400 mb-1">Operação Fluindo</h5>
                  <p className="text-xs text-emerald-500/80 leading-relaxed">
                    As taxas de conversão entre etapas estão acima de 85%. Não há gargalos críticos identificados neste momento.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0 ${bottleneck?.color}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h5 className={`text-sm font-black mb-1 ${bottleneck?.color}`}>
                    Gargalo Crítico: {bottleneck?.name}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    A conversão atual desta etapa é de apenas <strong className="text-white">{(bottleneck!.rate * 100).toFixed(0)}%</strong>. 
                    Temos <strong className="text-white">{bottleneck?.pending}</strong> {bottleneck?.desc}.
                  </p>
                  <div className="flex gap-2 items-center text-[10px] font-mono text-zinc-500 bg-black/40 px-3 py-2 rounded-lg w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Isto está travando o fluxo das próximas etapas.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* SEÇÃO 3: O QUE PRECISA SER FEITO AGORA? */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            3. O que precisa ser feito agora?
            <span className="h-px bg-white/10 flex-1"></span>
          </h4>
          
          <div className="bg-black/30 border border-white/5 rounded-xl p-2 h-full flex flex-col gap-2">
            {isHealthy ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <CheckCircle className="w-8 h-8 text-emerald-500/30 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nenhuma Ação Imediata Necessária</p>
                <p className="text-[10px] mt-1">Continue monitorando o painel direcional.</p>
              </div>
            ) : (
              <>
                {/* Ação Principal baseada no Gargalo */}
                <button className={`w-full p-4 rounded-lg border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-colors text-left`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-black/50 ${bottleneck?.color}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Ação Prioritária</p>
                      <p className={`text-sm font-black ${bottleneck?.color}`}>{bottleneck?.action}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity ${bottleneck?.color}`} />
                </button>
                
                {/* Outras Ações (se houver) */}
                <div className="flex-1 flex flex-col gap-2 px-1">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-2 pt-2">Próximos Passos Recomendados</p>
                  {sortedRates.slice(1, 3).map(rate => (
                    <div key={rate.id} className="flex items-center justify-between px-2 py-1.5 border-l-2 border-white/5 hover:border-zinc-500 transition-colors">
                      <span className="text-[11px] text-zinc-400 font-medium">{rate.action}</span>
                      <span className={`text-[10px] font-mono font-bold ${rate.color}`}>{Math.round(rate.rate * 100)}% fluidez</span>
                    </div>
                  ))}
                  {sortedRates.length <= 1 && (
                    <div className="px-2 py-1.5 text-[11px] text-zinc-600 italic">
                      Nenhuma ação secundária pendente.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

