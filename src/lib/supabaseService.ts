import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isStaticBuild } from './supabase';
import { auth, initAuth } from './supabaseAuth';
import { IndexedDBService } from './indexedDb';
import { AlertLog } from '../types';

export type SyncErrorHandler = (alert: AlertLog) => void;

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

const TABLE_NAME_MAP: Record<string, string> = {
  capacidade_operacional: 'capacidade',
  escalas_referentes: 'escala_semanal',
};

const LOCAL_ONLY_TABLES = new Set([
  'alertas_operacionais',
  'copil_matriz',
  'universos_trabalho'
]);

const TABLE_COLUMNS: Record<string, string[]> = {
  store_master: ['id', 'nome', 'cidade', 'uf', 'transportadoraPadrao', 'transportadorapadrao', 'observacoes', 'created_at', 'updated_at'],
  setores: ['id', 'numero', 'nome', 'resp', 'fotoLider', 'fotolider', 'meta', 'horario', 'situacao', 'ativ', 'promessa', 'varFin', 'varfin', 'bsi', 'nota5s', 'errosPicking', 'errospicking', 'reproTotal', 'reprototal', 'infracaoSeguranca', 'infracaoseguranca', 'horasDKT', 'horasdkt', 'poliRec', 'polirec', 'rdl', 'poliSaid', 'polisaid', 'coletado', 'uph', 'created_at', 'updated_at'],
  lista_coleta: ['lista', 'loja', 'setor', 'corte', 'carregamento', 'transportadora', 'volumes', 'enderecos', 'atividadeRelacionada', 'atividaderelacionada', 'created_at', 'updated_at'],
  radar_lojas_status: ['lista', 'created_at', 'updated_at', 'updated_by'],
  store_operations: ['id', 'programacaoId', 'programacao_id', 'lojaId', 'loja_id', 'nomeLoja', 'nome_loja', 'setor', 'transportadora', 'corte', 'carregamento', 'volumes', 'enderecos', 'atividadeRelacionada', 'atividade_relacionada', 'statusSoltura', 'status_soltura', 'horarioSoltura', 'horario_soltura', 'soltoPor', 'solto_por', 'statusColeta', 'status_coleta', 'horarioColeta', 'horario_coleta', 'coletadoPor', 'coletado_por', 'statusCarregamento', 'status_carregamento', 'horarioCarregamento', 'horario_carregamento', 'carregadoPor', 'carregado_por', 'statusExpedicao', 'status_expedicao', 'perdeuCorte', 'perdeu_corte', 'updated_at', 'updated_by', 'created_at'],
  atividade_loja: ['id', 'setor', 'updated_at', 'created_at'],
  usuarios: ['id', 'email', 'nome', 'role', 'setoresAutorizados', 'setoresautorizados', 'situacao', 'cargo', 'unidade', 'avatar_url', 'created_at', 'updated_at'],
  colaboradores: ['id', 'nome', 'setor', 'status', 'cargo', 'horas', 'foto', 'created_at', 'updated_at'],
  escalas: ['id', 'colaborador_id', 'data', 'turno', 'status', 'created_at', 'updated_at'],
  escala_semanal: ['id', 'dia', 'created_at', 'updated_at'],
  capacidade: ['id', 'setor', 'abertura', 'fecho_hora', 'fechoHora', 'updated_at'],
  capacidade_operacional: ['id', 'setor', 'abertura', 'fecho_hora', 'fechoHora', 'updated_at'],
  escalas_referentes: ['id', 'dia', 'created_at', 'updated_at'],
  historico_consolidado: ['id', 'hora', 'semana', 'turno', 'setor', 'ativ', 'uph', 'repro', 'promessa', 'nota5s', 'nota_5s', 'erros', 'created_at', 'updated_at'],
  audit_logs: ['id', 'acao', 'usuario', 'campo', 'dispositivo', 'valorAnterior', 'valor_anterior', 'valorNovo', 'valor_novo', 'created_at']
};

export class SupabaseService {
  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;
  private static syncErrorHandlers: SyncErrorHandler[] = [];

  public static logSchema404Error(tableName: string, error: unknown): void {
    const realTable = this.getRealTableName(tableName);
    const errObj = error as { status?: number; code?: string; message?: string };
    const msg = String(errObj?.message || error || '');
    const code = String(errObj?.code || '');
    const is404 = errObj?.status === 404 || code === 'PGRST204' || code === '42P01' || msg.includes('404') || msg.includes('Could not find');
    
    if (is404) {
      console.error(`[Supabase 404 Schema Inspector] Tabela "${tableName}" (mapeada para "${realTable}") retornou ERRO 404 / Tabela ou Coluna Inexistente.`);
      console.error(`[Supabase 404 Schema Inspector] Mapeamento atual: ${tableName} -> ${realTable}. Colunas conhecidas no cliente:`, TABLE_COLUMNS[realTable] || TABLE_COLUMNS[tableName] || []);
      console.error(`[Supabase 404 Schema Inspector] Detalhes do Erro Supabase:`, error);
    }
  }

  public static getRealTableName(tableName: string): string {
    return TABLE_NAME_MAP[tableName] || tableName;
  }

  public static toDbRecord(tableName: string, record: Record<string, unknown>): Record<string, unknown> {
    const realTable = this.getRealTableName(tableName);
    const result: Record<string, unknown> = { ...record };

    if (realTable === 'setores') {
      if ('fotoLider' in result) { result.fotolider = result.fotoLider; delete result.fotoLider; }
      if ('varFin' in result) { result.varfin = result.varFin; delete result.varFin; }
      if ('errosPicking' in result) { result.errospicking = result.errosPicking; delete result.errosPicking; }
      if ('reproTotal' in result) { result.reprototal = result.reproTotal; delete result.reproTotal; }
      if ('infracaoSeguranca' in result) { result.infracaoseguranca = result.infracaoSeguranca; delete result.infracaoSeguranca; }
      if ('horasDKT' in result) { result.horasdkt = result.horasDKT; delete result.horasDKT; }
      if ('poliRec' in result) { result.polirec = result.poliRec; delete result.poliRec; }
      if ('poliSaid' in result) { result.polisaid = result.poliSaid; delete result.poliSaid; }
    } else if (realTable === 'usuarios') {
      if ('setoresAutorizados' in result) { result.setoresautorizados = result.setoresAutorizados; delete result.setoresAutorizados; }
      delete result.aprovado_por;
      delete result.data_aprovacao;
    } else if (realTable === 'store_master') {
      if ('transportadoraPadrao' in result) { result.transportadorapadrao = result.transportadoraPadrao; delete result.transportadoraPadrao; }
    } else if (realTable === 'lista_coleta') {
      if ('atividadeRelacionada' in result) { result.atividaderelacionada = result.atividadeRelacionada; delete result.atividadeRelacionada; }
    } else if (realTable === 'capacidade') {
      if ('setor_id' in result) { result.setor = result.setor_id; delete result.setor_id; }
      if ('fechoHora' in result) { result.fecho_hora = result.fechoHora; delete result.fechoHora; }
    } else if (realTable === 'store_operations') {
      if ('programacaoId' in result) { result.programacao_id = result.programacaoId; delete result.programacaoId; }
      if ('lojaId' in result) { result.loja_id = result.lojaId; delete result.lojaId; }
      if ('nomeLoja' in result) { result.nome_loja = result.nomeLoja; delete result.nomeLoja; }
      if ('atividadeRelacionada' in result) { result.atividade_relacionada = result.atividadeRelacionada; delete result.atividadeRelacionada; }
      if ('statusSoltura' in result) { result.status_soltura = result.statusSoltura; delete result.statusSoltura; }
      if ('horarioSoltura' in result) { result.horario_soltura = result.horarioSoltura; delete result.horarioSoltura; }
      if ('soltoPor' in result) { result.solto_por = result.soltoPor; delete result.soltoPor; }
      if ('statusColeta' in result) { result.status_coleta = result.statusColeta; delete result.statusColeta; }
      if ('horarioColeta' in result) { result.horario_coleta = result.horarioColeta; delete result.horarioColeta; }
      if ('coletadoPor' in result) { result.coletado_por = result.coletadoPor; delete result.coletadoPor; }
      if ('statusCarregamento' in result) { result.status_carregamento = result.statusCarregamento; delete result.statusCarregamento; }
      if ('horarioCarregamento' in result) { result.horario_carregamento = result.horarioCarregamento; delete result.horarioCarregamento; }
      if ('carregadoPor' in result) { result.carregado_por = result.carregadoPor; delete result.carregadoPor; }
      if ('statusExpedicao' in result) { result.status_expedicao = result.statusExpedicao; delete result.statusExpedicao; }
      if ('perdeuCorte' in result) { result.perdeu_corte = result.perdeuCorte; delete result.perdeuCorte; }
    } else if (realTable === 'historico_consolidado') {
      if ('nota5s' in result) { result.nota_5s = result.nota5s; delete result.nota5s; }
    } else if (realTable === 'audit_logs') {
      if ('valorAnterior' in result) { result.valor_anterior = result.valorAnterior; delete result.valorAnterior; }
      if ('valorNovo' in result) { result.valor_novo = result.valorNovo; delete result.valorNovo; }
    }

    return result;
  }

  public static fromDbRecord(tableName: string, record: Record<string, unknown>): Record<string, unknown> {
    const realTable = this.getRealTableName(tableName);
    const result: Record<string, unknown> = { ...record };

    if (realTable === 'setores') {
      if ('fotolider' in result && !('fotoLider' in result)) result.fotoLider = result.fotolider;
      if ('varfin' in result && !('varFin' in result)) result.varFin = result.varfin;
      if ('errospicking' in result && !('errosPicking' in result)) result.errosPicking = result.errospicking;
      if ('reprototal' in result && !('reproTotal' in result)) result.reproTotal = result.reprototal;
      if ('infracaoseguranca' in result && !('infracaoSeguranca' in result)) result.infracaoSeguranca = result.infracaoseguranca;
      if ('horasdkt' in result && !('horasDKT' in result)) result.horasDKT = result.horasdkt;
      if ('polirec' in result && !('poliRec' in result)) result.poliRec = result.polirec;
      if ('polisaid' in result && !('poliSaid' in result)) result.poliSaid = result.polisaid;
    } else if (realTable === 'usuarios') {
      if ('setoresautorizados' in result && !('setoresAutorizados' in result)) result.setoresAutorizados = result.setoresautorizados;
    } else if (realTable === 'store_master') {
      if ('transportadorapadrao' in result && !('transportadoraPadrao' in result)) result.transportadoraPadrao = result.transportadorapadrao;
    } else if (realTable === 'lista_coleta') {
      if ('atividaderelacionada' in result && !('atividadeRelacionada' in result)) result.atividadeRelacionada = result.atividaderelacionada;
    } else if (realTable === 'capacidade') {
      if ('setor' in result && !('setor_id' in result)) result.setor_id = result.setor;
      if ('fecho_hora' in result && !('fechoHora' in result)) result.fechoHora = result.fecho_hora;
    } else if (realTable === 'store_operations') {
      if ('programacao_id' in result && !('programacaoId' in result)) result.programacaoId = result.programacao_id;
      if ('loja_id' in result && !('lojaId' in result)) result.lojaId = result.lojaId;
      if ('nome_loja' in result && !('nomeLoja' in result)) result.nomeLoja = result.nome_loja;
      if ('atividade_relacionada' in result && !('atividadeRelacionada' in result)) result.atividadeRelacionada = result.atividade_relacionada;
      if ('status_soltura' in result && !('statusSoltura' in result)) result.statusSoltura = result.status_soltura;
      if ('horario_soltura' in result && !('horarioSoltura' in result)) result.horarioSoltura = result.horario_soltura;
      if ('solto_por' in result && !('soltoPor' in result)) result.soltoPor = result.solto_por;
      if ('status_coleta' in result && !('statusColeta' in result)) result.statusColeta = result.status_coleta;
      if ('horario_coleta' in result && !('horarioColeta' in result)) result.horarioColeta = result.horario_coleta;
      if ('coletado_por' in result && !('coletadoPor' in result)) result.coletadoPor = result.coletado_por;
      if ('status_carregamento' in result && !('statusCarregamento' in result)) result.statusCarregamento = result.status_carregamento;
      if ('horario_carregamento' in result && !('horarioCarregamento' in result)) result.horarioCarregamento = result.horario_carregamento;
      if ('carregado_por' in result && !('carregadoPor' in result)) result.carregadoPor = result.carregado_por;
      if ('status_expedicao' in result && !('statusExpedicao' in result)) result.statusExpedicao = result.status_expedicao;
      if ('perdeu_corte' in result && !('perdeuCorte' in result)) result.perdeuCorte = result.perdeu_corte;
    } else if (realTable === 'historico_consolidado') {
      if ('nota_5s' in result && !('nota5s' in result)) result.nota5s = result.nota_5s;
    } else if (realTable === 'audit_logs') {
      if ('valor_anterior' in result && !('valorAnterior' in result)) result.valorAnterior = result.valor_anterior;
      if ('valor_novo' in result && !('valorNovo' in result)) result.valorNovo = result.valor_novo;
    }

    return result;
  }

  public static onSyncError(handler: SyncErrorHandler): () => void {
    this.syncErrorHandlers.push(handler);
    return () => {
      this.syncErrorHandlers = this.syncErrorHandlers.filter(h => h !== handler);
    };
  }

  private static notifySyncError(alert: AlertLog): void {
    for (const handler of this.syncErrorHandlers) {
      try {
        handler(alert);
      } catch (err) {
        console.error('[SupabaseService] Erro ao disparar handler de syncError:', err);
      }
    }
  }

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
      throw new Error("Supabase client is not initialized. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) environment variables are defined.");
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

    if (LOCAL_ONLY_TABLES.has(tableName)) {
      const cached = await IndexedDBService.getAll<T>(tableName);
      if (cached.length > 0) return cached;
      if (defaultData.length > 0) {
        await IndexedDBService.putMany(tableName, defaultData);
        return defaultData;
      }
      return [];
    }

    const realTableName = this.getRealTableName(tableName);

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
          .from(realTableName)
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped = data.map((row) => this.fromDbRecord(tableName, row as Record<string, unknown>) as unknown as T);
          await IndexedDBService.putMany(tableName, mapped);
          return mapped;
        }
      } catch (err) {
        this.logSchema404Error(tableName, err);
        console.warn(`[Supabase] Failed to fetch table ${realTableName} (${tableName}) online. Falling back to cache.`, err);
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

    if (LOCAL_ONLY_TABLES.has(tableName)) {
      await IndexedDBService.put(tableName, finalizedRecord);
      return finalizedRecord as unknown as T;
    }

    const realTableName = this.getRealTableName(tableName);

    // Converte record do formato do App para o formato do DB e filtra colunas válidas
    const dbRecord = this.toDbRecord(tableName, finalizedRecord as Record<string, unknown>);
    const filteredRecord = this.filterRecordColumns(realTableName, dbRecord);

    // Salva record local no formato do App para a UI
    await IndexedDBService.put(tableName, finalizedRecord);

    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Gravando em "${tableName}" (${realTableName}) no cache local sem usuário autenticado.`);
      return finalizedRecord as unknown as T;
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

    if (isOnline()) {
      try {
        const client = this.getClient();
        const { error } = await client
          .from(realTableName)
          .upsert(filteredRecord);

        if (error) {
          const errMsg = error.message || '';
          if (error.code === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist')) {
            console.error(`[Supabase Sanitizer] [PGRST204] Erro de coluna inexistente ao salvar em ${realTableName}. Abortando inserção.`, error);
            const alertLog: AlertLog = {
              id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              prioridade: 'alta',
              titulo: 'Sincronização Descartada',
              descricao: `Alteração na tabela "${realTableName}" continha estrutura incompatível e foi descartada.`,
              setor: 'Sistema',
              hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              lido: false
            };
            this.notifySyncError(alertLog);
          } else {
            throw error;
          }
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string; code?: string };
        const errMsg = String(errObj?.message || err);
        const errCode = String(errObj?.code || '');
        if (errCode === 'PGRST204' || errMsg.includes('PGRST204') || errMsg.includes('column') || errMsg.includes('does not exist')) {
          console.error(`[Supabase Sanitizer] Descartando inserção inválida devido a erro PGRST204 de coluna inexistente na tabela ${realTableName}.`, err);
          const alertLog: AlertLog = {
            id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            prioridade: 'alta',
            titulo: 'Sincronização Descartada',
            descricao: `Alteração na tabela "${realTableName}" continha estrutura incompatível e foi descartada.`,
            setor: 'Sistema',
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            lido: false
          };
          this.notifySyncError(alertLog);
        } else {
          console.warn(`[Supabase Offline Fallback] Erro ao enviar diretamente para ${realTableName}:${docId}. Enfileirando.`, err);
          const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
          queue.push({ table: tableName, realTable: realTableName, record: filteredRecord, primaryKey: keyField, action: 'upsert' });
          localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
        }
      }
    } else {
      console.log(`[Supabase Offline] Queued update for ${tableName}:${docId}`);
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ table: tableName, realTable: realTableName, record: filteredRecord, primaryKey: keyField, action: 'upsert' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }

    return finalizedRecord as unknown as T;
  }

  public static async deleteRecord(tableName: string, keyVal: unknown, keyField: string = 'id'): Promise<void> {
    await this.garantirAuthPronto();

    const docId = String(keyVal);
    
    await IndexedDBService.delete(tableName, docId);

    if (LOCAL_ONLY_TABLES.has(tableName)) {
      return;
    }

    const realTableName = this.getRealTableName(tableName);

    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Removendo de "${tableName}" (${realTableName}) no cache local sem usuário autenticado.`);
      return;
    }

    if (isOnline()) {
      try {
        const client = this.getClient();
        const { error } = await client
          .from(realTableName)
          .delete()
          .eq(keyField, keyVal);

        if (error) throw error;
      } catch (err) {
        console.warn(`[Supabase Offline Fallback] Erro ao deletar diretamente de ${realTableName}:${docId}. Enfileirando.`, err);
        const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
        queue.push({ table: tableName, realTable: realTableName, keyVal, primaryKey: keyField, action: 'delete' });
        localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
      }
    } else {
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      queue.push({ table: tableName, realTable: realTableName, keyVal, primaryKey: keyField, action: 'delete' });
      localStorage.setItem("sys_radar_offline_queue", JSON.stringify(queue));
    }
  }

  public static subscribe(
    tableName: string, 
    callback: (payload: { table: string; event: 'INSERT' | 'UPDATE' | 'DELETE'; new: unknown; old?: unknown }) => void
  ): () => void {
    let channel: RealtimeChannel | null = null;
    let cancelado = false;

    if (LOCAL_ONLY_TABLES.has(tableName)) {
      return () => {};
    }

    const realTableName = this.getRealTableName(tableName);

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
        console.log(`[Supabase] Offline mode or client uninitialized: Real-time subscription to ${tableName} (${realTableName}) will fall back to local changes.`);
        return;
      }

      try {
        const client = this.getClient();
        channel = client.channel(`public:${realTableName}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: realTableName }, async (payload) => {
            const changeType = payload.eventType;
            const rawNewData = payload.new as Record<string, unknown> | null;
            const oldData = payload.old;
            
            if (changeType === 'INSERT' || changeType === 'UPDATE') {
              if (rawNewData) {
                const newData = SupabaseService.fromDbRecord(tableName, rawNewData);
                await IndexedDBService.put(tableName, newData);
                callback({
                  table: tableName,
                  event: changeType,
                  new: newData
                });
              }
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
        console.warn(`[Supabase] Failed to subscribe to ${tableName} (${realTableName}):`, err);
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
          const client = this.getClient() as unknown as {
            from: (table: string) => {
              upsert: (data: unknown) => Promise<{ error: { code?: string; message?: string } | null }>;
              delete: () => { eq: (col: string, val: unknown) => Promise<{ error: { code?: string; message?: string } | null }> };
            };
          };
          const tbl = item.table || item.tableName;
          if (LOCAL_ONLY_TABLES.has(tbl)) {
            continue;
          }
          const realTbl = item.realTable || this.getRealTableName(tbl);
          const pKey = item.primaryKey || item.keyField || 'id';
          const act = String(item.action || '').toLowerCase();

          if (act === 'upsert') {
            const dbRecord = this.toDbRecord(tbl, item.record);
            const filteredRecord = this.filterRecordColumns(realTbl, dbRecord);

            const { error } = await client
              .from(realTbl)
              .upsert(filteredRecord);

            if (error) {
              const errMsg = error.message || '';
              if (error.code === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist')) {
                console.error(`[Supabase Sync] [PGRST204] Coluna inexistente detectada na tabela ${realTbl}. Gerando alerta visual e removendo item inválido.`, error);
                const alertLog: AlertLog = {
                  id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  prioridade: 'alta',
                  titulo: 'Sincronização Descartada',
                  descricao: `Alteração na tabela "${realTbl}" continha estrutura incompatível e foi descartada da fila offline.`,
                  setor: 'Sistema',
                  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  lido: false
                };
                this.notifySyncError(alertLog);
                continue;
              }
              throw error;
            }
          } else if (act === 'delete') {
            const { error } = await client
              .from(realTbl)
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
            this.notifySyncError(alertLog);
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
