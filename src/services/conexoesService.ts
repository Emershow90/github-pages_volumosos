import { fetchPublicSpreadsheetMetrics, fetchPlanoCarregamento, clearPlanilhaCache, PublicSpreadsheetMetricsMap } from '../lib/googleSheetsPublicSource';
import { SupabaseService } from '../lib/supabaseService';
import { MatrizPerformanceItem } from '../types';

export interface SyncResult {
  success: boolean;
  importedCount: number;
  error?: string;
  timestamp: string;
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
   * Sincroniza a planilha pública da Controladoria e o Plano de Carregamento no Supabase/IndexedDB.
   */
  public static async syncControladoriaSheet(): Promise<SyncResult> {
    try {
      let importedCount = 0;

      // 1. Sincroniza Matriz de Performance
      const metricsMap: PublicSpreadsheetMetricsMap = await fetchPublicSpreadsheetMetrics();
      const sectorIds = Object.keys(metricsMap);
      const recordsToUpsert: Partial<MatrizPerformanceItem>[] = [];
      const now = new Date();
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
        importedCount++;
      }

      if (recordsToUpsert.length > 0) {
        await SupabaseService.upsert("matriz_performance", recordsToUpsert, "id");
      }

      // 2. Sincroniza Plano de Carregamento
      try {
        const planoRows = await fetchPlanoCarregamento();
        if (planoRows.length > 0) {
          const planoRecords = planoRows.map((row) => ({
            id: `${row.data}_${row.codLoja}_${row.horaCarregamento}`,
            data: row.data,
            dia_semana: row.diaSemana,
            hora_carregamento: row.horaCarregamento,
            cod_loja: row.codLoja,
            nome_loja: row.nomeLoja,
          }));
          await SupabaseService.upsert("plano_carregamento", planoRecords, "id");
          importedCount += planoRows.length;
        }
      } catch (e) {
        console.warn("[ConexoesService] Aviso ao sincronizar plano de carregamento:", e);
      }

      const dataFim = new Date().toISOString();
      const resultObj = {
        success: true,
        importedCount,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      };
      
      try {
        await SupabaseService.upsert("sync_logs", [{
          id: stringToUuid(`log_${dataFim}`),
          conexao_id: 'google_sheets_controladoria',
          data_inicio: now.toISOString(),
          data_fim: dataFim,
          status: 'success',
          registros_afetados: importedCount,
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
          data_inicio: dataFim,
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
