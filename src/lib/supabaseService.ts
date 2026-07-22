import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isStaticBuild } from './supabase';
import { auth, initAuth } from './supabaseAuth';
import { IndexedDBService } from './indexedDb';
import { useHistoryStore } from '../stores/useHistoryStore';
import { AlertLog } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const isOnline = (): boolean => {
  if (isStaticBuild) return false;
  const isSimOffline = localStorage.getItem("sys_radar_sim_offline") === "true";
  return !isSimOffline && navigator.onLine;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

const TABLE_COLUMNS: Record<string, string[]> = {
  store_master: ['id', 'nome', 'cidade', 'uf', 'transportadoraPadrao', 'observacoes', 'created_at', 'updated_at'],
  setores: ['id', 'numero', 'nome', 'resp', 'fotoLider', 'meta', 'horario', 'situacao', 'ativ', 'promessa', 'varFin', 'bsi', 'nota5s', 'errosPicking', 'reproTotal', 'infracaoSeguranca', 'horasDKT', 'poliRec', 'rdl', 'poliSaid', 'coletado', 'uph', 'created_at', 'updated_at'],
  lista_coleta: ['lista', 'loja', 'setor', 'corte', 'carregamento', 'transportadora', 'volumes', 'enderecos', 'atividadeRelacionada', 'created_at', 'updated_at'],
  radar_lojas_status: ['lista', 'statusSoltura', 'horarioSoltura', 'soltoPor', 'statusColeta', 'horarioColeta', 'coletadoPor', 'statusCarregamento', 'horarioCarregamento', 'carregadoPor', 'statusExpedicao', 'created_at', 'updated_at', 'updated_by'],
  store_operations: ['id', 'programacaoId', 'lojaId', 'nomeLoja', 'setor', 'transportadora', 'corte', 'carregamento', 'volumes', 'enderecos', 'atividadeRelacionada', 'statusSoltura', 'horarioSoltura', 'soltoPor', 'statusColeta', 'horarioColeta', 'coletadoPor', 'statusCarregamento', 'horarioCarregamento', 'carregadoPor', 'statusExpedicao', 'perdeuCorte', 'updated_at', 'updated_by', 'created_at'],
  atividade_loja: ['id', 'programacaoId', 'lojaId', 'setor', 'tipoAtividade', 'colisProgramados', 'colisColetados', 'updated_at', 'created_at'],
  usuarios: ['id', 'email', 'nome', 'role', 'setoresAutorizados', 'situacao', 'cargo', 'unidade', 'avatar_url', 'aprovado_por', 'data_aprovacao', 'created_at', 'updated_at'],
  colaboradores: ['id', 'nome', 'setor', 'status', 'cargo', 'horas', 'foto', 'created_at', 'updated_at'],
  escalas: ['id', 'colaborador_id', 'data', 'turno', 'status', 'created_at', 'updated_at'],
  capacidade_operacional: ['id', 'setor_id', 'abertura', 'fechoHora', 'created_at', 'updated_at'],
  universos_trabalho: ['id', 'setor_id', 'nome', 'meta', 'feito', 'created_at', 'updated_at'],
  historico_consolidado: ['id', 'data', 'hora', 'semana', 'turno', 'setor', 'ativ', 'uph', 'repro', 'promessa', 'nota5s', 'erros', 'created_at', 'updated_at'],
  copil_matriz: ['id', 'setor_id', 'grupo', 'kpi', 'comp', 'real', 'inverso', 'auto', 'tolerancia', 'regraCalculo', 'criterio', 'notaManual', 'calcNota', 'created_at', 'updated_at'],
  escalas_referentes: ['id', 'dia', 'ref87', 'refVol', 'apoios', 'created_at', 'updated_at'],
  alertas_operacionais: ['id', 'prioridade', 'titulo', 'descricao', 'setor', 'hora', 'lido', 'created_at', 'updated_at'],
  audit_logs: ['id', 'data', 'hora', 'tipo', 'autor', 'acao', 'detalhes', 'usuario', 'campo', 'valorAnterior', 'valorNovo', 'dispositivo', 'created_at', 'updated_at']
};

export class SupabaseService {
  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;

  public static initAuthObserver(): void {
    if (this.initializedAuthObserver) return;
    this.initializedAuthObserver = true;

    auth.onAuthStateChanged((user) => {
      this.authState = user ? 'authenticated' : 'unauthenticated';
      this.authStateListeners.forEach((cb) => cb(this.authState));
    });
  }

  public static onAuthStateResolved(callback: (state: AuthState) => void): () => void {
    this.initAuthObserver();
    callback(this.authState);
    this.authStateListeners.add(callback);
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  private static getClient() {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are defined.");
    }
    return supabase;
  }

  public static garantirAuthPronto(): Promise<void> {
    return new Promise((resolve) => {
      if (this.authState !== 'loading') {
        resolve();
        return;
      }

      let unsubscribe: (() => void) | undefined;
      unsubscribe = this.onAuthStateResolved((state) => {
        if (state !== 'loading') {
          if (unsubscribe) {
            unsubscribe();
          } else {
            queueMicrotask(() => {
              if (unsubscribe) unsubscribe();
            });
          }
          resolve();
        }
      });
    });
  }

  private static getDocId(record: Record<string, unknown>, keyField: string = 'id'): string {
    const idVal = record[keyField] || record.id || record.lista || record.chave;
    return idVal ? String(idVal) : '';
  }

  public static async fetchTable<T>(tableName: string, defaultData: T[] = []): Promise<T[]> {
    await this.garantirAuthPronto();

    if (!auth.currentUser) {
      console.warn(`[Supabase] fetchTable(${tableName}) chamado sem usuário autenticado. Retornando cache local.`);
      const cached = await IndexedDBService.getAll<T>(tableName);
      if (cached.length > 0) {
        return cached;
      }
      if (defaultData.length > 0) {
        await IndexedDBService.putMany(tableName, defaultData);
        return defaultData;
      }
      return [];
    }

    if (isOnline()) {
      try {
        const client = this.getClient();
        const { data, error } = await client
          .from(tableName)
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          await IndexedDBService.putMany(tableName, data as unknown as T[]);
          return data as T[];
        }
      } catch (err) {
        console.warn(`[Supabase] Failed to fetch table ${tableName} online. Falling back to cache.`, err);
      }
    }

    const cached = await IndexedDBService.getAll<T>(tableName);
    if (cached.length > 0) {
      return cached;
    }

    if (defaultData.length > 0) {
      await IndexedDBService.putMany(tableName, defaultData);
      return defaultData;
    }

    return [];
  }

  public static filterRecordColumns<T>(tableName: string, record: T): Record<string, unknown> {
    const columns = TABLE_COLUMNS[tableName];
    if (!columns) return record as Record<string, unknown>;

    const filtered: Record<string, unknown> = {};
    const rec = record as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      if (columns.includes(key)) {
        filtered[key] = rec[key];
      } else {
        console.warn(`[Supabase Sanitizer] Ignorando coluna inválida "${key}" para tabela "${tableName}".`);
      }
    }
    return filtered;
  }

  public static async upsertRecord<T extends { updated_at?: string; id?: unknown; lista?: string; key?: string; chave?: string }>(
    tableName: string,
    record: T,
    keyField: keyof T = 'id' as keyof T
  ): Promise<T> {
    await this.garantirAuthPronto();

    const docId = this.getDocId(record as Record<string, unknown>, keyField as string);
    if (!docId) {
      throw new Error(`Cannot upsert to ${tableName} without a valid unique key.`);
    }

    const now = new Date().toISOString();
    const finalizedRecord = {
      ...record,
      updated_at: record.updated_at || now
    };

    // Filtrar colunas inválidas antes de prosseguir
    const filteredRecord = this.filterRecordColumns(tableName, finalizedRecord);

    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Gravando em "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.put(tableName, filteredRecord);
      return filteredRecord as unknown as T;
    }

    const localExisting = await IndexedDBService.get<T>(tableName, docId);
    if (localExisting && localExisting.updated_at) {
      const localTime = new Date(localExisting.updated_at).getTime();
      const newTime = new Date(finalizedRecord.updated_at).getTime();
      if (newTime < localTime) {
        console.log(`[Supabase LWW] Newer record exists locally for ${tableName}:${docId}. Skipping update.`);
        return localExisting;
      }
    }

    await IndexedDBService.put(tableName, filteredRecord);

    if (isOnline()) {
      try {
        const client = this.getClient();
        const { error } = await client
          .from(tableName)
          .upsert(filteredRecord);

        if (error) {
          const errMsg = error.message || '';
          if (error.code === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist')) {
            console.error(`[Supabase Sanitizer] [PGRST204] Erro de coluna inexistente ao salvar em ${tableName}. Abortando inserção.`, error);
          } else {
            throw error;
          }
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string; code?: string };
        const errMsg = String(errObj?.message || err);
        const errCode = String(errObj?.code || '');
        if (errCode === 'PGRST204' || errMsg.includes('PGRST204') || errMsg.includes('column') || errMsg.includes('does not exist')) {
          console.error(`[Supabase Sanitizer] Descartando inserção inválida devido a erro PGRST204 de coluna inexistente na tabela ${tableName}.`, err);
        } else {
          console.warn(`[Supabase Offline Fallback] Erro ao enviar diretamente para ${tableName}:${docId}. Enfileirando.`, err);
          const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
          queue.push({ table: tableName, record: filteredRecord, primaryKey: keyField, action: 'upsert' });
          localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
        }
      }
    } else {
      console.log(`[Supabase Offline] Queued update for ${tableName}:${docId}`);
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ table: tableName, record: filteredRecord, primaryKey: keyField, action: 'upsert' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }

    return finalizedRecord;
  }

  public static async deleteRecord(tableName: string, keyVal: unknown, keyField: string = 'id'): Promise<void> {
    await this.garantirAuthPronto();

    const docId = String(keyVal);
    
    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Removendo de "${tableName}" no cache local sem usuário autenticado.`);
      await IndexedDBService.delete(tableName, docId);
      return;
    }

    await IndexedDBService.delete(tableName, docId);

    if (isOnline()) {
      try {
        const client = this.getClient();
        const { error } = await client
          .from(tableName)
          .delete()
          .eq(keyField, keyVal);

        if (error) throw error;
      } catch (err) {
        console.warn(`[Supabase Offline Fallback] Erro ao deletar diretamente de ${tableName}:${docId}. Enfileirando.`, err);
        const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
        queue.push({ table: tableName, keyVal, primaryKey: keyField, action: 'delete' });
        localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
      }
    } else {
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ table: tableName, keyVal, primaryKey: keyField, action: 'delete' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }
  }

  public static subscribe(
    tableName: string, 
    callback: (payload: { table: string; event: 'INSERT' | 'UPDATE' | 'DELETE'; new: unknown; old?: unknown }) => void
  ): () => void {
    let channel: RealtimeChannel | null = null;
    let cancelado = false;

    const unsubscribeAuth = this.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        if (channel) {
          channel.unsubscribe();
          channel = null;
        }
        return;
      }

      if (cancelado || channel) return;

      if (!isOnline() || !supabase) {
        console.log(`[Supabase] Offline mode or client uninitialized: Real-time subscription to ${tableName} will fall back to local changes.`);
        return;
      }

      try {
        const client = this.getClient();
        channel = client.channel(`public:${tableName}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async (payload) => {
            const changeType = payload.eventType;
            const newData = payload.new;
            const oldData = payload.old;
            
            if (changeType === 'INSERT' || changeType === 'UPDATE') {
              await IndexedDBService.put(tableName, newData);
              callback({
                table: tableName,
                event: changeType,
                new: newData
              });
            } else if (changeType === 'DELETE') {
              const oldRecord = oldData as Record<string, unknown> | null;
              const docId = oldRecord?.id || oldRecord?.lista || oldRecord?.chave || payload.errors?.[0];
              if (docId) {
                await IndexedDBService.delete(tableName, String(docId));
                callback({
                  table: tableName,
                  event: 'DELETE',
                  new: { id: docId, lista: docId, chave: docId }
                });
              }
            }
          })
          .subscribe();
      } catch (err) {
        console.warn(`[Supabase] Failed to subscribe to ${tableName}:`, err);
      }
    });

    return () => {
      cancelado = true;
      unsubscribeAuth();
      if (channel) {
        channel.unsubscribe();
      }
    };
  }

  public static async flushOfflineQueue(): Promise<void> {
    if (!isOnline()) return;

    const queueStr = localStorage.getItem("sys_radar_offline_queue");
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      console.log(`[Supabase Sync] Sincronizando ${queue.length} alterações pendentes offline...`);
      const remainingQueue = [];

      for (const item of queue) {
        try {
          const client = this.getClient() as any;
          const tbl = item.table || item.tableName;
          const pKey = item.primaryKey || item.keyField || 'id';
          const act = String(item.action || '').toLowerCase();

          if (act === 'upsert') {
            // Filtrar colunas inválidas antes de enviar para o Supabase
            const filteredRecord = this.filterRecordColumns(tbl, item.record);

            const { error } = await client
              .from(tbl)
              .upsert(filteredRecord);

            if (error) {
              const errMsg = error.message || '';
              if (error.code === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist')) {
                console.error(`[Supabase Sync] [PGRST204] Coluna inexistente detectada na tabela ${tbl}. Gerando alerta visual e removendo item inválido.`, error);
                const alertLog: AlertLog = {
                  id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  prioridade: 'alta',
                  titulo: 'Sincronização Descartada',
                  descricao: `Alteração na tabela "${tbl}" continha estrutura incompatível e foi descartada da fila offline.`,
                  setor: 'Sistema',
                  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  lido: false
                };
                useHistoryStore.getState().setAlerts([alertLog, ...useHistoryStore.getState().alerts]);
                continue; // Descarta da fila (não insere no remainingQueue)
              }
              throw error;
            }
          } else if (act === 'delete') {
            const { error } = await client
              .from(tbl)
              .delete()
              .eq(pKey, item.keyVal);
            if (error) throw error;
          }
        } catch (err: unknown) {
          const tblName = item.table || item.tableName;
          console.error(`[Supabase Sync] Erro ao sincronizar item offline para tabela "${tblName}":`, err);
          
          const errObj = err as { message?: string; code?: string };
          const errMsg = String(errObj?.message || err);
          const errCode = String(errObj?.code || '');
          if (errCode === 'PGRST204' || errMsg.includes('PGRST204') || errMsg.includes('column') || errMsg.includes('does not exist')) {
            console.warn(`[Supabase Sync] Ignorando e descartando alteração com coluna inválida de ${tblName} da fila para evitar travamentos.`);
            const alertLog: AlertLog = {
              id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              prioridade: 'alta',
              titulo: 'Sincronização Descartada',
              descricao: `Alteração na tabela "${tblName}" continha estrutura incompatível e foi descartada da fila offline.`,
              setor: 'Sistema',
              hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              lido: false
            };
            useHistoryStore.getState().setAlerts([alertLog, ...useHistoryStore.getState().alerts]);
          } else {
            remainingQueue.push(item);
          }
        }
      }

      if (remainingQueue.length > 0) {
        localStorage.setItem("sys_radar_offline_queue", JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem("sys_radar_offline_queue");
        console.log(`[Supabase Sync] Sincronização offline concluída com sucesso.`);
      }
    } catch (e) {
      console.error("[Supabase Sync] Erro ao analisar fila offline:", e);
    }
  }

  public static async syncOfflineQueue(): Promise<void> {
    return this.flushOfflineQueue();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    SupabaseService.syncOfflineQueue();
  });
}
