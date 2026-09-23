import { 
  fetchPublishedSheet, 
  fetchPainelOperacional, 
  fetchBD, 
  fetchPlanoCarregamento, 
  clearSheetsCache 
} from '../services/sheetsService';
import { exportGembaToGoogleSheets } from '../services/googleSheetsExportService';
import { fetchPublicSpreadsheetMetrics, clearPlanilhaCache } from '../lib/googleSheetsPublicSource';
import { useGembaStore } from '../stores/useGembaStore';
import { useSectorStore } from '../stores/useSectorStore';
import { useStoreMaster } from '../stores/useStoreMaster';
import { SupabaseService } from '../lib/supabaseService';
import { MatrizPerformanceItem } from '../types';
import { SectorOverrideValues } from '../types/Setor';

export class ConexoesService {
  /**
   * Sincronização Consciente de Planilhas:
   * 1. Lê métricas operacionais da Controladoria e planilha pública
   * 2. Aplica métricas sugeridas no useSectorStore (sem sobrescrever overrides manuais de usuários)
   * 3. Importa e atualiza lojas via BD e Plano de Carregamento
   * 4. Registra log de sincronização para observabilidade
   */
  public static async syncControladoriaSheet(): Promise<SyncResult> {
    const now = new Date();
    let importedCount = 0;
    let storesCount = 0;
    const suggestedMap: Record<string, SectorOverrideValues> = {};

    try {
      // 1. Coleta métricas públicas de setores (Atividade, UPH, Caixas)
      try {
        const publicMetrics = await fetchPublicSpreadsheetMetrics();
        Object.entries(publicMetrics).forEach(([secId, m]) => {
          suggestedMap[secId] = {
            ativ: m.atividadeTotal,
            atividade: m.atividadeTotal,
            uph: m.uph,
            promessa: m.promessa ?? 100,
            bsi: m.bsi ?? 100,
            erros: m.errosPicking ?? 0,
            reproTotal: m.caixasDisponiveis ?? null,
            caixasReapro: m.caixasDisponiveis ?? null,
          };
        });
      } catch (err) {
        console.warn("[ConexoesService] Falha ao ler planilha pública de atividades:", err);
      }

      // 2. Coleta métricas do painel operacional da Controladoria (pivô)
      try {
        const painelResult = await fetchPainelOperacional({ force: true });
        if (painelResult.data && painelResult.data.length > 0) {
          painelResult.data.forEach((row) => {
            if (row.setor) {
              const secKey = row.setor.replace(/^Setor\s+/i, '').trim();
              suggestedMap[secKey] = {
                ...(suggestedMap[secKey] || {}),
                ...(row.atividade != null ? { ativ: row.atividade, atividade: row.atividade } : {}),
                ...(row.uph != null ? { uph: row.uph } : {}),
                ...(row.promessa != null ? { promessa: row.promessa } : {}),
                ...(row.bsi != null ? { bsi: row.bsi } : {}),
                ...(row.caixasReapro != null ? { reproTotal: row.caixasReapro, caixasReapro: row.caixasReapro } : {}),
                ...(row.colisColeta != null ? { colis: row.colisColeta, colisColeta: row.colisColeta } : {}),
                ...(row.auditoria5s != null ? { nota5s: row.auditoria5s, auditoria5s: row.auditoria5s } : {}),
                ...(row.errosPicking != null ? { erros: row.errosPicking } : {}),
              };
            }
          });
        }
      } catch (err) {
        console.warn("[ConexoesService] Falha ao processar painel operacional da controladoria:", err);
      }

      // 3. Aplica métricas sugeridas na store de setores (respeitando overrides existentes)
      if (Object.keys(suggestedMap).length > 0) {
        useSectorStore.getState().applySuggestedMetrics(suggestedMap);
        importedCount += Object.keys(suggestedMap).length;
      }

      // 4. Importa registros de Matriz de Performance
      try {
        const rows = await fetchPublishedSheet('controladoria', { force: true });
        const records: Partial<MatrizPerformanceItem>[] = rows.map((row: any) => ({
          id: (row.Setor || 'S') + '_' + (row.Data || now.getTime()),
          setor: row.Setor,
          updated_at: now.toISOString(),
        }));

        if (records.length > 0) {
          await SupabaseService.upsert("matriz_performance", records, "id");
          importedCount += records.length;
        }
      } catch (err) {
        console.warn("[ConexoesService] Falha ao gravar matriz_performance:", err);
      }

      // 5. Sincroniza Cadastro de Lojas (BD) de forma consciente
      try {
        const bdResult = await fetchBD({ force: true });
        if (bdResult.data && bdResult.data.length > 0) {
          const storeMaster = useStoreMaster.getState();
          for (const item of bdResult.data) {
            if (item.loja) {
              await storeMaster.addStore({
                id: String(item.loja),
                nome: item.nome || `Loja ${item.loja}`,
                cidade: item.cidade || 'Campinas',
                uf: (item.uf as any) || 'SP',
                transportadoraPadrao: item.transportadora || 'JADLOG',
                observacoes: 'Sincronizado via ConexoesService'
              });
              storesCount++;
            }
          }
        }
      } catch (err) {
        console.warn("[ConexoesService] Falha ao sincronizar lojas do BD:", err);
      }

      // 6. Registra log de auditoria da sincronização no Supabase
      const detailsMsg = `Sincronizados ${Object.keys(suggestedMap).length} setores e ${storesCount} lojas. Monitor e Overrides alinhados.`;
      try {
        await SupabaseService.upsertRecord('sync_logs', {
          id: `sync_${now.getTime()}`,
          origem: 'Controladoria & Plano Mestre',
          status: 'success',
          imported_count: importedCount,
          detalhes: detailsMsg,
          created_at: now.toISOString()
        }, 'id');
      } catch {}

      return {
        success: true,
        importedCount,
        storesCount,
        timestamp: now.toLocaleTimeString(),
        details: detailsMsg
      };
    } catch (err) {
      console.error("[ConexoesService] Erro durante sincronização:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      try {
        await SupabaseService.upsertRecord('sync_logs', {
          id: `sync_err_${now.getTime()}`,
          origem: 'Controladoria & Plano Mestre',
          status: 'error',
          imported_count: 0,
          detalhes: `Falha: ${errMsg}`,
          created_at: now.toISOString()
        }, 'id');
      } catch {}

      return {
        success: false,
        importedCount: 0,
        storesCount: 0,
        timestamp: now.toLocaleTimeString(),
        error: errMsg
      };
    }
  }

  public static async syncGembaSheet(): Promise<SyncResult> {
    const now = new Date();
    try {
      const cards = useGembaStore.getState().cards;
      const sheetUrl = await exportGembaToGoogleSheets(cards);

      return {
        success: true,
        importedCount: cards.length,
        timestamp: now.toLocaleTimeString(),
        details: `Sincronizados ${cards.length} cards com a aba Gemba da Planilha Mestre. URL: ${sheetUrl}`
      };
    } catch (err) {
      console.error("[ConexoesService] Erro ao sincronizar aba Gemba:", err);
      return {
        success: false,
        importedCount: 0,
        timestamp: now.toLocaleTimeString(),
        error: String(err)
      };
    }
  }

  public static async resetCache(): Promise<void> {
    clearSheetsCache();
    await clearPlanilhaCache();
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

export interface ConnectionDetail {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing' | 'idle';
  lastSync: string;
  description: string;
  endpointUrl?: string;
  recordCount?: number;
}

