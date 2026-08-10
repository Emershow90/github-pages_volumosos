import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HardDrive, 
  ExternalLink, 
  Layers, 
  Trash2, 
  Zap,
  Activity,
  Table
} from 'lucide-react';
import { ConexoesService, SyncResult, ConnectionDetail } from '../services/conexoesService';
import { useToast } from '../hooks/useToast';
import { SupabaseService } from '../lib/supabaseService';

export const ConexoesTab: React.FC = () => {
  const toast = useToast();
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ healthy: boolean; latencyMs: number } | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingTables, setLoadingTables] = useState(false);

  const connections: ConnectionDetail[] = [
    {
      id: 'google_sheets_controladoria',
      name: 'Planilha Controladoria (CSV Google Sheets)',
      type: 'google_sheets',
      status: lastSyncResult?.success === false ? 'error' : 'connected',
      lastSync: lastSyncResult?.timestamp || 'Automatico (Cache 5 min)',
      description: 'Feed de métricas operacionais da Controladoria com UPH e volume de atividade.',
      endpointUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?output=csv',
      recordCount: lastSyncResult?.importedCount,
    },
    {
      id: 'supabase_database',
      name: 'Supabase PostgreSQL & Realtime',
      type: 'database',
      status: dbStatus ? (dbStatus.healthy ? 'connected' : 'disconnected') : 'connected',
      lastSync: dbStatus ? `${dbStatus.latencyMs}ms de latência` : 'Realtime Ativo (onSnapshot)',
      description: 'Persistência em nuvem centralizada para setores, colaboradores, históricos e escalas.',
      recordCount: (Object.values(tableCounts) as number[]).reduce((a: number, b: number) => a + b, 0),
    },
    {
      id: 'indexeddb_cache',
      name: 'IndexedDB Local Cache & Offline Queue',
      type: 'indexeddb',
      status: 'connected',
      lastSync: 'Sincronizado localmente',
      description: 'Armazenamento offline de alta performance com resiliência de queda de conexão.',
    },
  ];

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const res = await ConexoesService.checkDatabaseHealth();
      setDbStatus(res);
      if (res.healthy) {
        toast.success(`Supabase Online! Latência: ${res.latencyMs}ms`);
      } else {
        toast.error('Não foi possível conectar ao Supabase.');
      }
    } catch {
      toast.error('Erro ao verificar saúde do banco de dados.');
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSyncSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const result = await ConexoesService.syncControladoriaSheet();
      setLastSyncResult(result);
      if (result.success) {
        toast.success(`Sincronização concluída! ${result.importedCount} setores atualizados.`);
        loadTableCounts();
      } else {
        toast.error(`Falha na sincronização: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await ConexoesService.resetCache();
      toast.success('Cache local da planilha limpo com sucesso.');
    } catch {
      toast.error('Erro ao limpar cache local.');
    }
  };

  const loadTableCounts = async () => {
    setLoadingTables(true);
    try {
      const [setores, colabs, matriz, historico, escalas] = await Promise.all([
        SupabaseService.fetchTable('setores').catch(() => []),
        SupabaseService.fetchTable('colaboradores').catch(() => []),
        SupabaseService.fetchTable('matriz_performance').catch(() => []),
        SupabaseService.fetchTable('historico_consolidado').catch(() => []),
        SupabaseService.fetchTable('escalas_referentes').catch(() => []),
      ]);
      setTableCounts({
        setores: setores.length,
        colaboradores: colabs.length,
        matriz_performance: matriz.length,
        historico_consolidado: historico.length,
        escalas_referentes: escalas.length,
      });
    } catch (err) {
      console.error('[ConexoesTab] Erro ao carregar registros das tabelas:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    loadTableCounts();
    handleTestDatabase();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Conexões & Integrações Operacionais</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Painel de gerenciamento de fontes de dados, sincronização com a Controladoria e resiliência offline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSyncSheets}
            disabled={isSyncingSheets}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            {isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Controladoria'}
          </button>
        </div>
      </div>

      {/* Connection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {conn.type === 'google_sheets' && <Table className="w-5 h-5 text-emerald-400" />}
                  {conn.type === 'database' && <Database className="w-5 h-5 text-blue-400" />}
                  {conn.type === 'indexeddb' && <HardDrive className="w-5 h-5 text-amber-400" />}
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{conn.type}</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    conn.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {conn.status === 'connected' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Desconectado
                    </>
                  )}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{conn.name}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">{conn.description}</p>

              {conn.endpointUrl && (
                <div className="bg-black/40 p-2 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-500 truncate mb-3 flex items-center justify-between gap-2">
                  <span className="truncate">{conn.endpointUrl}</span>
                  <a
                    href={conn.endpointUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors shrink-0"
                    title="Abrir URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{conn.lastSync}</span>
              </div>
              {conn.recordCount !== undefined && (
                <div className="flex items-center gap-1 font-mono text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{conn.recordCount} registros</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Database Tables Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Registries */}
        <div className="lg:col-span-2 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Mapeamento de Tabelas no Supabase</h3>
            </div>
            <button
              onClick={loadTableCounts}
              disabled={loadingTables}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Recarregar Contagem"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTables ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Setores', key: 'setores', color: 'text-blue-400' },
              { label: 'Colaboradores', key: 'colaboradores', color: 'text-emerald-400' },
              { label: 'Matriz Performance', key: 'matriz_performance', color: 'text-purple-400' },
              { label: 'Histórico Consolidado', key: 'historico_consolidado', color: 'text-amber-400' },
              { label: 'Escalas Referentes', key: 'escalas_referentes', color: 'text-cyan-400' },
            ].map((tbl) => (
              <div
                key={tbl.key}
                className="bg-black/30 p-3.5 rounded-xl border border-zinc-800/60 flex flex-col justify-between space-y-1"
              >
                <span className="text-[11px] text-zinc-400 font-medium">{tbl.label}</span>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-bold font-mono ${tbl.color}`}>
                    {loadingTables ? '...' : tableCounts[tbl.key] ?? 0}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">linhas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Ações de Manutenção</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Executar diagnósticos e redefinição de caches para garantir a integridade do estado realtime.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleTestDatabase}
              disabled={isTestingDb}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors border border-zinc-700/60 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-blue-400" />
              {isTestingDb ? 'Testando Conexão...' : 'Testar Conexão Supabase'}
            </button>

            <button
              onClick={handleClearCache}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors border border-zinc-700/60 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              Limpar Cache da Planilha (IndexedDB)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
