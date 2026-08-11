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
  const isSimOffline = localStorage.getItem("radar_sim_offline") === "true";
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
  'universos_trabalho',
  'plano_carregamento'
]);

const TABLE_COLUMNS: Record<string, string[]> = {
  store_master: ['id', 'nome', 'cidade', 'uf', 'transportadorapadrao', 'observacoes', 'created_at', 'updated_at'],
  setores: ['id', 'numero', 'nome', 'resp', 'fotolider', 'meta', 'horario', 'situacao', 'ativ', 'promessa', 'varfin', 'bsi', 'nota5s', 'errospicking', 'reprototal', 'infracaoseguranca', 'horasdkt', 'polirec', 'rdl', 'polisaid', 'coletado', 'uph', 'created_at', 'updated_at'],
  lista_coleta: ['lista', 'loja', 'setor', 'corte', 'carregamento', 'transportadora', 'volumes', 'enderecos', 'atividaderelacionada', 'created_at', 'updated_at'],
  radar_lojas_status: ['lista', 'status_soltura', 'horario_soltura', 'solto_por', 'status_coleta', 'horario_coleta', 'coletado_por', 'status_carregamento', 'horario_carregamento', 'carregado_por', 'status_expedicao', 'created_at', 'updated_at', 'updated_by'],
  plano_carregamento: ['id', 'data', 'dia_semana', 'hora_carregamento', 'cod_loja', 'nome_loja', 'created_at'],
  store_operations: ['id', 'programacao_id', 'loja_id', 'nome_loja', 'setor', 'transportadora', 'corte', 'carregamento', 'volumes', 'enderecos', 'atividade_relacionada', 'status_soltura', 'horario_soltura', 'solto_por', 'status_coleta', 'horario_coleta', 'coletado_por', 'status_carregamento', 'horario_carregamento', 'carregado_por', 'status_expedicao', 'perdeu_corte', 'updated_at', 'updated_by', 'created_at'],
  atividade_loja: ['id', 'setor', 'programacao_id', 'loja_id', 'tipo_atividade', 'colis_programados', 'colis_coletados', 'updated_at', 'created_at'],
  usuarios: ['id', 'email', 'nome', 'role', 'setoresautorizados', 'situacao', 'cargo', 'unidade', 'avatar_url', 'aprovado_por', 'data_aprovacao', 'created_at', 'updated_at'],
  colaboradores: ['id', 'nome', 'setor', 'status', 'cargo', 'horas', 'foto', 'created_at', 'updated_at'],
  escalas: ['id', 'colaborador_id', 'data', 'turno', 'status', 'created_at', 'updated_at'],
  escala_semanal: ['id', 'dia', 'referente_sb7', 'referente_volumosos', 'apoio', 'atualizado_em', 'updated_at', 'updated_by'],
  capacidade: ['id', 'setor', 'abertura', 'fecho_hora', 'updated_at'],
  capacidade_operacional: ['id', 'setor', 'abertura', 'fecho_hora', 'updated_at'],
  escalas_referentes: ['id', 'dia', 'referente_sb7', 'referente_volumosos', 'apoio', 'atualizado_em', 'updated_at', 'updated_by'],
  historico_consolidado: ['id', 'hora', 'semana', 'turno', 'setor', 'ativ', 'uph', 'repro', 'promessa', 'nota_5s', 'erros', 'created_at', 'updated_at'],
  audit_logs: ['id', 'acao', 'usuario', 'campo', 'dispositivo', 'valor_anterior', 'valor_novo', 'created_at', 'updated_at'],
  lideranca: ['id', 'nome', 'cargo', 'setor', 'contato', 'foto', 'created_at', 'updated_at'],
  override_operacional: ['chave', 'valor', 'created_at', 'updated_at'],
  activity_entries: ['id', 'sector_id', 'activity_date', 'user_id', 'alimento', 'montanha', 'l7_mochila', 'elog', 'reapro', 'colis', 'adhoc_categories', 'created_at', 'updated_at'],
  painel_producao: ['id', 'sector_id', 'upload_date', 'feito_hoje', 'feito_ontem', 'maquina_full', 'rafale_full', 'uploaded_by', 'arquivo_nome', 'created_at', 'updated_at'],
  matriz_performance: ['id', 'setor', 'semana', 'ano', 'pilotagem', 'volume_que_caiu', 'percentual', 'horas_planning', 'horas_terceiros', 'poli_entrada', 'poli_saida', 'capacidade', 'total_coletado', 'produtividade', 'promessa', 'lead_time', 'aderencia', 'created_at', 'updated_at'],
  conexoes: ['id', 'nome', 'tipo', 'url', 'credenciais', 'configuracao', 'destino', 'status', 'ultima_sincronizacao', 'registros', 'created_at', 'updated_at'],
  sync_logs: ['id', 'conexao_id', 'data_inicio', 'data_fim', 'status', 'registros_afetados', 'mensagem_erro', 'created_at']
};

export class SupabaseService {
  public static async checkConnection(): Promise<boolean> {
    if (isStaticBuild) return false;
    if (!navigator.onLine) return false;
    try {
      const { error } = await supabase.from('setores').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private static authState: AuthState = 'loading';
  private static authStateListeners: Set<(state: AuthState) => void> = new Set();
  private static initializedAuthObserver = false;
  private static syncErrorHandlers: SyncErrorHandler[] = [];
  private static remoteSchemaCache: Map<string, Set<string>> = new Map();
  private static isProcessingQueue = false;
  private static queueCooldownUntil = 0;

  public static registerRemoteColumns(tableName: string, keys: string[]): void {
    const realTable = this.getRealTableName(tableName);
    if (!keys || keys.length === 0) return;
    const existing = this.remoteSchemaCache.get(realTable) || new Set<string>();
    keys.forEach((k) => existing.add(k));
    this.remoteSchemaCache.set(realTable, existing);
  }

  public static removeInvalidColumnFromCache(tableName: string, colName: string): void {
    const realTable = this.getRealTableName(tableName);
    if (TABLE_COLUMNS[realTable]) {
      TABLE_COLUMNS[realTable] = TABLE_COLUMNS[realTable].filter((c) => c !== colName);
    }
    if (TABLE_COLUMNS[tableName]) {
      TABLE_COLUMNS[tableName] = TABLE_COLUMNS[tableName].filter((c) => c !== colName);
    }
    const cached = this.remoteSchemaCache.get(realTable);
    if (cached) {
      cached.delete(colName);
    }
  }

  private static extractInvalidColumnFromError(errMsg: string): string | null {
    const colMatch =
      errMsg.match(/find the ['"]([^'"]+)['"] column/i) ||
      errMsg.match(/column ['"]([^'"]+)['"]/i) ||
      errMsg.match(/coluna ['"]([^'"]+)['"]/i) ||
      errMsg.match(/['"]([^'"]+)['"] column/i) ||
      errMsg.match(/['"]([^'"]+)['"] coluna/i);
    if (colMatch && colMatch[1]) {
      const col = colMatch[1].trim();
      if (col && col !== 'of' && col !== 'table' && col !== 'the' && col !== 'schema' && col !== 'in') {
        return col;
      }
    }
    return null;
  }

  public static enqueueOperation(item: {
    table: string;
    realTable: string;
    action: 'upsert' | 'delete';
    record?: Record<string, unknown>;
    primaryKey?: string;
    keyVal?: unknown;
  }): void {
    try {
      const queueStr = localStorage.getItem("radar_offline_queue");
      const queue = queueStr ? JSON.parse(queueStr) : [];
      queue.push({
        ...item,
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("radar_offline_queue", JSON.stringify(queue));
    } catch (e) {
      console.error("[Supabase Queue] Erro ao enfileirar operação:", e);
    }
  }

  public static getQueueLength(): number {
    try {
      const queueStr = localStorage.getItem("radar_offline_queue");
      if (!queueStr) return 0;
      const queue = JSON.parse(queueStr);
      return Array.isArray(queue) ? queue.length : 0;
    } catch {
      return 0;
    }
  }

  public static logDatabaseDiagnostics(tableName: string, operation: 'fetch' | 'upsert' | 'delete', error: unknown, payload?: Record<string, unknown>): void {
    const realTable = this.getRealTableName(tableName);
    const errObj = error as { status?: number; code?: string; message?: string; details?: string; hint?: string };
    const code = String(errObj?.code || '');
    const status = errObj?.status;
    const msg = String(errObj?.message || error || '');
    const details = errObj?.details || null;
    const hint = errObj?.hint || null;

    let errorCategory = 'ERRO DE OPERAÇÃO';
    if (code === 'PGRST205' || code === '42P01' || status === 404 || msg.includes('404') || msg.includes('Could not find')) {
      console.warn(`[Supabase Fallback] Tabela "${tableName}" não encontrada no Supabase (${code}). Operação mantida no cache local.`);
      return;
    } else if (code === '42501' || msg.includes('row-level security') || msg.includes('RLS')) {
      console.warn(`[Supabase Fallback] Acesso à tabela "${tableName}" restrito por RLS (${code}). Operação mantida no cache local.`);
      return;
    } else if (code === 'PGRST204' || msg.includes('column') || msg.includes('does not exist')) {
      errorCategory = 'PGRST204 (COLUNA INEXISTENTE NA TABELA)';
    } else if (code === '22P02' || msg.includes('uuid') || msg.includes('invalid input syntax')) {
      errorCategory = '22P02 (TIPO DE DADO INCOMPATÍVEL / SINTAXE DE COLUNA INVALIDA - Ex: UUID)';
    }

    console.error(`🚨 [Supabase Diagnostic Log] ${errorCategory} na operação "${operation}" na tabela "${tableName}" (DB table: "${realTable}")`);
    console.error(`  📌 Código do Erro: ${code || 'N/A'} | HTTP Status: ${status || 'N/A'}`);
    console.error(`  📌 Mensagem: ${msg}`);
    if (details) console.error(`  📌 Detalhes: ${details}`);
    if (hint) console.error(`  📌 Dica (Hint): ${hint}`);
    console.error(`  📌 Colunas permitidas no mapa local:`, TABLE_COLUMNS[realTable] || TABLE_COLUMNS[tableName] || []);
    if (payload) {
      console.error(`  📌 Chaves enviadas no Payload:`, Object.keys(payload));
      console.error(`  📌 Conteúdo do Payload enviado:`, payload);
    }
  }

  public static logSchema404Error(tableName: string, error: unknown): void {
    this.logDatabaseDiagnostics(tableName, 'fetch', error);
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
      if ('erros_picking' in result) { result.errospicking = result.erros_picking; delete result.erros_picking; }
      if ('reproTotal' in result) { result.reprototal = result.reproTotal; delete result.reproTotal; }
      if ('repro_total' in result) { result.reprototal = result.repro_total; delete result.repro_total; }
      if ('infracaoSeguranca' in result) { result.infracaoseguranca = result.infracaoSeguranca; delete result.infracaoSeguranca; }
      if ('horasDKT' in result) { result.horasdkt = result.horasDKT; delete result.horasDKT; }
      if ('poliRec' in result) { result.polirec = result.poliRec; delete result.poliRec; }
      if ('poliSaid' in result) { result.polisaid = result.poliSaid; delete result.poliSaid; }
      if ('nota_5s' in result) { result.nota5s = result.nota_5s; delete result.nota_5s; }
      if ('equipe' in result) { delete result.equipe; }
      if ('capacidade' in result) { delete result.capacidade; }
    } else if (realTable === 'usuarios') {
      if (!Array.isArray(result.setoresAutorizados)) {
        if (typeof result.setoresAutorizados === 'string' && (result.setoresAutorizados as string).trim() !== '') {
          result.setoresAutorizados = [(result.setoresAutorizados as string).trim()];
        } else {
          result.setoresAutorizados = [];
        }
      }
      if ('setoresAutorizados' in result) { result.setoresautorizados = result.setoresAutorizados; delete result.setoresAutorizados; }
      if ('role' in result && typeof result.role === 'string') {
        const r = String(result.role).trim().toLowerCase();
        if (r === 'admin' || r === 'admin') result.role = 'Admin';
        else if (r === 'coordenador' || r === 'supervisor') result.role = 'Supervisor';
        else if (r === 'operador' || r === 'referente' || r === 'operacao' || r === 'expedicao') result.role = 'Operador';
        else result.role = 'Consulta';
      }
    } else if (realTable === 'audit_logs') {
      if ('id' in result && typeof result.id === 'string' && result.id.startsWith('aud-')) {
        delete result.id;
      }
      if ('valorAnterior' in result) { result.valor_anterior = result.valorAnterior; delete result.valorAnterior; }
      if ('valorNovo' in result) { result.valor_novo = result.valorNovo; delete result.valorNovo; }
      if ('data' in result) {
        if (!result.created_at) {
          result.created_at = result.data;
        }
        delete result.data;
      }
    } else if (realTable === 'store_master') {
      if ('transportadoraPadrao' in result) { result.transportadorapadrao = result.transportadoraPadrao; delete result.transportadoraPadrao; }
    } else if (realTable === 'lista_coleta') {
      if ('atividadeRelacionada' in result) { result.atividaderelacionada = result.atividadeRelacionada; delete result.atividadeRelacionada; }
    } else if (realTable === 'radar_lojas_status') {
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
    } else if (realTable === 'capacidade') {
      if ('setor_id' in result) { result.setor = result.setor_id; delete result.setor_id; }
      if ('fechoHora' in result) { result.fecho_hora = result.fechoHora; delete result.fechoHora; }
    } else if (realTable === 'plano_carregamento') {
      if ('diaSemana' in result) { result.dia_semana = result.diaSemana; delete result.diaSemana; }
      if ('horaCarregamento' in result) { result.hora_carregamento = result.horaCarregamento; delete result.horaCarregamento; }
      if ('codLoja' in result) { result.cod_loja = result.codLoja; delete result.codLoja; }
      if ('nomeLoja' in result) { result.nome_loja = result.nomeLoja; delete result.nomeLoja; }
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
    } else if (realTable === 'atividade_loja') {
      if ('programacaoId' in result) { result.programacao_id = result.programacaoId; delete result.programacaoId; }
      if ('lojaId' in result) { result.loja_id = result.lojaId; delete result.lojaId; }
      if ('tipoAtividade' in result) { result.tipo_atividade = result.tipoAtividade; delete result.tipoAtividade; }
      if ('colisProgramados' in result) { result.colis_programados = result.colisProgramados; delete result.colisProgramados; }
      if ('colisColetados' in result) { result.colis_coletados = result.colisColetados; delete result.colisColetados; }
    } else if (realTable === 'historico_consolidado') {
      if ('nota5s' in result) { result.nota_5s = result.nota5s; delete result.nota5s; }
    } else if (realTable === 'escala_semanal') {
      if ('ref87' in result) { result.referente_sb7 = result.ref87; delete result.ref87; }
      if ('referenteSB7' in result) { result.referente_sb7 = result.referenteSB7; delete result.referenteSB7; }
      if ('refVol' in result) { result.referente_volumosos = result.refVol; delete result.refVol; }
      if ('referenteVolumosos' in result) { result.referente_volumosos = result.referenteVolumosos; delete result.referenteVolumosos; }
      if ('apoios' in result) { result.apoio = result.apoios; delete result.apoios; }
      if ('updated_at' in result) { result.atualizado_em = result.updated_at; delete result.updated_at; }
    } else if (realTable === 'audit_logs') {
      if ('valorAnterior' in result) { result.valor_anterior = result.valorAnterior; delete result.valorAnterior; }
      if ('valorNovo' in result) { result.valor_novo = result.valorNovo; delete result.valorNovo; }
    } else if (realTable === 'activity_entries') {
      if ('sectorId' in result) { result.sector_id = result.sectorId; delete result.sectorId; }
      if ('activityDate' in result) { result.activity_date = result.activityDate; delete result.activityDate; }
      if ('userId' in result) { result.user_id = result.userId; delete result.userId; }
      if ('l7Mochila' in result) { result.l7_mochila = result.l7Mochila; delete result.l7Mochila; }
      if ('adhocCategories' in result) { result.adhoc_categories = result.adhocCategories; delete result.adhocCategories; }
      if ('createdAt' in result) { result.created_at = result.createdAt; delete result.createdAt; }
      if ('updatedAt' in result) { result.updated_at = result.updatedAt; delete result.updatedAt; }
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
      if ('role' in result && typeof result.role === 'string') {
        const r = String(result.role).trim().toLowerCase();
        if (r === 'admin') result.role = 'admin';
        else if (r === 'supervisor' || r === 'coordenador') result.role = 'coordenador';
        else if (r === 'operador') result.role = 'operador';
        else result.role = 'consulta';
      }
    } else if (realTable === 'audit_logs') {
      if ('valor_anterior' in result && !('valorAnterior' in result)) result.valorAnterior = result.valor_anterior;
      if ('valor_novo' in result && !('valorNovo' in result)) result.valorNovo = result.valor_novo;
      if ('created_at' in result && !('data' in result)) result.data = result.created_at;
    } else if (realTable === 'activity_entries') {
      if ('sector_id' in result && !('sectorId' in result)) result.sectorId = result.sector_id;
      if ('activity_date' in result && !('activityDate' in result)) result.activityDate = result.activity_date;
      if ('user_id' in result && !('userId' in result)) result.userId = result.user_id;
      if ('l7_mochila' in result && !('l7Mochila' in result)) result.l7Mochila = result.l7_mochila;
      if ('adhoc_categories' in result && !('adhocCategories' in result)) result.adhocCategories = result.adhoc_categories;
      if ('created_at' in result && !('createdAt' in result)) result.createdAt = result.created_at;
      if ('updated_at' in result && !('updatedAt' in result)) result.updatedAt = result.updated_at;
    } else if (realTable === 'store_master') {
      if ('transportadorapadrao' in result && !('transportadoraPadrao' in result)) result.transportadoraPadrao = result.transportadorapadrao;
    } else if (realTable === 'lista_coleta') {
      if ('atividaderelacionada' in result && !('atividadeRelacionada' in result)) result.atividadeRelacionada = result.atividaderelacionada;
    } else if (realTable === 'radar_lojas_status') {
      if ('status_soltura' in result && !('statusSoltura' in result)) result.statusSoltura = result.status_soltura;
      if ('statussoltura' in result && !('statusSoltura' in result)) result.statusSoltura = result.statussoltura;
      if ('horario_soltura' in result && !('horarioSoltura' in result)) result.horarioSoltura = result.horario_soltura;
      if ('horariosoltura' in result && !('horarioSoltura' in result)) result.horarioSoltura = result.horariosoltura;
      if ('solto_por' in result && !('soltoPor' in result)) result.soltoPor = result.solto_por;
      if ('soltopor' in result && !('soltoPor' in result)) result.soltoPor = result.soltopor;
      if ('status_coleta' in result && !('statusColeta' in result)) result.statusColeta = result.status_coleta;
      if ('statuscoleta' in result && !('statusColeta' in result)) result.statusColeta = result.statuscoleta;
      if ('horario_coleta' in result && !('horarioColeta' in result)) result.horarioColeta = result.horario_coleta;
      if ('horariocoleta' in result && !('horarioColeta' in result)) result.horarioColeta = result.horariocoleta;
      if ('coletado_por' in result && !('coletadoPor' in result)) result.coletadoPor = result.coletado_por;
      if ('coletadopor' in result && !('coletadoPor' in result)) result.coletadoPor = result.coletadopor;
      if ('status_carregamento' in result && !('statusCarregamento' in result)) result.statusCarregamento = result.status_carregamento;
      if ('statuscarregamento' in result && !('statusCarregamento' in result)) result.statusCarregamento = result.statuscarregamento;
      if ('horario_carregamento' in result && !('horarioCarregamento' in result)) result.horarioCarregamento = result.horario_carregamento;
      if ('horariocarregamento' in result && !('horarioCarregamento' in result)) result.horarioCarregamento = result.horariocarregamento;
      if ('carregado_por' in result && !('carregadoPor' in result)) result.carregadoPor = result.carregado_por;
      if ('carregadopor' in result && !('carregadoPor' in result)) result.carregadoPor = result.carregadopor;
      if ('status_expedicao' in result && !('statusExpedicao' in result)) result.statusExpedicao = result.status_expedicao;
      if ('statusexpedicao' in result && !('statusExpedicao' in result)) result.statusExpedicao = result.statusexpedicao;
    } else if (realTable === 'capacidade') {
      if ('setor' in result && !('setor_id' in result)) result.setor_id = result.setor;
      if ('fecho_hora' in result && !('fechoHora' in result)) result.fechoHora = result.fecho_hora;
    } else if (realTable === 'store_operations') {
      if ('programacao_id' in result && !('programacaoId' in result)) result.programacaoId = result.programacao_id;
      if ('loja_id' in result && !('lojaId' in result)) result.lojaId = result.loja_id;
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
    } else if (realTable === 'atividade_loja') {
      if ('programacao_id' in result && !('programacaoId' in result)) result.programacaoId = result.programacao_id;
      if ('loja_id' in result && !('lojaId' in result)) result.lojaId = result.loja_id;
      if ('tipo_atividade' in result && !('tipoAtividade' in result)) result.tipoAtividade = result.tipo_atividade;
      if ('colis_programados' in result && !('colisProgramados' in result)) result.colisProgramados = result.colis_programados;
      if ('colis_coletados' in result && !('colisColetados' in result)) result.colisColetados = result.colis_coletados;
    } else if (realTable === 'historico_consolidado') {
      if ('nota_5s' in result && !('nota5s' in result)) result.nota5s = result.nota_5s;
    } else if (realTable === 'escala_semanal') {
      if ('referente_sb7' in result) { result.ref87 = result.referente_sb7; result.referenteSB7 = result.referente_sb7; }
      if ('referente_volumosos' in result) { result.refVol = result.referente_volumosos; result.referenteVolumosos = result.referente_volumosos; }
      if ('apoio' in result) { result.apoios = result.apoio; }
      if ('atualizado_em' in result) { result.updated_at = result.atualizado_em; }
    } else if (realTable === 'audit_logs') {
      if ('valor_anterior' in result && !('valorAnterior' in result)) result.valorAnterior = result.valor_anterior;
      if ('valor_novo' in result && !('valorNovo' in result)) result.valorNovo = result.valor_novo;
    } else if (realTable === 'activity_entries') {
      if ('sector_id' in result && !('sectorId' in result)) result.sectorId = result.sector_id;
      if ('activity_date' in result && !('activityDate' in result)) result.activityDate = result.activity_date;
      if ('user_id' in result && !('userId' in result)) result.userId = result.user_id;
      if ('l7_mochila' in result && !('l7Mochila' in result)) result.l7Mochila = result.l7_mochila;
      if ('adhoc_categories' in result && !('adhocCategories' in result)) result.adhocCategories = result.adhoc_categories;
      if ('created_at' in result && !('createdAt' in result)) result.createdAt = result.created_at;
      if ('updated_at' in result && !('updatedAt' in result)) result.updatedAt = result.updated_at;
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
    if (keyField.includes(',')) {
      const keys = keyField.split(',').map(k => k.trim());
      const vals = keys.map(k => record[k] || '');
      return vals.join('_');
    }
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
          this.registerRemoteColumns(realTableName, Object.keys(data[0] as Record<string, unknown>));
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
    const realTable = this.getRealTableName(tableName);
    const dbRecord = this.toDbRecord(tableName, record as Record<string, unknown>);

    const staticCols = TABLE_COLUMNS[realTable] || TABLE_COLUMNS[tableName];
    const dynamicCols = this.remoteSchemaCache.get(realTable);

    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(dbRecord)) {
      if (dynamicCols && dynamicCols.size > 0) {
        if (dynamicCols.has(key)) {
          filtered[key] = dbRecord[key];
        }
        continue;
      }

      if (staticCols && staticCols.length > 0) {
        if (staticCols.includes(key)) {
          filtered[key] = dbRecord[key];
        }
        continue;
      }

      filtered[key] = dbRecord[key];
    }

    return filtered;
  }

  public static async upsert<T>(
    tableName: string,
    recordOrRecords: T | T[],
    keyField?: string | undefined,
    onConflict?: string
  ): Promise<T | T[]> {
    if (Array.isArray(recordOrRecords)) {
      return Promise.all(recordOrRecords.map((r) => this.upsertRecord(tableName, r as any, keyField as any, onConflict)));
    }
    return this.upsertRecord(tableName, recordOrRecords as any, keyField as any, onConflict);
  }

  public static async upsertRecord<T extends { updated_at?: string; id?: unknown; lista?: string; key?: string; chave?: string }>(
    tableName: string,
    record: T,
    keyField?: keyof T | string,
    onConflict?: string
  ): Promise<T> {
    await this.garantirAuthPronto();

    let docId = '';
    if (keyField) {
      docId = this.getDocId(record as Record<string, unknown>, keyField as string);
    }
    const conflictTarget = onConflict || (keyField ? String(keyField) : 'id');

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
    const filteredRecord = this.filterRecordColumns(tableName, finalizedRecord);

    // Salva record local no formato do App para a UI
    await IndexedDBService.put(tableName, finalizedRecord);

    if (!auth.currentUser) {
      console.warn(`[Supabase Offline Fallback] Gravando em "${tableName}" (${realTableName}) no cache local sem usuário autenticado.`);
      return finalizedRecord as unknown as T;
    }

    if (docId) {
      const localExisting = await IndexedDBService.get<T>(tableName, docId);
      if (localExisting && localExisting.updated_at) {
        const localTime = new Date(localExisting.updated_at).getTime();
        const newTime = new Date(finalizedRecord.updated_at).getTime();
        if (newTime < localTime) {
          console.log(`[Supabase LWW] Newer record exists locally for ${tableName}:${docId}. Skipping update.`);
          return localExisting;
        }
      }
    }

    if (isOnline() && Date.now() >= this.queueCooldownUntil) {
      try {
        const client = this.getClient();
        const { data, error } = await client
          .from(realTableName)
          .upsert(filteredRecord, { onConflict: conflictTarget })
          .select()
          .maybeSingle();
        
        if (data) {
          this.registerRemoteColumns(realTableName, Object.keys(data as Record<string, unknown>));
          const dbRet = this.fromDbRecord(tableName, data) as unknown as T;
          await IndexedDBService.put(tableName, dbRet);
          return dbRet;
        }

        if (error) {
          const errMsg = String(error.message || '');
          const errCode = String(error.code || '');

          if (errCode === '42501' || errMsg.includes('row-level security')) {
            console.error(`[Supabase] Violacao RLS (42501) na tabela "${realTableName}". O usuario nao tem permissao. Gravado apenas no cache local.`);
            return finalizedRecord as unknown as T;
          }

          if (errCode === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist') || errMsg.includes('schema cache')) {
            const invalidCol = this.extractInvalidColumnFromError(errMsg);
            if (invalidCol) {
              console.warn(`[Supabase Sanitizer] [PGRST204] Coluna "${invalidCol}" inexistente na tabela ${realTableName}. Removendo e re-tentando...`);
              this.removeInvalidColumnFromCache(realTableName, invalidCol);

              const sanitized = this.filterRecordColumns(tableName, finalizedRecord);
              delete sanitized[invalidCol];

              const { data: retryData, error: retryErr } = await client
                .from(realTableName)
                .upsert(sanitized, { onConflict: conflictTarget })
                .select()
                .maybeSingle();

              if (!retryErr && retryData) {
                const dbRet = this.fromDbRecord(tableName, retryData) as unknown as T;
                await IndexedDBService.put(tableName, dbRet);
                return dbRet;
              }
            }

            console.error(`[Supabase Sanitizer] Erro PGRST204 ao salvar em ${realTableName}. Salvo apenas localmente.`, error);
            const alertLog: AlertLog = {
              id: `alert_pgrst204_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              prioridade: 'alta',
              titulo: 'Sincronização Descartada',
              descricao: `Alteração na tabela "${realTableName}" continha estrutura incompatível e foi gravada apenas no cache local.`,
              setor: 'Sistema',
              hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              lido: false
            };
            this.notifySyncError(alertLog);
            return finalizedRecord as unknown as T;
          }

          

              

              if (errCode === 'PGRST205' || errCode === '42P01' || errMsg.includes('Could not find')) {
            console.warn(`[Supabase] Tabela "${realTableName}" não existe no Supabase. Gravado apenas no cache local.`);
            return finalizedRecord as unknown as T;
          }

          throw error;
        }
      } catch (err: unknown) {
        this.logDatabaseDiagnostics(tableName, 'upsert', err, filteredRecord);
        console.warn(`[Supabase Queue] Instabilidade de rede ao salvar em ${realTableName}:${docId}. Enfileirando na fila de espera.`, err);
        this.queueCooldownUntil = Date.now() + 4000;
        this.enqueueOperation({
          table: tableName,
          realTable: realTableName,
          record: filteredRecord,
          primaryKey: conflictTarget,
          action: 'upsert'
        });
      }
    } else {
      console.log(`[Supabase Queue] Modo offline ou conexão instável (cooldown). Operação enfileirada para ${tableName}:${docId}`);
      this.enqueueOperation({
        table: tableName,
        realTable: realTableName,
        record: filteredRecord,
        primaryKey: conflictTarget,
        action: 'upsert'
      });
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

    if (isOnline() && Date.now() >= this.queueCooldownUntil) {
      try {
        const client = this.getClient();
        const { error } = await client
          .from(realTableName)
          .delete()
          .eq(keyField, keyVal);

        if (error) {
          const errMsg = String(error.message || '');
          const errCode = String(error.code || '');

          if (errCode === '42501' || errMsg.includes('row-level security')) {
            console.error(`[Supabase] Violacao RLS (42501) na tabela "${realTableName}". O usuario nao tem permissao. Exclusão feita apenas no cache local.`);
            return;
          }

          if (errCode === 'PGRST205' || errCode === '42P01' || errMsg.includes('Could not find')) {
            return;
          }
          throw error;
        }
      } catch (err) {
        console.warn(`[Supabase Queue] Erro ou instabilidade ao deletar de ${realTableName}:${docId}. Enfileirando.`, err);
        this.queueCooldownUntil = Date.now() + 4000;
        this.enqueueOperation({
          table: tableName,
          realTable: realTableName,
          keyVal,
          primaryKey: keyField,
          action: 'delete'
        });
      }
    } else {
      this.enqueueOperation({
        table: tableName,
        realTable: realTableName,
        keyVal,
        primaryKey: keyField,
        action: 'delete'
      });
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

  public static subscribeToTable(tableName: string, callback: () => void): { unsubscribe: () => void } {
    const unsub = this.subscribe(tableName, () => callback());
    return { unsubscribe: unsub };
  }

  public static async flushOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (!isOnline()) return;
    if (Date.now() < this.queueCooldownUntil) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const queueStr = localStorage.getItem("radar_offline_queue");
      if (!queueStr) {
        this.isProcessingQueue = false;
        return;
      }

      const queue = JSON.parse(queueStr);
      if (!Array.isArray(queue) || queue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      console.log(`[Supabase Sync] Processando ${queue.length} alterações na fila de salvamento...`);
      const remainingQueue = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const tbl = item.table || item.tableName;
        if (LOCAL_ONLY_TABLES.has(tbl)) {
          continue;
        }

        if (!isOnline()) {
          remainingQueue.push(...queue.slice(i));
          break;
        }

        const realTbl = item.realTable || this.getRealTableName(tbl);
        const pKey = item.primaryKey || item.keyField || 'id';
        const act = String(item.action || 'upsert').toLowerCase();

        try {
          const client = this.getClient() as any;

          if (act === 'upsert' && item.record) {
            const filteredRecord = this.filterRecordColumns(tbl, item.record);

            const { error } = await client
              .from(realTbl)
              .upsert(filteredRecord, { onConflict: pKey });

            if (error) {
              const errMsg = String(error.message || '');
              const errCode = String(error.code || '');


              
                            if (errCode === '42501' || errMsg.includes('row-level security')) {
                console.error(`[Supabase Sync] Violacao RLS (42501) na tabela "${realTbl}". O usuario nao tem permissao. Descartando da fila.`);
                const alertLog = {
                  id: `alert_rls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  prioridade: 'alta' as const,
                  titulo: 'Falha de Permissão (RLS)',
                  descricao: `Tentativa de salvar na tabela "${realTbl}" negada pelo banco de dados (Acesso Negado).`,
                  setor: 'Sistema',
                  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  lido: false
                };
                this.notifySyncError(alertLog);
                continue;
              }

              if (errCode === 'PGRST204' || errMsg.includes('column') || errMsg.includes('does not exist')) {
                const invalidCol = this.extractInvalidColumnFromError(errMsg);
                if (invalidCol) {
                  console.warn(`[Supabase Sync] Coluna "${invalidCol}" inexistente na tabela "${realTbl}". Removendo do esquema e re-tentando...`);
                  this.removeInvalidColumnFromCache(realTbl, invalidCol);

                  const sanitized = this.filterRecordColumns(tbl, item.record);
                  const { error: retryErr } = await client
                    .from(realTbl)
                    .upsert(sanitized, { onConflict: pKey });

                  if (!retryErr) {
                    console.log(`[Supabase Sync] Reenvio sanitizado para "${realTbl}" concluído.`);
                    continue;
                  }
                }

                console.error(`[Supabase Sync] [PGRST204] Estrutura incompatível na tabela ${realTbl}. Descartando da fila.`, error);
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

              if (errCode === 'PGRST205' || errCode === '42P01' || errMsg.includes('Could not find')) {
                console.warn(`[Supabase Sync] Tabela "${realTbl}" não existe no Supabase. Descartando da fila.`);
                continue;
              }

              throw error;
            }
          } else if (act === 'delete' && item.keyVal) {
            const { error } = await client
              .from(realTbl)
              .delete()
              .eq(pKey, item.keyVal);

            if (error) {
              const errMsg = String(error.message || '');
              const errCode = String(error.code || '');

              
              if (errCode === '42501' || errMsg.includes('row-level security')) {
                console.error(`[Supabase Sync] Violacao RLS (42501) na tabela "${realTbl}". O usuario nao tem permissao. Descartando da fila.`);
                const alertLog = {
                  id: `alert_rls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  prioridade: 'alta' as const,
                  titulo: 'Falha de Permissão (RLS)',
                  descricao: `Tentativa de salvar na tabela "${realTbl}" negada pelo banco de dados (Acesso Negado).`,
                  setor: 'Sistema',
                  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  lido: false
                };
                this.notifySyncError(alertLog);
                continue;
              }

if (errCode === 'PGRST205' || errCode === '42P01' || errMsg.includes('Could not find')) {
                continue;
              }
              throw error;
            }
          }
        } catch (err: unknown) {
          console.warn(`[Supabase Sync] Instabilidade de rede ao sincronizar item para "${tbl}". Ativando cooldown de 4s.`, err);
          this.queueCooldownUntil = Date.now() + 4000;
          remainingQueue.push(...queue.slice(i));
          break;
        }
      }

      if (remainingQueue.length > 0) {
        localStorage.setItem("radar_offline_queue", JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem("radar_offline_queue");
        console.log(`[Supabase Sync] Sincronização offline concluída com sucesso.`);
      }
    } catch (e) {
      console.error("[Supabase Sync] Erro ao analisar fila offline:", e);
    } finally {
      this.isProcessingQueue = false;
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
