import { fetchPublicSpreadsheetMetrics, clearPlanilhaCache, PublicSpreadsheetMetricsMap } from '../lib/googleSheetsPublicSource';
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

export class ConexoesService {
  /**
   * Sincroniza a planilha pública da Controladoria com a tabela matriz_performance no Supabase/IndexedDB.
   */
  public static async syncControladoriaSheet(): Promise<SyncResult> {
    try {
      const metricsMap: PublicSpreadsheetMetricsMap = await fetchPublicSpreadsheetMetrics();
      const sectorIds = Object.keys(metricsMap);

      let importedCount = 0;
      const recordsToUpsert: Partial<MatrizPerformanceItem>[] = [];

      for (const sectorId of sectorIds) {
        const metric = metricsMap[sectorId];
        if (!metric) continue;

        recordsToUpsert.push({
          id: `matriz_${sectorId}`,
          setor: sectorId,
          produtividade: metric.uph || 0,
          pilotagem: metric.atividadeTotal || 0,
          promessa: metric.promessa || 95,
          aderencia: metric.bsi || 100,
          total_coletado: metric.atividadeTotal || 0,
          updated_at: new Date().toISOString(),
        });
        importedCount++;
      }

      if (recordsToUpsert.length > 0) {
        await SupabaseService.upsert("matriz_performance", recordsToUpsert, "id");
      }

      return {
        success: true,
        importedCount,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[ConexoesService] Erro na sincronização com Controladoria:", err);
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
}
