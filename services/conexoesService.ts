import { fetchPublishedSheet } from '../services/sheetsService';
import { SupabaseService } from '../lib/supabaseService';
import { MatrizPerformanceItem } from '../types';

export class ConexoesService {
  public static async syncControladoriaSheet(): Promise<SyncResult> {
    const now = new Date();
    try {
      const rows = await fetchPublishedSheet('controladoria');
      
      const records: Partial<MatrizPerformanceItem>[] = rows.map((row: any) => ({
        id: (row.Setor || 'S') + '_' + (row.Data || now.getTime()),
        setor: row.Setor,
        updated_at: now.toISOString(),
      }));

      if (records.length > 0) {
        await SupabaseService.upsert("matriz_performance", records, "id");
      }
      
      return { success: true, importedCount: records.length, timestamp: now.toLocaleTimeString(), details: 'Sincronizado' };
    } catch (err) {
      console.error("[ConexoesService] Erro:", err);
      return { success: false, importedCount: 0, timestamp: now.toLocaleTimeString(), error: String(err) };
    }
  }

  public static async resetCache(): Promise<void> {
  }

  public static async checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const isOnline = await SupabaseService.checkConnection();
      return { healthy: isOnline, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

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
