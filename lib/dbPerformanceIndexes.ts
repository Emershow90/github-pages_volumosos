/**
 * dbPerformanceIndexes.ts
 * 
 * Database Index Catalog & N+1 Optimization Engine for Torre de Comando.
 * Defines the 80/20 critical SQL indexes for PostgreSQL / Supabase,
 * plus batch query utilities to eliminate N+1 roundtrips.
 */

export interface DatabaseIndexDefinition {
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique?: boolean;
  purpose: string;
  sql: string;
}

export const RECOMMENDED_DB_INDEXES: DatabaseIndexDefinition[] = [
  {
    tableName: 'painel_producao',
    indexName: 'idx_painel_producao_sector_date_turno',
    columns: ['sector_id', 'upload_date', 'turno'],
    isUnique: true,
    purpose: 'O(1) upsert e busca instantânea do monitor de setores por data, setor e turno',
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_painel_producao_sector_date_turno ON painel_producao (sector_id, upload_date, COALESCE(turno, \'1\'));'
  },
  {
    tableName: 'store_operations',
    indexName: 'idx_store_operations_setor_status',
    columns: ['setor', 'status_coleta', 'corte'],
    purpose: 'Elimina full table scans no Radar Live durante filtragem por setor e janela de corte',
    sql: 'CREATE INDEX IF NOT EXISTS idx_store_operations_setor_status ON store_operations (setor, status_coleta, corte);'
  },
  {
    tableName: 'store_operations',
    indexName: 'idx_store_operations_programacao_loja',
    columns: ['programacao_id', 'loja_id'],
    purpose: 'Resolução de N+1 durante atualização em lote de lojas e programações',
    sql: 'CREATE INDEX IF NOT EXISTS idx_store_operations_programacao_loja ON store_operations (programacao_id, loja_id);'
  },
  {
    tableName: 'activity_entries',
    indexName: 'idx_activity_entries_sector_date',
    columns: ['sector_id', 'activity_date'],
    purpose: 'Busca rápida de universos de produtos (Alimento/Montanha/Colis) por setor e dia',
    sql: 'CREATE INDEX IF NOT EXISTS idx_activity_entries_sector_date ON activity_entries (sector_id, activity_date);'
  },
  {
    tableName: 'colaboradores',
    indexName: 'idx_colaboradores_setor_status',
    columns: ['setor', 'status'],
    purpose: 'Cálculo de operadores ativos e escala por setor sem iterar tabela completa',
    sql: 'CREATE INDEX IF NOT EXISTS idx_colaboradores_setor_status ON colaboradores (setor, status);'
  },
  {
    tableName: 'historico_consolidado',
    indexName: 'idx_historico_consolidado_setor_semana',
    columns: ['setor', 'semana', 'created_at'],
    purpose: 'Agregação rápida de séries temporais para o módulo de Analytics e Previsão IA',
    sql: 'CREATE INDEX IF NOT EXISTS idx_historico_consolidado_setor_semana ON historico_consolidado (setor, semana, created_at DESC);'
  },
  {
    tableName: 'audit_logs',
    indexName: 'idx_audit_logs_created_at',
    columns: ['created_at'],
    purpose: 'Paginação e exportação de logs de auditoria ordenados por tempo',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);'
  },
  {
    tableName: 'audit_logs',
    indexName: 'idx_audit_logs_usuario',
    columns: ['usuario', 'created_at'],
    purpose: 'Filtragem rápida de logs de auditoria por operador / usuário',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs (usuario, created_at DESC);'
  },
  {
    tableName: 'consolidado_diario',
    indexName: 'idx_consolidado_data',
    columns: ['data'],
    purpose: 'Busca rápida de registros diários em ordem cronológica reversa',
    sql: 'CREATE INDEX IF NOT EXISTS idx_consolidado_data ON consolidado_diario(data DESC);'
  },
  {
    tableName: 'consolidado_diario',
    indexName: 'idx_consolidado_semana',
    columns: ['semana', 'data'],
    purpose: 'Filtragem de consolidados por semana operacional',
    sql: 'CREATE INDEX IF NOT EXISTS idx_consolidado_semana ON consolidado_diario(semana, data DESC);'
  },
  {
    tableName: 'consolidado_diario',
    indexName: 'idx_consolidado_status',
    columns: ['status_geral', 'data'],
    purpose: 'Agrupamento estatístico por status de qualidade operacional',
    sql: 'CREATE INDEX IF NOT EXISTS idx_consolidado_status ON consolidado_diario(status_geral, data DESC);'
  }
];

/**
 * Generate full DDL script to run in PostgreSQL / Supabase SQL Editor
 */
export function generateDatabaseIndexDDL(): string {
  return [
    '-- =========================================================',
    '-- TORRE DE COMANDO VOLUMOSOS - ÍNDICES DE PERFORMANCE (80/20)',
    '-- Otimização contra N+1 queries e table scans',
    '-- =========================================================',
    '',
    ...RECOMMENDED_DB_INDEXES.map(idx => `${idx.sql} -- ${idx.purpose}`)
  ].join('\n');
}

/**
 * Helper to execute batch lookups without N+1 requests
 */
export async function batchResolve<K, V>(
  keys: K[],
  batchFetchFn: (keys: K[]) => Promise<Map<K, V> | Record<string, V>>,
  keyExtractor?: (item: K) => string
): Promise<Map<K, V>> {
  if (keys.length === 0) return new Map();

  const uniqueKeys = Array.from(new Set(keys));
  const rawResult = await batchFetchFn(uniqueKeys);

  const resultMap = new Map<K, V>();

  if (rawResult instanceof Map) {
    return rawResult;
  }

  for (const k of uniqueKeys) {
    const keyStr = keyExtractor ? keyExtractor(k) : String(k);
    if (rawResult[keyStr] !== undefined) {
      resultMap.set(k, rawResult[keyStr]);
    }
  }

  return resultMap;
}
