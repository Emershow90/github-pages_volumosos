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
  Table, 
  ListOrdered, 
  Webhook, 
  Terminal, 
  Save, 
  Plus, 
  Store, 
  Search, 
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';
import { ConexoesService, SyncResult, ConnectionDetail } from '../services/conexoesService';
import { useToast } from '../hooks/useToast';
import { SupabaseService } from '../lib/supabaseService';
import { formatToBrasiliaTime } from '../utils/time';
import { useStoreMaster } from '../stores/useStoreMaster';
import { useStoreOperations } from '../stores/useStoreOperations';

export const ConexoesTab: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'lojas' | 'logs' | 'webhooks'>('overview');
  
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ healthy: boolean; latencyMs: number } | null>(null);
  const [sheetStatus, setSheetStatus] = useState<{ healthy: boolean; latencyMs: number } | null>(null);
  
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingTables, setLoadingTables] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(SupabaseService.getQueueLength());
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);

  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'success'>('all');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');

  // Lojas Tab state
  const { stores, loadStores } = useStoreMaster();
  const operations = useStoreOperations((s) => s.operations);
  const [searchStore, setSearchStore] = useState('');

  const ATIVIDADE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=0&single=true&output=csv';
  const PLANO_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSKeTmdIKZi0AAngskuSuKETelAONFje78J34WhbYErMYNKAi9N6oyfuciyL_l4PeCnocGDhrckxqm/pub?gid=1141245157&single=true&output=csv';

  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueueCount(SupabaseService.getQueueLength());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const connections: ConnectionDetail[] = [
    {
      id: 'google_sheets_atividade',
      name: 'Planilha Atividade Total (Controladoria - Atividades por Setor)',
      type: 'google_sheets',
      status: sheetStatus ? (sheetStatus.healthy ? 'connected' : 'error') : 'connected',
      lastSync: sheetStatus ? `${sheetStatus.latencyMs}ms de latência` : 'Automático (Cache 5 min)',
      description: 'Aba/Planilha exclusiva de Atividade Total e UPH da Controladoria por setor.',
      endpointUrl: ATIVIDADE_SHEET_URL,
      recordCount: lastSyncResult?.importedCount,
    },
    {
      id: 'google_sheets_plano',
      name: 'Planilha Plano de Carregamento & Lojas (Logística)',
      type: 'google_sheets',
      status: sheetStatus ? (sheetStatus.healthy ? 'connected' : 'error') : 'connected',
      lastSync: sheetStatus ? `${sheetStatus.latencyMs}ms de latência` : 'Automático (On demand)',
      description: 'Aba/Planilha exclusiva do Plano de Carregamento de Lojas, Cortes e Transportadoras.',
      endpointUrl: PLANO_SHEET_URL,
      recordCount: stores.length,
    },
    {
      id: 'supabase_database',
      name: 'Supabase PostgreSQL & Realtime',
      type: 'database',
      status: dbStatus ? (dbStatus.healthy ? 'connected' : 'disconnected') : 'connected',
      lastSync: dbStatus ? `${dbStatus.latencyMs}ms de latência` : 'Realtime Ativo (onSnapshot)',
      description: 'Persistência em nuvem centralizada para setores, colaboradores, históricos, lojas e escalas.',
      recordCount: (Object.values(tableCounts) as number[]).reduce((a: number, b: number) => a + b, 0),
    },
    {
      id: 'indexeddb_cache',
      name: 'IndexedDB Local Cache & Offline Queue',
      type: 'indexeddb',
      status: 'connected',
      lastSync: offlineQueueCount === 0 ? 'Fila 100% sincronizada (0 pendentes)' : `${offlineQueueCount} alteração(ões) pendente(s)`,
      description: 'Armazenamento offline de alta performance com resiliência de queda de conexão.',
      recordCount: offlineQueueCount,
    },
  ];

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const dbRes = await ConexoesService.checkDatabaseHealth();
      setDbStatus(dbRes);
      
      const sheetRes = await ConexoesService.checkSpreadsheetHealth(ATIVIDADE_SHEET_URL);
      setSheetStatus(sheetRes);
      
      if (dbRes.healthy && sheetRes.healthy) {
        toast.success(`Serviços Online! DB: ${dbRes.latencyMs}ms | Sheets: ${sheetRes.latencyMs}ms`);
      } else {
        toast.error('Algum serviço encontra-se instável. Verifique os logs.');
      }
    } catch {
      toast.error('Erro ao verificar saúde dos serviços.');
    } finally {
      setIsTestingDb(false);
    }
  };

  const loadSyncLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await SupabaseService.fetchTable('sync_logs') as any[];
      logs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setSyncLogs(logs.slice(0, 100));
    } catch (err) {
      console.warn("Could not load sync logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSyncSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const result = await ConexoesService.syncControladoriaSheet();
      setLastSyncResult(result);
      if (result.success) {
        toast.success(`Sincronização concluída! ${result.importedCount} registros (${result.storesCount || 0} lojas cadastradas).`);
        await loadTableCounts();
        await loadStores();
        await loadSyncLogs();
      } else {
        toast.error(`Falha na sincronização: ${result.error || 'Erro desconhecido'}`);
        await loadSyncLogs();
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const result = await ConexoesService.syncControladoriaSheet();
      if (result.success) {
        toast.success(`Registro reprocessado com sucesso! ${result.importedCount} registros atualizados.`);
        await loadTableCounts();
        await loadStores();
        await loadSyncLogs();
      } else {
        toast.error(`Falha ao reprocessar: ${result.error || 'Erro desconhecido'}`);
        await loadSyncLogs();
      }
    } catch (e) {
      toast.error('Erro ao reenviar sincronização.');
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setIsSyncingSheets(true);
    try {
      await handleSyncSheets();
      await SupabaseService.syncOfflineQueue();
      toast.success('Todas as sincronizações pendentes foram reexecutadas.');
    } catch {
      toast.error('Erro ao reprocessar todas as falhas.');
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

  const handleFlushOfflineQueue = async () => {
    setIsFlushingQueue(true);
    try {
      await SupabaseService.flushOfflineQueue();
      const remaining = SupabaseService.getQueueLength();
      setOfflineQueueCount(remaining);
      if (remaining === 0) {
        toast.success('Fila offline 100% sincronizada com a nuvem!');
      } else {
        toast.info(`Sincronização em andamento. ${remaining} itens restantes.`);
      }
      loadTableCounts();
    } catch {
      toast.error('Erro ao processar fila offline.');
    } finally {
      setIsFlushingQueue(false);
    }
  };

  const handleClearOfflineQueue = () => {
    try {
      SupabaseService.clearOfflineQueue();
      setOfflineQueueCount(0);
      toast.success('Fila de pendentes limpa com sucesso!');
    } catch {
      toast.error('Erro ao limpar fila de pendentes.');
    }
  };

  const [isPurgingRetention, setIsPurgingRetention] = useState(false);

  const handlePurgeRetention = async () => {
    if (!window.confirm('Deseja executar a purga de retenção semestral? Registros com mais de 6 meses (180 dias) em Histórico, Atividades e Logs serão removidos para otimizar o banco de dados.')) {
      return;
    }
    setIsPurgingRetention(true);
    try {
      const stats = await SupabaseService.purgeRecordsOlderThanMonths(6);
      if (stats.success) {
        toast.success(`Purga concluída! ${stats.totalPurged} registros com mais de 6 meses foram arquivados/removidos.`);
      } else {
        toast.info('Purga executada (nenhum registro com mais de 6 meses encontrado ou erro parcial).');
      }
      loadTableCounts();
    } catch {
      toast.error('Erro ao executar purga de retenção.');
    } finally {
      setIsPurgingRetention(false);
    }
  };

  const loadTableCounts = async () => {
    setLoadingTables(true);
    try {
      const [setores, colabs, matriz, historico, escalas, plano, ops, storesMaster, activityEntries] = await Promise.all([
        SupabaseService.fetchTable('setores').catch(() => []),
        SupabaseService.fetchTable('colaboradores').catch(() => []),
        SupabaseService.fetchTable('matriz_performance').catch(() => []),
        SupabaseService.fetchTable('historico_consolidado').catch(() => []),
        SupabaseService.fetchTable('escalas_referentes').catch(() => []),
        SupabaseService.fetchTable('plano_carregamento').catch(() => []),
        SupabaseService.fetchTable('store_operations').catch(() => []),
        SupabaseService.fetchTable('store_master').catch(() => []),
        SupabaseService.fetchTable('activity_entries').catch(() => []),
      ]);
      setTableCounts({
        setores: setores.length,
        colaboradores: colabs.length,
        matriz_performance: matriz.length,
        historico_consolidado: historico.length,
        escalas_referentes: escalas.length,
        plano_carregamento: plano.length,
        store_operations: ops.length,
        store_master: storesMaster.length,
        activity_entries: activityEntries.length,
      });
    } catch (err) {
      console.error('[ConexoesTab] Erro ao carregar registros das tabelas:', err);
    } finally {
      setLoadingTables(false);
    }
  };
  
  const loadWebhooks = async () => {
    try {
      const conexoes = await SupabaseService.fetchTable('conexoes');
      const hooks = conexoes.filter((c: any) => c.tipo === 'api_rest');
      setWebhooks(hooks);
    } catch (err) {
      console.warn("Could not load webhooks", err);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookName || !webhookUrl) {
      toast.error('Preencha nome e URL do Webhook.');
      return;
    }
    try {
      await SupabaseService.upsert('conexoes', [{
        id: crypto.randomUUID(),
        nome: webhookName,
        tipo: 'api_rest',
        url: webhookUrl,
        status: 'Ativo',
        created_at: new Date().toISOString()
      }], 'id');
      toast.success('Webhook salvo com sucesso!');
      setWebhookName('');
      setWebhookUrl('');
      loadWebhooks();
    } catch (err) {
      toast.error('Erro ao salvar webhook.');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await SupabaseService.deleteRecord('conexoes', id, 'id');
      toast.success('Webhook removido.');
      loadWebhooks();
    } catch (err) {
      toast.error('Erro ao remover webhook.');
    }
  };

  useEffect(() => {
    loadTableCounts();
    handleTestDatabase();
    loadSyncLogs();
    loadWebhooks();
    loadStores();
  }, []);

  const filteredStores = stores.filter((s) => 
    s.id.toLowerCase().includes(searchStore.toLowerCase()) ||
    s.nome.toLowerCase().includes(searchStore.toLowerCase()) ||
    (s.cidade && s.cidade.toLowerCase().includes(searchStore.toLowerCase()))
  );

  const filteredLogs = syncLogs.filter((l) => {
    if (logFilter === 'error') return l.status === 'error';
    if (logFilter === 'success') return l.status === 'success';
    return true;
  });

  const failedLogsCount = syncLogs.filter((l) => l.status === 'error').length;

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
                Sincronização de planilhas, plano de carregamento, cadastro de lojas e logs de banco de dados.
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
            {isSyncingSheets ? 'Sincronizando Lojas & Planilhas...' : 'Sincronizar Lojas & Planilhas'}
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800 w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Visão Geral & Status
        </button>
        <button
          onClick={() => setActiveTab('lojas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'lojas'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Lojas & Plano de Carga</span>
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
            {stores.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>Logs & Reenvio de Falhas</span>
          {failedLogsCount > 0 && (
            <span className="bg-rose-500/20 text-rose-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
              {failedLogsCount} falhas
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Webhook className="w-4 h-4 text-cyan-400" />
          Integrações (Webhooks)
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                          Online
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Offline
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
                  <h3 className="text-sm font-bold text-white">Mapeamento de Tabelas do Banco de Dados</h3>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Lojas Master', key: 'store_master', color: 'text-emerald-400' },
                  { label: 'Operações de Loja', key: 'store_operations', color: 'text-indigo-400' },
                  { label: 'Plano Carregamento', key: 'plano_carregamento', color: 'text-rose-400' },
                  { label: 'Setores', key: 'setores', color: 'text-blue-400' },
                  { label: 'Colaboradores', key: 'colaboradores', color: 'text-cyan-400' },
                  { label: 'Matriz Performance', key: 'matriz_performance', color: 'text-purple-400' },
                  { label: 'Histórico Consolidado', key: 'historico_consolidado', color: 'text-amber-400' },
                  { label: 'Atividades / Registros', key: 'activity_entries', color: 'text-rose-400' },
                  { label: 'Escalas Referentes', key: 'escalas_referentes', color: 'text-teal-400' },
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
                  <h3 className="text-sm font-bold text-white">Ações de Manutenção & Retenção</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Sincronização imediata de lojas, gestão de filas offline e política de retenção semestral (6 meses).
                </p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={handlePurgeRetention}
                  disabled={isPurgingRetention}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold transition-colors border border-purple-500/30 cursor-pointer"
                  title="Purga registros com mais de 6 meses de histórico e atividades"
                >
                  <RefreshCw className={`w-4 h-4 ${isPurgingRetention ? 'animate-spin' : ''}`} />
                  {isPurgingRetention ? 'Purgando Registros...' : 'Executar Retenção Semestral (6 Meses)'}
                </button>
                <button
                  onClick={handleFlushOfflineQueue}
                  disabled={isFlushingQueue}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-semibold transition-colors border border-blue-500/30 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isFlushingQueue ? 'animate-spin' : ''}`} />
                  {isFlushingQueue ? 'Sincronizando Fila...' : `Sincronizar Fila (${offlineQueueCount} pendentes)`}
                </button>
                <button
                  onClick={handleClearOfflineQueue}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-medium transition-colors border border-amber-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Fila de Pendentes
                </button>
                <button
                  onClick={handleTestDatabase}
                  disabled={isTestingDb}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors border border-zinc-700/60 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingDb ? 'animate-spin' : ''}`} />
                  Testar Latência & Conexões
                </button>
                <button
                  onClick={handleClearCache}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-medium transition-colors border border-red-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Cache IndexedDB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lojas Sincronizadas Tab */}
      {activeTab === 'lojas' && (
        <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                Lojas Cadastradas & Sincronizadas ({filteredStores.length} lojas)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Lojas sincronizadas a partir da planilha de Plano de Carregamento e cadastradas no Master.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStore}
                  onChange={(e) => setSearchStore(e.target.value)}
                  placeholder="Buscar por código, nome ou cidade..."
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                onClick={handleSyncSheets}
                disabled={isSyncingSheets}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Re-sincronizar Lojas da Planilha"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => {
              const matchedOp = Object.values(operations).find(op => op.lojaId === store.id);
              return (
                <div
                  key={store.id}
                  className="bg-black/30 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          #{store.id}
                        </span>
                        <span className="text-xs font-bold text-zinc-200">{store.nome}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {store.cidade} - {store.uf} | Transp: {store.transportadoraPadrao || 'JADLOG'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      Carga: {matchedOp?.carregamento || '14:00'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                      <Check className="w-3 h-3" /> Master Ativo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStores.length === 0 && (
            <div className="text-center py-12 bg-black/20 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
              Nenhuma loja encontrada para a busca "{searchStore}". Clique em "Sincronizar Lojas & Planilhas" para importar.
            </div>
          )}
        </div>
      )}

      {/* Logs & Reenvio de Falhas Tab */}
      {activeTab === 'logs' && (
        <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 animate-in fade-in duration-200 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                Logs Detalhados de Sincronização & Reenvio de Falhas
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Histórico de operações sincronizadas com o banco de dados. Permite ao Administrador reenviar registros que falharam.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-zinc-800 text-xs">
                <button
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${logFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Todos ({syncLogs.length})
                </button>
                <button
                  onClick={() => setLogFilter('error')}
                  className={`px-3 py-1 rounded-md transition-colors ${logFilter === 'error' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Falhas ({failedLogsCount})
                </button>
                <button
                  onClick={() => setLogFilter('success')}
                  className={`px-3 py-1 rounded-md transition-colors ${logFilter === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Sucessos ({syncLogs.length - failedLogsCount})
                </button>
              </div>

              {failedLogsCount > 0 && (
                <button
                  onClick={handleRetryAllFailed}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  Reenviar Todas as Falhas
                </button>
              )}

              <button
                onClick={loadSyncLogs}
                disabled={loadingLogs}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Atualizar Logs"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm bg-black/20 rounded-xl border border-dashed border-zinc-800">
              {loadingLogs ? 'Carregando logs...' : 'Nenhum log de sincronização encontrado para o filtro selecionado.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Data/Hora</th>
                    <th className="px-4 py-3">Conexão</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Linhas</th>
                    <th className="px-4 py-3">Detalhes / Mensagem</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-300 text-xs">
                        {log.created_at ? formatToBrasiliaTime(log.created_at) : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">{log.conexao_id}</td>
                      <td className="px-4 py-3">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-400/20">
                            <CheckCircle2 className="w-3 h-3" /> Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-red-400/20">
                            <XCircle className="w-3 h-3" /> Falha
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                        {log.registros_afetados || 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-sm break-words" title={log.mensagem_erro || 'Operação realizada com sucesso.'}>
                        {log.mensagem_erro || 'Operação realizada com sucesso.'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRetryLog(log.id)}
                          disabled={retryingLogId === log.id}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          title="Reenviar esta operação para o banco de dados"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin text-purple-400' : ''}`} />
                          Reenviar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Novo Webhook (API REST)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Configure URLs para disparar eventos de sistema.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  Nome do Webhook
                </label>
                <input
                  type="text"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="Ex: API Cliente, Slack, N8N..."
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-700"
                />
              </div>
              
              <div>
                <label className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  URL de Destino (Endpoint)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://sua-api.com/webhook"
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-700"
                />
              </div>

              <button
                onClick={handleSaveWebhook}
                disabled={!webhookName || !webhookUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Webhook
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <ListOrdered className="w-4 h-4 text-purple-400" />
              Webhooks Configurados
            </h3>
            
            {webhooks.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
                Nenhum webhook configurado.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((hook) => (
                  <div key={hook.id} className="p-4 bg-black/40 border border-zinc-800 rounded-xl flex items-start justify-between group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-zinc-800/50 rounded-lg text-emerald-400 mt-0.5">
                        <Webhook className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-zinc-200">{hook.nome}</h4>
                        <p className="text-xs text-zinc-500 mt-1 break-all max-w-[200px] sm:max-w-xs">{hook.url}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20">
                          {hook.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteWebhook(hook.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

