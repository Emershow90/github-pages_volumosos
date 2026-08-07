import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditLog } from '../types';
import { SupabaseService } from '../lib/supabaseService';

export function useConsoleStatus() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await SupabaseService.fetchTable<AuditLog>('audit_logs');
      setLogs(items || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const subscription = SupabaseService.subscribeToTable('audit_logs', () => {
      fetchLogs();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchLogs]);

  const consoleSummary = useMemo(() => {
    const totalCount = logs.length;
    const latestLogs = [...logs]
      .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())
      .slice(0, 10);

    const activeUsers = Array.from(new Set(logs.map((l) => l.usuario))).filter(Boolean);
    const actionsCount = logs.reduce((acc: Record<string, number>, log) => {
      const acao = log.acao || 'Geral';
      acc[acao] = (acc[acao] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCount,
      latestLogs,
      activeUsers,
      actionsCount,
      isOnline: true,
    };
  }, [logs]);

  return {
    logs,
    loading,
    error,
    consoleSummary,
    refetch: fetchLogs,
  };
}
