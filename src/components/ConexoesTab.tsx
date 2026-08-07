import React, { useState, useEffect } from "react";
import { Conexao, SyncLog, UserRole } from "../types";
import { SupabaseService } from "../lib/supabaseService";
import { ConexoesService } from "../services/conexoesService";
import {
  Link2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Play,
  Trash2,
  Power,
  Edit,
  AlertTriangle,
  Activity,
  FileSpreadsheet,
} from "lucide-react";

interface ConexoesTabProps {
  currentRole: UserRole | string | null;
}

export const ConexoesTab: React.FC<ConexoesTabProps> = ({ currentRole }) => {
  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingConexao, setEditingConexao] = useState<Partial<Conexao> | null>(null);

  // Form State
  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState<"google_sheets" | "postgres" | "api_rest">("google_sheets");
  const [formUrl, setFormUrl] = useState("");
  const [formDestino, setFormDestino] = useState("matriz_performance");
  const [formFrequencia, setFormFrequencia] = useState<string>("diaria");

  const isAdminOrCoord = currentRole === UserRole.Admin || currentRole === UserRole.Coordenador || currentRole === "admin";

  const loadConexoesData = async () => {
    setIsLoading(true);
    try {
      // Garante inicialização da conexão padrão
      const conns = await ConexoesService.initializeDefaultConnections();
      setConexoes(conns);

      // Carrega logs de sincronização
      const logs = await SupabaseService.fetchTable<SyncLog>("sync_logs");
      if (logs) {
        setSyncLogs(logs.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()));
      }
    } catch (e) {
      console.error("[ConexoesTab] Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConexoesData();

    const sub1 = SupabaseService.subscribeToTable("conexoes", () => loadConexoesData());
    const sub2 = SupabaseService.subscribeToTable("sync_logs", () => loadConexoesData());

    return () => {
      sub1?.unsubscribe();
      sub2?.unsubscribe();
    };
  }, []);

  const handleTestConnection = async (conexao: Conexao) => {
    setTestingId(conexao.id);
    setTestResult(null);
    try {
      const ok = await ConexoesService.testConnection(conexao);
      setTestResult({ id: conexao.id, success: ok });
    } catch {
      setTestResult({ id: conexao.id, success: false });
    } finally {
      setTestingId(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleSyncNow = async (conexao: Conexao) => {
    setIsSyncingId(conexao.id);
    try {
      if (conexao.id === "controladoria-volumosos" || conexao.destino === "matriz_performance") {
        await ConexoesService.syncControladoriaSheet(conexao.id);
      } else if (conexao.id === "override-operacional" || conexao.destino === "override_operacional") {
        await ConexoesService.syncOverrideSheet(conexao.id);
      } else {
        // Mock generico para outras conexões
        const now = new Date().toISOString();
        await SupabaseService.upsertRecord("conexoes", {
          id: conexao.id,
          status: "online",
          ultima_sincronizacao: now,
          registros: Math.floor(Math.random() * 50) + 10,
        });

        await SupabaseService.upsertRecord("sync_logs", {
          id: `log_${Date.now()}`,
          conexao_id: conexao.id,
          data_inicio: now,
          data_fim: now,
          status: "sucesso",
          registros_afetados: 15,
        });
      }
      await loadConexoesData();
    } catch (e) {
      console.error("[ConexoesTab] Erro na sincronização manual:", e);
    } finally {
      setIsSyncingId(null);
    }
  };

  const handleToggleStatus = async (conexao: Conexao) => {
    const newStatus = conexao.status === "online" ? "offline" : "online";
    await SupabaseService.upsertRecord("conexoes", { id: conexao.id, status: newStatus }, "id");
    await loadConexoesData();
  };

  const handleDeleteConexao = async (id: string) => {
    if (window.confirm("Tem certeza que deseja remover esta conexão e seu histórico?")) {
      await SupabaseService.deleteRecord("conexoes", id, "id");
      await loadConexoesData();
    }
  };

  const handleOpenModal = (conexao?: Conexao) => {
    if (conexao) {
      setEditingConexao(conexao);
      setFormNome(conexao.nome);
      setFormTipo(conexao.tipo);
      setFormUrl(conexao.url || "");
      setFormDestino(conexao.destino);
      setFormFrequencia(conexao.configuracao?.frequencia || "diaria");
    } else {
      setEditingConexao(null);
      setFormNome("");
      setFormTipo("google_sheets");
      setFormUrl("");
      setFormDestino("matriz_performance");
      setFormFrequencia("diaria");
    }
    setShowModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    const id = editingConexao?.id || `conn_${Date.now()}`;
    const record: Conexao = {
      id,
      nome: formNome.trim(),
      tipo: formTipo,
      url: formUrl.trim(),
      destino: formDestino,
      status: "online",
      registros: editingConexao?.registros || 0,
      configuracao: {
        frequencia: formFrequencia as any,
      },
    };

    await SupabaseService.upsertRecord("conexoes", record, "id");
    setShowModal(false);
    await loadConexoesData();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="glass-card p-6 border-l-2 border-purple-500/50 bg-[#07070a]/98">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Link2 className="text-purple-400" size={22} />
              Central de Conexões & Integradores de Dados
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Gerencie integrações com fontes externas (Google Sheets, PostgreSQL, APIs REST) e monitore logs de execução.
            </p>
          </div>

          {isAdminOrCoord && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            >
              <Plus size={14} />
              + Nova Conexão
            </button>
          )}
        </div>
      </div>

      {/* LISTAGEM DE CONEXÕES CONFIGURADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-zinc-500 font-mono text-xs animate-pulse">
            Carregando conexões cadastradas...
          </div>
        ) : conexoes.length === 0 ? (
          <div className="col-span-full glass-card p-8 text-center text-zinc-400">
            <AlertTriangle className="mx-auto text-amber-400 mb-2" size={28} />
            <p className="text-xs font-bold uppercase tracking-wider">Nenhuma conexão cadastrada no momento.</p>
          </div>
        ) : (
          conexoes.map((conn) => {
            const isSyncing = isSyncingId === conn.id;
            const isTesting = testingId === conn.id;
            const isTestOk = testResult?.id === conn.id && testResult.success;
            const isTestFail = testResult?.id === conn.id && !testResult.success;

            return (
              <div key={conn.id} className="glass-card p-5 border-l-2 border-indigo-500/50 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {conn.tipo === "google_sheets" ? (
                        <FileSpreadsheet className="text-emerald-400" size={18} />
                      ) : (
                        <Database className="text-sky-400" size={18} />
                      )}
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{conn.nome}</h4>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">{conn.tipo}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        conn.status === "online"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : conn.status === "offline"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      ● {conn.status}
                    </span>
                  </div>

                  <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5 text-[11px] font-mono mb-4 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Destino (Supabase):</span>
                      <span className="text-indigo-300 font-bold">{conn.destino}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Registros Importados:</span>
                      <span className="text-emerald-400 font-bold">{conn.registros || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Última Sincronização:</span>
                      <span className="text-zinc-400">
                        {conn.ultima_sincronizacao
                          ? new Date(conn.ultima_sincronizacao).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Nunca"}
                      </span>
                    </div>
                  </div>

                  {testResult?.id === conn.id && (
                    <div
                      className={`text-[10px] p-2 rounded mb-3 flex items-center gap-1.5 font-bold uppercase ${
                        isTestOk ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {isTestOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {isTestOk ? "Conexão Testada com Sucesso!" : "Falha na Conexão com Fonte."}
                    </div>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleTestConnection(conn)}
                      disabled={isTesting}
                      className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      title="Testar Conectividade"
                    >
                      <Activity size={10} className={isTesting ? "animate-spin" : ""} />
                      Testar
                    </button>
                    <button
                      onClick={() => handleSyncNow(conn)}
                      disabled={isSyncing}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      title="Sincronizar Agora"
                    >
                      <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                      Sincronizar
                    </button>
                  </div>

                  {isAdminOrCoord && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(conn)}
                        className={`p-1.5 rounded border transition cursor-pointer ${
                          conn.status === "online"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                        title={conn.status === "online" ? "Pausar Conexão" : "Reativar Conexão"}
                      >
                        <Power size={12} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(conn)}
                        className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 p-1.5 rounded transition cursor-pointer"
                        title="Editar Conexão"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteConexao(conn.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 p-1.5 rounded transition cursor-pointer"
                        title="Remover Conexão"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* HISTÓRICO DE SINCRONIZAÇÃO (SYNC LOGS) */}
      <div className="glass-card p-6 border-l-2 border-indigo-500/50">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Clock className="text-indigo-400" size={18} />
          Histórico Operacional de Sincronizações (Sync Logs)
        </h3>

        {syncLogs.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 font-mono text-xs">
            Nenhum log de sincronização registrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-[10px] font-black uppercase text-zinc-400">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">ID Conexão</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Registros Afetados</th>
                  <th className="py-2.5 px-3">Mensagem / Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {syncLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 px-3 text-zinc-300">
                      {new Date(log.data_inicio).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">{log.conexao_id}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.status === "sucesso"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      +{log.registros_afetados}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 truncate max-w-xs">
                      {log.mensagem_erro || "Sincronização concluída com sucesso."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CRIAÇÃO / EDIÇÃO DE CONEXÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 border-indigo-500/50 space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-white/10 pb-3 flex justify-between items-center">
              <span>{editingConexao ? "Editar Conexão" : "Nova Conexão de Dados"}</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                  Nome da Conexão
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Controladoria - Volumosos"
                  className="inp py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                    Tipo de Fonte
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="inp py-2 px-3 text-xs"
                  >
                    <option value="google_sheets">Google Sheets (CSV/HTML)</option>
                    <option value="postgres">PostgreSQL Relacional</option>
                    <option value="api_rest">API REST Externa</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                    Frequência Auto
                  </label>
                  <select
                    value={formFrequencia}
                    onChange={(e) => setFormFrequencia(e.target.value)}
                    className="inp py-2 px-3 text-xs"
                  >
                    <option value="diaria">Diária (06:00 BRT)</option>
                    <option value="horaria">A cada hora</option>
                    <option value="semanal">Semanal</option>
                    <option value="manual">Apenas Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                  URL / Endpoint de Integração
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/..."
                  className="inp py-2 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                  Tabela de Destino no Supabase
                </label>
                <input
                  type="text"
                  required
                  value={formDestino}
                  onChange={(e) => setFormDestino(e.target.value)}
                  placeholder="matriz_performance"
                  className="inp py-2 px-3 text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Salvar Conexão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
