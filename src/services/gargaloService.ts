import { SetorData } from "../types/Setor";
import { DiagnosticoGargalo, NivelPrioridade } from "../types/Gargalo";
import { StoreOperation } from "../types/Radar";

export class GargaloService {
  /**
   * Analisa setores e operações em tempo real para detectar gargalos operacionais
   */
  public static analisarGargalos(
    setores: SetorData[],
    operacoes?: StoreOperation[]
  ): DiagnosticoGargalo[] {
    const gargalos: DiagnosticoGargalo[] = [];

    // 1. Analisar Desvios de Produtividade / UPH por Setor
    setores.forEach((s) => {
      const uph = s.horasDKT > 0 ? Math.round((s.ativ / s.horasDKT) * 10) / 10 : 0;
      const metaUph = s.metaHora || 40;
      
      // Se há horas apontadas e a produtividade está abaixo da meta
      if (s.horasDKT > 0 && uph < metaUph) {
        const desvioPercentual = Math.round(((uph - metaUph) / metaUph) * 1000) / 10;
        const perdaProducaoHoras = Math.round(((metaUph - uph) * s.horasDKT / metaUph) * 10) / 10;
        
        let urgencia: "Alta" | "Media" | "Baixa" = "Baixa";
        let nivel: NivelPrioridade = "Controlado";
        let pesoUrgencia = 1;

        if (desvioPercentual <= -20) {
          urgencia = "Alta";
          nivel = "Critico";
          pesoUrgencia = 3;
        } else if (desvioPercentual <= -8) {
          urgencia = "Media";
          nivel = "Atencao";
          pesoUrgencia = 2;
        }

        // Frequência inferida pelo desvio ou retrabalho
        const freq = s.reproTotal > 10 ? 3 : s.reproTotal > 0 ? 2 : 1;
        const impactoScore = Math.min(10, Math.max(1, Math.round(Math.abs(desvioPercentual) / 5)));
        const prioridadeScore = impactoScore * pesoUrgencia * freq;

        let causaProvavel = "Deslocamento elevado ou espera por abastecimento (necessita validação em piso)";
        let acaoRecomendada = "Revisar sequência de abastecimento e balanceamento de colaboradores no setor.";

        if (s.reproTotal > 15) {
          causaProvavel = "Alto índice de retrabalho gerando perdas de ciclo produtivo";
          acaoRecomendada = "Auditar conferência inicial e identificar causas raízes de reprocesso no turno.";
        } else if (s.horasDKT > 30 && s.ativ < 300) {
          causaProvavel = "Gargalo no fluxo de entrada / falta de produto para separação";
          acaoRecomendada = "Alinhar liberação de ondas de separação com a liderança do setor.";
        }

        gargalos.push({
          id: `gargalo-uph-${s.id}`,
          titulo: `Produtividade Abaixo da Meta (${uph} / ${metaUph} cx/h)`,
          setorId: s.id,
          setorNome: s.nome,
          processo: "Separação / Movimentação",
          indicador: "UPH (Produtividade)",
          valorAtual: uph,
          meta: metaUph,
          unidade: "cx/h",
          desvioPercentual,
          impactoHorasEstimado: perdaProducaoHoras,
          urgencia,
          frequenciaTurnos: freq,
          prioridadeScore,
          prioridadeNivel: nivel,
          causaProvavel,
          evidencia: `${s.horasDKT}h operadas com ${s.ativ} itens produzidos vs meta de ${Math.round(metaUph * s.horasDKT)} itens`,
          acaoRecomendada,
          dataIdentificacao: new Date().toISOString(),
        });
      }

      // 2. Analisar Alto Retrabalho / Reprocesso
      if (s.reproTotal > 12) {
        gargalos.push({
          id: `gargalo-retrab-${s.id}`,
          titulo: `Taxa Elevada de Reprocesso (${s.reproTotal} caixas)`,
          setorId: s.id,
          setorNome: s.nome,
          processo: "Qualidade / Conferência",
          indicador: "Retrabalho",
          valorAtual: `${s.reproTotal} cx`,
          meta: "< 5 cx",
          unidade: "cx",
          desvioPercentual: Math.round(((s.reproTotal - 5) / 5) * 100),
          impactoHorasEstimado: Math.round((s.horasDKT * (s.reproTotal / 100)) * 10) / 10,
          urgencia: s.reproTotal > 20 ? "Alta" : "Media",
          frequenciaTurnos: 2,
          prioridadeScore: Math.round(s.reproTotal * 1.5),
          prioridadeNivel: s.reproTotal > 20 ? "Critico" : "Atencao",
          causaProvavel: "Divergência na etiquetagem ou separação incorreta de SKU",
          evidencia: `${s.reproTotal} itens rejeitados na conferência final`,
          acaoRecomendada: "Treinamento pontual de conferência e verificação de integridade de código de barras.",
          dataIdentificacao: new Date().toISOString(),
        });
      }
    });

    // 3. Analisar Lojas Críticas no Radar Live (se fornecido)
    if (operacoes && operacoes.length > 0) {
      const lojasCriticas = operacoes.filter(
        (op) => op.perdeuCorte || op.statusExpedicao === "Fora do horário" || op.statusCarregamento === "Não carregada"
      );
      if (lojasCriticas.length > 0) {
        gargalos.push({
          id: `gargalo-radar-live`,
          titulo: `${lojasCriticas.length} Lojas com Risco Iminente de Corte no Radar Live`,
          setorNome: "Expedição / Crossdocking",
          processo: "Expedição & Carregamento",
          indicador: "Lojas em Risco",
          valorAtual: lojasCriticas.length,
          meta: "0",
          unidade: "lojas",
          desvioPercentual: 100,
          impactoHorasEstimado: Math.round(lojasCriticas.length * 1.5 * 10) / 10,
          urgencia: "Alta",
          frequenciaTurnos: 3,
          prioridadeScore: 90,
          prioridadeNivel: "Critico",
          causaProvavel: "Atraso no fechamento de gaiolas/paletes para as docas das rotas",
          evidencia: `Lojas: ${lojasCriticas.map((l) => `${l.lojaId} - ${l.nomeLoja}`).slice(0, 5).join(", ")}${lojasCriticas.length > 5 ? "..." : ""}`,
          acaoRecomendada: "Priorizar imediata alocação de conferentes para as docas das lojas em corte.",
          dataIdentificacao: new Date().toISOString(),
        });
      }
    }

    // Ordenar pelo Score de Prioridade decrescente
    return gargalos.sort((a, b) => b.prioridadeScore - a.prioridadeScore);
  }
}
