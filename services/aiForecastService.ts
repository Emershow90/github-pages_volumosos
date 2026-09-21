import { CargoVolumeForecast, StageForecast, SectorForecast, ShiftDistributionForecast } from '../types/AIForecast';
import { HistoricoRegistro, Setor, CapacidadeSetor, Colaborador } from '../types';

export interface ForecastInputPayload {
  historico?: HistoricoRegistro[];
  setores?: Setor[];
  capacidade?: CapacidadeSetor[];
  colaboradores?: Colaborador[];
  targetDateStr?: string;
  dayOfWeekStr?: string;
  bufferPercentage?: number; // e.g. 5%
}

/**
 * Mathematical statistical forecast engine for Next-Day Cargo Volume
 * analyzing the 4 operational stages: 'Soltura - Coleta - Carga - Expedição'
 */
export function generateLocalCargoForecast(input: ForecastInputPayload): CargoVolumeForecast {
  const {
    historico = [],
    setores = [],
    capacidade = [],
    colaboradores = [],
    bufferPercentage = 5,
  } = input;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayOfWeek = input.dayOfWeekStr || dayNames[tomorrow.getDay()];
  const targetDate = input.targetDateStr || `Amanhã (${tomorrow.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;

  // 1. Calculate Historical Averages
  const validRecords = historico.filter((h) => h.ativ && h.ativ > 0);
  const totalRecords = validRecords.length;

  let avgDailyVolume = 26500;
  let avgUPH = 485;
  let avgSLA = 98.6;

  if (totalRecords > 0) {
    const totalVolume = validRecords.reduce((sum, h) => sum + h.ativ, 0);
    const avgPerEntry = totalVolume / totalRecords;
    // Estimate daily volume (assuming typical daily multi-sector consolidation)
    avgDailyVolume = Math.max(18000, Math.round(avgPerEntry * Math.min(4, Math.max(1, setores.length || 4))));
    avgUPH = Math.round(validRecords.reduce((sum, h) => sum + (h.uph || 450), 0) / totalRecords);
    avgSLA = parseFloat((validRecords.reduce((sum, h) => sum + (h.promessa || 98), 0) / totalRecords).toFixed(1));
  } else if (setores.length > 0) {
    // Sum current sector volumes as baseline
    const currentAtiv = setores.reduce((sum, s) => sum + (s.ativ || 0), 0);
    if (currentAtiv > 0) {
      avgDailyVolume = Math.round(currentAtiv * 1.05);
    }
  }

  // 2. Stage Multipliers (Soltura -> Coleta -> Carga -> Expedição)
  // Soltura has wave release buffer (~103%), Coleta is 100%, Carga is packed (~98%), Expedição is dispatched (~97%)
  const avgSoltura = Math.round(avgDailyVolume * 1.03);
  const avgColeta = Math.round(avgDailyVolume * 1.0);
  const avgCarga = Math.round(avgDailyVolume * 0.98);
  const avgExpedicao = Math.round(avgDailyVolume * 0.97);

  // 3. Day of week seasonal index
  const dayMultipliers: Record<number, number> = {
    0: 0.70, // Domingo
    1: 1.15, // Segunda (pico de início de semana)
    2: 1.08, // Terça
    3: 1.04, // Quarta
    4: 1.12, // Quinta (abastecimento pré-fim de semana)
    5: 1.20, // Sexta (pico máximo de expedição para lojas)
    6: 0.85, // Sábado
  };

  const dayFactor = dayMultipliers[tomorrow.getDay()] || 1.05;
  const growthVsAvg = Math.round(((dayFactor * (1 + bufferPercentage / 100)) - 1) * 100);

  // Total Expected Cargo Volume for Next Day
  const predictedCargoVolume = Math.round(avgCarga * dayFactor * (1 + bufferPercentage / 100));
  const minCargoVolume = Math.round(predictedCargoVolume * 0.91);
  const maxCargoVolume = Math.round(predictedCargoVolume * 1.14);
  const confidenceScore = totalRecords >= 5 ? 94 : 88;

  // 4. Detailed 4-Stages Breakdown
  const solturaVol = Math.round(predictedCargoVolume * 1.04);
  const coletaVol = Math.round(predictedCargoVolume * 1.02);
  const cargaVol = predictedCargoVolume;
  const expedicaoVol = Math.round(predictedCargoVolume * 0.99);

  const stages: {
    soltura: StageForecast;
    coleta: StageForecast;
    carga: StageForecast;
    expedicao: StageForecast;
  } = {
    soltura: {
      stage: 'Soltura',
      descricao: 'Liberação de listas e ordens de separação no sistema',
      historicalAvgVolume: avgSoltura,
      predictedVolume: solturaVol,
      targetUPH: Math.round(avgUPH * 1.35), // Soltura sistêmica tem alta cadência
      requiredHeadcount: Math.max(2, Math.ceil(solturaVol / ((avgUPH * 1.35) * 7.2))),
      estimatedHours: parseFloat((solturaVol / (avgUPH * 1.35 * 4)).toFixed(1)),
      status: solturaVol > avgSoltura * 1.15 ? 'atencao' : 'adequado',
      insights: `Necessário antecipar a soltura da primeira onda em 45 min para abastecer as frentes de picking do Turno 1 sem gerar ociosidade de coletores.`,
    },
    coleta: {
      stage: 'Coleta',
      descricao: 'Picking físico nos endereços dos universos e corredores',
      historicalAvgVolume: avgColeta,
      predictedVolume: coletaVol,
      targetUPH: avgUPH,
      requiredHeadcount: Math.max(12, Math.ceil(coletaVol / (avgUPH * 7.2))),
      estimatedHours: parseFloat((coletaVol / (avgUPH * 14)).toFixed(1)),
      status: coletaVol > avgColeta * 1.2 ? 'critico' : 'adequado',
      insights: `Concentrar operadores nos setores com maior densidade de itens pesados (S87/S88). Meta de UPH coletivo fixada em ${avgUPH} cx/h.`,
    },
    carga: {
      stage: 'Carga',
      descricao: 'Consolidação, paletização e pulmão de gaiolas',
      historicalAvgVolume: avgCarga,
      predictedVolume: cargaVol,
      targetUPH: Math.round(avgUPH * 0.85),
      requiredHeadcount: Math.max(6, Math.ceil(cargaVol / ((avgUPH * 0.85) * 7.2))),
      estimatedHours: parseFloat((cargaVol / ((avgUPH * 0.85) * 8)).toFixed(1)),
      status: cargaVol > avgCarga * 1.1 ? 'atencao' : 'adequado',
      insights: `Alocar área do pulmão central para ${Math.ceil(cargaVol / 45)} paletes/gaiolas para evitar estrangulamento das esteiras de saída.`,
    },
    expedicao: {
      stage: 'Expedição',
      descricao: 'Conferência, carregamento em docas e despacho de caminhões',
      historicalAvgVolume: avgExpedicao,
      predictedVolume: expedicaoVol,
      targetUPH: Math.round(avgUPH * 1.1),
      requiredHeadcount: Math.max(4, Math.ceil(expedicaoVol / ((avgUPH * 1.1) * 7.2))),
      estimatedHours: parseFloat((expedicaoVol / ((avgUPH * 1.1) * 6)).toFixed(1)),
      status: 'adequado',
      insights: `Janela de docas dimensionada para carregamento simultâneo de veículos com prioridade para rotas distantes (corte 14:00 e 17:00).`,
    },
  };

  // 5. Sector Breakdown (S87, S88, S89, S90)
  const defaultSectors = [
    { id: '87', name: 'Setor 87 (Confecção/Volumosos)', weight: 0.54, cap: 16000 },
    { id: '88', name: 'Setor 88 (Bazar/Linha Leve)', weight: 0.38, cap: 11000 },
    { id: '89', name: 'Setor 89 (Calçados/Especiais)', weight: 0.035, cap: 1500 },
    { id: '90', name: 'Setor 90 (Pesados/Recebimento)', weight: 0.045, cap: 2000 },
  ];

  const sectorList = setores.length > 0 ? setores : defaultSectors.map(d => ({ id: d.id, nome: d.name, uph: 450, meta: 500, ativ: Math.round(predictedCargoVolume * d.weight), promessa: 99, resp: 'Líder' }));

  const totalCap = capacidade.reduce((sum, c) => sum + c.abertura, 0) || 30500;

  const sectors: SectorForecast[] = sectorList.map((s) => {
    const sId = String(s.id);
    const def = defaultSectors.find((d) => d.id === sId) || { weight: 1 / sectorList.length, cap: 5000 };
    const capObj = capacidade.find((c) => String(c.id) === sId);
    const sectorCap = capObj?.abertura || def.cap;
    const vol = Math.round(cargaVol * def.weight);
    const occupancy = Math.round((vol / sectorCap) * 100);
    const targetSectorUph = s.uph || 450;
    const headcount = Math.max(2, Math.ceil(vol / (targetSectorUph * 7.2)));

    return {
      setorId: sId,
      setorName: s.nome || `Setor ${sId}`,
      volumePrevisto: vol,
      percentualTotal: Math.round(def.weight * 100),
      headcountSugerido: headcount,
      uphAlvo: targetSectorUph,
      capacidadeEstimada: sectorCap,
      taxaOcupacao: occupancy,
      gargaloPotencial: occupancy >= 88,
    };
  });

  // 6. Shift Distribution
  const turnos: ShiftDistributionForecast[] = [
    {
      turno: 'Turno 1 (Manhã - 07:00 às 15:20)',
      volumePrevisto: Math.round(cargaVol * 0.48),
      percentual: 48,
      operadoresSugeridos: Math.ceil(stages.coleta.requiredHeadcount * 0.52),
      focoOperacional: 'Pico de Coleta & Carga das primeiras rotas críticas (Lojas R1 e R2)',
    },
    {
      turno: 'Turno 2 (Tarde - 15:20 às 23:30)',
      volumePrevisto: Math.round(cargaVol * 0.38),
      percentual: 38,
      operadoresSugeridos: Math.ceil(stages.coleta.requiredHeadcount * 0.38),
      focoOperacional: 'Finalização de Carga, consolidação de pulmão e pico de Expedição nas docas',
    },
    {
      turno: 'Turno 3 (Madrugada - 23:30 às 07:00)',
      volumePrevisto: Math.round(cargaVol * 0.14),
      percentual: 14,
      operadoresSugeridos: Math.ceil(stages.coleta.requiredHeadcount * 0.15),
      focoOperacional: 'Soltura prévia de ondas, reabastecimento de picking e auditoria de endereços',
    },
  ];

  // 7. Executive Recommendations
  const recomendacoesIA = {
    resumoExecutivo: `Previsão de ${predictedCargoVolume.toLocaleString('pt-BR')} caixas para ${targetDate} (${dayOfWeek}), representando variação de ${growthVsAvg >= 0 ? `+${growthVsAvg}` : growthVsAvg}% frente à média histórica de ${avgCarga.toLocaleString('pt-BR')} caixas.`,
    estrategiaCarga: `Fluxo balanceado com cadência puxada pela Expedição. Recomendada soltura antecipada de ${solturaVol.toLocaleString('pt-BR')} cx no Turno 3 para garantir pulmão de picking no início da manhã.`,
    alertasGargalos: [
      sectors.some((sec) => sec.gargaloPotencial)
        ? `Setor ${sectors.find((sec) => sec.gargaloPotencial)?.setorId} com ocupação prevista em ${sectors.find((sec) => sec.gargaloPotencial)?.taxaOcupacao}%. Recomenda-se remanejamento de 2 operadores no T1.`
        : 'Capacidade instalada dos setores absorve a demanda prevista sem saturação crítica.',
      solturaVol > avgSoltura * 1.1
        ? 'Volume de Soltura superior à média histórica: verificar liberação de cortes de pedidos no ERP até as 06:00.'
        : 'Cadência de soltura e picking alinhada com as janelas de agendamento de veículos.',
    ],
    planoAcao: [
      `Garantir escala de ${stages.coleta.requiredHeadcount} operadores no picking e ${stages.carga.requiredHeadcount} na paletização.`,
      `Monitorar UPH alvo de ${avgUPH} cx/h a cada hora pelo Console Operacional.`,
      `Priorizar docas 01 a 04 para rotas com corte às 14:00 (D-0).`,
      `Reservar pulmão de ${Math.ceil(cargaVol / 45)} gaiolas para absorver pico das 11:00 às 14:00.`,
    ],
  };

  return {
    timestamp: new Date().toISOString(),
    targetDate,
    dayOfWeek,
    totalCargoVolume: predictedCargoVolume,
    confidenceInterval: {
      min: minCargoVolume,
      expected: predictedCargoVolume,
      max: maxCargoVolume,
      confidenceScore,
    },
    historicalAverages: {
      totalRecordsAnalyzed: totalRecords,
      avgDailyVolume,
      avgSoltura,
      avgColeta,
      avgCarga,
      avgExpedicao,
      avgUPH,
      avgSLA,
      growthVsAvg,
    },
    stages,
    sectors,
    turnos,
    recomendacoesIA,
    source: 'local_deterministic_forecast',
  };
}

/**
 * Calls Server-side Gemini Forecast endpoint (/api/ai/forecast)
 * with instant fallback to mathematical statistical forecast
 */
export async function fetchAICargoForecast(payload: ForecastInputPayload): Promise<CargoVolumeForecast> {
  const localBaseline = generateLocalCargoForecast(payload);

  try {
    const res = await fetch('/api/ai/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[aiForecastService] Server returned status ${res.status}, using deterministic local forecast.`);
      return localBaseline;
    }

    const data = await res.json();
    if (data && data.forecast) {
      return data.forecast as CargoVolumeForecast;
    }

    return localBaseline;
  } catch (err) {
    console.warn('[aiForecastService] Network error fetching forecast, using deterministic local forecast.', err);
    return localBaseline;
  }
}
