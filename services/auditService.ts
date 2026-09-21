// src/services/auditService.ts
// =============================================================================
// Persiste logs de falha de parse no Supabase (tabela audit_logs).
// Se o Supabase estiver indisponivel, guarda em fila de memoria ate o proximo flush.
// =============================================================================

import { supabase } from '../lib/supabase';
import type { ParseIssue } from '../lib/schemas';

// Fila offline em memoria (persiste durante a sessao do usuario)
const filaOffline: ParseIssue[] = [];

export const AuditService = {
  /**
   * Salva um lote de issues no Supabase.
   * Se falhar (sem sessao ou erro de rede), guarda na fila offline.
   */
  async logIssues(issues: ParseIssue[]): Promise<void> {
    if (issues.length === 0) return;

    if (!supabase) {
      filaOffline.push(...issues);
      console.warn('[AuditService] Supabase indisponivel, guardando offline:', issues.length);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        filaOffline.push(...issues);
        console.warn('[AuditService] Sem sessao ativa, guardando offline:', issues.length);
        return;
      }

      const payload = issues.map(i => ({
        sheet: i.sheet,
        row_index: i.rowIndex,
        raw_value: typeof i.rawValue === 'string'
          ? i.rawValue
          : JSON.stringify(i.rawValue),
        reason: i.reason,
        user_id: session.user.id,
        severity: i.severity,
      }));

      const { error } = await supabase.from('audit_logs').insert(payload);
      if (error) throw error;

      console.info(`[AuditService] ${issues.length} logs salvos.`);
    } catch (e) {
      console.error('[AuditService] Falha ao salvar:', e);
      filaOffline.push(...issues);
    }
  },

  /**
   * Tenta reenviar a fila offline.
   * Chamar apos o login do usuario.
   */
  async flushOffline(): Promise<void> {
    if (filaOffline.length === 0) return;
    const pendentes = [...filaOffline];
    filaOffline.length = 0;
    await this.logIssues(pendentes);
  },

  /** Lista os ultimos N logs do Supabase. */
  async listar(limit = 50): Promise<ParseIssue[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AuditService] Erro ao listar:', error);
      return [];
    }

    return (data ?? []).map(r => ({
      sheet: r.sheet as string,
      rowIndex: r.row_index as number,
      rawValue: r.raw_value as unknown,
      reason: r.reason as string,
      severity: r.severity as 'warning' | 'error' | 'critical',
    }));
  },

  /**
   * Remove logs com mais de N dias.
   * Retorna a quantidade removida.
   */
  async limparAntigos(dias = 7): Promise<number> {
    if (!supabase) return 0;

    const corte = new Date(Date.now() - dias * 86_400_000).toISOString();
    const { error, count } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', corte);

    if (error) {
      console.error('[AuditService] Erro ao limpar:', error);
      return 0;
    }
    return count ?? 0;
  },

  /** Retorna quantos issues estao na fila offline (diagnostico). */
  get filaSize(): number {
    return filaOffline.length;
  },
};
