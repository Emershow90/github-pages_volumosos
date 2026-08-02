import React, { useState, useEffect } from "react";
import { supabase, isStaticBuild } from "../lib/supabase";
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Layers, 
  Server, 
  FileText 
} from "lucide-react";
import { motion } from "motion/react";

interface HealthItem {
  name: string;
  type: "table" | "view";
  description: string;
  count: number | null;
  status: "healthy" | "warning" | "error" | "offline";
  errorDetails?: string;
}

export const SupabaseHealthPanel: React.FC = () => {
  const [items, setItems] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    if (isStaticBuild || !supabase) {
      // Modo Estático (Mock)
      const mockItems: HealthItem[] = [
        { name: "usuarios", type: "table", description: "Perfis de usuários do sistema e controle de acesso (RBAC)", count: 6, status: "offline" },
        { name: "setores", type: "table", description: "Setores operacionais e suas respectivas metas e métricas", count: 4, status: "offline" },
        { name: "colaboradores", type: "table", description: "Cadastro e dados de produtividade dos operadores", count: 17, status: "offline" },
        { name: "store_master", type: "table", description: "Cadastro mestre de lojas parceiras e transportadoras", count: 6, status: "offline" },
        { name: "store_operations", type: "table", description: "Operações ativas de expedição e carregamento por loja", count: 12, status: "offline" },
        { name: "lista_coleta", type: "table", description: "Listas de picking importadas para o fluxo diário", count: 32, status: "offline" },
        { name: "radar_lojas_status", type: "table", description: "Estados detalhados de soltura, coleta e expedição", count: 32, status: "offline" },
        { name: "atividade_loja", type: "table", description: "Histórico e volume de atividades por loja", count: 8, status: "offline" },
        { name: "escalas", type: "table", description: "Planejamento semanal de turnos para os colaboradores", count: 45, status: "offline" },
        { name: "view_radar_completo", type: "view", description: "Relatório consolidado de listas de coleta e status", count: 32, status: "offline" },
        { name: "view_colaboradores_setor", type: "view", description: "Visão quantitativa de equipe operacional por setor", count: 4, status: "offline" },
      ];
      setItems(mockItems);
      setLastChecked(new Date().toLocaleTimeString("pt-BR"));
      return;
    }

    setLoading(true);
    setGlobalError(null);

    const checkEntity = async (name: string, type: "table" | "view", description: string): Promise<HealthItem> => {
      try {
        // Query utilizing count parameter which is standard and performs count directly via head request
        const { count, error } = await supabase!
          .from(name)
          .select("*", { count: "exact", head: true });

        if (error) {
          // Fallback query (select limited rows to see if we can read length)
          const { data: fallbackData, error: fallbackError } = await supabase!
            .from(name)
            .select("*")
            .limit(1);

          if (fallbackError) {
            return {
              name,
              type,
              description,
              count: null,
              status: "error",
              errorDetails: fallbackError.message
            };
          }

          // Se funcionou o fallback mas sem count exato, buscamos tamanho dos dados ou retornamos 0
          return {
            name,
            type,
            description,
            count: fallbackData ? fallbackData.length : 0,
            status: "healthy"
          };
        }

        return {
          name,
          type,
          description,
          count: count !== null ? count : 0,
          status: "healthy"
        };
      } catch (err: any) {
        return {
          name,
          type,
          description,
          count: null,
          status: "error",
          errorDetails: err.message || String(err)
        };
      }
    };

    try {
      const results = await Promise.all([
        checkEntity("usuarios", "table", "Perfis de usuários do sistema e controle de acesso (RBAC)"),
        checkEntity("setores", "table", "Setores operacionais e suas respectivas metas e métricas"),
        checkEntity("colaboradores", "table", "Cadastro e dados de produtividade dos operadores"),
        checkEntity("store_master", "table", "Cadastro mestre de lojas parceiras e transportadoras"),
        checkEntity("store_operations", "table", "Operações ativas de expedição e carregamento por loja"),
        checkEntity("lista_coleta", "table", "Listas de picking importadas para o fluxo diário"),
        checkEntity("radar_lojas_status", "table", "Estados detalhados de soltura, coleta e expedição"),
        checkEntity("atividade_loja", "table", "Histórico e volume de atividades por loja"),
        checkEntity("escalas", "table", "Planejamento semanal de turnos para os colaboradores"),
        checkEntity("view_radar_completo", "view", "Relatório consolidado de listas de coleta e status"),
        checkEntity("view_colaboradores_setor", "view", "Visão quantitativa de equipe operacional por setor")
      ]);

      setItems(results);
    } catch (err: any) {
      setGlobalError(err.message || "Erro desconhecido ao obter integridade das tabelas.");
    } finally {
      setLastChecked(new Date().toLocaleTimeString("pt-BR"));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const healthyCount = items.filter(i => i.status === "healthy" || i.status === "offline").length;
  const totalCount = items.length;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Painel de Saúde do Supabase
            </h3>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            Métricas de volumetria e status de integridade das tabelas operacionais e views relacionais
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Ref: {lastChecked || "--:--:--"}</span>
          </div>

          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg border border-indigo-500/30 cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Verificando..." : "Atualizar"}</span>
          </button>
        </div>
      </div>

      {/* Visão de Resumo de Saúde */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/40 rounded-lg border border-indigo-500/20">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Status de Conexão</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
              {isStaticBuild ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                  <span className="text-zinc-400 font-mono">ESTÁTICO (MOCK)</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <span className="text-emerald-400 font-mono">SUPABASE ONLINE</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/40 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Integridade de Objetos</div>
            <div className="text-xs font-bold text-white mt-0.5">
              {loading ? (
                <span className="text-zinc-400 font-mono">Carregando...</span>
              ) : (
                <span className={healthyCount === totalCount ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                  {healthyCount} de {totalCount} OK
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/40 rounded-lg border border-amber-500/20">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Esquema do Banco</div>
            <div className="text-xs font-bold text-zinc-300 font-mono mt-0.5">
              9 Tabelas • 2 Views
            </div>
          </div>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Lista de Tabelas/Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => {
          const isError = item.status === "error";
          const isView = item.type === "view";
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className={`p-3.5 rounded-xl border transition-all ${
                isError 
                  ? "bg-red-950/10 border-red-500/20 hover:border-red-500/40 shadow-[0_4px_12px_rgba(239,68,68,0.05)]" 
                  : "bg-black/40 border-white/5 hover:border-indigo-500/20"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                    isView 
                      ? "bg-sky-950 text-sky-400 border border-sky-800/30" 
                      : "bg-indigo-950 text-indigo-400 border border-indigo-800/30"
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-xs font-black text-white font-mono">{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  {item.status === "healthy" ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                  ) : item.status === "offline" ? (
                    <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  )}
                  <span className={`text-[10px] font-bold ${
                    isError ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {item.status === "healthy" ? "OK" : item.status === "offline" ? "Off-line" : "Aviso"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed h-[32px] overflow-hidden line-clamp-2">
                {item.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-600">Volumetria</span>
                <span className={`font-bold ${isError ? "text-red-400" : "text-white"}`}>
                  {isError ? (
                    <span className="flex items-center gap-1 text-[9px] text-rose-400" title={item.errorDetails}>
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      Falha na Consulta
                    </span>
                  ) : item.count !== null ? (
                    `${item.count.toLocaleString("pt-BR")} registros`
                  ) : (
                    "--"
                  )}
                </span>
              </div>

              {isError && item.errorDetails && (
                <div className="mt-2 bg-red-950/20 border border-red-500/10 rounded-lg p-2 text-[9px] font-mono text-red-400/90 leading-tight select-all max-h-[60px] overflow-y-auto custom-scrollbar">
                  {item.errorDetails}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
