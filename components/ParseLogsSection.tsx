// src/components/ParseLogsSection.tsx
// =============================================================================
// Secao de Logs de Parse — exibe falhas de validacao do sheetsService.
// Integrar no ConexoesTab como nova secao dentro da aba "logs".
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, AlertOctagon, XOctagon, RefreshCw, Trash2 } from 'lucide-react';
import { AuditService } from '../services/auditService';
import type { ParseIssue } from '../lib/schemas';

// =============================================================================
// HELPERS
// =============================================================================

const SEVERITY_CONFIG: Record<
  ParseIssue['severity'],
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  warning: {
    label: 'Aviso',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    Icon: AlertTriangle,
  },
  error: {
    label: 'Erro',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    Icon: AlertOctagon,
  },
  critical: {
    label: 'Critico',
    color: 'text-red-300',
    bg: 'bg-red-600/20',
    border: 'border-red-600/40',
    Icon: XOctagon,
  },
};

const SHEET_LABELS: Record<string, string> = {
  controladoria: 'Controladoria',
  gemba: 'GEMBA',
  planoCarregamento: 'Plano de Carregamento',
  bd: 'BD (Lojas)',
};

const PAGE_SIZE = 10;

// =============================================================================
// COMPONENTE
// =============================================================================

type FilterSeverity = 'all' | ParseIssue['severity'];
type FilterSheet = 'all' | string;

export const ParseLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<ParseIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterSheet, setFilterSheet] = useState<FilterSheet>('all');
  const [isClearing, setIsClearing] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const data = await AuditService.listar(200);
    setLogs(data);
    setPage(0);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const handleLimpar = async () => {
    if (!confirm('Remover todos os logs com mais de 7 dias?')) return;
    setIsClearing(true);
    const removidos = await AuditService.limparAntigos(7);
    setIsClearing(false);
    void carregar();
    // Feedback inline — o componente pai pode ter toast, mas aqui usamos console
    console.info(`[ParseLogsSection] ${removidos} logs removidos.`);
  };

  // Filtros
  const sheetsDisponiveis = [...new Set(logs.map(l => l.sheet))];

  const logsFiltrados = logs.filter(l => {
    if (filterSeverity !== 'all' && l.severity !== filterSeverity) return false;
    if (filterSheet !== 'all' && l.sheet !== filterSheet) return false;
    return true;
  });

  const totalPages = Math.ceil(logsFiltrados.length / PAGE_SIZE);
  const logsPagina = logsFiltrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const countBySeverity = (sev: ParseIssue['severity']) =>
    logs.filter(l => l.severity === sev).length;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">
            Logs de Parse
          </h3>
          {/* Badges de contagem por severidade */}
          {countBySeverity('critical') > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-600/20 text-red-300 border border-red-600/40">
              {countBySeverity('critical')} critico{countBySeverity('critical') > 1 ? 's' : ''}
            </span>
          )}
          {countBySeverity('error') > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
              {countBySeverity('error')} erro{countBySeverity('error') > 1 ? 's' : ''}
            </span>
          )}
          {countBySeverity('warning') > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {countBySeverity('warning')} aviso{countBySeverity('warning') > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void carregar()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => void handleLimpar()}
            disabled={isClearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar &gt;7 dias
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Filtro severidade */}
        <div className="flex gap-1">
          {(['all', 'warning', 'error', 'critical'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => { setFilterSeverity(sev); setPage(0); }}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                filterSeverity === sev
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {sev === 'all' ? 'Todos' : SEVERITY_CONFIG[sev].label}
            </button>
          ))}
        </div>

        {/* Filtro aba */}
        {sheetsDisponiveis.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => { setFilterSheet('all'); setPage(0); }}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                filterSheet === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
            >
              Todas as abas
            </button>
            {sheetsDisponiveis.map(sheet => (
              <button
                key={sheet}
                onClick={() => { setFilterSheet(sheet); setPage(0); }}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                  filterSheet === sheet
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {SHEET_LABELS[sheet] ?? sheet}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estado vazio ou carregando */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-zinc-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando logs...
        </div>
      )}

      {!loading && logsFiltrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 bg-black/20 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm gap-2">
          <span className="text-2xl">✅</span>
          Nenhuma falha de parse registrada.
        </div>
      )}

      {/* Lista de logs */}
      {!loading && logsPagina.length > 0 && (
        <ul className="space-y-2">
          {logsPagina.map((log, i) => {
            const cfg = SEVERITY_CONFIG[log.severity];
            const Icon = cfg.Icon;
            return (
              <li
                key={`${log.sheet}-${log.rowIndex}-${i}`}
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold ${cfg.color}`}>
                      [{SHEET_LABELS[log.sheet] ?? log.sheet}]
                    </span>
                    <span className="text-zinc-500">
                      linha {log.rowIndex >= 0 ? log.rowIndex : 'N/A'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-zinc-300 break-all">{log.reason}</p>
                  {log.rawValue !== null && log.rawValue !== undefined && (
                    <p className="text-zinc-600 font-mono text-[10px] truncate max-w-xs">
                      {typeof log.rawValue === 'string'
                        ? log.rawValue
                        : JSON.stringify(log.rawValue)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, logsFiltrados.length)} de {logsFiltrados.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 disabled:opacity-40 transition-colors"
            >
              ‹ Ant.
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 disabled:opacity-40 transition-colors"
            >
              Prox. ›
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
