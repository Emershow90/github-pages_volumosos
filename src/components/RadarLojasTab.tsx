import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Trash2, 
  CheckCircle, 
  FileText, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  Download, 
  Upload, 
  User, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  Sliders, 
  AlertTriangle, 
  Check, 
  Clock, 
  Info,
  Layers,
  ChevronRight,
  Database,
  Grid,
  List,
  Flame,
  CheckSquare,
  Activity,
  Truck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatToBrasiliaTime, getBrasiliaTimeString } from "../utils/time";
import { useStoreOperations } from "../stores/useStoreOperations";
import { useAtividadeLoja } from "../stores/useAtividadeLoja";
import { useUserStore } from "../stores/useUserStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { StoreService } from "../services/storeService";
import { BusinessRules } from "../services/businessRules";
import { FirebaseService, isOnline } from "../lib/firebaseService";
import { realtimeSync } from "../services/realtimeSyncService";
import { StoreOperation, ParsedProgramRow, StoreMaster } from "../types";
import { useSectorStore } from "../stores/useSectorStore";

interface RadarLojasTabProps {
  currentRole?: string;
  onSaveRadar?: (items: any[]) => void;
  activeSectorId?: string;
}

export default function RadarLojasTab({ currentRole: rbacRoleProps, onSaveRadar, activeSectorId }: RadarLojasTabProps) {
  // Zustand States
  const operations = useStoreOperations((state) => state.operations);
  const upsertOperation = useStoreOperations((state) => state.upsertOperation);
  const removeOperation = useStoreOperations((state) => state.removeOperation);
  const setOperations = useStoreOperations((state) => state.setOperations);
  
  const currentUser = useUserStore((state) => state.currentUser);
  const currentRole = useUserStore((state) => state.currentRole);
  const addAlert = useNotificationStore((state) => state.addAlert);
  const { setores } = useSectorStore();

  // Connection & sync state
  const [onlineState, setOnlineState] = useState<boolean>(isOnline());
  const [offlineQueueLength, setOfflineQueueLength] = useState<number>(0);
  const [applyToAllSectors, setApplyToAllSectors] = useState(false);
  
  // Local interaction state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "individual" | "table">("grouped");
  
  // User profile sector settings for operational checks
  const [userSectors, setUserSectors] = useState<string[]>(["S87", "S88", "S89", "S90"]);
  
  // New manual entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLojaId, setNewLojaId] = useState("");
  const [newLojaNome, setNewLojaNome] = useState("");
  const [newSector, setNewSector] = useState<string>("S87");
  const [newCorte, setNewCorte] = useState("08:00");
  const [newCarregamento, setNewCarregamento] = useState("08:30");
  const [newTransportadora, setNewTransportadora] = useState("MOBI");
  const [newVolumes, setNewVolumes] = useState<number>(1000);
  const [newEnderecos, setNewEnderecos] = useState<number>(30);
  
  // Importer states (OCR copy-paste)
  const [importTab, setImportTab] = useState<"ocr" | "json" | "migration">("ocr");
  const [ocrInputText, setOcrInputText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedProgramRow[]>([]);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);

  // Discrepancy wizard states
  const [discrepancies, setDiscrepancies] = useState<{
    row: ParsedProgramRow;
    type: 'not_found' | 'divergent';
    currentName?: string;
    resolution?: 'create' | 'use_current' | 'update_master' | 'manual';
    resolvedName?: string;
  }[]>([]);
  const [currentDiscrepancyIndex, setCurrentDiscrepancyIndex] = useState<number>(-1);
  const [wizardStoreCity, setWizardStoreCity] = useState("São Paulo");
  const [wizardStoreUF, setWizardStoreUF] = useState("SP");
  const [wizardManualName, setWizardManualName] = useState("");

  // Error/Success Notification feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync and listen
  useEffect(() => {
    // Seed default master data if empty
    StoreService.initMasterStores();

    // Check connectivity periodic interval
    const interval = setInterval(() => {
      setOnlineState(isOnline());
      const queue = JSON.parse(localStorage.getItem("sys_radar_offline_queue") || "[]");
      setOfflineQueueLength(queue.length);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
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

  // Connectivity switch
  const handleToggleOffline = () => {
    const simOffline = localStorage.getItem("sys_radar_sim_offline") === "true";
    localStorage.setItem("sys_radar_sim_offline", simOffline ? "false" : "true");
    setOnlineState(!simOffline);
    triggerFeedback(`Modo ${!simOffline ? "OFFLINE" : "ONLINE"} ativado.`);
    
    if (simOffline) {
      FirebaseService.flushOfflineQueue();
    }
  };

  // Perform operational step update
  const handleUpdateOperationalStep = async (
    op: StoreOperation,
    action: 'soltura' | 'coleta' | 'carga' | 'expedicao'
  ) => {
    // 1. Validate Flow using businessRules
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
        descricao: `Falha Operacional: ${validation.message}`,
        setor: op.setor || "Radar"
      });
      return;
    }

    // 2. Perform transition
    const nextOp = { ...op };
    const userTag = `${currentUser} (${currentRole.toUpperCase()})`;
    const currentTime = getBrasiliaTimeString();

    if (action === 'soltura') {
      const isSolta = op.statusSoltura === 'Solta';
      nextOp.statusSoltura = isSolta ? 'Não Solta' : 'Solta';
      nextOp.horarioSoltura = isSolta ? null : currentTime;
      nextOp.soltoPor = isSolta ? null : userTag;
      
      // Cascade reset if undoing
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

      // Reset downstream
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
      
      // Trigger notification message
      addAlert({
        tipo: "Info",
        prioridade: "media",
        titulo: "Atualização de Setor",
        descricao: `Setor ${op.setor} da loja ${op.nomeLoja} atualizado para ${action.toUpperCase()} por ${currentUser}`,
        setor: op.setor
      });
      triggerFeedback("Status operacional atualizado.");
    } catch (err: any) {
      triggerFeedback("Falha ao salvar atualização no banco de dados.", true);
    }
  };

  // Batch actions on store card level
  const handleBatchStoreAction = async (
    lojaId: string,
    action: 'soltura' | 'coleta' | 'carga' | 'expedicao'
  ) => {
    const storeOps = Object.values(operations).filter(o => o.lojaId === lojaId);
    if (storeOps.length === 0) return;

    let totalUpdated = 0;
    for (const op of storeOps) {
      // Create copy of validations parameters for this sector
      const validation = BusinessRules.validateOperationalFlow(op, action, currentRole, userSectors);
      if (!validation.allowed) continue;

      const nextOp = { ...op };
      const userTag = `${currentUser} (${currentRole.toUpperCase()})`;
      const currentTime = getBrasiliaTimeString();

      if (action === 'soltura') {
        nextOp.statusSoltura = 'Solta';
        nextOp.horarioSoltura = currentTime;
        nextOp.soltoPor = userTag;
      } else if (action === 'coleta') {
        nextOp.statusColeta = 'Coletada';
        nextOp.horarioColeta = currentTime;
        nextOp.coletadoPor = userTag;
      } else if (action === 'carga') {
        nextOp.statusCarregamento = 'Carregada';
        nextOp.horarioCarregamento = currentTime;
        nextOp.carregadoPor = userTag;
      } else if (action === 'expedicao') {
        const isLate = BusinessRules.isDelayed(op.carregamento, currentTime);
        nextOp.statusExpedicao = isLate ? 'Fora do horário' : 'Dentro do horário';
        nextOp.perdeuCorte = isLate;
      }

      nextOp.updated_at = new Date().toISOString();
      nextOp.updated_by = userTag;

      await FirebaseService.upsertRecord('store_operations', nextOp, 'id');
      upsertOperation(nextOp);
      totalUpdated++;
    }

    if (totalUpdated > 0) {
      triggerFeedback(`Ação em lote aplicada para ${totalUpdated} setores.`);
      addAlert({
        tipo: "Info",
        prioridade: "media",
        titulo: "Ação em Lote",
        descricao: `Ação em lote ${action.toUpperCase()} realizada para loja ${lojaId}`,
        setor: "Lote"
      });
    } else {
      triggerFeedback("Nenhuma operação pôde ser executada sob as regras atuais de fluxo.", true);
    }
  };

  // Parse Copy-Pasted OCR
  const handleOcrProcess = async () => {
    if (!ocrInputText.trim()) {
      triggerFeedback("Insira o relatório de carregamento/programação.", true);
      return;
    }

    setOcrLoading(true);
    try {
      const result = await StoreService.parseOcrText(ocrInputText, "2026-07-05");
      setParsedRows(result.rows);
      
      if (result.discrepancies.length > 0) {
        // Prepare wizard list
        setDiscrepancies(result.discrepancies.map(d => ({ ...d, resolution: 'use_current', resolvedName: d.row.nomeLoja })));
        setCurrentDiscrepancyIndex(0);
        // Pre-fill fields
        setWizardManualName(result.discrepancies[0].row.nomeLoja);
      } else {
        setDiscrepancies([]);
        setCurrentDiscrepancyIndex(-2);
      }

      setImportedStatus(`Sucesso! ${result.rows.length} registros extraídos.`);
    } catch (e) {
      triggerFeedback("Falha no parser inteligente de dados.", true);
    } finally {
      setOcrLoading(false);
    }
  };

  // Handle discrepancy wizard steps
  const handleDiscrepancyResolve = (resolution: 'create' | 'use_current' | 'update_master' | 'manual') => {
    const current = discrepancies[currentDiscrepancyIndex];
    if (!current) return;

    let finalName = current.row.nomeLoja;
    if (resolution === 'use_current' && current.currentName) {
      finalName = current.currentName;
    } else if (resolution === 'manual') {
      finalName = wizardManualName;
    }

    const updated = [...discrepancies];
    updated[currentDiscrepancyIndex] = {
      ...current,
      resolution,
      resolvedName: finalName
    };
    setDiscrepancies(updated);

    // Save master record immediately if "create" or "update_master"
    if (resolution === 'create') {
      const newMaster: StoreMaster = {
        id: current.row.lojaId,
        nome: finalName,
        cidade: wizardStoreCity,
        uf: wizardStoreUF,
        transportadoraPadrao: current.row.transportadora
      };
      FirebaseService.upsertRecord('store_master', newMaster, 'id');
    } else if (resolution === 'update_master') {
      const updatedMaster: StoreMaster = {
        id: current.row.lojaId,
        nome: finalName,
        cidade: "São Paulo",
        uf: "SP",
        transportadoraPadrao: current.row.transportadora
      };
      FirebaseService.upsertRecord('store_master', updatedMaster, 'id');
    }

    // Advance index
    if (currentDiscrepancyIndex < discrepancies.length - 1) {
      const nextIdx = currentDiscrepancyIndex + 1;
      setCurrentDiscrepancyIndex(nextIdx);
      setWizardManualName(discrepancies[nextIdx].row.nomeLoja);
    } else {
      // Completed wizard! Apply modifications to parsed rows list
      const fixedRows = parsedRows.map(row => {
        const discMatch = updated.find(d => d.row.lojaId === row.lojaId && d.row.setor === row.setor);
        if (discMatch) {
          return {
            ...row,
            nomeLoja: discMatch.resolvedName || row.nomeLoja
          };
        }
        return row;
      });

      setParsedRows(fixedRows);
      setCurrentDiscrepancyIndex(-2); // Marked as resolved
      triggerFeedback("Todas as divergências resolvidas com sucesso!");
    }
  };

  // Commit OCR parsed items to daily operations list
  const handleCommitOcrImport = async () => {
    if (parsedRows.length === 0) return;

    const allSectors = setores && setores.length > 0 ? setores.map(s => `S${s.id}`) : ["S87", "S88", "S89", "S90"];

    // Expandir linhas se a opção estiver ativa
    let rowsToCommit = parsedRows;
    if (applyToAllSectors) {
      rowsToCommit = parsedRows.flatMap((row) =>
        allSectors.map((sector) => ({
          ...row,
          setor: sector,
          // Atualiza atividadeRelacionada com base no setor
          atividadeRelacionada: sector === 'S87' ? 'Picking' : sector === 'S88' ? 'Volumosos' : 'Colis',
        }))
      );
    }

    try {
      await StoreService.commitImportedRows(rowsToCommit, currentUser);
      
      // Zero-latency state sync for each imported operational row
      rowsToCommit.forEach((row) => {
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
          atividadeRelacionada: row.atividadeRelacionada || 'Picking',
          
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
      });

      triggerFeedback(`Sincronizado! ${rowsToCommit.length} rotas operacionais criadas.`);
      addAlert({
        tipo: "Info",
        prioridade: "baixa",
        titulo: "Importação OCR",
        descricao: `Importação OCR: ${rowsToCommit.length} programações sincronizadas.`,
        setor: "OCR"
      });
      
      // Reset state
      setParsedRows([]);
      setOcrInputText("");
      setImportedStatus(null);
      setCurrentDiscrepancyIndex(-1);
    } catch (e) {
      triggerFeedback("Erro ao registrar rotas no banco de dados.", true);
    }
  };

  // Load OCR Sample template
  const loadOcrSample = () => {
    setOcrInputText(
      `CORTE: 07:00 | LOJA: 2722 - FLORIPA CONTINENTE | SETOR: S87 | VOL: 3787 | CARGA: 07:30 | TRANS: SUDOESTE EXPRESS | END: 45\n` +
      `CORTE: 08:00 | LOJA: 2360 - OSASCO | SETOR: S88 | VOL: 6800 | CARGA: 08:30 | TRANS: MOBI | END: 120\n` +
      `CORTE: 10:00 | LOJA: 1250 - SÃO JOSÉ DOS CAMPOS | SETOR: S89 | VOL: 4500 | CARGA: 10:30 | TRANS: JADLOG | END: 30\n` +
      `CORTE: 12:00 | LOJA: 9999 - UNIDADE INEXISTENTE | SETOR: S90 | VOL: 1500 | CARGA: 12:30 | TRANS: TRANS-RAPIDO | END: 15`
    );
  };

  // Run legacy migration
  const handleMigrateLegacyData = async () => {
    if (window.confirm("Isso importará dados legados de lista_coleta e radar_lojas_status para o novo modelo de setores independentes. Continuar?")) {
      const count = await StoreService.migrateLegacyToOperations(currentUser);
      triggerFeedback(`Sucesso! ${count} registros legados migrados e deduplicados.`);
      addAlert({
        tipo: "Info",
        prioridade: "baixa",
        titulo: "Migração de Dados",
        descricao: `Migração: ${count} listas do modelo antigo reestruturadas.`,
        setor: "Legado"
      });
    }
  };

  // Create customized single list item
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLojaId || !newLojaNome) {
      triggerFeedback("Identificador e Nome da Loja são campos obrigatórios.", true);
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
      volumes: Number(newVolumes),
      enderecos: Number(newEnderecos),
      dataProgramacao: "2026-07-05",
      atividadeRelacionada: newSector === 'S87' ? 'Picking' : newSector === 'S88' ? 'Volumosos' : 'Colis'
    };

    await StoreService.commitImportedRows([row], currentUser);
    
    // Zero-latency state sync for manual entry
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

    triggerFeedback(`Registro operacional cadastrado com sucesso.`);
    
    // Clear inputs
    setNewLojaId("");
    setNewLojaNome("");
    setShowAddForm(false);
  };

  // Delete an operation item
  const handleDeleteOperation = async (id: string) => {
    if (window.confirm("Deseja realmente remover esta rota operacional?")) {
      try {
        await FirebaseService.deleteRecord('store_operations', id);
        removeOperation(id);
        triggerFeedback("Operação de setor deletada.");
      } catch (e) {
        triggerFeedback("Erro ao excluir registro.", true);
      }
    }
  };

  // Filtering Operations Lists
  const getFilteredOperations = () => {
    const list = Object.values(operations);
    
    return list.filter((op) => {
      // 1. Search Query
      const matchesSearch = 
        op.lojaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.nomeLoja.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Sector Filter
      if (activeSectorId && op.setor !== `S${activeSectorId}`) return false;

      // 3. Status Filter
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
  };

  const filteredOps = getFilteredOperations();

  // Grouped rendering preparation (Map storeId -> list of active operations)
  const getGroupedStores = () => {
    const grouped: Record<string, { lojaId: string; nomeLoja: string; ops: StoreOperation[] }> = {};
    
    filteredOps.forEach((op) => {
      if (!grouped[op.lojaId]) {
        grouped[op.lojaId] = {
          lojaId: op.lojaId,
          nomeLoja: op.nomeLoja,
          ops: []
        };
      }
      grouped[op.lojaId].ops.push(op);
    });

    return Object.values(grouped).sort((a, b) => a.lojaId.localeCompare(b.lojaId));
  };

  const groupedStores = getGroupedStores();

  return (
    <div id="radar_lojas_main_container" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Top Banner Alert / Success messages */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="col-span-12 bg-red-500/15 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 font-mono"
          >
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="col-span-12 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 font-mono"
          >
            <CheckCircle size={15} />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time KPI Overview Bar */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* KPI 1: Total */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-white/10 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total de Fluxos</span>
            <div className="p-1 rounded bg-blue-500/10 text-blue-400">
              <Activity size={12} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{filteredOps.length}</span>
            <p className="text-[8.5px] text-zinc-500 mt-0.5">Rotas monitoradas hoje</p>
          </div>
        </div>

        {/* KPI 2: Não Soltos */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-white/10 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full blur-xl group-hover:bg-zinc-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Aguardando Soltura</span>
            <div className="p-1 rounded bg-zinc-800 text-zinc-400">
              <Clock size={12} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-zinc-300 font-mono">
              {filteredOps.filter(o => o.statusSoltura !== 'Solta').length}
            </span>
            <p className="text-[8.5px] text-zinc-500 mt-0.5">Pendentes de liberação</p>
          </div>
        </div>

        {/* KPI 3: Em Andamento */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-white/10 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Em Andamento</span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-400 animate-pulse">
              <RefreshCw size={12} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {filteredOps.filter(o => o.statusSoltura === 'Solta' && o.statusExpedicao === 'Pendente').length}
            </span>
            <p className="text-[8.5px] text-zinc-500 mt-0.5">Ativos em coleta/carga</p>
          </div>
        </div>

        {/* KPI 4: Expedidos */}
        <div className="bg-[#0e0e15]/90 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-white/10 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Finalizadas</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <CheckCircle size={12} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {filteredOps.filter(o => o.statusExpedicao !== 'Pendente').length}
            </span>
            <p className="text-[8.5px] text-zinc-500 mt-0.5">Sincronizadas e expedidas</p>
          </div>
        </div>

        {/* KPI 5: Atrasados */}
        <div className={`rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden transition ${
          filteredOps.filter(o => o.statusExpedicao === 'Pendente' && BusinessRules.isDelayed(o.corte, getBrasiliaTimeString())).length > 0
            ? "bg-red-950/20 border border-red-500/30 text-red-400 animate-pulse"
            : "bg-[#0e0e15]/90 border border-white/5"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider">Em Atraso</span>
            {filteredOps.filter(o => o.statusExpedicao === 'Pendente' && BusinessRules.isDelayed(o.corte, getBrasiliaTimeString())).length > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            ) : (
              <div className="p-1 rounded bg-zinc-800 text-zinc-500">
                <AlertTriangle size={12} />
              </div>
            )}
          </div>
          <div className="mt-2.5">
            <span className={`text-2xl font-black font-mono ${
              filteredOps.filter(o => o.statusExpedicao === 'Pendente' && BusinessRules.isDelayed(o.corte, getBrasiliaTimeString())).length > 0
                ? "text-red-400"
                : "text-zinc-500"
            }`}>
              {filteredOps.filter(o => o.statusExpedicao === 'Pendente' && BusinessRules.isDelayed(o.corte, getBrasiliaTimeString())).length}
            </span>
            <p className="text-[8.5px] text-zinc-500 mt-0.5">Cortes expirados</p>
          </div>
        </div>
      </div>

      {/* LEFT COLUMN: Controls, Filters and Real-time Status */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Real-time synchronization box */}
        <div className="bg-[#0e0e15] rounded-xl border border-white/5 p-4 space-y-3.5 shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Conectividade & Sinc</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
              onlineState ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              {onlineState ? <Wifi size={10} /> : <WifiOff size={10} />}
              {onlineState ? "NUVEM LIVE" : "MODO LOCAL"}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-mono">Fila de Alterações:</span>
            <span className={`font-mono font-bold ${offlineQueueLength > 0 ? "text-amber-400" : "text-zinc-500"}`}>
              {offlineQueueLength} registros pendentes
            </span>
          </div>

          <button
            onClick={handleToggleOffline}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold font-mono text-[10px] py-2 rounded-lg border border-white/5 uppercase transition-colors"
          >
            Simular {onlineState ? "Corte de Internet" : "Restabelecer Conexão"}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#0e0e15] rounded-xl border border-white/5 p-4 space-y-4 shadow-md">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Pesquisa e Segmentação</h4>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-zinc-600" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar Loja por ID ou Nome..."
              className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300 font-mono"
            />
          </div>

          {/* Grid filter selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block mb-1">Setor (Filtro Ativo)</label>
              <div className="w-full bg-zinc-900/50 border border-white/5 rounded-lg p-2 text-xs text-zinc-400 font-bold font-mono">
                S{activeSectorId}
              </div>
            </div>

            <div>
              <label className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block mb-1">Status Atividade</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
              >
                <option value="all">Todos Status</option>
                <option value="nao_solta">Não Solta</option>
                <option value="solta">Solta</option>
                <option value="coleta_andamento">Em Coleta</option>
                <option value="coletada">Coletada</option>
                <option value="carregada">Carregada</option>
                <option value="atrasada">Com Atraso</option>
              </select>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-lg">
            <button
              onClick={() => setViewMode("grouped")}
              className={`flex-1 text-center py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                viewMode === "grouped" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Agrupado Loja
            </button>
            <button
              onClick={() => setViewMode("individual")}
              className={`flex-1 text-center py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                viewMode === "individual" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Setores Indep.
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex-1 text-center py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                viewMode === "table" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Tabela
            </button>
          </div>
        </div>

        {/* Action Button: Manual Input Trigger */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/5 hover:border-white/10 text-white font-black text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={14} />
          Cadastrar Fluxo Individual
        </button>

        {/* Manual Addition Form */}
        {showAddForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            onSubmit={handleManualAddSubmit}
            className="bg-[#0e0e15] p-5 rounded-xl border border-white/5 space-y-3 shadow-md"
          >
            <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest flex items-center justify-between">
              <span>📝 Registro Operacional</span>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-600 hover:text-white">✕</button>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-zinc-500 uppercase font-black">ID Loja*</label>
                <input
                  type="text"
                  required
                  value={newLojaId}
                  onChange={(e) => setNewLojaId(e.target.value)}
                  placeholder="Ex: 2722"
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 uppercase font-black">Setor*</label>
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
                >
                  <option value="S87">S87 - Caixas</option>
                  <option value="S88">S88 - Volumosos</option>
                  <option value="S89">S89 - Colis</option>
                  <option value="S90">S90 - Paletizado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[8px] text-zinc-500 uppercase font-black">Nome da Loja*</label>
              <input
                type="text"
                required
                value={newLojaNome}
                onChange={(e) => setNewLojaNome(e.target.value)}
                placeholder="Ex: FLORIPA CONTINENTE"
                className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-zinc-500 uppercase font-black">Corte*</label>
                <input
                  type="text"
                  required
                  value={newCorte}
                  onChange={(e) => setNewCorte(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 uppercase font-black">Carregamento*</label>
                <input
                  type="text"
                  required
                  value={newCarregamento}
                  onChange={(e) => setNewCarregamento(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[8px] text-zinc-500 uppercase font-black">Transportadora</label>
                <input
                  type="text"
                  value={newTransportadora}
                  onChange={(e) => setNewTransportadora(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 uppercase font-black">Volumes</label>
                <input
                  type="number"
                  value={newVolumes}
                  onChange={(e) => setNewVolumes(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] text-zinc-500 uppercase font-black">Endereços</label>
              <input
                type="number"
                value={newEnderecos}
                onChange={(e) => setNewEnderecos(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2 rounded-lg uppercase tracking-wider"
            >
              Confirmar e Cadastrar
            </button>
          </motion.form>
        )}

        {/* Universal Importer and OCR Wizard */}
        <div className="bg-[#0e0e15] rounded-xl border border-white/5 p-4 space-y-4 shadow-md">
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setImportTab("ocr")}
              className={`flex-1 pb-2 text-center text-[10px] font-black uppercase tracking-wider transition ${
                importTab === "ocr" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              📷 Assistente OCR
            </button>
            <button
              onClick={() => setImportTab("migration")}
              className={`flex-1 pb-2 text-center text-[10px] font-black uppercase tracking-wider transition ${
                importTab === "migration" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ⚙️ Dados Legados
            </button>
          </div>

          {importTab === "ocr" ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold">Leitor de Programação</span>
                <button
                  onClick={loadOcrSample}
                  className="text-[8px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded font-bold hover:bg-white/15"
                >
                  Exemplo de Texto
                </button>
              </div>

              <textarea
                value={ocrInputText}
                onChange={(e) => setOcrInputText(e.target.value)}
                placeholder="Cole o relatório de transporte aqui..."
                className="w-full h-28 bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono leading-relaxed resize-none"
              />

              <button
                onClick={handleOcrProcess}
                disabled={ocrLoading}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2 rounded-lg uppercase tracking-wider transition disabled:opacity-40"
              >
                {ocrLoading ? "Lendo Relatório..." : "Processar Programação"}
              </button>

              {importedStatus && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[9px] text-emerald-400 font-mono">
                  {importedStatus}
                </div>
              )}

                  {/* Parsed Previews list and commit */}
                  {parsedRows.length > 0 && currentDiscrepancyIndex === -2 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Registros Validados e Prontos:</div>
                      <div className="max-h-24 overflow-y-auto space-y-1 bg-black/30 p-1.5 rounded-lg border border-white/5">
                        {parsedRows.map((r, idx) => (
                          <div key={idx} className="flex justify-between text-[9px] font-mono text-zinc-400 border-b border-white/5 pb-0.5">
                            <span className="truncate max-w-[120px]">{r.lojaId} - {r.nomeLoja}</span>
                            <span>{r.setor} | {r.volumes}v</span>
                          </div>
                        ))}
                      </div>

                      {/* NOVO: Opção para aplicar a todos os setores */}
                      <div className="flex flex-col gap-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                        <label className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase tracking-wider cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyToAllSectors}
                            onChange={(e) => setApplyToAllSectors(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                          />
                          Aplicar a todos os setores
                        </label>
                        <span className="text-[8px] text-zinc-500 font-mono leading-tight">
                          (duplica e planeja registros para todos os setores de uma vez: S87, S88, S89, S90)
                        </span>
                      </div>

                      <button
                        onClick={handleCommitOcrImport}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-lg uppercase tracking-widest shadow-md transition-all cursor-pointer"
                      >
                        Confirmar e Importar no Radar
                      </button>
                    </div>
                  )}
            </div>
          ) : (
            <div className="space-y-3.5">
              <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold block">Migração de Dados Legados</span>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Reestruture dados antigos das tabelas de listas em formato unificado para o novo modelo de acompanhamento de setores independentes.
              </p>
              <button
                onClick={handleMigrateLegacyData}
                className="w-full bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 font-bold text-xs py-2 rounded-lg uppercase tracking-wider transition"
              >
                Sincronizar Dados Legados (Bolsão D+1)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Operational Main Workspace */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Discrepancy Wizard Dialog Modal/Widget */}
        {currentDiscrepancyIndex >= 0 && (
          <div className="bg-[#101018] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              <h4 className="text-xs font-black uppercase tracking-wider font-mono">Divergência de Cadastro Master Encontrada!</h4>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              O registro importado aponta a loja <span className="text-white font-bold font-mono">"{discrepancies[currentDiscrepancyIndex]?.row.lojaId}"</span> com o nome <span className="text-white font-bold">"{discrepancies[currentDiscrepancyIndex]?.row.nomeLoja}"</span>.
            </p>

            <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5 text-xs text-zinc-400 font-mono">
              <div>Código: <span className="text-white">{discrepancies[currentDiscrepancyIndex]?.row.lojaId}</span></div>
              <div>Nome no Arquivo: <span className="text-white">{discrepancies[currentDiscrepancyIndex]?.row.nomeLoja}</span></div>
              {discrepancies[currentDiscrepancyIndex]?.currentName && (
                <div className="text-amber-400">Nome Atual no Master: <span className="font-bold">{discrepancies[currentDiscrepancyIndex]?.currentName}</span></div>
              )}
            </div>

            {/* Quick Register / Create Master details */}
            {discrepancies[currentDiscrepancyIndex]?.type === 'not_found' && (
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-lg border border-white/5">
                <div className="col-span-2 text-[9px] text-zinc-500 uppercase font-black">Cadastro Rápido de Loja no Master</div>
                <div>
                  <label className="text-[8px] text-zinc-500 uppercase block mb-0.5">Cidade</label>
                  <input
                    type="text"
                    value={wizardStoreCity}
                    onChange={(e) => setWizardStoreCity(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 uppercase block mb-0.5">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={wizardStoreUF}
                    onChange={(e) => setWizardStoreUF(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Manual Edit inline */}
            <div className="space-y-1.5">
              <label className="text-[8px] text-zinc-500 uppercase font-black">Nome Manual Alternativo (Opcional)</label>
              <input
                type="text"
                value={wizardManualName}
                onChange={(e) => setWizardManualName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
              />
            </div>

            {/* Selection buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              {discrepancies[currentDiscrepancyIndex]?.type === 'not_found' ? (
                <button
                  onClick={() => handleDiscrepancyResolve('create')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-2 rounded uppercase tracking-wider"
                >
                  Criar Cadastro Master
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDiscrepancyResolve('use_current')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[10px] py-2 rounded uppercase tracking-wider"
                  >
                    Usar Nome Atual
                  </button>
                  <button
                    onClick={() => handleDiscrepancyResolve('update_master')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] py-2 rounded uppercase tracking-wider"
                  >
                    Atualizar p/ Importado
                  </button>
                </>
              )}
              <button
                onClick={() => handleDiscrepancyResolve('manual')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] py-2 rounded uppercase tracking-wider"
              >
                Nome Manual
              </button>
              <button
                onClick={() => {
                  // Skip discrepancy
                  if (currentDiscrepancyIndex < discrepancies.length - 1) {
                    setCurrentDiscrepancyIndex(currentDiscrepancyIndex + 1);
                  } else {
                    setCurrentDiscrepancyIndex(-2);
                  }
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-bold text-[10px] py-2 rounded uppercase tracking-wider"
              >
                Pular Linha
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: GROUPED BY STORE CARDS (RECOMMENDED FLOW) */}
        {viewMode === "grouped" && (
          <div className="space-y-4">
            {groupedStores.length === 0 ? (
              <div className="bg-[#0e0e15] p-12 text-center rounded-xl border border-white/5 space-y-2">
                <p className="text-sm font-bold text-zinc-400 font-mono">Sem programações ativas</p>
                <p className="text-xs text-zinc-600">Importe um relatório OCR ou cadastre uma nova lista para exibir dados.</p>
              </div>
            ) : (
              groupedStores.map((store) => {
                return (
                  <div 
                    key={store.lojaId}
                    className="bg-[#0e0e15] rounded-xl border border-white/5 p-4 space-y-4 shadow-md hover:border-white/10 transition"
                  >
                    {/* Store Card Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-black">
                            LOJA {store.lojaId}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">
                            {store.ops[0]?.transportadora}
                          </span>
                        </div>
                        <h3 className="font-black text-white text-base mt-1 uppercase tracking-tight">
                          {store.nomeLoja}
                        </h3>
                      </div>

                      {/* Store Batch Operations Shortcuts */}
                      <div className="flex flex-wrap gap-1.5 bg-black/40 p-1 rounded-lg">
                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-wider px-2 py-1 block self-center">LOTE:</span>
                        <button
                          onClick={() => handleBatchStoreAction(store.lojaId, 'soltura')}
                          className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] font-black uppercase px-2 py-1 rounded"
                          title="Soltar todos os setores ativos desta loja"
                        >
                          Soltar Todos
                        </button>
                        <button
                          onClick={() => handleBatchStoreAction(store.lojaId, 'coleta')}
                          className="bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/20 text-blue-400 font-mono text-[8px] font-black uppercase px-2 py-1 rounded"
                          title="Coletar todos os setores ativos desta loja"
                        >
                          Coletar Todos
                        </button>
                        <button
                          onClick={() => handleBatchStoreAction(store.lojaId, 'carga')}
                          className="bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 text-cyan-400 font-mono text-[8px] font-black uppercase px-2 py-1 rounded"
                          title="Carregar todos os setores ativos"
                        >
                          Carregar Todos
                        </button>
                        <button
                          onClick={() => handleBatchStoreAction(store.lojaId, 'expedicao')}
                          className="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/20 text-purple-400 font-mono text-[8px] font-black uppercase px-2 py-1 rounded"
                          title="Expedir todos os setores ativos"
                        >
                          Expedir Todos
                        </button>
                      </div>
                    </div>

                    {/* Sectors Grid/Timeline Rows inside this store */}
                    <div className="space-y-4">
                      {store.ops.map((op) => {
                        const isLate = BusinessRules.isDelayed(op.corte, op.statusExpedicao !== 'Pendente' ? getBrasiliaTimeString() : null);
                        const risk = BusinessRules.predictRisk(op);

                        return (
                          <div 
                            key={op.id}
                            className="bg-black/25 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition hover:bg-black/35"
                          >
                            {/* Sector info metadata */}
                            <div className="space-y-1 min-w-[150px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-zinc-900 text-zinc-400 font-mono px-2 py-0.5 rounded font-black">
                                  {op.setor}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {op.volumes}v | {op.enderecos}e
                                </span>
                              </div>
                              <div className="text-[9px] font-mono text-zinc-500">
                                Corte: <span className="text-zinc-400 font-bold">{op.corte}</span> | Carga: <span className="text-zinc-400">{op.carregamento}</span>
                              </div>
                              <div className="flex items-center gap-1 pt-1">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  risk.level === 'Crítico' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  risk.level === 'Alto' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  risk.level === 'Médio' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  Risco {risk.level}
                                </span>
                                <span className="text-[7.5px] text-zinc-400 leading-none">{risk.reason}</span>
                              </div>
                            </div>

                            {/* Timeline Progression Indicators */}
                            <div className="flex-1 grid grid-cols-4 gap-1.5 max-w-md w-full relative">
                              <div className="absolute top-[13px] left-[10%] right-[10%] h-[2.5px] bg-zinc-900 z-0 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all duration-500 rounded-full"
                                  style={{ 
                                    width: op.statusExpedicao !== 'Pendente' ? '100%' : 
                                           op.statusCarregamento === 'Carregada' ? '75%' : 
                                           op.statusColeta === 'Coletada' ? '50%' : 
                                           op.statusSoltura === 'Solta' ? '25%' : '0%' 
                                  }}
                                />
                              </div>

                              {/* Stage 1: Soltura */}
                              <div className="flex flex-col items-center text-center relative z-10">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOperationalStep(op, 'soltura')}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                                    op.statusSoltura === 'Solta'
                                      ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-emerald-500/50"
                                  }`}
                                  title={`Solto por: ${op.soltoPor || "Não Solta"}`}
                                >
                                  <Check size={10} />
                                </button>
                                <span className="text-[7.5px] font-black uppercase mt-1 text-zinc-500">Soltura</span>
                                <span className="text-[7px] text-zinc-600 font-mono">
                                  {op.statusSoltura === 'Solta' ? op.horarioSoltura : "Não"}
                                </span>
                              </div>

                              {/* Stage 2: Coleta */}
                              <div className="flex flex-col items-center text-center relative z-10">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOperationalStep(op, 'coleta')}
                                  disabled={op.statusSoltura !== 'Solta'}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                                    op.statusColeta === 'Coletada'
                                      ? "bg-blue-500 text-white border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                      : op.statusColeta === 'Em andamento'
                                      ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                                      : "bg-zinc-950 text-zinc-600 border-zinc-800 disabled:opacity-30"
                                  }`}
                                  title={`Coletado por: ${op.coletadoPor || "Não Iniciado"}`}
                                >
                                  <Layers size={9} />
                                </button>
                                <span className="text-[7.5px] font-black uppercase mt-1 text-zinc-500">Coleta</span>
                                <span className="text-[7px] text-zinc-600 font-mono truncate max-w-[65px]">
                                  {op.statusColeta}
                                </span>
                              </div>

                              {/* Stage 3: Carga */}
                              <div className="flex flex-col items-center text-center relative z-10">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOperationalStep(op, 'carga')}
                                  disabled={op.statusColeta !== 'Coletada'}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                                    op.statusCarregamento === 'Carregada'
                                      ? "bg-cyan-500 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                      : op.statusCarregamento === 'Em andamento'
                                      ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                                      : "bg-zinc-950 text-zinc-600 border-zinc-800 disabled:opacity-30"
                                  }`}
                                  title={`Carregado por: ${op.carregadoPor || "Não Carregado"}`}
                                >
                                  <Clock size={9} />
                                </button>
                                <span className="text-[7.5px] font-black uppercase mt-1 text-zinc-500">Carga</span>
                                <span className="text-[7px] text-zinc-600 font-mono truncate max-w-[65px]">
                                  {op.statusCarregamento}
                                </span>
                              </div>

                              {/* Stage 4: Expedição */}
                              <div className="flex flex-col items-center text-center relative z-10">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOperationalStep(op, 'expedicao')}
                                  disabled={op.statusCarregamento !== 'Carregada'}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                                    op.statusExpedicao !== 'Pendente'
                                      ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                                      : "bg-zinc-950 text-zinc-600 border-zinc-800 disabled:opacity-30"
                                  }`}
                                  title="Expedir rota"
                                >
                                  <ExternalLink size={9} />
                                </button>
                                <span className="text-[7.5px] font-black uppercase mt-1 text-zinc-500">Expedido</span>
                                <span className="text-[7px] text-zinc-600 font-mono">
                                  {op.statusExpedicao}
                                </span>
                              </div>
                            </div>

                            {/* Delete/Action option */}
                            <div className="flex items-center gap-2">
                              {isLate && op.statusExpedicao === 'Pendente' && (
                                <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                                  ⚠️ ATRASADO
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteOperation(op.id)}
                                className="text-zinc-600 hover:text-red-400 p-1.5 rounded transition"
                                title="Remover operação"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: FLAT SECTOR-SPECIFIC LISTS (INDIVIDUAL COLUMNS) */}
        {viewMode === "individual" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOps.map((op) => {
              const isLate = BusinessRules.isDelayed(op.corte, op.statusExpedicao !== 'Pendente' ? getBrasiliaTimeString() : null);
              const risk = BusinessRules.predictRisk(op);

              return (
                <div 
                  key={op.id}
                  className={`bg-[#0e0e15] rounded-xl border p-4 space-y-4 shadow-sm hover:border-white/10 transition ${
                    risk.level === 'Crítico' ? "border-red-500/30 ring-1 ring-red-500/10" : 
                    risk.level === 'Alto' ? "border-amber-500/30" : "border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-black">
                          S{op.setor}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase">
                          {op.transportadora}
                        </span>
                      </div>
                      <h4 className="font-black text-white text-sm mt-1 uppercase truncate max-w-[190px]">{op.nomeLoja}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        risk.level === 'Crítico' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        risk.level === 'Alto' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        risk.level === 'Médio' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        Risco {risk.level}
                      </span>
                      <span className={`text-[8.5px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${
                        op.statusExpedicao !== 'Pendente' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-zinc-800 text-zinc-400 border-white/5"
                      }`}>
                        {op.statusExpedicao !== 'Pendente' ? 'EXPEDIDO' : 'EM FILA'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-black/25 p-2 rounded-lg text-[9px] font-mono text-zinc-500">
                    <div>
                      <span className="text-[7.5px] text-zinc-600 uppercase block">Corte / Carga</span>
                      <span className="text-zinc-300 font-bold">{op.corte} / {op.carregamento}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] text-zinc-600 uppercase block">Volumes</span>
                      <span className="text-zinc-300 font-bold">{op.volumes}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] text-zinc-600 uppercase block">Endereços</span>
                      <span className="text-zinc-300 font-bold">{op.enderecos}</span>
                    </div>
                  </div>

                  {/* Operational buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    <button
                      onClick={() => handleUpdateOperationalStep(op, 'soltura')}
                      className={`py-1 rounded text-[8px] font-black uppercase transition ${
                        op.statusSoltura === 'Solta' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-black/30 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Soltura
                    </button>
                    <button
                      onClick={() => handleUpdateOperationalStep(op, 'coleta')}
                      disabled={op.statusSoltura !== 'Solta'}
                      className={`py-1 rounded text-[8px] font-black uppercase transition ${
                        op.statusColeta === 'Coletada' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : op.statusColeta === 'Em andamento' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-black/30 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      }`}
                    >
                      Coleta
                    </button>
                    <button
                      onClick={() => handleUpdateOperationalStep(op, 'carga')}
                      disabled={op.statusColeta !== 'Coletada'}
                      className={`py-1 rounded text-[8px] font-black uppercase transition ${
                        op.statusCarregamento === 'Carregada' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : op.statusCarregamento === 'Em andamento' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" : "bg-black/30 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      }`}
                    >
                      Carga
                    </button>
                    <button
                      onClick={() => handleUpdateOperationalStep(op, 'expedicao')}
                      disabled={op.statusCarregamento !== 'Carregada'}
                      className={`py-1 rounded text-[8px] font-black uppercase transition ${
                        op.statusExpedicao !== 'Pendente' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-black/30 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      }`}
                    >
                      Expedir
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[7.5px] text-zinc-600 font-mono border-t border-white/5 pt-2.5">
                    <span>Ref: {op.updated_by}</span>
                    <span>Atualizado: {formatToBrasiliaTime(op.updated_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: TABULAR SPREADSHEET REPRESENTATION */}
        {viewMode === "table" && (
          <div className="bg-[#0e0e15] rounded-xl border border-white/5 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-black/40 text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nome Loja</th>
                    <th className="p-3">Setor</th>
                    <th className="p-3">Corte</th>
                    <th className="p-3">Carga</th>
                    <th className="p-3">Soltura</th>
                    <th className="p-3">Coleta</th>
                    <th className="p-3">Carga Status</th>
                    <th className="p-3">Expedido</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-zinc-400">
                  {filteredOps.map((op) => {
                    return (
                      <tr key={op.id} className="hover:bg-black/20 transition">
                        <td className="p-3 text-zinc-300 font-bold">{op.lojaId}</td>
                        <td className="p-3 text-zinc-300 font-sans uppercase font-bold truncate max-w-[120px]">{op.nomeLoja}</td>
                        <td className="p-3">
                          <span className="bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded font-black">{op.setor}</span>
                        </td>
                        <td className="p-3 text-zinc-300">{op.corte}</td>
                        <td className="p-3 text-zinc-400">{op.carregamento}</td>
                        <td className="p-3">
                          <span className={op.statusSoltura === 'Solta' ? "text-emerald-400 font-bold" : "text-zinc-600"}>
                            {op.statusSoltura === 'Solta' ? `SIM (${op.horarioSoltura})` : 'NÃO'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={op.statusColeta === 'Coletada' ? "text-blue-400 font-bold" : op.statusColeta === 'Em andamento' ? "text-amber-400 font-bold" : "text-zinc-600"}>
                            {op.statusColeta}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={op.statusCarregamento === 'Carregada' ? "text-cyan-400 font-bold" : op.statusCarregamento === 'Em andamento' ? "text-amber-400 font-bold" : "text-zinc-600"}>
                            {op.statusCarregamento}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={op.statusExpedicao !== 'Pendente' ? "text-purple-400 font-bold" : "text-zinc-600"}>
                            {op.statusExpedicao}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteOperation(op.id)}
                            className="text-zinc-600 hover:text-red-400 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
