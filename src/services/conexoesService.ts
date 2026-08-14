import { fetchPublicSpreadsheetMetrics, fetchPlanoCarregamento, clearPlanilhaCache, PublicSpreadsheetMetricsMap } from '../lib/googleSheetsPublicSource';
import { SupabaseService } from '../lib/supabaseService';
import { MatrizPerformanceItem, StoreMaster, StoreOperation } from '../types';
import { IndexedDBService } from '../lib/indexedDb';

export interface SyncResult {
  success: boolean;
  importedCount: number;
  storesCount?: number;
  planoCount?: number;
  metricsCount?: number;
  error?: string;
  timestamp: string;
  details?: string;
}

export interface ConnectionDetail {
  id: string;
  name: string;
  type: 'google_sheets' | 'database' | 'indexeddb';
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: string;
  description: string;
  endpointUrl?: string;
  recordCount?: number;
}

function stringToUuid(str: string): string {
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + code;
    hash1 |= 0;
    hash2 = ((hash2 << 7) - hash2) + code;
    hash2 |= 0;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const h3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const h4 = Math.abs(hash1 + hash2).toString(16).padStart(8, '0');
  const hex = (h1 + h2 + h3 + h4).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 15)}a-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function getCurrentWeekNumber(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export class ConexoesService {
  /**
   * Sincroniza a planilha pública da Controladoria, o Plano de Carregamento e as Lojas no Supabase/IndexedDB.
   */
  public static async syncControladoriaSheet(): Promise<SyncResult> {
    const now = new Date();
    try {
      let importedCount = 0;
      let metricsCount = 0;
      let planoCount = 0;
      let storesCount = 0;

      // 1. Sincroniza Matriz de Performance
      const metricsMap: PublicSpreadsheetMetricsMap = await fetchPublicSpreadsheetMetrics();
      const sectorIds = Object.keys(metricsMap);
      const recordsToUpsert: Partial<MatrizPerformanceItem>[] = [];
      const currentYear = now.getFullYear();
      const currentWeek = getCurrentWeekNumber();

      for (const sectorId of sectorIds) {
        const metric = metricsMap[sectorId];
        if (!metric) continue;

        recordsToUpsert.push({
          id: stringToUuid(`matriz_${sectorId}`),
          setor: sectorId,
          semana: currentWeek,
          ano: currentYear,
          pilotagem: metric.atividadeTotal || 0,
          volume_que_caiu: metric.atividadeTotal || 0,
          percentual: 100,
          horas_planning: 0,
          horas_terceiros: 0,
          poli_entrada: 0,
          poli_saida: 0,
          capacidade: metric.atividadeTotal || 0,
          total_coletado: metric.atividadeTotal || 0,
          produtividade: metric.uph || 0,
          promessa: metric.promessa || 95,
          lead_time: 0,
          aderencia: metric.bsi || 100,
          updated_at: now.toISOString(),
        });
        metricsCount++;
        importedCount++;
      }

      if (recordsToUpsert.length > 0) {
        await SupabaseService.upsert("matriz_performance", recordsToUpsert, "id");
      }

      // 2. Sincroniza Plano de Carregamento e Lojas Master/Operações
      try {
        const planoRows = await fetchPlanoCarregamento();
        if (planoRows.length > 0) {
          planoCount = planoRows.length;
          importedCount += planoRows.length;

          // A. Registros de plano_carregamento
          const planoRecords = planoRows.map((row) => ({
            id: `${row.data}_${row.codLoja}_${row.horaCarregamento}`,
            data: row.data,
            dia_semana: row.diaSemana,
            hora_carregamento: row.horaCarregamento,
            cod_loja: row.codLoja,
            nome_loja: row.nomeLoja,
          }));
          await SupabaseService.upsert("plano_carregamento", planoRecords, "id");

          // B. Extrair e sincronizar Lojas Master (store_master)
          const distinctStoresMap = new Map<string, { codLoja: string; nomeLoja: string; horaCarregamento: string }>();
          planoRows.forEach((r) => {
            if (r.codLoja && !distinctStoresMap.has(r.codLoja)) {
              distinctStoresMap.set(r.codLoja, {
                codLoja: r.codLoja,
                nomeLoja: r.nomeLoja || `Loja ${r.codLoja}`,
                horaCarregamento: r.horaCarregamento || '14:00'
              });
            }
          });

          const masterRecords: StoreMaster[] = Array.from(distinctStoresMap.values()).map((s) => ({
            id: s.codLoja,
            nome: s.nomeLoja,
            cidade: s.nomeLoja.includes('-') ? s.nomeLoja.split('-')[1]?.trim() : 'São Paulo',
            uf: 'SP',
            transportadoraPadrao: 'JADLOG',
            horarioCarregamentoPadrao: s.horaCarregamento,
            observacoes: 'Sincronizado automaticamente via Plano de Carregamento'
          }));

          if (masterRecords.length > 0) {
            storesCount = masterRecords.length;
            await SupabaseService.upsert("store_master", masterRecords, "id");
            for (const sm of masterRecords) {
              await IndexedDBService.put("store_master", sm);
            }
          }

          // C. Sincronizar Operações de Lojas (store_operations) para alimentar o Radar Live
          const opsToUpsert: StoreOperation[] = [];
          for (const row of planoRows) {
            const opId = `${row.codLoja}_${row.data}_S87`;
            const op: StoreOperation = {
              id: opId,
              programacaoId: row.data,
              lojaId: row.codLoja,
              nomeLoja: row.nomeLoja || `Loja ${row.codLoja}`,
              setor: 'S87',
              transportadora: 'JADLOG',
              corte: row.horaCarregamento || '12:00',
              carregamento: row.horaCarregamento || '15:00',
              volumes: 150,
              enderecos: 8,
              statusSoltura: 'Não Solta',
              horarioSoltura: null,
              soltoPor: null,
              statusColeta: 'Não iniciada',
              horarioColeta: null,
              coletadoPor: null,
              statusCarregamento: 'Não carregada',
              horarioCarregamento: row.horaCarregamento || null,
              carregadoPor: null,
              statusExpedicao: 'Pendente',
              perdeuCorte: false,
              updated_at: now.toISOString(),
              updated_by: 'ConexoesSync',
            };
            opsToUpsert.push(op);
          }

          if (opsToUpsert.length > 0) {
            await SupabaseService.upsert("store_operations", opsToUpsert, "id");
            for (const op of opsToUpsert) {
              await IndexedDBService.put("store_operations", op);
            }

            // Atualiza store reativa de operações se estiver no browser
            try {
              const { useStoreOperations } = await import('../stores/useStoreOperations');
              const currentOps = useStoreOperations.getState().operations;
              const nextOps = { ...currentOps };
              opsToUpsert.forEach((op) => {
                nextOps[op.id] = { ...(nextOps[op.id] || {}), ...op };
              });
              useStoreOperations.getState().setOperations(nextOps);
            } catch (e) {
              console.warn('[ConexoesService] Aviso ao atualizar useStoreOperations:', e);
            }

            // Atualiza store reativa de lojas master
            try {
              const { useStoreMaster } = await import('../stores/useStoreMaster');
              await useStoreMaster.getState().loadStores();
            } catch (e) {
              console.warn('[ConexoesService] Aviso ao atualizar useStoreMaster:', e);
            }
          }
        }
      } catch (e) {
        console.warn("[ConexoesService] Aviso ao sincronizar plano e lojas:", e);
      }

      const dataFim = new Date().toISOString();
      const details = `${metricsCount} setores atualizados, ${storesCount} lojas cadastradas e ${planoCount} horários de carga sincronizados.`;
      
      const resultObj: SyncResult = {
        success: true,
        importedCount,
        storesCount,
        planoCount,
        metricsCount,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        details
      };
      
      try {
        await SupabaseService.upsert("sync_logs", [{
          id: stringToUuid(`log_${dataFim}`),
          conexao_id: 'google_sheets_controladoria',
          data_inicio: now.toISOString(),
          data_fim: dataFim,
          status: 'success',
          registros_afetados: importedCount,
          mensagem_erro: details,
          created_at: dataFim
        }], 'id');
      } catch (logErr) {
        console.warn("[ConexoesService] Falha ao gravar log de sucesso:", logErr);
      }

      return resultObj;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[ConexoesService] Erro na sincronização com Controladoria:", err);
      
      const dataFim = new Date().toISOString();
      try {
        await SupabaseService.upsert("sync_logs", [{
          id: stringToUuid(`log_err_${dataFim}`),
          conexao_id: 'google_sheets_controladoria',
          data_inicio: now.toISOString(),
          data_fim: dataFim,
          status: 'error',
          registros_afetados: 0,
          mensagem_erro: errorMsg,
          created_at: dataFim
        }], 'id');
      } catch (logErr) {
        console.warn("[ConexoesService] Falha ao gravar log de erro:", logErr);
      }

      return {
        success: false,
        importedCount: 0,
        error: errorMsg,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      };
    }
  }

  /**
   * Limpa o cache local da planilha armazenado no IndexedDB.
   */
  public static async resetCache(): Promise<void> {
    await clearPlanilhaCache();
  }

  /**
   * Testa e retorna o estado de saúde da conexão com a base de dados.
   */
  public static async checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const isOnline = await SupabaseService.checkConnection();
      return { healthy: isOnline, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  /**
   * Testa a latência e o status da planilha pública.
   */
  public static async checkSpreadsheetHealth(url: string): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return { healthy: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }
}

