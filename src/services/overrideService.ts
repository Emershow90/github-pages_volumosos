// src/services/overrideService.ts
// =============================================================================
// Conecta o painel de Override a planilha mestre (aba Controladoria).
// Fornece os "Sugeridos" por setor + data, propagando issues para auditoria.
// =============================================================================

import { fetchPainelOperacional, clearSheetsCache } from './sheetsService';
import { AuditService } from './auditService';
import type { PainelDia } from '../lib/schemas';

export interface OverrideSugestoes {
  setor: string;
  data: string;
  atividade: number | null;
  uph: number | null;
  caixasReapro: number | null;
  colisColeta: number | null;
  promessa: number | null;
  auditoria5s: number | null;
  bsi: number | null;
  errosPicking: number | null;
  /** Avisos nao criticos sobre a qualidade dos dados encontrados */
  _warnings: string[];
}

/** Retorna a data de hoje no formato DD/MM/AAAA */
function hojeBR(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Normaliza o identificador do setor para comparacao segura */
function normalizarSetor(setor: string): string {
  // Remove tudo exceto alfanumerico e converte para maiusculas
  const base = setor.replace(/[^\dA-Z]/gi, '').toUpperCase();
  // Remove zeros à esquerda para comparar "087" como "87"
  return base.replace(/^0+/, '');
}

/**
 * Busca os sugeridos da planilha para o setor na data informada (padrao: hoje).
 * Se a data nao for encontrada, utiliza a data mais recente disponivel.
 * Propaga issues de parse para o AuditService (fire-and-forget).
 */
export async function getSugestoesDoSetor(
  setor: string,
  data?: string
): Promise<OverrideSugestoes | null> {
  const resultado = await fetchPainelOperacional();

  // Propaga issues de parse (fire-and-forget — nao bloqueia o retorno)
  if (resultado.issues.length > 0) {
    void AuditService.logIssues(resultado.issues);
  }

  if (resultado.data.length === 0) return null;

  const alvo = data ?? hojeBR();
  const setorNorm = normalizarSetor(setor);
  const warnings: string[] = [];

  // 1a tentativa: setor + data exata
  let linha: PainelDia | undefined = resultado.data.find(
    r => normalizarSetor(r.setor) === setorNorm && r.data === alvo
  );

  // Fallback: data mais recente disponivel para o setor
  if (!linha) {
    const candidatas = resultado.data
      .filter(r => normalizarSetor(r.setor) === setorNorm)
      .sort((a, b) => {
        const [da, ma, ya] = a.data.split('/').map(Number);
        const [db, mb, yb] = b.data.split('/').map(Number);
        return (
          new Date(yb, mb - 1, db).getTime() -
          new Date(ya, ma - 1, da).getTime()
        );
      });
    linha = candidatas[0];

    if (linha) {
      warnings.push(
        `Data "${alvo}" nao encontrada. Usando dado mais recente: ${linha.data}`
      );
    }
  }

  if (!linha) return null;

  return {
    setor: linha.setor,
    data: linha.data,
    atividade: linha.atividade,
    uph: linha.uph,
    caixasReapro: linha.caixasReapro,
    colisColeta: linha.colisColeta,
    promessa: linha.promessa,
    auditoria5s: linha.auditoria5s,
    bsi: linha.bsi,
    errosPicking: linha.errosPicking,
    _warnings: warnings,
  };
}

/**
 * Retorna todas as sugestoes disponiveis agrupadas por setor.
 * Util para pre-carregar todos os setores de uma vez.
 */
export async function getTodasSugestoes(): Promise<Record<string, OverrideSugestoes>> {
  const resultado = await fetchPainelOperacional();

  if (resultado.issues.length > 0) {
    void AuditService.logIssues(resultado.issues);
  }

  const hoje = hojeBR();

  // Agrupa por setor
  const porSetor: Record<string, PainelDia[]> = {};
  for (const r of resultado.data) {
    const key = normalizarSetor(r.setor);
    porSetor[key] = porSetor[key] ?? [];
    porSetor[key].push(r);
  }

  const out: Record<string, OverrideSugestoes> = {};

  for (const [setorNorm, linhas] of Object.entries(porSetor)) {
    const preferida =
      linhas.find(l => l.data === hoje) ??
      [...linhas].sort((a, b) => {
        const [da, ma, ya] = a.data.split('/').map(Number);
        const [db, mb, yb] = b.data.split('/').map(Number);
        return (
          new Date(yb, mb - 1, db).getTime() -
          new Date(ya, ma - 1, da).getTime()
        );
      })[0];

    if (!preferida) continue;

    const warnings: string[] = [];
    if (preferida.data !== hoje) {
      warnings.push(`Dado mais recente disponivel: ${preferida.data}`);
    }

    out[setorNorm] = {
      setor: preferida.setor,
      data: preferida.data,
      atividade: preferida.atividade,
      uph: preferida.uph,
      caixasReapro: preferida.caixasReapro,
      colisColeta: preferida.colisColeta,
      promessa: preferida.promessa,
      auditoria5s: preferida.auditoria5s,
      bsi: preferida.bsi,
      errosPicking: preferida.errosPicking,
      _warnings: warnings,
    };
  }

  return out;
}

/** Limpa o cache de planilha para forciar re-fetch no proximo acesso. */
export function recarregarPlanilha(): void {
  clearSheetsCache();
}
