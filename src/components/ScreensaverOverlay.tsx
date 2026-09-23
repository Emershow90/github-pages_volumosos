import React, { useMemo } from "react";
import { Setor } from "../types";
import { Activity, Package, Boxes, Truck, CheckSquare } from "lucide-react";
import { useStoreOperations } from "../stores/useStoreOperations";
import { useSectorStore, resolveSectorMetrics } from "../stores/useSectorStore";

interface ScreensaverOverlayProps {
  isScreensaverActive: boolean;
  setoresFluctuated: Setor[];
  setores: Setor[];
  timeState: { local: string; utc: string };
  currentUser: string;
}

export const ScreensaverOverlay: React.FC<ScreensaverOverlayProps> = ({
  isScreensaverActive,
  setoresFluctuated,
  setores,
  timeState,
  currentUser,
}) => {
  // Store operations data
  const operationsMap = useStoreOperations((s) => s.operations);
  const sectorStoreSectors = useSectorStore((s) => s.setores);

  const effectiveSetores = useMemo(() => {
    return sectorStoreSectors.map((s) => resolveSectorMetrics(s));
  }, [sectorStoreSectors]);

  const allOperations = useMemo(() => Object.values(operationsMap), [operationsMap]);
  const totalLojasHoje = allOperations.length;
  const lojasColetadas = allOperations.filter((o) => o.statusColeta === "Coletada").length;
  const lojasEmAndamento = allOperations.filter((o) => o.statusColeta === "Em andamento").length;

  const totalVolumesProgramados = allOperations.reduce((acc, o) => acc + (o.volumes || 250), 0);
  const totalVolumesColetados = allOperations.reduce((acc, o) => {
    const v = o.volumes || 250;
    if (o.statusColeta === "Coletada") return acc + v;
    if (o.statusColeta === "Em andamento") return acc + Math.round(v * 0.5);
    return acc;
  }, 0);

  const percentualColetado = totalVolumesProgramados > 0
    ? Math.round((totalVolumesColetados / totalVolumesProgramados) * 100)
    : 0;

  const totalAtividade = useMemo(() => {
    return effectiveSetores.reduce((acc, s) => acc + (s.ativ || 0), 0);
  }, [effectiveSetores]);

  const totalColis = useMemo(() => {
    return effectiveSetores.reduce((acc, s) => acc + (s.colis || 0), 0);
  }, [effectiveSetores]);

  const totalReapro = useMemo(() => {
    return effectiveSetores.reduce((acc, s) => acc + (s.reproTotal || 0), 0);
  }, [effectiveSetores]);

  if (!isScreensaverActive) return null;

  // Safe retrieve of 4 main sectors
  const ssSectors = ["87", "88", "89", "90"]
    .map(
      (id) =>
        setoresFluctuated.find((s) => s.id === id) ||
        setores.find((s) => s.id === id)
    )
    .filter(Boolean) as Setor[];

  const getSectorKpisForScreensaver = (s: Setor) => {
    // 1. Pilotagem
    const pilotReal =
      s.id === "87" ? 100 : s.id === "88" ? 99.2 : s.id === "89" ? 98.0 : 99.5;
    const pilotScore = pilotReal / 100;

    // 2. Produtividade
    const prodReal = s.uph;
    const prodScore = s.uph / 550;

    // 3. Picking
    const pickReal =
      s.id === "87" ? 99.8 : s.id === "88" ? 99.0 : s.id === "89" ? 97.5 : 99.2;
    const pickScore = pickReal / 100;

    // 4. Promessa
    const promReal = s.promessa;
    const promScore = s.promessa / 95;

    // 5. Lead Time
    const ltReal = Math.max(30, Math.round(35 + (100 - s.promessa) * 1.5));
    const ltScore = 45 / ltReal;

    // 6. Aderência ao Corte
    const cutReal =
      s.id === "87" ? 100 : s.id === "88" ? 99.4 : s.id === "89" ? 98.1 : 99.8;
    const cutScore = cutReal / 100;

    // 7. Erro de Picking
    const errReal = s.errosPicking;
    const errScore = errReal <= 0 ? 1.2 : 1.0 / Math.max(0.01, errReal);

    // 8. PPM Erro de Picking
    const ppmReal = Math.round(s.errosPicking * 1000);
    const ppmScore = ppmReal <= 0 ? 1.2 : 1000 / Math.max(10, ppmReal);

    // 9. SAC Logístico
    const sacReal = parseFloat((s.errosPicking * 0.45).toFixed(2));
    const sacScore = sacReal <= 0 ? 1.2 : 0.5 / Math.max(0.01, sacReal);

    // 10. Taxa de Inventário
    const invReal =
      s.id === "87" ? 99.8 : s.id === "88" ? 99.6 : s.id === "89" ? 99.1 : 99.7;
    const invScore = invReal / 99.5;

    // 11. 5S Área
    const s5Real = s.nota5s;
    const s5Score = s.nota5s / 90;

    // 12. Variação de Estoque
    const stockReal =
      s.id === "87" ? 1250 : s.id === "88" ? 1480 : s.id === "89" ? 2100 : 950;
    const stockScore = 2000 / stockReal;

    // 13. BSI Cruzado
    const bsiReal = s.bsi;
    const bsiScore = s.bsi / 98;

    // 14. Infrações de Segurança
    const infReal = s.infracaoSeguranca ? 1 : 0;
    const infScore = s.infracaoSeguranca ? 0.0 : 1.2;

    return [
      { name: "Pilotagem", meta: "100%", real: `${pilotReal.toFixed(1)}%`, score: pilotScore },
      { name: "Produtividade", meta: "550 UPH", real: `${prodReal} UPH`, score: prodScore },
      { name: "Picking", meta: "100%", real: `${pickReal.toFixed(1)}%`, score: pickScore },
      { name: "Promessa", meta: "95%", real: `${promReal}%`, score: promScore },
      { name: "Lead Time", meta: "< 45 min", real: `${ltReal} min`, score: ltScore },
      { name: "Aderência ao Corte", meta: "100%", real: `${cutReal.toFixed(1)}%`, score: cutScore },
      { name: "Erro de Picking", meta: "< 1.0%", real: `${errReal}%`, score: errScore },
      { name: "PPM Erro de Picking", meta: "< 1000", real: `${ppmReal} ppm`, score: ppmScore },
      { name: "SAC Logístico", meta: "< 0.50%", real: `${sacReal.toFixed(2)}%`, score: sacScore },
      { name: "Taxa de Inventário", meta: "99.5%", real: `${invReal.toFixed(1)}%`, score: invScore },
      { name: "5S Área", meta: "90%", real: `${s5Real}%`, score: s5Score },
      {
        name: "Variação de Estoque",
        meta: "< R$ 2.000",
        real: `R$ ${(stockReal ?? 0).toLocaleString("pt-BR")}`,
        score: stockScore,
      },
      { name: "BSI Cruzado", meta: "98%", real: `${bsiReal}%`, score: bsiScore },
      {
        name: "Infrações Segurança",
        meta: "0",
        real: infReal === 0 ? "Nenhuma" : "1 Infração",
        score: infScore,
      },
    ];
  };

  const getKpiStyle = (score: number) => {
    if (score >= 1.0) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
        arrow: "▲",
        cls: "text-emerald-400 font-black",
      };
    } else if (score >= 0.8) {
      return {
        bg: "bg-amber-500/10 border-amber-500/25 text-amber-400",
        arrow: "▶",
        cls: "text-amber-400 font-black",
      };
    } else if (score >= 0.6) {
      return {
        bg: "bg-orange-500/10 border-orange-500/25 text-orange-400",
        arrow: "▶",
        cls: "text-orange-400 font-black",
      };
    } else {
      return {
        bg: "bg-red-500/15 border-red-500/35 text-red-400 pulse-anim",
        arrow: "▼",
        cls: "text-red-400 font-black",
      };
    }
  };

  const formattedDate = new Date()
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-md flex flex-col justify-between text-left animate-fade-in p-6 select-none font-sans text-white overflow-hidden">
      {/* Background scanner lines */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none"></div>
      </div>

      {/* HEADER OF SCREENSAVER */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-4 mb-4 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></div>
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] text-zinc-400 uppercase leading-none">
              COPIL GESTÃO À VISTA
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest mt-1 uppercase">
              Operação: CD LOGÍSTICO — PAINEL OPERACIONAL
            </p>
          </div>
        </div>

        {/* Central clock and date */}
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 font-mono tracking-tighter filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] leading-none">
            {timeState.local || "00:00:00"}
          </div>
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1.5">
            {formattedDate}
          </div>
        </div>

        {/* Operator details and synchronization timestamp */}
        <div className="text-right flex flex-col items-end gap-1 font-mono text-[10px] text-zinc-400">
          <p>
            COORDENADOR: <span className="text-white font-bold">{currentUser.toUpperCase()}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>ÚLTIMA ATUALIZAÇÃO: DADOS EM TEMPO REAL</span>
          </div>
        </div>
      </header>

      {/* 5 HERO METRICS BANNER • MODO TV (ATIVIDADE, COLIS, REAPRO, LOJAS HOJE, COLETADO) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 relative z-10">
        {/* ATIVIDADE */}
        <div className="bg-zinc-950/70 border border-emerald-500/30 border-l-4 border-l-emerald-500 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Activity size={13} /> ATIVIDADE</span>
            <span className="font-mono text-zinc-500">CD</span>
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-white mt-1">
            {totalAtividade.toLocaleString("pt-BR")}
          </div>
          <p className="text-[9.5px] text-zinc-400 mt-0.5">Unidades processadas hoje</p>
        </div>

        {/* QUANTIDADE COLIS */}
        <div className="bg-zinc-950/70 border border-cyan-500/30 border-l-4 border-l-cyan-500 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Package size={13} /> QUANTIDADE COLIS</span>
            <span className="font-mono text-zinc-500">TOTAL</span>
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-cyan-300 mt-1">
            {totalColis.toLocaleString("pt-BR")}
          </div>
          <p className="text-[9.5px] text-zinc-400 mt-0.5">Colis consolidados no CD</p>
        </div>

        {/* REAPRO */}
        <div className="bg-zinc-950/70 border border-purple-500/30 border-l-4 border-l-purple-500 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Boxes size={13} /> REAPRO</span>
            <span className="font-mono text-zinc-500">LINHAS</span>
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-purple-300 mt-1">
            {totalReapro.toLocaleString("pt-BR")}
          </div>
          <p className="text-[9.5px] text-zinc-400 mt-0.5">Caixas em reabastecimento</p>
        </div>

        {/* QUAIS LOJAS PARA ENVIAR HOJE */}
        <div className="bg-zinc-950/70 border border-blue-500/30 border-l-4 border-l-blue-500 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-blue-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Truck size={13} /> LOJAS PARA ENVIAR</span>
            <span className="font-mono text-zinc-500">HOJE</span>
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-white mt-1">
            {totalLojasHoje} <span className="text-xs font-sans text-zinc-400 font-normal">lojas</span>
          </div>
          <p className="text-[9.5px] text-zinc-400 mt-0.5">
            {lojasColetadas} coletadas • {lojasEmAndamento} em andamento
          </p>
        </div>

        {/* QUANTO JÁ FOI COLETADO */}
        <div className="bg-zinc-950/70 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-xl p-3 shadow-md col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><CheckSquare size={13} /> QUANTO COLETADO</span>
            <span className="font-mono text-amber-300 font-bold">{percentualColetado}%</span>
          </div>
          <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5 my-1.5">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentualColetado}%` }}
            />
          </div>
          <p className="text-[9.5px] text-zinc-400 font-mono">
            {totalVolumesColetados.toLocaleString("pt-BR")}/{totalVolumesProgramados.toLocaleString("pt-BR")} vols
          </p>
        </div>
      </div>

      {/* GRID OF 4 SECTORS (2x2) */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 h-[calc(100vh-160px)] overflow-y-auto mb-4 relative z-10">
        {ssSectors.map((s) => {
          const isRisk = s.bsi < 99 || s.infracaoSeguranca;
          const unitText = s.id === "87" ? "Caixas" : "Colis";
          const kpis = getSectorKpisForScreensaver(s);

          return (
            <div
              key={s.id}
              className={`glass-card p-4 flex flex-col justify-between border-t-2 bg-zinc-950/40 relative overflow-hidden transition-all duration-300 ${
                isRisk ? "border-t-red-500/70" : "border-t-emerald-500/50"
              }`}
            >
              {/* Inner high-contrast subtle layout border indicator */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] font-black text-9xl pointer-events-none select-none">
                S{s.id}
              </div>

              {/* Sector Header */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border border-white/10 bg-black/50 flex items-center justify-center text-xs font-black text-zinc-300">
                    S{s.id}
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wider text-white uppercase">
                      Setor {s.id}
                    </h2>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Líder: {s.resp}
                    </p>
                  </div>
                </div>

                {/* Prominent operational activity indicator */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                      Atividade
                    </p>
                    <p className="text-base font-black font-mono text-white mt-0.5">
                      {(s.ativ ?? 0).toLocaleString("pt-BR")}{" "}
                      <span className="text-[10px] font-bold text-zinc-400 font-sans">
                        {unitText}
                      </span>
                    </p>
                  </div>

                  {/* Status Indicator badge */}
                  <div
                    className={`px-2 py-1 rounded text-[8px] font-black tracking-widest uppercase ${
                      isRisk
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 pulse-anim"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isRisk ? "ALERTA CRÍTICO" : "NORMAL"}
                  </div>
                </div>
              </div>

              {/* KPI High-Density 2-Column Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1 content-start">
                {kpis.map((k, idx) => {
                  const style = getKpiStyle(k.score);
                  return (
                    <div
                      key={idx}
                      className="bg-black/20 hover:bg-black/40 border border-white/[0.03] hover:border-white/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between transition-colors gap-2"
                    >
                      <div className="truncate flex-1 min-w-0">
                        <p className="text-[9.5px] font-black text-zinc-300 uppercase tracking-wide truncate">
                          {k.name}
                        </p>
                        <p className="text-[8.5px] font-mono text-zinc-500">
                          Meta: {k.meta}
                        </p>
                      </div>

                      {/* Score badge with Arrow indicator */}
                      <div
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black flex items-center gap-1 border ${style.bg}`}
                      >
                        <span>{k.real}</span>
                        <span className="text-[8px]">{style.arrow}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {/* FOOTER OF SCREENSAVER */}
      <footer className="flex justify-between items-center border-t border-white/5 pt-3 mt-1 relative z-10">
        <p className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">
          SISTEMA OPERACIONAL COPIL LOGÍSTICA V4.3
        </p>
        <p className="text-[10px] text-indigo-400/80 font-black uppercase tracking-widest animate-pulse">
          [ PRESSIONE QUALQUER TECLA OU MOVA O MOUSE PARA RETORNAR AO MÓDULO OPERACIONAL ]
        </p>
      </footer>
    </div>
  );
};
