import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Trash2, 
  CheckCircle, 
  Plus, 
  RefreshCw, 
  Search, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock, 
  CheckSquare, 
  Truck,
  Flame,
  Layers,
  MapPin,
  List,
  Grid,
  Filter,
  Sliders,
  Sparkles,
  Store,
  Building2,
  Check,
  ChevronDown,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatToBrasiliaTime, getBrasiliaTimeString } from "../utils/time";
import { useStoreOperations } from "../stores/useStoreOperations";
import { useAtividadeLoja } from "../stores/useAtividadeLoja";
import { useUserStore } from "../stores/useUserStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useStoreMaster } from "../stores/useStoreMaster";
import { StoreService } from "../services/storeService";
import { fetchPlanoCarregamento, PlanoCarregamentoRow } from "../lib/googleSheetsPublicSource";
import { BusinessRules } from "../services/businessRules";
import { SupabaseService as FirebaseService, isOnline } from "../lib/supabaseService";
import { StoreOperation, ParsedProgramRow, StoreMaster } from "../types";
import { useSectorStore } from "../stores/useSectorStore";
import { ModalConfirmacao } from "./ModalConfirmacao";
import { usePlanoCarregamentoRisk, RiskLevel } from "../hooks/usePlanoCarregamentoRisk";

interface RadarLojasTabProps {
  currentRole?: string;
  onSaveRadar?: (items: Record<string, unknown>[]) => void;
  activeSectorId?: string;
}

export default function RadarLojasTab({ currentRole: rbacRoleProps, onSaveRadar, activeSectorId }: RadarLojasTabProps) {
  // Zustand States
  const operations = useStoreOperations((state) => state.operations);
  const upsertOperation = useStoreOperations((state) => state.upsertOperation);
  const removeOperation = useStoreOperations((state) => state.removeOperation);
  
  const currentUser = useUserStore((state) => state.currentUser);
  const currentRole = useUserStore((state) => state.currentRole);
  const addAlert = useNotificationStore((state) => state.addAlert);
  const { setores } = useSectorStore();

  // Hook do Plano de Carregamento & Risco
  const { operations: riskOperations, summary: riskSummary, loading: riskLoading, planoCarregamento } = usePlanoCarregamentoRisk();

  // Estado de conexão e sincronização
  const [onlineState, setOnlineState] = useState<boolean>(isOnline());
  const [offlineQueueLength, setOfflineQueueLength] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncingPlano, setIsSyncingPlano] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Filtros locais
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Permissões e Formulario Manual
  const [userSectors] = useState<string[]>(["S87", "S88", "S89", "S90"]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLojaId, setNewLojaId] = useState("");
  const [newLojaNome, setNewLojaNome] = useState("");
  const [newSector, setNewSector] = useState<string>("S87");
  const [newCorte, setNewCorte] = useState("08:00");
  const [newCarregamento, setNewCarregamento] = useState("08:30");
  const [newTransportadora, setNewTransportadora] = useState("MOBI");

  // Master Store Catalog State
  const { stores: masterStores, addStore: addMasterStore, loadStores: loadMasterStores } = useStoreMaster();
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);

  // Notificações
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    StoreService.initMasterStores();
    const interval = setInterval(() => {
      const online = isOnline();
      setOnlineState(online);
      const queue = JSON.parse(localStorage.getItem("radar_offline_queue") || "[]");
      setOfflineQueueLength(queue.length);

      if (online && queue.length > 0) {
        FirebaseService.flushOfflineQueue().catch(err => {
          console.warn("[Auto-Sync] Falha ao sincronizar fila offline:", err);
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const triggerFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleToggleOffline = async () => {
    const simOffline = localStorage.getItem("radar_sim_offline") === "true";
    localStorage.setItem("radar_sim_offline", simOffline ? "false" : "true");
    const nextState = !simOffline;
    setOnlineState(nextState);
    triggerFeedback(`Modo ${nextState ? "ONLINE" : "OFFLINE"} ativado.`);
    
    if (simOffline) {
      setIsSyncing(true);
      try {
        await FirebaseService.flushOfflineQueue();
        triggerFeedback("Modo Online restabelecido e dados sincronizados!");
      } catch (err) {
        triggerFeedback("Erro ao sincronizar fila offline.", true);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSyncPlano = async () => {
    setIsSyncingPlano(true);
    try {
      const rows = await fetchPlanoCarregamento();
      
      const parsedRows: ParsedProgramRow[] = rows.map(r => {
        const dataStr = typeof r.data === 'string' ? r.data.split('T')[0] : String(r.data);
        return {
          lojaId: String(r.codLoja).trim(),
          nomeLoja: r.nomeLoja || `Loja ${r.codLoja}`,
          cidade: 'São Paulo', // Default
          uf: 'SP',
          setor: 'S87', // Default to Picking
          corte: r.horaCarregamento,
          carregamento: r.horaCarregamento,
          transportadora: 'JADLOG', // Default
          volumes: 0,
          enderecos: 0,
          atividadeRelacionada: 'Picking',
          dataProgramacao: dataStr
        };
      });

      for (const row of rows) {
        const id = `${row.data}_${row.codLoja}_${row.horaCarregamento}`;
        await FirebaseService.upsertRecord('plano_carregamento', { id, ...row }, 'id');
      }

      await StoreService.commitImportedRows(parsedRows, currentUser);

      triggerFeedback(`Plano Sincronizado! (${rows.length} registros)`);
    } catch (err) {
      triggerFeedback('Erro ao sincronizar Plano de Carregamento', true);
    } finally {
      setIsSyncingPlano(false);
    }
  };

  const handleForceSync = async () => {
    if (!onlineState) {
      triggerFeedback("Não é possível sincronizar no modo offline.", true);
      return;
    }
    setIsSyncing(true);
    try {
      await FirebaseService.flushOfflineQueue();
      const targetDateIso = new Date().toISOString().split("T")[0];
      const dbOps = await FirebaseService.fetchTable<StoreOperation>('store_operations');
      if (dbOps && dbOps.length > 0) {
        let filtered = dbOps.filter(op => op.programacaoId === targetDateIso);
        if (filtered.length === 0) filtered = dbOps;
        const opsMap: Record<string, StoreOperation> = {};
        filtered.forEach(op => { opsMap[op.id] = op; });
        useStoreOperations.getState().setOperations(opsMap);
      }
      triggerFeedback("Sincronização concluída com sucesso!");
    } catch (err) {
      triggerFeedback("Falha ao sincronizar.", true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Atualização operacional por etapa
  const handleUpdateOperationalStep = async (
    op: StoreOperation,
    action: 'soltura' | 'coleta' | 'carga' | 'expedicao'
  ) => {
    const validation = BusinessRules.validateOperationalFlow(
      op,
      action,
      currentRole,
      userSectors
    );

    if (!validation.allowed) {
      triggerFeedback(validation.message, true);
      addAlert({
        tipo: "Erro",
        prioridade: "alta",
        titulo: "Falha Operacional",
        descricao: validation.message,
        setor: op.setor || "Radar"
      });
      return;
    }

    const nextOp = { ...op };
    const userTag = `${currentUser} (${currentRole.toUpperCase()})`;
    const currentTime = getBrasiliaTimeString();

    if (action === 'soltura') {
      const isSolta = op.statusSoltura === 'Solta';
      nextOp.statusSoltura = isSolta ? 'Não Solta' : 'Solta';
      nextOp.horarioSoltura = isSolta ? null : currentTime;
      nextOp.soltoPor = isSolta ? null : userTag;
      if (isSolta) {
        nextOp.statusColeta = 'Não iniciada';
        nextOp.horarioColeta = null;
        nextOp.coletadoPor = null;
        nextOp.statusCarregamento = 'Não carregada';
        nextOp.horarioCarregamento = null;
        nextOp.carregadoPor = null;
        nextOp.statusExpedicao = 'Pendente';
      }
    } else if (action === 'coleta') {
      let nextState: 'Não iniciada' | 'Em andamento' | 'Coletada' = 'Em andamento';
      if (op.statusColeta === 'Em andamento') nextState = 'Coletada';
      else if (op.statusColeta === 'Coletada') nextState = 'Não iniciada';

      nextOp.statusColeta = nextState;
      nextOp.horarioColeta = nextState !== 'Não iniciada' ? currentTime : null;
      nextOp.coletadoPor = nextState !== 'Não iniciada' ? userTag : null;
      if (nextState === 'Não iniciada') {
        nextOp.statusCarregamento = 'Não carregada';
        nextOp.horarioCarregamento = null;
        nextOp.carregadoPor = null;
        nextOp.statusExpedicao = 'Pendente';
      }
    } else if (action === 'carga') {
      let nextState: 'Não carregada' | 'Em andamento' | 'Carregada' = 'Em andamento';
      if (op.statusCarregamento === 'Em andamento') nextState = 'Carregada';
      else if (op.statusCarregamento === 'Carregada') nextState = 'Não carregada';

      nextOp.statusCarregamento = nextState;
      nextOp.horarioCarregamento = nextState !== 'Não carregada' ? currentTime : null;
      nextOp.carregadoPor = nextState !== 'Não carregada' ? userTag : null;
      if (nextState === 'Não carregada') {
        nextOp.statusExpedicao = 'Pendente';
      }
    } else if (action === 'expedicao') {
      const isFinished = op.statusExpedicao !== 'Pendente';
      const isLate = BusinessRules.isDelayed(op.carregamento, currentTime);
      nextOp.statusExpedicao = isFinished ? 'Pendente' : (isLate ? 'Fora do horário' : 'Dentro do horário');
      nextOp.perdeuCorte = !isFinished && isLate;
    }

    nextOp.updated_at = new Date().toISOString();
    nextOp.updated_by = userTag;

    try {
      await FirebaseService.upsertRecord('store_operations', nextOp, 'id');
      upsertOperation(nextOp);
      triggerFeedback("Status operacional atualizado.");
    } catch (err) {
      triggerFeedback("Falha ao salvar no banco.", true);
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLojaId || !newLojaNome) {
      triggerFeedback("Código e Nome da Loja são obrigatórios.", true);
      return;
    }

    const row: ParsedProgramRow = {
      lojaId: newLojaId.trim().toUpperCase(),
      nomeLoja: newLojaNome.trim(),
      cidade: "São Paulo",
      uf: "SP",
      setor: newSector,
      corte: newCorte,
      carregamento: newCarregamento,
      transportadora: newTransportadora.trim().toUpperCase(),
      volumes: 1000,
      enderecos: 30,
      dataProgramacao: new Date().toISOString().split("T")[0],
      atividadeRelacionada: newSector === 'S87' ? 'Picking' : newSector === 'S88' ? 'Volumosos' : 'Colis'
    };

    await StoreService.commitImportedRows([row], currentUser);

    // Auto-register in Master Store database if not present
    if (!masterStores.some((s) => s.id === row.lojaId)) {
      addMasterStore({
        id: row.lojaId,
        nome: row.nomeLoja,
        cidade: row.cidade,
        uf: row.uf,
        transportadoraPadrao: row.transportadora,
        observacoes: "Adicionada via Radar Live"
      }).catch(err => console.warn("Failed to auto-register store in Master DB", err));
    }

    const opId = `${row.lojaId}_${row.dataProgramacao}_${row.setor}`;
    upsertOperation({
      id: opId,
      programacaoId: row.dataProgramacao,
      lojaId: row.lojaId,
      nomeLoja: row.nomeLoja,
      setor: row.setor,
      transportadora: row.transportadora,
      corte: row.corte,
      carregamento: row.carregamento,
      volumes: row.volumes,
      enderecos: row.enderecos,
      atividadeRelacionada: row.atividadeRelacionada,
      statusSoltura: 'Não Solta',
      horarioSoltura: null,
      soltoPor: null,
      statusColeta: 'Não iniciada',
      horarioColeta: null,
      coletadoPor: null,
      statusCarregamento: 'Não carregada',
      horarioCarregamento: null,
      carregadoPor: null,
      statusExpedicao: 'Pendente',
      perdeuCorte: false,
      updated_at: new Date().toISOString(),
      updated_by: currentUser
    });

    triggerFeedback(`Loja ${row.lojaId} cadastrada com sucesso!`);
    setNewLojaId("");
    setNewLojaNome("");
    setShowAddForm(false);
  };

  const handleDeleteAllOperations = async () => {
    const opsList = Object.values(operations);
    if (opsList.length === 0) {
      triggerFeedback("Não há operações para apagar.", true);
      return;
    }

    setIsSyncing(true);
    try {
      for (const op of opsList) {
        await FirebaseService.deleteRecord('store_operations', op.id);
        removeOperation(op.id);
      }
      triggerFeedback("Operações do dia limpas permanentemente!");
    } catch (e) {
      triggerFeedback("Erro ao apagar dados.", true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtragem de operações
  const filteredRiskOps = riskOperations.filter(({ op, plano }) => {
    const term = searchQuery.toLowerCase();
    const matchSearch = 
      op.lojaId.toLowerCase().includes(term) ||
      op.nomeLoja.toLowerCase().includes(term) ||
      (plano && plano.codLoja.toLowerCase().includes(term));
    
    if (!matchSearch) return false;
    
    if (activeSectorId && activeSectorId !== 'todos' && activeSectorId !== 'all') {
      const normActiveSector = activeSectorId.replace(/^S/i, '').toUpperCase();
      const normOpSector = (op.setor || '').replace(/^S/i, '').toUpperCase();
      if (normOpSector !== normActiveSector) return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'nao_solta' && op.statusSoltura !== 'Não Solta') return false;
      if (statusFilter === 'solta' && op.statusSoltura !== 'Solta') return false;
      if (statusFilter === 'coleta_andamento' && op.statusColeta !== 'Em andamento') return false;
      if (statusFilter === 'coletada' && op.statusColeta !== 'Coletada') return false;
      if (statusFilter === 'carregada' && op.statusCarregamento !== 'Carregada') return false;
      if (statusFilter === 'atrasada' && !op.perdeuCorte) return false;
    }

    return true;
  });

  const totalOpsCount = Object.keys(operations).length;
  const hasOperations = totalOpsCount > 0;

  const renderRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'red':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">🔴 Crítico</span>;
      case 'yellow':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">🟡 Atenção</span>;
      case 'green':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Normal</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">⚪ Inativo</span>;
    }
  };

  return (
    <div id="radar_lojas_main_container" className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. CABEÇALHO ÚNICO E COMPACTO */}
      <div className="glass-card p-3.5 px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-l-2 border-indigo-500/50 bg-[#07070a]/98">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <MapPin size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Radar de Lojas | Visão Consolidada Operacional
            </h2>
            <p className="text-[10.5px] text-zinc-400">
              Cruza o Plano de Carga com o status em tempo real do chão de fábrica
            </p>
          </div>
        </div>

        {/* Status de Conectividade em Barra Fina */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono border ${
            onlineState 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {onlineState ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{onlineState ? "NUVEM LIVE" : "MODO LOCAL"}</span>
            {offlineQueueLength > 0 && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  triggerFeedback("Sincronizando fila offline com o servidor...");
                  await FirebaseService.flushOfflineQueue();
                  const remaining = FirebaseService.getQueueLength();
                  setOfflineQueueLength(remaining);
                  if (remaining === 0) {
                    triggerFeedback("Fila offline sincronizada com sucesso!");
                  } else {
                    triggerFeedback(`${remaining} item(ns) restante(s) na fila.`);
                  }
                }}
                className="ml-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors border border-amber-500/30"
                title="Clique para forçar envio imediato"
              >
                {offlineQueueLength} pendentes ↻
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ALERTAS DE FEEDBACK */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/15 border border-red-500/30 text-red-400 p-2.5 rounded-xl text-xs flex items-center gap-2 font-mono">
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-xl text-xs flex items-center gap-2 font-mono">
            <CheckCircle size={14} />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FAIXA DE KPIS (4 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Progresso Coleta */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Progresso Coleta</span>
            <div className="p-1 rounded bg-blue-500/10 text-blue-400"><CheckSquare size={12} /></div>
          </div>
          <div className="mt-2">
            {hasOperations ? (
              <>
                <span className="text-2xl font-black text-white font-mono">
                  {filteredRiskOps.filter(r => r.op.statusColeta === 'Coletada').length} / {filteredRiskOps.length}
                </span>
                <p className="text-[8.5px] text-zinc-500 mt-0.5">Rotas coletadas hoje</p>
              </>
            ) : (
              <span className="text-xs text-zinc-500 italic block py-1">Aguardando operações do dia</span>
            )}
          </div>
        </div>

        {/* KPI 2: Lojas em Risco */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Lojas em Risco</span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-400"><AlertTriangle size={12} /></div>
          </div>
          <div className="mt-2">
            {hasOperations ? (
              <>
                <span className="text-2xl font-black text-amber-400 font-mono">{riskSummary.red + riskSummary.yellow}</span>
                <p className="text-[8.5px] text-zinc-500 mt-0.5">{riskSummary.red} críticas / {riskSummary.yellow} atenção</p>
              </>
            ) : (
              <span className="text-xs text-zinc-500 italic block py-1">Aguardando operações do dia</span>
            )}
          </div>
        </div>

        {/* KPI 3: Expedidos */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Expedidos</span>
            <div className="p-1 rounded bg-purple-500/10 text-purple-400"><Truck size={12} /></div>
          </div>
          <div className="mt-2">
            {hasOperations ? (
              <>
                <span className="text-2xl font-black text-purple-400 font-mono">
                  {filteredRiskOps.filter(r => r.op.statusExpedicao !== 'Pendente').length}
                </span>
                <p className="text-[8.5px] text-zinc-500 mt-0.5">Rotas despachadas</p>
              </>
            ) : (
              <span className="text-xs text-zinc-500 italic block py-1">Aguardando operações do dia</span>
            )}
          </div>
        </div>

        {/* KPI 4: Cortes Expirados */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Cortes Expirados</span>
            <div className="p-1 rounded bg-red-500/10 text-red-400"><Flame size={12} /></div>
          </div>
          <div className="mt-2">
            {hasOperations ? (
              <>
                <span className="text-2xl font-black text-red-400 font-mono">
                  {filteredRiskOps.filter(r => r.op.statusExpedicao === 'Pendente' && BusinessRules.isDelayed(r.op.corte, getBrasiliaTimeString())).length}
                </span>
                <p className="text-[8.5px] text-zinc-500 mt-0.5">Fora do limite de horário</p>
              </>
            ) : (
              <span className="text-xs text-zinc-500 italic block py-1">Aguardando operações do dia</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. CORPO PRINCIPAL (2 COLUNAS: 75% ESQUERDA | 25% DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* COLUNA ESQUERDA (8 COLUNAS): LISTA CONSOLIDADA RADAR + PLANO */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0e0e15] border border-white/5 rounded-xl p-4 shadow-md space-y-3">
            
            {/* Barra de Pesquisa & Modo de Exibição */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por código ou nome da loja..."
                  className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-zinc-300 font-mono focus:outline-none"
                >
                  <option value="all">Todos Status</option>
                  <option value="nao_solta">Não Solta</option>
                  <option value="solta">Solta</option>
                  <option value="coleta_andamento">Em Coleta</option>
                  <option value="coletada">Coletada</option>
                  <option value="carregada">Carregada</option>
                  <option value="atrasada">Com Atraso</option>
                </select>

                <div className="flex items-center bg-black/40 border border-white/5 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded text-xs transition cursor-pointer ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-white"}`}
                    title="Visão Tabela Densa"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded text-xs transition cursor-pointer ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-white"}`}
                    title="Visão Cards"
                  >
                    <Grid size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* TABELA DENSA DE LOJAS COM CRUZAMENTO DE RISCO */}
            {filteredRiskOps.length === 0 ? (
              <div className="text-center py-12 bg-black/20 rounded-xl border border-white/5">
                <Layers className="mx-auto text-zinc-600 mb-2" size={32} />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nenhuma operação cadastrada no dia</p>
                <p className="text-[11px] text-zinc-500 mt-1">Sincronize o Plano de Carregamento ou cadastre uma nova rota na sidebar.</p>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <th className="py-2.5 px-3">Hora (Plano)</th>
                      <th className="py-2.5 px-3">Loja</th>
                      <th className="py-2.5 px-3">Setor</th>
                      <th className="py-2.5 px-3 text-center">Soltura</th>
                      <th className="py-2.5 px-3 text-center">Coleta</th>
                      <th className="py-2.5 px-3 text-center">Carga</th>
                      <th className="py-2.5 px-3 text-center">Risco</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {filteredRiskOps.map(({ op, plano, risk }) => (
                      <tr key={op.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-2.5 px-3 font-bold text-zinc-300">
                          <Clock size={11} className="inline mr-1 text-zinc-500" />
                          {plano?.horaCarregamento || op.carregamento}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-bold text-white font-mono">{op.lojaId}</span>
                          <span className="text-zinc-400 text-xs ml-2 truncate max-w-[150px] inline-block align-bottom">
                            {op.nomeLoja}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-indigo-300 font-bold">{op.setor}</td>

                        {/* Botão de Soltura */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleUpdateOperationalStep(op, 'soltura')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                              op.statusSoltura === 'Solta'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            {op.statusSoltura === 'Solta' ? '✅ Solta' : 'Pendente'}
                          </button>
                        </td>

                        {/* Botão de Coleta */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleUpdateOperationalStep(op, 'coleta')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                              op.statusColeta === 'Coletada'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : op.statusColeta === 'Em andamento'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            {op.statusColeta}
                          </button>
                        </td>

                        {/* Botão de Carga */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleUpdateOperationalStep(op, 'carga')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                              op.statusCarregamento === 'Carregada'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : op.statusCarregamento === 'Em andamento'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            {op.statusCarregamento}
                          </button>
                        </td>

                        {/* Badge de Risco */}
                        <td className="py-2.5 px-3 text-center">
                          {renderRiskBadge(risk)}
                        </td>

                        {/* Botão Expedição */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleUpdateOperationalStep(op, 'expedicao')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                              op.statusExpedicao !== 'Pendente'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            {op.statusExpedicao !== 'Pendente' ? 'Despachada' : 'Expedir'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* MODO CARDS (GRID RESPONSIVO) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRiskOps.map(({ op, plano, risk }) => (
                  <div key={op.id} className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{op.lojaId}</span>
                          <span className="text-xs text-zinc-400 truncate max-w-[140px]">{op.nomeLoja}</span>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-mono">Setor {op.setor}</span>
                      </div>
                      {renderRiskBadge(risk)}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleUpdateOperationalStep(op, 'soltura')}
                        className={`p-1.5 rounded text-[9px] font-bold border transition ${
                          op.statusSoltura === 'Solta' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Soltura: {op.statusSoltura}
                      </button>
                      <button
                        onClick={() => handleUpdateOperationalStep(op, 'coleta')}
                        className={`p-1.5 rounded text-[9px] font-bold border transition ${
                          op.statusColeta === 'Coletada' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Coleta: {op.statusColeta}
                      </button>
                      <button
                        onClick={() => handleUpdateOperationalStep(op, 'carga')}
                        className={`p-1.5 rounded text-[9px] font-bold border transition ${
                          op.statusCarregamento === 'Carregada' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-800'
                        }`}
                      >
                        Carga: {op.statusCarregamento}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (4 COLUNAS): SIDEBAR DE FERRAMENTAS ADMINISTRATIVAS */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card: Plano de Carregamento (Sincronização) */}
          <div className="bg-[#0e0e15] border border-white/5 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider">Plano de Carregamento</span>
              <button
                onClick={handleSyncPlano}
                disabled={isSyncingPlano}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold font-mono text-[9.5px] uppercase transition cursor-pointer"
              >
                <RefreshCw size={10} className={isSyncingPlano ? "animate-spin" : ""} />
                {isSyncingPlano ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>

            <p className="text-[11px] text-zinc-400">
              {planoCarregamento.length > 0 
                ? `${planoCarregamento.length} lojas mapeadas na planilha para a data de hoje.` 
                : "Nenhum plano carregado localmente."}
            </p>
          </div>

          {/* Card: Ferramentas do Sistema */}
          <div className="bg-[#0e0e15] border border-white/5 rounded-xl p-4 space-y-3 shadow-md">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">Ações Sistêmicas</span>
            
            <div className="space-y-2">
              <button
                onClick={handleForceSync}
                disabled={isSyncing || !onlineState}
                className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold font-mono text-xs py-2 px-3 rounded-lg border border-white/5 uppercase transition cursor-pointer"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                Sincronizar Supabase
              </button>

              <button
                onClick={handleToggleOffline}
                className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold font-mono text-xs py-2 px-3 rounded-lg border border-white/5 uppercase transition cursor-pointer"
              >
                Simular Modo {onlineState ? "Offline" : "Online"}
              </button>

              <button
                onClick={() => setIsConfirmModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold font-mono text-xs py-2 px-3 rounded-lg border border-red-500/20 uppercase transition cursor-pointer"
              >
                <Trash2 size={12} />
                Resetar Dados do Dia
              </button>
            </div>
          </div>

          {/* Card: Cadastro Rápido de Rota */}
          <div className="bg-[#0e0e15] border border-white/5 rounded-xl p-4 space-y-3 shadow-md">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs py-2.5 px-3 rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              {showAddForm ? "Fechar Formulário" : "Cadastrar Rota Individual"}
            </button>

            {showAddForm && (
              <form onSubmit={handleManualAddSubmit} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                    Origem de Dados Master
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      loadMasterStores();
                      setIsCatalogModalOpen(true);
                    }}
                    className="text-[9px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition"
                  >
                    <BookOpen size={10} />
                    Catálogo ({masterStores.length})
                  </button>
                </div>

                <div className="relative">
                  <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Cód. Loja*</label>
                  <input
                    type="text"
                    required
                    value={newLojaId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewLojaId(val);
                      setShowStoreSuggestions(true);
                      const match = masterStores.find(s => s.id.toLowerCase() === val.trim().toLowerCase());
                      if (match) {
                        setNewLojaNome(match.nome);
                        if (match.transportadoraPadrao) setNewTransportadora(match.transportadoraPadrao);
                      }
                    }}
                    onFocus={() => setShowStoreSuggestions(true)}
                    placeholder="Ex: 2722"
                    className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white font-mono uppercase"
                  />

                  {/* Autocomplete suggestions */}
                  {showStoreSuggestions && newLojaId.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#161622] border border-white/10 rounded-lg shadow-xl max-h-36 overflow-y-auto custom-scrollbar">
                      {masterStores
                        .filter(s => s.id.toLowerCase().includes(newLojaId.toLowerCase()) || s.nome.toLowerCase().includes(newLojaId.toLowerCase()))
                        .slice(0, 6)
                        .map(st => (
                          <div
                            key={st.id}
                            onMouseDown={() => {
                              setNewLojaId(st.id);
                              setNewLojaNome(st.nome);
                              if (st.transportadoraPadrao) setNewTransportadora(st.transportadoraPadrao);
                              setShowStoreSuggestions(false);
                            }}
                            className="p-2 hover:bg-indigo-600/20 cursor-pointer text-xs flex items-center justify-between border-b border-white/5 last:border-0"
                          >
                            <span className="font-mono font-bold text-indigo-400">{st.id}</span>
                            <span className="text-zinc-300 truncate max-w-[140px]">{st.nome}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Nome da Loja*</label>
                  <input
                    type="text"
                    required
                    value={newLojaNome}
                    onChange={(e) => setNewLojaNome(e.target.value)}
                    placeholder="Ex: FLORIPA CONTINENTE"
                    className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Setor</label>
                    <select
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white font-mono"
                    >
                      <option value="S87">S87</option>
                      <option value="S88">S88</option>
                      <option value="S89">S89</option>
                      <option value="S90">S90</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Transportadora</label>
                    <input
                      type="text"
                      value={newTransportadora}
                      onChange={(e) => setNewTransportadora(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Corte</label>
                    <input
                      type="text"
                      value={newCorte}
                      onChange={(e) => setNewCorte(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Carga</label>
                    <input
                      type="text"
                      value={newCarregamento}
                      onChange={(e) => setNewCarregamento(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded uppercase font-mono transition cursor-pointer"
                >
                  Salvar Operação
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* MODAL: CATÁLOGO MASTER DE LOJAS */}
      <AnimatePresence>
        {isCatalogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Catálogo Master de Lojas ({masterStores.length} registradas)
                    </h3>
                    <p className="text-[10px] text-zinc-500">
                      Selecione uma loja para preencher a rota automaticamente
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded transition"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-white/5 bg-black/30">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filtrar por código, nome ou cidade..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Stores List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
                {(() => {
                  const filtered = masterStores.filter(s => {
                    const q = catalogSearch.toLowerCase();
                    return !q || s.id.toLowerCase().includes(q) || s.nome.toLowerCase().includes(q) || (s.cidade && s.cidade.toLowerCase().includes(q));
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-zinc-500 text-xs uppercase font-bold">
                        Nenhuma loja encontrada para "{catalogSearch}".
                      </div>
                    );
                  }

                  return filtered.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        setNewLojaId(st.id);
                        setNewLojaNome(st.nome);
                        if (st.transportadoraPadrao) setNewTransportadora(st.transportadoraPadrao);
                        setIsCatalogModalOpen(false);
                        setShowAddForm(true);
                      }}
                      className="p-3 bg-white/[0.02] hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/30 rounded-xl cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-400 text-xs bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            {st.id}
                          </span>
                          <span className="font-bold text-white text-xs uppercase group-hover:text-indigo-300 transition">
                            {st.nome}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          {st.cidade || "São Paulo"} - {st.uf || "SP"} | 🚚 {st.transportadoraPadrao || "JADLOG"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="bg-indigo-600/20 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition"
                      >
                        Selecionar
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE RESET */}
      {isConfirmModalOpen && (
        <ModalConfirmacao
          isOpen={isConfirmModalOpen}
          titulo="Limpar Operações do Dia"
          mensagem="Atenção: Esta ação irá apagar todas as rotas registradas no Radar Live para o dia de hoje. Deseja prosseguir?"
          onConfirm={() => {
            handleDeleteAllOperations();
            setIsConfirmModalOpen(false);
          }}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}
    </div>
  );
}
