import React, { useState } from "react";
import { SetorData } from "../types/Setor";
import { StoreOperation } from "../types/Radar";
import { ConsolidadoDia } from "../services/consolidationService.v2";
import { GargaloService } from "../services/gargaloService";
import {
  Brain,
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface InsightIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  setores: SetorData[];
  operacoes?: StoreOperation[];
  consolidadoHoje?: ConsolidadoDia | null;
}

interface MensagemInsight {
  id: string;
  sender: "user" | "ia";
  texto: string;
  hora: string;
}

export const InsightIaModal: React.FC<InsightIaModalProps> = ({
  isOpen,
  onClose,
  setores,
  operacoes,
  consolidadoHoje,
}) => {
  const [inputQuery, setInputQuery] = useState("");
  const [mensagens, setMensagens] = useState<MensagemInsight[]>([
    {
      id: "msg-welcome",
      sender: "ia",
      texto:
        "Olá! Sou o Assistente de Decisão Operacional da Torre de Comando. Posso analisar em tempo real seus setores, gargalos, desvios de UPH e recomendar ações estruturadas.",
      hora: new Date().toLocaleTimeString("pt-BR").slice(0, 5),
    },
  ]);

  if (!isOpen) return null;

  const handlePerguntar = (perguntaTexto: string) => {
    const q = perguntaTexto.trim();
    if (!q) return;

    const hora = new Date().toLocaleTimeString("pt-BR").slice(0, 5);
    const msgUsuario: MensagemInsight = {
      id: `user-${Date.now()}`,
      sender: "user",
      texto: q,
      hora,
    };

    setMensagens((prev) => [...prev, msgUsuario]);
    setInputQuery("");

    // Processamento analítico determinístico baseado nos dados reais
    setTimeout(() => {
      let resposta = "";
      const gargalos = GargaloService.analisarGargalos(setores, operacoes);
      const totalAtiv = setores.reduce((acc, s) => acc + s.ativ, 0);
      const totalHoras = setores.reduce((acc, s) => acc + s.horasDKT, 0);
      const uphGlobal = totalHoras > 0 ? Math.round((totalAtiv / totalHoras) * 10) / 10 : 0;

      if (q.includes("acontecendo") || q.includes("hoje") || q.includes("status")) {
        const criticos = gargalos.filter((g) => g.prioridadeNivel === "Critico").length;
        resposta = `📊 **Diagnóstico Operacional do Turno:**\n\n• **Atividade Total Realizada:** ${totalAtiv.toLocaleString("pt-BR")} caixas\n• **Produtividade Média Global:** ${uphGlobal} cx/h\n• **Gargalos Detectados:** ${gargalos.length} (${criticos} críticos)\n\n${
          gargalos.length > 0
            ? `O principal desvio está no **${gargalos[0].setorNome}**, com UPH de ${gargalos[0].valorAtual} vs meta de ${gargalos[0].meta} (${gargalos[0].desvioPercentual}%).\n\n💡 **Recomendação Imediata:** ${gargalos[0].acaoRecomendada}`
            : "✅ A operação está dentro de todos os parâmetros de meta."
        }`;
      } else if (q.includes("maior problema") || q.includes("gargalo") || q.includes("priorizar")) {
        if (gargalos.length > 0) {
          const top = gargalos[0];
          resposta = `🚨 **Principal Ponto de Atenção (Score: ${top.prioridadeScore}):**\n\n• **Setor:** ${top.setorNome}\n• **Problema:** ${top.titulo}\n• **Desvio:** ${top.desvioPercentual}%\n• **Causa Provável:** ${top.causaProvavel}\n• **Impacto Estimado:** ${top.impactoHorasEstimado} horas de capacidade produtiva\n\n🛠️ **Plano de Ação Sugerido:**\n1. Abrir Plano 5W2H no setor.\n2. ${top.acaoRecomendada}\n3. Medir impacto antes x depois no fechamento do turno.`;
        } else {
          resposta = "Não há gargalos críticos detectados no momento. Todos os setores operam acima do limiar de segurança.";
        }
      } else if (q.includes("ação") || q.includes("recomenda") || q.includes("sugest")) {
        if (gargalos.length > 0) {
          resposta = `🛠️ **Ações Prioritárias Recomendadas:**\n\n1. **${gargalos[0].setorNome}:** ${gargalos[0].acaoRecomendada}\n${
            gargalos[1] ? `2. **${gargalos[1].setorNome}:** ${gargalos[1].acaoRecomendada}\n` : ""
          }\nEssas ações atacam diretamente o impacto estimado de **${Math.round(
            gargalos.reduce((a, b) => a + b.impactoHorasEstimado, 0)
          )}h** perdidas no turno.`;
        } else {
          resposta = "Mantenha o monitoramento padrão do Radar Live e garanta a liberação contínua das docas de expedição.";
        }
      } else {
        resposta = `🔍 Analisando os ${setores.length} setores ativos: A produtividade global está em **${uphGlobal} cx/h** com **${totalAtiv} caixas** processadas. Utilize as perguntas sugeridas abaixo para diagnósticos detalhados por setor ou causa raiz.`;
      }

      setMensagens((prev) => [
        ...prev,
        {
          id: `ia-${Date.now()}`,
          sender: "ia",
          texto: resposta,
          hora: new Date().toLocaleTimeString("pt-BR").slice(0, 5),
        },
      ]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b0c13] border border-purple-500/30 rounded-2xl max-w-2xl w-full h-[85vh] max-h-[700px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-white/10 bg-[#10121c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                🧠 Assistente INSIGHT • Decisão Operacional
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Análise em malha fechada orientada a causas e planos 5W2H
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Chat */}
        <div className="flex-1 p-3.5 space-y-3 overflow-y-auto font-sans text-xs">
          {mensagens.map((msg) => {
            const isIa = msg.sender === "ia";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isIa ? "items-start" : "items-start flex-row-reverse"}`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isIa ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {isIa ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] space-y-1 ${
                    isIa
                      ? "bg-[#141624] border border-white/10 text-slate-200"
                      : "bg-indigo-600 text-white font-medium"
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed text-xs">{msg.texto}</p>
                  <span className="text-[9px] text-slate-400 block text-right font-mono">{msg.hora}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Perguntas Rápidas de Gestão */}
        <div className="p-2 border-t border-white/5 bg-[#090a10] flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => handlePerguntar("O que está acontecendo hoje?")}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-300 font-medium whitespace-nowrap transition-all flex items-center gap-1"
          >
            <Lightbulb size={11} className="text-amber-400" />
            <span>O que está acontecendo hoje?</span>
          </button>
          <button
            onClick={() => handlePerguntar("Onde está o maior gargalo?")}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-300 font-medium whitespace-nowrap transition-all flex items-center gap-1"
          >
            <AlertTriangle size={11} className="text-rose-400" />
            <span>Onde está o gargalo?</span>
          </button>
          <button
            onClick={() => handlePerguntar("Qual ação recomenda priorizar?")}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-300 font-medium whitespace-nowrap transition-all flex items-center gap-1"
          >
            <Sparkles size={11} className="text-purple-400" />
            <span>Qual ação recomenda?</span>
          </button>
        </div>

        {/* Input de Pergunta */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePerguntar(inputQuery);
          }}
          className="p-3 border-t border-white/10 bg-[#0e1018] flex gap-2"
        >
          <input
            type="text"
            placeholder="Faça uma pergunta sobre a operação ou setor..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 bg-[#151824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center shadow-lg transition-all"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
