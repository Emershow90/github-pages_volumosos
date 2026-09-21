import { Setor, CapacidadeSetor, CopilKPI, CopilMatrizRow } from '../types';

/**
 * Pure helper function to compute COPIL KPI note (A, B, C, D) based on target, real values and business rules.
 */
export function calcCopilNota(
  row: CopilKPI | CopilMatrizRow,
  setores: Setor[],
  activeSectorId: string,
  capacidade: CapacidadeSetor[]
): string {
  if (row.notaManual && ["A", "B", "C", "D"].includes(row.notaManual)) {
    return row.notaManual;
  }

  let ratioVal = -1;

  if (row.auto) {
    const s = setores.find((x) => x.id === activeSectorId) || setores[0];
    const kpiLower = row.kpi.toLowerCase();

    if (kpiLower.includes("volume") || kpiLower.includes("produtividade")) {
      const cap = capacidade.find((c) => c.id === s?.id) || { abertura: 1000 };
      const calculatedVal = cap.abertura > 0 && s ? s.ativ / cap.abertura : 0;
      const meta = parseFloat(row.comp) || 1.0;
      ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
    } else if (
      kpiLower.includes("promessa") ||
      kpiLower.includes("sla") ||
      kpiLower.includes("eficiência")
    ) {
      const calculatedVal = s ? s.promessa / 100 : 0;
      const meta = (parseFloat(row.comp) || 95) / 100;
      ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
    } else if (
      kpiLower.includes("5s") ||
      kpiLower.includes("auditoria") ||
      kpiLower.includes("área")
    ) {
      const calculatedVal = s ? s.nota5s / 100 : 0;
      const meta = (parseFloat(row.comp) || 90) / 100;
      ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
    } else if (
      kpiLower.includes("reprocesso") ||
      kpiLower.includes("erro")
    ) {
      const realReproRate = s && s.ativ > 0 ? (s.reproTotal || 0) / s.ativ : 0;
      const metaReproRate = (parseFloat(row.comp) || 1.0) / 100;
      ratioVal =
        realReproRate <= metaReproRate
          ? 1.0
          : realReproRate === 0
          ? 0
          : metaReproRate / realReproRate;
    } else if (
      kpiLower.includes("segurança") ||
      kpiLower.includes("bsi")
    ) {
      const calculatedVal = s ? s.bsi / 100 : 0;
      const meta = (parseFloat(row.comp) || 98) / 100;
      ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
    }
  }

  if (ratioVal === -1) {
    if (
      !row.comp ||
      !row.real ||
      String(row.comp).trim() === "" ||
      String(row.real).trim() === ""
    ) {
      return "—";
    }

    const meta = parseFloat(row.comp);
    const real = parseFloat(row.real);

    if (isNaN(meta) || isNaN(real)) {
      return "—";
    }

    const isVariacaoEstoque =
      row.regraCalculo === "Variação de Estoque" ||
      row.kpi.toLowerCase().includes("variação") ||
      row.kpi.toLowerCase().includes("variacao");

    if (isVariacaoEstoque) {
      if (meta > 0) {
        if (Math.abs(real) <= meta) {
          return "A";
        } else {
          return "D";
        }
      } else {
        return real <= 0 ? "A" : "D";
      }
    }

    const isInverse =
      row.regraCalculo === "Inverso" ||
      row.inverso ||
      row.kpi.toLowerCase().includes("erro") ||
      row.kpi.toLowerCase().includes("infraç") ||
      row.kpi.toLowerCase().includes("infrac");
    if (isInverse) {
      ratioVal = real <= meta ? 1.0 : real === 0 ? 0 : meta / real;
    } else {
      ratioVal = meta > 0 ? real / meta : 1.0;
    }
  }

  if (ratioVal >= 1.0) return "A";
  if (ratioVal >= 0.95) return "B";
  if (ratioVal >= 0.9) return "C";
  return "D";
}
