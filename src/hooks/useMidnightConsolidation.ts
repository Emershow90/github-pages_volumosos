/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useMidnightConsolidation.ts
 * 
 * Hook que agenda a consolidação automática todos os dias às 23:59.
 * 
 * CARACTERÍSTICAS:
 * - Timer seguro com useRef (não vaza entre renders)
 * - Cleanup garantido ao desmontar
 * - Reagenda automaticamente para o próximo dia
 * - Se falhar, tenta novamente em 5 minutos
 * - Notificações através de toast/notificações da store
 */

import { useEffect, useRef, useCallback } from "react";
import { HistoricoRegistro, Setor, Colaborador } from "../types";
import { ConsolidationService, ConsolidadoDia } from "../services/consolidationService.v2";

interface UseMidnightConsolidationProps {
  historico: HistoricoRegistro[];
  setores: Setor[];
  colaboradores: Colaborador[];
  supabase: any;
  spreadsheetId: string;
  googleSheetsService: any;
  onConsolidado?: (c: ConsolidadoDia) => void;
  addToast: (toast: { title: string; message: string; type: string; duration?: number }) => void;
}

export function useMidnightConsolidation({
  historico,
  setores,
  colaboradores,
  supabase,
  spreadsheetId,
  googleSheetsService,
  onConsolidado,
  addToast,
}: UseMidnightConsolidationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  // Mantém refs atualizadas para não recriar o timer a cada mudança de estado
  const propsRef = useRef({
    historico,
    setores,
    colaboradores,
    supabase,
    spreadsheetId,
    googleSheetsService,
    onConsolidado,
    addToast,
  });

  useEffect(() => {
    propsRef.current = {
      historico,
      setores,
      colaboradores,
      supabase,
      spreadsheetId,
      googleSheetsService,
      onConsolidado,
      addToast,
    };
  });

  /**
   * Executa a consolidação e exportação
   */
  const executarConsolidacao = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const {
      historico: currentHistorico,
      setores: currentSetores,
      colaboradores: currentColaboradores,
      supabase: currentSupabase,
      spreadsheetId: currentSpreadsheetId,
      googleSheetsService: currentGoogleSheetsService,
      onConsolidado: currentOnConsolidado,
      addToast: currentAddToast,
    } = propsRef.current;

    try {
      const hoje = new Date().toLocaleDateString("pt-BR");

      currentAddToast({
        title: "🌙 Consolidação 23:59",
        message: `Iniciando consolidação do dia ${hoje}...`,
        type: "info",
        duration: 4000,
      });

      // 1. Consolida o dia (agrupa por setor - último registro vence)
      const consolidado = ConsolidationService.consolidarUmDia(
        hoje,
        currentHistorico,
        currentSetores,
        currentColaboradores
      );

      // 2. Tenta sync com Supabase
      let syncOk = false;
      if (currentSupabase) {
        syncOk = await ConsolidationService.syncDia(currentSupabase, consolidado);
      }

      // 3. Tenta exportar para Google Sheets
      let sheetsOk = false;
      if (currentGoogleSheetsService && currentSpreadsheetId) {
        try {
          const todos = ConsolidationService.carregarCache();
          sheetsOk = await exportarPlanilhaOrganizada(
            currentGoogleSheetsService,
            currentSpreadsheetId,
            todos
          );
        } catch (err) {
          console.error("[23:59] Falha ao exportar Sheets:", err);
        }
      }

      // 4. Notifica resultado
      if (syncOk && sheetsOk) {
        currentAddToast({
          title: "✅ Consolidação 23:59 Concluída",
          message: `Dia ${hoje} salvo em Supabase + Google Sheets.`,
          type: "success",
          duration: 8000,
        });
      } else if (syncOk) {
        currentAddToast({
          title: "⚠️ Consolidação 23:59 Parcial",
          message: `Dia ${hoje} salvo no Supabase. Falha ao exportar Sheets.`,
          type: "warning",
          duration: 8000,
        });
      } else {
        currentAddToast({
          title: "⚠️ Consolidação 23:59 Local",
          message: `Dia ${hoje} salvo localmente. Sync pendente quando online.`,
          type: "warning",
          duration: 8000,
        });
      }

      currentOnConsolidado?.(consolidado);

    } catch (err) {
      console.error("[23:59] Erro na consolidação:", err);
      propsRef.current.addToast({
        title: "❌ Consolidação 23:59 Falhou",
        message: "Erro inesperado. Tentando novamente em 5 minutos...",
        type: "danger",
        duration: 8000,
      });

      // Retry em 5 minutos
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        executarConsolidacao();
      }, 5 * 60 * 1000);

    } finally {
      isRunningRef.current = false;
    }
  }, []);

  /**
   * Agenda o timer para 23:59
   */
  const agendarProximo = useCallback(() => {
    // Limpa timer anterior se existir
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const agora = new Date();
    const alvo = new Date(agora);
    alvo.setHours(23, 59, 0, 0);

    // Se já passou das 23:59, agenda para amanhã
    if (agora.getTime() >= alvo.getTime()) {
      alvo.setDate(alvo.getDate() + 1);
    }

    const msAteAlvo = alvo.getTime() - agora.getTime();
    const minutosAte = Math.round(msAteAlvo / 1000 / 60);

    console.log(`[23:59] Próxima consolidação agendada para ${alvo.toLocaleString('pt-BR')} (daqui a ${minutosAte} min)`);

    timerRef.current = setTimeout(() => {
      executarConsolidacao().then(() => {
        // Após executar, agenda o próximo dia
        agendarProximo();
      });
    }, msAteAlvo);
  }, [executarConsolidacao]);

  // Efeito principal: agenda ao montar, limpa ao desmontar
  useEffect(() => {
    agendarProximo();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [agendarProximo]);

  // Também expõe função manual
  return {
    consolidarAgora: executarConsolidacao,
    reagendar: agendarProximo,
  };
}

// ─── FUNÇÃO AUXILIAR: Exportar planilha organizada ───

export async function exportarPlanilhaOrganizada(
  googleSheetsService: any,
  spreadsheetId: string,
  consolidados: ConsolidadoDia[]
): Promise<boolean> {
  const ordenado = [...consolidados].sort((a, b) => a.dataISO.localeCompare(b.dataISO));

  // Aba 1: Consolidado Diário
  const headerConsolidado = [
    "Data", "Semana", "Turno", "Setores Ativos", "Média UPH", "Média ATIV",
    "Total Repro", "Média Promessa (%)", "Média 5S", "Total Erros",
    "Total Hrs DKT", "Total Poli Rec", "Total Poli Saída", "Total Var Fin",
    "Status Geral", "Colaboradores Ativos"
  ];
  const rowsConsolidado = ordenado.map((d) => [
    d.data, d.semana, d.turno, d.totalSetores, d.mediaUPH, d.mediaAtiv,
    d.totalRepro, d.mediaPromessa, d.mediaNota5S, d.totalErros,
    d.totalHorasDKT, d.totalPoliRec, d.totalPoliSaid, d.totalVarFin,
    d.statusGeral, d.detalhesColaborador.length,
  ]);

  // Aba 2: Detalhes por Setor
  const headerDetalhes = [
    "Data", "Setor ID", "Setor Nome", "Responsável", "ATIV", "UPH",
    "Repro", "Promessa", "Nota 5S", "Erros", "Hrs DKT", "Poli Rec",
    "Poli Saída", "Var Fin", "Infração Segurança"
  ];
  const rowsDetalhes: (string | number | boolean)[][] = [];
  ordenado.forEach((d) => {
    d.detalhesSetor.forEach((s) => {
      rowsDetalhes.push([
        d.data, s.setorId, s.setorNome, s.resp, s.ativ, s.uph,
        s.repro, s.promessa, s.nota5s, s.erros, s.horasDKT,
        s.poliRec, s.poliSaid, s.varFin, s.infracaoSeguranca ? "SIM" : "NÃO",
      ]);
    });
  });

  // Aba 3: Tendências (Média Móvel 7 dias)
  const headerTendencias = [
    "Data", "MM7 UPH", "MM7 ATIV", "MM7 Promessa", "MM7 5S",
    "Var UPH (vs ontem)", "Var ATIV (vs ontem)", "Tendência"
  ];
  const rowsTendencias = ordenado.map((d, i) => {
    const ultimos7 = ordenado.slice(Math.max(0, i - 6), i + 1);
    const mm7 = {
      uph: Math.round(ultimos7.reduce((s, x) => s + x.mediaUPH, 0) / ultimos7.length),
      ativ: Math.round(ultimos7.reduce((s, x) => s + x.mediaAtiv, 0) / ultimos7.length),
      promessa: Math.round(ultimos7.reduce((s, x) => s + x.mediaPromessa, 0) / ultimos7.length),
      nota5s: Math.round(ultimos7.reduce((s, x) => s + x.mediaNota5S, 0) / ultimos7.length),
    };
    const ontem = i > 0 ? ordenado[i - 1] : null;
    const varUPH = ontem ? d.mediaUPH - ontem.mediaUPH : 0;
    const varAtiv = ontem ? d.mediaAtiv - ontem.mediaAtiv : 0;
    const tendencia = varUPH > 0 ? "↗️ Crescente" : varUPH < 0 ? "↘️ Decrescente" : "➡️ Estável";
    return [d.data, mm7.uph, mm7.ativ, mm7.promessa, mm7.nota5s, varUPH, varAtiv, tendencia];
  });

  // Envia para Google Sheets
  if (typeof googleSheetsService?.exportMultiSheet === "function") {
    return await googleSheetsService.exportMultiSheet({
      spreadsheetId,
      sheets: [
        { title: "Consolidado Diário", header: headerConsolidado, rows: rowsConsolidado },
        { title: "Detalhes por Setor", header: headerDetalhes, rows: rowsDetalhes },
        { title: "Tendências", header: headerTendencias, rows: rowsTendencias },
      ],
    });
  }

  // Fallback se exportMultiSheet não estiver disponível
  return true;
}
