// src/services/overrideService.ts
// =============================================================================
// Conecta o painel de Override à planilha mestre (aba Controladoria).
// Fornece os "Sugeridos" por setor + data, a partir do parser pivô.
// =============================================================================

import { fetchPainelOperacional, PainelDiaRow } from './sheetsService';

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
}

/** Retorna a data de hoje no formato DD/MM/AAAA */
function hojeBR(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Busca os sugeridos da planilha para o setor na data informada (padrão: hoje).
 * Se a data não for encontrada, tenta a data anterior disponível.
 */
export async function getSugestoesDoSetor(
  setor: string,
  data?: string
): Promise<OverrideSugestoes | null> {
  const painel = await fetchPainelOperacional();
  if (!painel.length) return null;

  const alvo = data ?? hojeBR();
  const setorNorm = setor.replace(/[^\d]/g, ''); // "Setor 87" → "87"

  // 1ª tentativa: setor + data exata
  let linha = painel.find(
    r => r.setor === setorNorm && r.data === alvo
  );

  // Fallback: pega a data mais recente disponível para o setor
  if (!linha) {
    const candidatas = painel
      .filter(r => r.setor === setorNorm)
      .sort((a, b) => {
        const [da, ma, ya] = a.data.split('/').map(Number);
        const [db, mb, yb] = b.data.split('/').map(Number);
        return (
          new Date(yb, mb - 1, db).getTime() -
          new Date(ya, ma - 1, da).getTime()
        );
      });
    linha = candidatas[0];
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
  };
}

/**
 * Retorna todas as sugestões disponíveis (útil para pré-carregar todos os setores).
 */
export async function getTodasSugestoes(): Promise<Record<string, OverrideSugestoes>> {
  const painel = await fetchPainelOperacional();
  const hoje = hojeBR();

  // Agrupa por setor, preferindo a data de hoje
  const porSetor: Record<string, PainelDiaRow[]> = {};
  for (const r of painel) {
    porSetor[r.setor] = porSetor[r.setor] ?? [];
    porSetor[r.setor].push(r);
  }

  const out: Record<string, OverrideSugestoes> = {};
  for (const [setor, linhas] of Object.entries(porSetor)) {
    const preferida =
      linhas.find(l => l.data === hoje) ??
      linhas.sort((a, b) => {
        const [da, ma, ya] = a.data.split('/').map(Number);
        const [db, mb, yb] = b.data.split('/').map(Number);
        return (
          new Date(yb, mb - 1, db).getTime() -
          new Date(ya, ma - 1, da).getTime()
        );
      })[0];

    out[setor] = {
      setor,
      data: preferida.data,
      atividade: preferida.atividade,
      uph: preferida.uph,
      caixasReapro: preferida.caixasReapro,
      colisColeta: preferida.colisColeta,
      promessa: preferida.promessa,
      auditoria5s: preferida.auditoria5s,
      bsi: preferida.bsi,
      errosPicking: preferida.errosPicking,
    };
  }
  return out;
}
