/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * consolidationService.v2.ts
 * 
 * Lógica pura de consolidação diária:
 * - Agrupa registros do histórico por data e setor (último registro por setor prevalece)
 * - Computa métricas diárias consolidadas (UPH, ATIV, Promessa, 5S, etc.)
 * - Classifica a performance do dia (Excelente / Bom / Regular / Crítico)
 * - Gerencia persistência em 3 camadas: Local (localStorage), Supabase (PostgreSQL) e Sheets
 */

import { HistoricoRegistro, Setor, Colaborador } from "../types";

export interface DetalheSetorConsolidado {
  setorId: string;
  setorNome: string;
  resp: string;
  ativ: number;
  uph: number;
  repro: number;
  promessa: number;
  nota5s: number;
  erros: number;
  horasDKT: number;
  poliRec: number;
  poliSaid: number;
  varFin: number;
  infracaoSeguranca: boolean;
}

export interface DetalheColaboradorConsolidado {
  nome: string;
  setor: string;
  status: string;
  horas: number;
}

export interface ConsolidadoDia {
  id?: number | string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD
  semana: string;
  turno: string;
  totalSetores: number;
  mediaUPH: number;
  mediaAtiv: number;
  totalRepro: number;
  mediaPromessa: number;
  mediaNota5S: number;
  totalErros: number;
  totalHorasDKT: number;
  totalPoliRec: number;
  totalPoliSaid: number;
  totalVarFin: number;
  statusGeral: "Excelente" | "Bom" | "Regular" | "Crítico";
  detalhesSetor: DetalheSetorConsolidado[];
  detalhesColaborador: DetalheColaboradorConsolidado[];
}

const CACHE_KEY = "radar_consolidado_diario_cache_v2";

export interface EstatisticasConsolidados {
  totalDias: number;
  ultimoDia: string;
  ultimoStatus: string;
  porStatus: {
    Excelente: number;
    Bom: number;
    Regular: number;
    Crítico: number;
  };
}

export class ConsolidationService {
  /**
   * Converte data no formato DD/MM/YYYY para YYYY-MM-DD
   */
  static parseToISO(dataStr: string): string {
    if (!dataStr) return new Date().toISOString().slice(0, 10);
    if (dataStr.includes("-") && dataStr.length === 10) return dataStr;
    const parts = dataStr.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Classifica o status do dia com base nas metas operacionais
   */
  static classificarDia(mediaPromessa: number, mediaUPH: number, totalErros: number): "Excelente" | "Bom" | "Regular" | "Crítico" {
    if (mediaPromessa >= 98 && mediaUPH >= 120 && totalErros <= 2) {
      return "Excelente";
    }
    if (mediaPromessa >= 95 && mediaUPH >= 100) {
      return "Bom";
    }
    if (mediaPromessa >= 88 || mediaUPH >= 80) {
      return "Regular";
    }
    return "Crítico";
  }

  /**
   * Consolida um dia específico a partir dos registros de histórico brutos
   */
  static consolidarUmDia(
    dataStr: string,
    historico: HistoricoRegistro[],
    setores: Setor[],
    colaboradores: Colaborador[]
  ): ConsolidadoDia {
    const dataISO = this.parseToISO(dataStr);
    const registrosDia = historico.filter((h) => h.data === dataStr || this.parseToISO(h.data) === dataISO);

    // Agrupa por setor — o último registro de cada setor prevalece
    const mapSetorUltimo = new Map<string, HistoricoRegistro>();
    registrosDia.forEach((reg) => {
      mapSetorUltimo.set(String(reg.setor), reg);
    });

    // Mapeia detalhes dos setores
    const detalhesSetor: DetalheSetorConsolidado[] = [];
    let semana = "-";
    let turno = "-";

    mapSetorUltimo.forEach((reg, setorId) => {
      const setorInfo = setores.find((s) => String(s.id) === String(setorId));
      if (reg.semana && reg.semana !== "-") semana = reg.semana;
      if (reg.turno && reg.turno !== "-") turno = reg.turno;

      detalhesSetor.push({
        setorId,
        setorNome: setorInfo?.nome || `Setor ${setorId}`,
        resp: setorInfo?.resp || "Operação",
        ativ: Number(reg.ativ) || 0,
        uph: Number(reg.uph) || 0,
        repro: Number(reg.repro) || 0,
        promessa: Number(reg.promessa) || 0,
        nota5s: Number(reg.nota5s) || 0,
        erros: Number(reg.erros) || 0,
        horasDKT: Number(setorInfo?.horasDKT) || 0,
        poliRec: Number(setorInfo?.poliRec) || 0,
        poliSaid: Number(setorInfo?.poliSaid) || 0,
        varFin: Number(setorInfo?.varFin) || 0,
        infracaoSeguranca: Boolean(setorInfo?.infracaoSeguranca),
      });
    });

    // Se nenhum registro foi gravado ainda hoje, usa o snapshot dos setores ativos no momento
    if (detalhesSetor.length === 0 && setores.length > 0) {
      setores.forEach((s) => {
        detalhesSetor.push({
          setorId: String(s.id),
          setorNome: s.nome || `Setor ${s.id}`,
          resp: s.resp || "Operação",
          ativ: Number(s.ativ) || 0,
          uph: Number(s.uph) || 0,
          repro: Number(s.reproTotal) || 0,
          promessa: Number(s.promessa) || 0,
          nota5s: Number(s.nota5s) || 0,
          erros: Number(s.errosPicking) || 0,
          horasDKT: Number(s.horasDKT) || 0,
          poliRec: Number(s.poliRec) || 0,
          poliSaid: Number(s.poliSaid) || 0,
          varFin: Number(s.varFin) || 0,
          infracaoSeguranca: Boolean(s.infracaoSeguranca),
        });
      });
    }

    const count = detalhesSetor.length || 1;
    const mediaUPH = Math.round(detalhesSetor.reduce((acc, s) => acc + s.uph, 0) / count);
    const mediaAtiv = Math.round(detalhesSetor.reduce((acc, s) => acc + s.ativ, 0) / count);
    const totalRepro = detalhesSetor.reduce((acc, s) => acc + s.repro, 0);
    const mediaPromessa = Math.round(detalhesSetor.reduce((acc, s) => acc + s.promessa, 0) / count);
    const mediaNota5S = Math.round(detalhesSetor.reduce((acc, s) => acc + s.nota5s, 0) / count);
    const totalErros = detalhesSetor.reduce((acc, s) => acc + s.erros, 0);
    const totalHorasDKT = detalhesSetor.reduce((acc, s) => acc + s.horasDKT, 0);
    const totalPoliRec = detalhesSetor.reduce((acc, s) => acc + s.poliRec, 0);
    const totalPoliSaid = detalhesSetor.reduce((acc, s) => acc + s.poliSaid, 0);
    const totalVarFin = detalhesSetor.reduce((acc, s) => acc + s.varFin, 0);

    const detalhesColaborador: DetalheColaboradorConsolidado[] = colaboradores.map((c) => ({
      nome: c.nome,
      setor: c.setor,
      status: c.status,
      horas: Number(c.horas) || 0,
    }));

    const statusGeral = this.classificarDia(mediaPromessa, mediaUPH, totalErros);

    const consolidado: ConsolidadoDia = {
      data: dataStr,
      dataISO,
      semana: semana !== "-" ? semana : `S${Math.ceil((new Date(dataISO).getDate()) / 7)}`,
      turno: turno !== "-" ? turno : "Turno 1",
      totalSetores: detalhesSetor.length,
      mediaUPH,
      mediaAtiv,
      totalRepro,
      mediaPromessa,
      mediaNota5S,
      totalErros,
      totalHorasDKT,
      totalPoliRec,
      totalPoliSaid,
      totalVarFin,
      statusGeral,
      detalhesSetor,
      detalhesColaborador,
    };

    // Salva no cache local
    this.salvarNoCache(consolidado);

    return consolidado;
  }

  /**
   * Consolida todos os dias identificados no histórico
   */
  static consolidarTodos(
    historico: HistoricoRegistro[],
    setores: Setor[],
    colaboradores: Colaborador[]
  ): ConsolidadoDia[] {
    const datas = Array.from(new Set(historico.map((h) => h.data).filter(Boolean)));
    if (datas.length === 0) {
      const hoje = new Date().toLocaleDateString("pt-BR");
      datas.push(hoje);
    }

    const consolidados = datas.map((dataStr) =>
      this.consolidarUmDia(dataStr, historico, setores, colaboradores)
    );

    return consolidados;
  }

  /**
   * Carrega lista de consolidados do localStorage
   */
  static carregarCache(): ConsolidadoDia[] {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed: ConsolidadoDia[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("[ConsolidationService] Erro ao carregar cache local:", err);
      return [];
    }
  }

  /**
   * Salva ou atualiza um consolidado no localStorage
   */
  static salvarNoCache(novo: ConsolidadoDia): void {
    try {
      const lista = this.carregarCache();
      const idx = lista.findIndex((c) => c.dataISO === novo.dataISO || c.data === novo.data);
      if (idx >= 0) {
        lista[idx] = novo;
      } else {
        lista.push(novo);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(lista));
    } catch (err) {
      console.error("[ConsolidationService] Erro ao gravar cache local:", err);
    }
  }

  /**
   * Sincroniza um dia consolidado com a tabela `consolidado_diario` no Supabase
   */
  static async syncDia(supabaseClient: any, consolidado: ConsolidadoDia): Promise<boolean> {
    if (!supabaseClient) return false;
    try {
      const payload = {
        data: consolidado.dataISO,
        data_br: consolidado.data,
        semana: consolidado.semana,
        turno: consolidado.turno,
        total_setores: consolidado.totalSetores,
        media_uph: consolidado.mediaUPH,
        media_ativ: consolidado.mediaAtiv,
        total_repro: consolidado.totalRepro,
        media_promessa: consolidado.mediaPromessa,
        media_nota5s: consolidado.mediaNota5S,
        total_erros: consolidado.totalErros,
        total_horas_dkt: consolidado.totalHorasDKT,
        total_poli_rec: consolidado.totalPoliRec,
        total_poli_said: consolidado.totalPoliSaid,
        total_var_fin: consolidado.totalVarFin,
        status_geral: consolidado.statusGeral,
        detalhes_json: {
          setores: consolidado.detalhesSetor,
          colaboradores: consolidado.detalhesColaborador,
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseClient
        .from("consolidado_diario")
        .upsert(payload, { onConflict: "data" });

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || String(error.message).includes('Could not find')) {
          console.warn("[ConsolidationService] Tabela 'consolidado_diario' não encontrada no Supabase. Ignorando sincronização remota.");
          return false;
        }
        console.error("[ConsolidationService] Erro ao salvar consolidado no Supabase:", JSON.stringify(error));
        return false;
      }
      return true;
    } catch (err) {
      console.error("[ConsolidationService] Exceção ao persistir no Supabase:", err);
      return false;
    }
  }

  /**
   * Estatísticas gerais do histórico de consolidação
   */
  static estatisticas(consolidados: ConsolidadoDia[]): EstatisticasConsolidados | null {
    if (consolidados.length === 0) return null;
    const ordenado = [...consolidados].sort((a, b) => a.dataISO.localeCompare(b.dataISO));
    const ultimo = ordenado[ordenado.length - 1];

    const porStatus: { Excelente: number; Bom: number; Regular: number; Crítico: number } = {
      Excelente: consolidados.filter((c) => c.statusGeral === "Excelente").length,
      Bom: consolidados.filter((c) => c.statusGeral === "Bom").length,
      Regular: consolidados.filter((c) => c.statusGeral === "Regular").length,
      Crítico: consolidados.filter((c) => c.statusGeral === "Crítico").length,
    };

    return {
      totalDias: consolidados.length,
      ultimoDia: ultimo.data,
      ultimoStatus: ultimo.statusGeral,
      porStatus,
    };
  }
}
