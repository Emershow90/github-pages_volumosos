import React, { useState, useMemo } from "react";
import { useActionPlanStore } from "../stores/useActionPlanStore";
import { PlanoAcao5W2H, StatusPlanoAcao } from "../types/ActionPlan";
import { DiagnosticoGargalo } from "../types/Gargalo";
import {
  Wrench,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  TrendingUp,
  Award,
  ChevronRight,
  X,
  FileCheck,
  Building2,
} from "lucide-react";

interface PlanoAcaoTabProps {
  initialGargalo?: DiagnosticoGargalo | null;
  onClearInitialGargalo?: () => void;
  currentUserNome?: string;
}

export const PlanoAcaoTab: React.FC<PlanoAcaoTabProps> = ({
  initialGargalo,
  onClearInitialGargalo,
  currentUserNome = "Gestor Operacional",
}) => {
  const {
    planos,
    addPlano,
    updatePlano,
    concluirPlano,
    deletePlano,
    filtroStatus,
    setFiltroStatus,
    termoBusca,
    setTermoBusca,
  } = useActionPlanStore();

  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [modalConclusaoPlano, setModalConclusaoPlano] = useState<PlanoAcao5W2H | null>(null);

  // Form State para 5W2H
  const [formData, setFormData] = useState({
    problema: "",
    causa: "",
    what: "",
    why: "",
    where: "Setor 89",
    when: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    who: currentUserNome,
    how: "",
    howMuch: "Recursos internos do turno",
    indicador: "UPH (Produtividade)",
    unidade: "cx/h",
    valorAntes: 30,
    metaEsperada: 40,
    status: "Aberto" as StatusPlanoAcao,
  });

  // Preenche dados automaticamente se veio de um gargalo
  React.useEffect(() => {
    if (initialGargalo) {
      setFormData({
        problema: initialGargalo.titulo,
        causa: initialGargalo.causaProvavel,
        what: initialGargalo.acaoRecomendada,
        why: `Eliminar perda estimada de ${initialGargalo.impactoHorasEstimado}h e recuperar meta de ${initialGargalo.meta} ${initialGargalo.unidade}.`,
        where: initialGargalo.setorNome,
        when: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        who: currentUserNome,
        how: "Revisar rotas e balancear colaboradores na abertura do próximo turno.",
        howMuch: "Sem custo financeiro adicional",
        indicador: initialGargalo.indicador,
        unidade: initialGargalo.unidade,
        valorAntes: typeof initialGargalo.valorAtual === "number" ? initialGargalo.valorAtual : 30,
        metaEsperada: typeof initialGargalo.meta === "number" ? initialGargalo.meta : 40,
        status: "Em Andamento",
      });
      setModalCriacaoAberto(true);
      onClearInitialGargalo?.();
    }
  }, [initialGargalo, currentUserNome, onClearInitialGargalo]);

  // Form State de Conclusão (Antes x Depois)
  const [valorDepois, setValorDepois] = useState<number>(0);
  const [impactoDescricao, setImpactoDescricao] = useState("");
  const [padronizado, setPadronizado] = useState(true);
  const [padronizacaoDescricao, setPadronizacaoDescricao] = useState("Atualizado Procedimento Operacional Padrão (POP).");

  // Filtros aplicados
  const planosFiltrados = useMemo(() => {
    return planos.filter((p) => {
      const matchStatus = filtroStatus === "Todos" || p.status === filtroStatus;
      const matchTermo =
        !termoBusca ||
        p.what.toLowerCase().includes(termoBusca.toLowerCase()) ||
        p.problema.toLowerCase().includes(termoBusca.toLowerCase()) ||
        p.where.toLowerCase().includes(termoBusca.toLowerCase()) ||
        p.who.toLowerCase().includes(termoBusca.toLowerCase());
      return matchStatus && matchTermo;
    });
  }, [planos, filtroStatus, termoBusca]);

  // Contadores de Status
  const contadores = useMemo(() => {
    return {
      total: planos.length,
      abertos: planos.filter((p) => p.status === "Aberto").length,
      emAndamento: planos.filter((p) => p.status === "Em Andamento").length,
      concluidos: planos.filter((p) => p.status === "Concluido").length,
      padronizados: planos.filter((p) => p.padronizado).length,
    };
  }, [planos]);

  const handleSalvarPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPlano({
      ...formData,
      criadoPor: currentUserNome,
      padronizado: false,
    });
    setModalCriacaoAberto(false);
  };

  const handleConfirmarConclusao = async () => {
    if (!modalConclusaoPlano) return;
    await concluirPlano(
      modalConclusaoPlano.id,
      valorDepois,
      impactoDescricao,
      padronizado,
      padronizacaoDescricao
    );
    setModalConclusaoPlano(null);
  };

  return (
    <div className="space-y-4 p-3 md:p-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Wrench size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              🛠️ Planos de Ação 5W2H & Antes × Depois
            </h1>
            <p className="text-xs text-slate-400">
              Transformando desvios operacionais em ações rastreáveis com metas claras e padronização.
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalCriacaoAberto(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
        >
          <Plus size={16} />
          <span>Novo Plano 5W2H</span>
        </button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => setFiltroStatus("Todos")}
          className={`cursor-pointer border rounded-xl p-3 bg-[#0b0b10] transition-all ${
            filtroStatus === "Todos" ? "border-amber-500/50 bg-amber-500/5" : "border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] uppercase font-mono text-slate-400 block font-semibold">Total de Planos</span>
          <span className="text-xl font-mono font-black text-slate-100">{contadores.total}</span>
        </div>

        <div
          onClick={() => setFiltroStatus("Em Andamento")}
          className={`cursor-pointer border rounded-xl p-3 bg-[#0b0b10] transition-all ${
            filtroStatus === "Em Andamento" ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] uppercase font-mono text-indigo-400 block font-semibold">Em Andamento</span>
          <span className="text-xl font-mono font-black text-indigo-400">{contadores.emAndamento}</span>
        </div>

        <div
          onClick={() => setFiltroStatus("Concluido")}
          className={`cursor-pointer border rounded-xl p-3 bg-[#0b0b10] transition-all ${
            filtroStatus === "Concluido" ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] uppercase font-mono text-emerald-400 block font-semibold">Concluídos</span>
          <span className="text-xl font-mono font-black text-emerald-400">{contadores.concluidos}</span>
        </div>

        <div className="border border-purple-500/20 rounded-xl p-3 bg-purple-950/10">
          <span className="text-[10px] uppercase font-mono text-purple-400 block font-semibold">Padronizados (POP)</span>
          <span className="text-xl font-mono font-black text-purple-300">{contadores.padronizados}</span>
        </div>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="bg-[#0b0b10] border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ação, problema, setor ou responsável..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full bg-[#12131c] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusPlanoAcao | "Todos")}
            className="bg-[#12131c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Aberto">Aberto</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluido">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista de Planos de Ação */}
      {planosFiltrados.length === 0 ? (
        <div className="bg-[#0b0b10] border border-white/5 rounded-xl p-8 text-center space-y-3">
          <FileCheck size={36} className="text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Nenhum Plano de Ação Encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crie um novo plano 5W2H ou converta um gargalo identificado na aba de Gargalos.
          </p>
          <button
            onClick={() => setModalCriacaoAberto(true)}
            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg transition-all"
          >
            + Criar Primeiro Plano
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {planosFiltrados.map((plano) => {
            const isConcluido = plano.status === "Concluido";
            const statusBadge =
              plano.status === "Concluido"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : plano.status === "Em Andamento"
                ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30";

            return (
              <div
                key={plano.id}
                className="bg-[#0b0b10] border border-white/5 hover:border-white/10 rounded-xl p-4 space-y-3 transition-all"
              >
                {/* Header do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${statusBadge}`}>
                        {plano.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Building2 size={12} className="text-slate-500" />
                        {plano.where}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        • Prazo: {new Date(plano.when).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      {plano.what}
                    </h3>
                  </div>

                  {/* Ações de Estado */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isConcluido && (
                      <button
                        onClick={() => {
                          setModalConclusaoPlano(plano);
                          setValorDepois(plano.metaEsperada);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <CheckCircle2 size={13} />
                        <span>Concluir & Medir</span>
                      </button>
                    )}
                    {isConcluido && plano.padronizado && (
                      <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Award size={12} />
                        <span>POP Padronizado</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Estrutura 5W2H Compacta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-[#07070a] border border-white/5 rounded-lg p-2.5 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Por quê? (Why)</span>
                    <span className="text-slate-300 line-clamp-1">{plano.why}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Quem? (Who)</span>
                    <span className="text-amber-400 font-medium">{plano.who}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Como? (How)</span>
                    <span className="text-slate-300 line-clamp-1">{plano.how}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Custo / Recursos</span>
                    <span className="text-slate-400">{plano.howMuch || "Interno"}</span>
                  </div>
                </div>

                {/* Comparativo Antes x Depois (Se Concluído) ou Metas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 block font-sans font-semibold">Antes</span>
                      <span className="text-slate-300 font-bold">
                        {plano.valorAntes} {plano.unidade}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-slate-600" />
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 block font-sans font-semibold">Meta</span>
                      <span className="text-amber-400 font-bold">
                        {plano.metaEsperada} {plano.unidade}
                      </span>
                    </div>
                    {isConcluido && plano.valorDepois !== undefined && (
                      <>
                        <ChevronRight size={14} className="text-slate-600" />
                        <div>
                          <span className="text-[9px] uppercase text-emerald-400 block font-sans font-semibold">Depois</span>
                          <span className="text-emerald-400 font-bold">
                            {plano.valorDepois} {plano.unidade}
                          </span>
                        </div>
                        <div className="pl-2">
                          <span className="text-[9px] uppercase text-slate-500 block font-sans font-semibold">Variação</span>
                          <span className={`font-bold ${plano.percentualGanho && plano.percentualGanho >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {plano.percentualGanho && plano.percentualGanho > 0 ? "+" : ""}
                            {plano.percentualGanho}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Impacto Mensurado */}
                  {plano.impactoDescricao && (
                    <div className="text-[11px] text-slate-400 italic">
                      🎯 {plano.impactoDescricao}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação 5W2H */}
      {modalCriacaoAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSalvarPlano}
            className="bg-[#0d0e15] border border-white/10 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Criar Plano de Ação 5W2H</h3>
                  <p className="text-xs text-slate-400">Preenchimento estruturado para acompanhamento e escala</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCriacaoAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-300 font-semibold">Problema / Desvio Identificado:</label>
                <input
                  type="text"
                  required
                  value={formData.problema}
                  onChange={(e) => setFormData({ ...formData, problema: e.target.value })}
                  placeholder="Ex: Produtividade abaixo da meta no Setor 89"
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-300 font-semibold">Causa Raiz Provável:</label>
                <input
                  type="text"
                  required
                  value={formData.causa}
                  onChange={(e) => setFormData({ ...formData, causa: e.target.value })}
                  placeholder="Ex: Deslocamento excessivo e manobras bloqueadas"
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-amber-400 font-bold">1. WHAT (O que será feito?):</label>
                <input
                  type="text"
                  required
                  value={formData.what}
                  onChange={(e) => setFormData({ ...formData, what: e.target.value })}
                  placeholder="Ex: Reorganizar sequência lógica de abastecimento e criar pulmão"
                  className="w-full bg-[#12131c] border border-amber-500/30 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">2. WHY (Por quê?):</label>
                <input
                  type="text"
                  required
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="Ex: Reduzir tempo de ciclo de 18 min para 11 min"
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">3. WHERE (Onde?):</label>
                <input
                  type="text"
                  required
                  value={formData.where}
                  onChange={(e) => setFormData({ ...formData, where: e.target.value })}
                  placeholder="Ex: Setor 89 / Rua B4"
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">4. WHO (Quem é o responsável?):</label>
                <input
                  type="text"
                  required
                  value={formData.who}
                  onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                  placeholder="Ex: Emerson / Líder do Turno"
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">5. WHEN (Prazo limite):</label>
                <input
                  type="date"
                  required
                  value={formData.when}
                  onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-300 font-semibold">6. HOW (Como executar? Procedimento):</label>
                <textarea
                  rows={2}
                  required
                  value={formData.how}
                  onChange={(e) => setFormData({ ...formData, how: e.target.value })}
                  placeholder="Ex: Mapear posições de giro alto e reposicionar paletes pulmão no início do corredor."
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Metas Antes x Esperada */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Indicador:</label>
                <input
                  type="text"
                  value={formData.indicador}
                  onChange={(e) => setFormData({ ...formData, indicador: e.target.value })}
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-rose-400 font-semibold">Valor Antes:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.valorAntes}
                    onChange={(e) => setFormData({ ...formData, valorAntes: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#12131c] border border-rose-500/30 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-emerald-400 font-semibold">Meta Esperada:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.metaEsperada}
                    onChange={(e) => setFormData({ ...formData, metaEsperada: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#12131c] border border-emerald-500/30 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalCriacaoAberto(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Plus size={14} />
                <span>Salvar e Iniciar Plano</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Conclusão e Registro de Antes × Depois */}
      {modalConclusaoPlano && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0e15] border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Conclusão & Medição Antes × Depois</h3>
                  <p className="text-xs text-slate-400 font-mono">{modalConclusaoPlano.what}</p>
                </div>
              </div>
              <button
                onClick={() => setModalConclusaoPlano(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#07070a] border border-white/5 p-3 rounded-lg text-center font-mono">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block font-sans">Valor Antes</span>
                  <span className="text-sm font-bold text-rose-400">
                    {modalConclusaoPlano.valorAntes} {modalConclusaoPlano.unidade}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block font-sans">Meta Esperada</span>
                  <span className="text-sm font-bold text-amber-400">
                    {modalConclusaoPlano.metaEsperada} {modalConclusaoPlano.unidade}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-emerald-400 font-bold">Valor Alcançado Depois:</label>
                <input
                  type="number"
                  step="0.1"
                  value={valorDepois}
                  onChange={(e) => setValorDepois(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#12131c] border border-emerald-500/30 rounded-lg p-2.5 text-base font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Impacto Operacional Observado:</label>
                <input
                  type="text"
                  placeholder="Ex: Ganho de 8,8 cx/h e eliminação de fila de espera no setor."
                  value={impactoDescricao}
                  onChange={(e) => setImpactoDescricao(e.target.value)}
                  className="w-full bg-[#12131c] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={padronizado}
                    onChange={(e) => setPadronizado(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-white/20 focus:ring-0"
                  />
                  <span className="text-slate-200 font-bold text-xs">
                    Padronizar Melhoria (Criar / Atualizar POP Operacional)
                  </span>
                </label>

                {padronizado && (
                  <input
                    type="text"
                    placeholder="Descrição do padrão adotado no POP..."
                    value={padronizacaoDescricao}
                    onChange={(e) => setPadronizacaoDescricao(e.target.value)}
                    className="w-full bg-[#12131c] border border-purple-500/30 rounded-lg p-2 text-purple-200 focus:outline-none focus:border-purple-500"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setModalConclusaoPlano(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarConclusao}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg transition-all"
              >
                <CheckCircle2 size={14} />
                <span>Salvar Conclusão & Gerar Case</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
