import React, { useState, useEffect, useMemo } from 'react';
import { useGembaStore } from '../stores/useGembaStore';
import { GembaCard } from '../types/GembaCard';
import { useToast } from '../hooks/useToast';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wrench,
  Layers,
  Activity,
  Archive,
  Trash2,
  Edit3,
  X,
  RefreshCw,
  User,
  Calendar,
  Check,
  Tag,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ExternalLink,
  Flame,
  Award,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportGembaToGoogleSheets, initGoogleIdentity } from '../services/googleSheetsExportService';
import { useActionPlanStore } from '../stores/useActionPlanStore';

const CATEGORIAS = [
  'Todos',
  'Segurança',
  '5S',
  'Produtividade',
  'Qualidade',
  'Manutenção',
  'Processos',
  'Ergonomia'
];

const STATUS_LIST: Array<GembaCard['status']> = ['EM CURSO', 'EM RISCO', 'ATRASADO', 'CONCLUÍDO'];

const SETORES = ['Todos', 'Setor 87', 'Setor 88', 'Setor 89', 'Setor 90', 'Geral'];

export const GembaBoard: React.FC = () => {
  const {
    cards,
    loading,
    selectedCategory,
    selectedStatus,
    selectedSector,
    searchQuery,
    showArchived,
    setSelectedCategory,
    setSelectedStatus,
    setSelectedSector,
    setSearchQuery,
    setShowArchived,
    loadCards,
    addCard,
    updateCard,
    archiveCard,
    deleteCard,
    subscribeToUpdates
  } = useGembaStore();

  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GembaCard | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  const handleSyncPlanilhaMestre = async () => {
    setIsSyncingSheets(true);
    try {
      initGoogleIdentity();
      const url = await exportGembaToGoogleSheets(cards);
      toast.success('Estrutura Gemba conectada e sincronizada na Planilha Mestre (Aba Gemba)!');
      window.open(url, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar com Google Sheets';
      toast.error(msg);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handlePromoverParaCase = async (card: GembaCard) => {
    try {
      const novoCase = {
        titulo: `Case Gemba: ${card.descricao.slice(0, 50)}...`,
        gembaCardId: card.id,
        categoria: (card.categoria === 'Produtividade' ? 'Produtividade' : card.categoria === 'Qualidade' ? 'Qualidade' : 'Processo') as any,
        setor: card.identificador,
        problema: card.descricao,
        analiseCausa: `Anomalia identificada no chão de fábrica no Gemba em ${card.data_id}.`,
        acaoImplementada: card.acoes,
        responsavel: card.responsavel,
        dataInicio: card.data_id,
        dataFim: card.data_alvo || new Date().toISOString().slice(0, 10),
        valorAntes: 0,
        valorDepois: 1,
        unidade: 'ocorrência',
        ganhoPercentual: 100,
        impactoOperacional: `Contramedida validada no chão de fábrica: ${card.acoes}`,
        aprendizados: `Anomalia resolvida no Gemba com sucesso. Histórico de ações registrado.`,
        statusPadronizacao: 'Padronizado no POP' as const,
        horasHomemEconomizadas: 8,
        economiaEstimadaReais: 500,
      };
      await useActionPlanStore.getState().addCase(novoCase);
      toast.success(`Apontamento #${card.id} promovido a Case de Melhoria (Fase 4)!`);
    } catch (err) {
      toast.error('Erro ao promover para Case de Melhoria.');
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    categoria: 'Segurança',
    identificador: 'Setor 87',
    descricao: '',
    acoes: '',
    responsavel: '',
    data_alvo: '',
    status: 'EM CURSO' as GembaCard['status'],
    foto_url: ''
  });

  useEffect(() => {
    loadCards();
    const unsubscribe = subscribeToUpdates();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const openNewModal = () => {
    setEditingCard(null);
    setFormData({
      categoria: 'Segurança',
      identificador: 'Setor 87',
      descricao: '',
      acoes: '',
      responsavel: '',
      data_alvo: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'EM CURSO',
      foto_url: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (card: GembaCard) => {
    setEditingCard(card);
    setFormData({
      categoria: card.categoria,
      identificador: card.identificador || 'Setor 87',
      descricao: card.descricao,
      acoes: card.acoes || '',
      responsavel: card.responsavel,
      data_alvo: card.data_alvo || '',
      status: card.status,
      foto_url: card.foto_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim()) {
      toast.info('A descrição da oportunidade ou anomalia é obrigatória.');
      return;
    }
    if (!formData.responsavel.trim()) {
      toast.info('Informe o responsável pela ação.');
      return;
    }

    try {
      if (editingCard) {
        await updateCard(editingCard.id, {
          categoria: formData.categoria,
          identificador: formData.identificador,
          descricao: formData.descricao.trim(),
          acoes: formData.acoes.trim(),
          responsavel: formData.responsavel.trim(),
          data_alvo: formData.data_alvo,
          status: formData.status,
          foto_url: formData.foto_url.trim(),
          historico: [
            ...(editingCard.historico || []),
            {
              data: new Date().toLocaleDateString('pt-BR'),
              acao: `Atualizado por ${formData.responsavel || 'Operador'} (Status: ${formData.status})`
            }
          ]
        });
        toast.success('Apontamento Gemba atualizado com sucesso!');
      } else {
        await addCard({
          categoria: formData.categoria,
          identificador: formData.identificador,
          descricao: formData.descricao.trim(),
          acoes: formData.acoes.trim(),
          responsavel: formData.responsavel.trim(),
          data_alvo: formData.data_alvo,
          data_id: new Date().toISOString().split('T')[0],
          status: formData.status,
          foto_url: formData.foto_url.trim(),
          arquivado: false,
          historico: [
            {
              data: new Date().toLocaleDateString('pt-BR'),
              acao: `Criado na ronda de chão de fábrica por ${formData.responsavel.trim()}`
            }
          ]
        });
        toast.success('Novo apontamento Gemba registrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar apontamento.');
    }
  };

  const handleQuickComplete = async (card: GembaCard) => {
    try {
      await updateCard(card.id, {
        status: 'CONCLUÍDO',
        historico: [
          ...(card.historico || []),
          {
            data: new Date().toLocaleDateString('pt-BR'),
            acao: 'Concluído via ação rápida na Torre de Comando'
          }
        ]
      });
      toast.success('Ação Gemba marcada como CONCLUÍDA!');
    } catch (err) {
      toast.error('Erro ao concluir ação.');
    }
  };

  const handleToggleArchive = async (card: GembaCard) => {
    try {
      const nextState = !card.arquivado;
      await archiveCard(card.id, nextState);
      toast.info(nextState ? 'Card arquivado' : 'Card restaurado');
    } catch (err) {
      toast.error('Erro ao arquivar card.');
    }
  };

  const handleDelete = async (card: GembaCard) => {
    if (window.confirm(`Tem certeza que deseja excluir o apontamento "${card.descricao.slice(0, 40)}..."?`)) {
      try {
        await deleteCard(card.id);
        toast.success('Apontamento excluído com sucesso.');
      } catch (err) {
        toast.error('Erro ao excluir apontamento.');
      }
    }
  };

  // Filtragem dos Cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (!showArchived && c.arquivado) return false;
      if (showArchived && !c.arquivado) return false;

      if (selectedCategory !== 'Todos' && c.categoria !== selectedCategory) return false;
      if (selectedStatus !== 'Todos' && c.status !== selectedStatus) return false;
      if (selectedSector !== 'Todos' && c.identificador !== selectedSector) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (c.descricao || '').toLowerCase();
        const acoes = (c.acoes || '').toLowerCase();
        const resp = (c.responsavel || '').toLowerCase();
        const setor = (c.identificador || '').toLowerCase();
        if (!desc.includes(q) && !acoes.includes(q) && !resp.includes(q) && !setor.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [cards, showArchived, selectedCategory, selectedStatus, selectedSector, searchQuery]);

  // Métricas Consolidadas
  const metrics = useMemo(() => {
    const activeCards = cards.filter((c) => !c.arquivado);
    const total = activeCards.length;
    const emCurso = activeCards.filter((c) => c.status === 'EM CURSO').length;
    const concluido = activeCards.filter((c) => c.status === 'CONCLUÍDO').length;
    const emRisco = activeCards.filter((c) => c.status === 'EM RISCO').length;
    const atrasado = activeCards.filter((c) => c.status === 'ATRASADO').length;
    const taxaResolucao = total > 0 ? Math.round((concluido / total) * 100) : 100;

    return { total, emCurso, concluido, emRisco, atrasado, taxaResolucao };
  }, [cards]);

  const getCategoryBadge = (categoria: string) => {
    switch (categoria) {
      case 'Segurança':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          borderLeft: 'border-l-rose-500'
        };
      case '5S':
        return {
          icon: Sparkles,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          borderLeft: 'border-l-purple-500'
        };
      case 'Produtividade':
        return {
          icon: TrendingUp,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          borderLeft: 'border-l-emerald-500'
        };
      case 'Qualidade':
        return {
          icon: CheckCircle2,
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          borderLeft: 'border-l-cyan-500'
        };
      case 'Manutenção':
        return {
          icon: Wrench,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          borderLeft: 'border-l-amber-500'
        };
      case 'Processos':
        return {
          icon: Layers,
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          borderLeft: 'border-l-indigo-500'
        };
      case 'Ergonomia':
        return {
          icon: Activity,
          bg: 'bg-pink-500/10 border-pink-500/30 text-pink-300',
          borderLeft: 'border-l-pink-500'
        };
      default:
        return {
          icon: Tag,
          bg: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',
          borderLeft: 'border-l-zinc-500'
        };
    }
  };

  const getStatusBadge = (status: GembaCard['status']) => {
    switch (status) {
      case 'CONCLUÍDO':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'EM CURSO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'EM RISCO':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'ATRASADO':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      default:
        return 'bg-zinc-700 text-zinc-300 border-zinc-600';
    }
  };

  const renderCard = (card: GembaCard) => {
    const catStyle = getCategoryBadge(card.categoria);
    const CatIcon = catStyle.icon;
    const isExpanded = expandedCardId === card.id;

    // Calcular se está próximo ou passou do prazo
    let prazoAlert = '';
    if (card.data_alvo) {
      const hoje = new Date().toISOString().split('T')[0];
      if (card.status !== 'CONCLUÍDO') {
        if (card.data_alvo < hoje) {
          prazoAlert = 'Atrasado';
        } else if (card.data_alvo === hoje) {
          prazoAlert = 'Vence hoje';
        }
      }
    }

    return (
      <motion.div
        layout
        key={card.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-[#0d1017] border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-200 hover:border-white/20 border-l-4 ${catStyle.borderLeft}`}
      >
        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${catStyle.bg}`}>
                <CatIcon size={11} />
                <span>{card.categoria}</span>
              </span>
              {card.identificador && (
                <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-zinc-300 px-1.5 py-0.5 rounded">
                  {card.identificador}
                </span>
              )}
            </div>

            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadge(card.status)}`}>
              {card.status}
            </span>
          </div>

          {/* Descrição */}
          <h4 className="text-sm font-semibold text-zinc-100 leading-snug mb-2 select-text">
            {card.descricao}
          </h4>

          {/* Ações imediatas / Contramedidas */}
          {card.acoes && (
            <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 mb-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold mb-1 flex items-center gap-1">
                <Check size={11} />
                <span>Contramedida / Ação:</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed select-text">
                {card.acoes}
              </p>
            </div>
          )}

          {/* Foto/Evidência se houver */}
          {card.foto_url && (
            <div className="mb-3">
              <a
                href={card.foto_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ExternalLink size={12} />
                <span>Ver Evidência / Foto</span>
              </a>
            </div>
          )}

          {/* Histórico Expansível */}
          {card.historico && card.historico.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <span>Histórico ({card.historico.length})</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1.5 space-y-1 bg-black/40 border border-white/5 p-2 rounded-lg text-[10px] text-zinc-400 overflow-hidden"
                  >
                    {card.historico.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 border-b border-white/5 last:border-0 pb-1 last:pb-0">
                        <span className="font-mono text-zinc-500 shrink-0">{h.data}</span>
                        <span className="text-zinc-300">{h.acao}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Rodapé do Card */}
        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 truncate max-w-[140px]" title={card.responsavel}>
              <User size={12} className="text-zinc-500 shrink-0" />
              <strong className="text-zinc-300 truncate">{card.responsavel || 'Não atribuído'}</strong>
            </span>

            {card.data_alvo && (
              <span className={`flex items-center gap-1 font-mono text-[10px] ${prazoAlert ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                <Calendar size={11} />
                <span>{card.data_alvo.split('-').reverse().slice(0, 2).join('/')}</span>
                {prazoAlert && <span className="bg-rose-500/20 px-1 py-0.2 rounded text-[9px]">{prazoAlert}</span>}
              </span>
            )}
          </div>

          {/* Ações do Card */}
          <div className="flex items-center justify-between pt-1 gap-1">
            {card.status !== 'CONCLUÍDO' ? (
              <button
                type="button"
                onClick={() => handleQuickComplete(card)}
                className="btn-quick-complete flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded transition-colors"
                title="Marcar como Concluído"
              >
                <Check size={12} />
                <span>Concluir</span>
              </button>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Finalizado</span>
              </span>
            )}

            <div className="flex items-center gap-1">
              {card.status === 'CONCLUÍDO' && (
                <button
                  type="button"
                  onClick={() => handlePromoverParaCase(card)}
                  className="flex items-center gap-1 text-[10px] font-bold bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-2 py-1 rounded transition-colors mr-1"
                  title="Promover este apontamento resolvido a Case de Melhoria (Fase 4)"
                >
                  <Award size={12} className="text-purple-400" />
                  <span>Virar Case (Fase 4)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openEditModal(card)}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Editar Apontamento"
              >
                <Edit3 size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleToggleArchive(card)}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={card.arquivado ? "Desarquivar" : "Arquivar"}
              >
                <Archive size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(card)}
                className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Excluir Apontamento"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Header Banner */}
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame size={12} className="text-indigo-400 animate-pulse" />
                <span>Torre de Comando • Fase 3</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 text-xs font-mono">Gestão à Vista &amp; Resolução Contínua</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Gemba Board Digital</span>
              <span className="text-xs font-normal text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                Piso de Fábrica
              </span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mt-1">
              Registro, contramedidas imediatas e acompanhamento de anomalias operacionais nos setores de volumosos (Setores 87, 88, 89 e 90).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-sync-gemba-sheets"
              onClick={handleSyncPlanilhaMestre}
              disabled={isSyncingSheets}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Conectar e sincronizar na Planilha Mestre Oficial (Aba Gemba)"
            >
              <FileSpreadsheet size={15} className={isSyncingSheets ? 'animate-spin' : 'text-emerald-400'} />
              <span>{isSyncingSheets ? 'Sincronizando...' : 'Conectar Planilha (Aba Gemba)'}</span>
            </button>

            <button
              onClick={() => loadCards()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-50"
              title="Atualizar Gemba Board"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'grid' : 'kanban')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
              title="Alternar Modo de Visualização"
            >
              <SlidersHorizontal size={14} />
              <span>{viewMode === 'kanban' ? 'Visualização Grade' : 'Visualização Kanban'}</span>
            </button>

            <button
              id="btn-novo-gemba-card"
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Novo Apontamento Gemba</span>
            </button>
          </div>
        </div>

        {/* Metric Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/5">
          <div className="bg-black/30 border border-white/5 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Total Apontamentos</div>
            <div className="text-xl md:text-2xl font-black text-white mt-1">{metrics.total}</div>
          </div>

          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-blue-400 font-bold flex items-center gap-1">
              <Clock size={11} />
              <span>Em Curso</span>
            </div>
            <div className="text-xl md:text-2xl font-black text-blue-300 mt-1">{metrics.emCurso}</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>Concluídos</span>
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-300 mt-1">{metrics.concluido}</div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle size={11} />
              <span>Atrasados / Em Risco</span>
            </div>
            <div className="text-xl md:text-2xl font-black text-rose-300 mt-1">
              {metrics.atrasado + metrics.emRisco}
            </div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono uppercase text-purple-400 font-bold flex items-center gap-1">
              <Sparkles size={11} />
              <span>Taxa de Resolução</span>
            </div>
            <div className="text-xl md:text-2xl font-black text-purple-300 mt-1">{metrics.taxaResolucao}%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b0e14] border border-white/10 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            id="gemba-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição, ação ou responsável..."
            className="w-full bg-[#121620] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Categoria */}
          <select
            id="gemba-filter-categoria"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#121620] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Todos' ? 'Todas Categorias' : cat}
              </option>
            ))}
          </select>

          {/* Setor */}
          <select
            id="gemba-filter-setor"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-[#121620] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s === 'Todos' ? 'Todos Setores' : s}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            id="gemba-filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#121620] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Todos">Todos Status</option>
            {STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Arquivados toggle */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              showArchived
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#121620] border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Archive size={12} />
            <span>{showArchived ? 'Arquivados' : 'Ativos'}</span>
          </button>
        </div>
      </div>

      {/* Main Board Presentation */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_LIST.map((colStatus) => {
            const colCards = filteredCards.filter((c) => c.status === colStatus);
            let headerColor = 'text-blue-400 border-blue-500/30 bg-blue-950/20';
            if (colStatus === 'EM RISCO') headerColor = 'text-amber-400 border-amber-500/30 bg-amber-950/20';
            if (colStatus === 'ATRASADO') headerColor = 'text-rose-400 border-rose-500/30 bg-rose-950/20';
            if (colStatus === 'CONCLUÍDO') headerColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

            return (
              <div key={colStatus} className="bg-[#080b11] border border-white/10 rounded-2xl p-3 flex flex-col min-h-[500px]">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-3 ${headerColor}`}>
                  <span className="font-bold font-mono text-xs uppercase tracking-wider">{colStatus}</span>
                  <span className="text-xs font-bold font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                    {colCards.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[720px] pr-1">
                  {colCards.length > 0 ? (
                    colCards.map((card) => renderCard(card))
                  ) : (
                    <div className="h-48 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-zinc-500 text-xs p-4 text-center">
                      <span>Nenhum apontamento</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => renderCard(card))
          ) : (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-[#080b11]">
              <AlertTriangle size={32} className="mx-auto text-zinc-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Nenhum apontamento Gemba encontrado</p>
              <p className="text-xs text-zinc-500 mt-1">Ajuste os filtros ou registre um novo card pelo botão acima.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f131c] border border-white/20 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingCard ? 'Editar Apontamento Gemba' : 'Novo Apontamento Gemba'}
                  </h3>
                  <p className="text-xs text-zinc-400">Piso de Fábrica • Setores Volumosos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Categoria *
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIAS.filter((c) => c !== 'Todos').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Setor / Identificador *
                    </label>
                    <select
                      value={formData.identificador}
                      onChange={(e) => setFormData({ ...formData, identificador: e.target.value })}
                      className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {SETORES.filter((s) => s !== 'Todos').map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                    Descrição da Anomalia / Oportunidade *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva claramente o problema identificado no chão de fábrica..."
                    className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                    Contramedida / Ações Imediatas
                  </label>
                  <textarea
                    rows={2}
                    value={formData.acoes}
                    onChange={(e) => setFormData({ ...formData, acoes: e.target.value })}
                    placeholder="Plano de ação e passos práticos para contenção ou correção..."
                    className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Responsável *
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Data Alvo / Prazo
                    </label>
                    <input
                      type="date"
                      value={formData.data_alvo}
                      onChange={(e) => setFormData({ ...formData, data_alvo: e.target.value })}
                      className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as GembaCard['status'] })}
                      className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {STATUS_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold mb-1">
                    URL da Foto ou Evidência (Opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.foto_url}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-[#181d2a] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02]"
                  >
                    Salvar Apontamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
