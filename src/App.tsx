/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ToastProvider } from "./hooks/useToast";
import {
  Setor,
  Colaborador,
  AlertLog,
  AuditLog,
  HistoricoRegistro,
  ReferenteSemana,
  UserRole,
  ColaboradorStatus,
  CopilSetor,
  RadarLoja,
} from "./types";
import {
  initialSetores,
  initialColaboradores,
  initialReferentesSemana,
  initialCopil,
  initialRadar,
} from "./initialData";

// Components
import { ApresentacaoAtividadeTab } from "./components/ApresentacaoAtividadeTab";
import { DashboardTab } from "./components/DashboardTab";
import { ExecutivoTab, AnalyticsTab } from "./components/ExecutiveAndAnalyticsTabs";
import {
  CapacidadeTab,
  ProdutividadeTab,
} from "./components/TransactionalAndOperationalTabs";
import { CopilTab } from "./components/CopilTab";
import { ConexoesTab } from "./components/ConexoesTab";
import {
  EquipaTab,
  HistoricoTab,
  AlertasTab,
  AuditoriaTab,
  RelatoriosTab,
  ConfigTab,
} from "./components/AdminAndSupportTabs";
import { useUserStore } from "./stores/useUserStore";
import RadarLojasTab from "./components/RadarLojasTab";
import { useStoreOperations } from "./stores/useStoreOperations";
import { useSectorStore } from "./stores/useSectorStore";
import { useHistoryStore } from "./stores/useHistoryStore";
import { useCollaboratorStore } from "./stores/useCollaboratorStore";
import { useUIStore } from "./stores/useUIStore";
import { realtimeSync } from "./services/realtimeSyncService";
import { SupabaseService as FirebaseService } from "./lib/supabaseService";
import { StoreService } from "./services/storeService";

// Layout & Modular UI Components
import { OverrideTab } from "./components/OverrideTab";
import { HeaderBar } from "./components/HeaderBar";
import { NavigationPanel } from "./components/NavigationPanel";
import { TerminalDrawer } from "./components/TerminalDrawer";
import { ToastContainer } from "./components/ToastContainer";
import { OperationToastContainer } from "./components/OperationToastContainer";
import { useOperationNotifications } from "./hooks/useOperationNotifications";
import { ScreensaverOverlay } from "./components/ScreensaverOverlay";

// Utils & Helpers
import { calcCopilNota as calcCopilNotaUtil } from "./utils/copilCalculator";

// --- AUTH & LOGIN INTEGRATION ---
import { auth, getUserProfile, ensureUserProfile, logoutUser } from "./lib/supabaseAuth";
import LoginScreen from "./components/LoginScreen";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  useOperationNotifications();
  // Global States from Zustand (Unified User and Auth states)
  const {
    currentUser,
    setCurrentUser,
    currentRole,
    setCurrentRole,
    currentStatus,
    setCurrentStatus,
    setCurrentUserUid,
    toasts,
    removeToast,
    startListeningUserStatus,
    pendingUsers,
    loadPendingUsers,
  } = useUserStore();

  // Auth States
  const [fbUser, setFbUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Supabase connection tracking states
  const [supabaseOnline, setSupabaseOnline] = useState<boolean | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);

  const verifySupabaseConnection = async () => {
    setCheckingSupabase(true);
    try {
      const { supabase, isStaticBuild } = await import("./lib/supabase");
      if (isStaticBuild || !supabase) {
        setSupabaseOnline(false);
        setCheckingSupabase(false);
        return;
      }

      const checkPromise = supabase.from("usuarios").select("id").limit(1);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 4000)
      );

      await Promise.race([checkPromise, timeoutPromise]);
      setSupabaseOnline(true);
      console.log("✅ [Supabase Connection Log] Supabase está acessível e online.");
    } catch (err) {
      console.warn("❌ [Supabase Connection Log] Erro ou timeout ao conectar com o Supabase:", err);
      setSupabaseOnline(false);
    } finally {
      setCheckingSupabase(false);
    }
  };

  useEffect(() => {
    if (fbUser?.uid) {
      verifySupabaseConnection();
    } else {
      setSupabaseOnline(null);
    }
  }, [fbUser?.uid]);

  // Sync with Supabase Auth state
  useEffect(() => {
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.error(
          "[Auth Timeout] Supabase Auth não respondeu em 8s. Verifique as variáveis VITE_SUPABASE_* no .env."
        );
        setAuthError(
          "Falha ao conectar com o serviço de autenticação. Verifique a configuração do Supabase (.env)."
        );
        setAuthLoading(false);
      }
    }, 8000);

    const unsubscribe = auth.onAuthStateChanged(
      async (user) => {
        resolved = true;
        clearTimeout(timeoutId);
        try {
          if (user) {
            setFbUser(user);
            const profile = await ensureUserProfile(user);
            if (profile) {
              setCurrentUser(profile.nome);
              setCurrentRole(profile.role);
              setCurrentStatus(profile.situacao);
            }
          } else {
            setFbUser(null);
            setCurrentUser("");
            setCurrentRole(UserRole.Guest);
          }
        } catch (err) {
          console.error("[Auth Error] Falha ao carregar perfil do usuário:", err);
          setAuthError("Erro ao carregar perfil do usuário. Tente recarregar a página.");
        } finally {
          setAuthLoading(false);
        }
      },
      (error) => {
        resolved = true;
        clearTimeout(timeoutId);
        console.error("[Supabase Auth Error]", error);
        setAuthError(`Erro do Supabase Auth: ${(error as Error).message}`);
        setAuthLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Listen for active user's status changes in database
  useEffect(() => {
    if (fbUser?.uid) {
      setCurrentUserUid(fbUser.uid);
      const unsubscribe = startListeningUserStatus(fbUser.uid);
      return () => {
        unsubscribe();
      };
    }
  }, [fbUser?.uid, startListeningUserStatus, setCurrentUserUid]);

  // Load pending users for Admin on startup/role-change
  useEffect(() => {
    if (currentRole === UserRole.Admin) {
      loadPendingUsers();
    }
  }, [currentRole, loadPendingUsers]);

  // Zustand Stores
  const {
    setores,
    setSetores,
    capacidade,
    setCapacidade,
    universos,
    setUniversos,
    copilData,
    setCopilData,
    radar,
    setRadar,
    reaproData,
    setReaproData,
    bolsaoData,
    setBolsaoData,
  } = useSectorStore();

  const { historico, setHistorico, alerts, setAlerts, audit, setAudit } = useHistoryStore();

  const { colaboradores, setColaboradores } = useCollaboratorStore();

  const {
    activeTab,
    setActiveTab,
    activeSectorId,
    setActiveSectorId,
    showTerminal,
    setShowTerminal,
    terminalInput,
    setTerminalInput,
    terminalLogs,
    setTerminalLogs,
    notifications,
    setNotifications,
    screensaver,
    setScreensaver,
  } = useUIStore();

  const [isScreensaverActive, setIsScreensaverActive] = useState<boolean>(false);
  const [ticker, setTicker] = useState(0);

  // Unified fluctuation selector
  const setoresFluctuated = React.useMemo(() => {
    return setores.map((s) => {
      const numericId = parseInt(s.id.replace(/\D/g, "")) || 0;
      const seed = numericId + ticker;
      const change = (seed % 11) - 5; // -5 to +5
      const newAtiv = Math.max(0, s.ativ + change);

      const uphChange = (seed % 5) - 2; // -2 to +2
      const newUph = Math.max(10, s.uph + uphChange);

      return {
        ...s,
        ativ: newAtiv,
        uph: newUph,
      };
    });
  }, [setores, ticker]);

  const [referentesSemana, setReferentesSemana] = useState<ReferenteSemana[]>(() => {
    return initialReferentesSemana;
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 10000);
    return () => clearInterval(clockTimer);
  }, []);

  // Multi-site
  const [currentSite] = useState<string>("Campinas");

  // Zustand Operations Store for Radar live sync
  const operations = useStoreOperations((state) => state.operations);

  // Registrar handler de erros de sincronização offline e inicializar lojas master
  useEffect(() => {
    StoreService.initMasterStores();
    const unsub = FirebaseService.onSyncError((alertLog) => {
      useHistoryStore.getState().setAlerts([alertLog, ...useHistoryStore.getState().alerts]);
    });
    return () => unsub();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!fbUser?.uid) {
      realtimeSync.stopAll();
      return;
    }

    const targetDate = new Date().toISOString().split("T")[0]; // Dynamic today
    realtimeSync.startListeningProgramacao(targetDate);
    realtimeSync.startListeningAtividades(targetDate);
    realtimeSync.startListeningSetores();
    realtimeSync.startListeningColaboradores();
    realtimeSync.startListeningEscalas();
    realtimeSync.startListeningUniversos();
    realtimeSync.startListeningCopil();
    realtimeSync.startListeningCapacidade();
    realtimeSync.startListeningReferentes();
    realtimeSync.startListeningUsuarios();
    realtimeSync.startListeningAlertas();
    realtimeSync.startListeningHistorico();
    realtimeSync.startListeningAudit();
    realtimeSync.startListeningActivityEntries();
    realtimeSync.startListeningPainelProducao();

    return () => {
      realtimeSync.stopAll();
    };
  }, [fbUser?.uid]);

  // Synchronize radar with store_operations in real-time
  useEffect(() => {
    const opsList = Object.values(operations);
    if (opsList.length > 0) {
      const mapped = opsList.map((op) => ({
        corte: op.corte,
        loja: `${op.lojaId} - ${op.nomeLoja}`,
        vol: op.volumes,
        ativ: op.enderecos,
        prog:
          op.statusColeta === "Coletada"
            ? 100
            : op.statusColeta === "Em andamento"
            ? 50
            : 0,
      }));
      setRadar(mapped);
    }
  }, [operations, currentSite, setRadar]);

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Helper to load site-specific data
  const loadSiteData = (site: string) => {
    try {
      const sSetores = null; const sRadar = null; const sColab = null; const sCopil = null;

      if (sSetores) {
        const parsedSetores = JSON.parse(sSetores) as Setor[];
        const sanitized = parsedSetores.map((s) => ({
          ...s,
          numero: s.numero ?? (parseInt(s.id.replace(/\D/g, "")) || 0),
          nome: s.nome || "Setor " + (s.numero || s.id),
          meta: s.meta ?? 100,
          varFin: Math.round(Number(s.varFin) || 0),
          errosPicking: Math.round(Number(s.errosPicking) || 0),
          horasDKT: Math.round(Number(s.horasDKT) || 0),
        }));
        setSetores(sanitized);
      } else {
        const baseSetores = JSON.parse(JSON.stringify(initialSetores)) as Setor[];
        if (site === "Extrema") {
          baseSetores[0].resp = "ALAN OLIVEIRA";
          baseSetores[0].ativ = 12450;
          baseSetores[1].resp = "SABRINA COSTA";
          baseSetores[1].ativ = 7820;
        } else if (site === "Recife") {
          baseSetores[0].resp = "FILIPE MENEZES";
          baseSetores[0].ativ = 8100;
          baseSetores[1].resp = "BEATRIZ SILVA";
          baseSetores[1].ativ = 4900;
        }
        setSetores(baseSetores);
      }

      if (sRadar) {
        setRadar(JSON.parse(sRadar));
      } else {
        const baseRadar = JSON.parse(JSON.stringify(initialRadar)) as RadarLoja[];
        if (site === "Extrema") {
          baseRadar[0].loja = "2722 - EXTREMA MALL";
          baseRadar[1].loja = "2360 - POUSO ALEGRE";
        } else if (site === "Recife") {
          baseRadar[0].loja = "2722 - RECIFE SHOPPING";
          baseRadar[1].loja = "2360 - OLINDA CENTRO";
        }
        setRadar(baseRadar);
      }

      if (sColab) {
        setColaboradores(JSON.parse(sColab));
      } else {
        setColaboradores(initialColaboradores);
      }

      if (sCopil) {
        setCopilData(JSON.parse(sCopil));
      } else {
        setCopilData(initialCopil);
      }
    } catch (e) {
      console.error("Error loading site-specific data:", e);
    }
  };

  useEffect(() => {
    loadSiteData(currentSite);
  }, [currentSite]);

  // Time States
  const [timeState, setTimeState] = useState<{ local: string; utc: string }>({
    local: "",
    utc: "",
  });

  const handleUpdateSetorField = (sid: string, field: string, val: any) => {
    setSetores((prev) =>
      prev.map((s) => {
        if (s.id === sid) {
          const updated = { ...s, [field]: val };
          FirebaseService.upsertRecord("setores", updated).catch((err) =>
            console.error("Failed to upsert sector:", err)
          );
          return updated;
        }
        return s;
      })
    );
  };

  const lastActivityRef = useRef<number>(Date.now());

  // TIMERS & BACKGROUND SIMULATION
  useEffect(() => {
    const clockInt = setInterval(() => {
      const now = new Date();
      setTimeState({
        local: now.toLocaleTimeString("pt-BR"),
        utc: now.toISOString().slice(11, 19) + " UTC",
      });
    }, 1000);

    const simulationInt = setInterval(() => {
      if (!setores || setores.length === 0) return;
      const s = setores[Math.floor(Math.random() * setores.length)];

      if (Math.random() > 0.85) {
        const isSla = Math.random() > 0.5;
        const newAlert: AlertLog = {
          id: `alt-${Date.now()}`,
          titulo: isSla ? "Oscilação de SLA" : "Status de Segurança",
          descricao: isSla
            ? `Setor S${s.id} com flutuação de promessa de entrega.`
            : `Auditoria BSI ativa em S${s.id} — mantenha o padrão 5S.`,
          setor: s.id,
          prioridade: isSla ? "alta" : "media",
          lido: false,
          hora: new Date().toISOString(),
        };
        setAlerts((a) => [newAlert, ...a]);
      }

      if (Math.random() > 0.85) {
        const types: ("info" | "success" | "warning" | "danger")[] = [
          "info",
          "success",
          "warning",
          "danger",
        ];
        const notifType = types[Math.floor(Math.random() * types.length)];
        let notifTitle = "Atualização de Setor";
        let notifDesc = `Novas coletas concluídas no Setor S${s.id}.`;
        if (notifType === "warning") {
          notifTitle = "Meta sob Risco";
          notifDesc = `Atenção: Setor S${s.id} está operando abaixo da meta recomendada.`;
        } else if (notifType === "danger") {
          notifTitle = "Divergência de Estoque";
          notifDesc = `Variação financeira identificada no Setor S${s.id}.`;
        } else if (notifType === "success") {
          notifTitle = "KPI Alcançado";
          notifDesc = `Excelente! Setor S${s.id} estabilizou SLA em 100%.`;
        }

        const now = new Date();
        const formattedTime = now.toLocaleTimeString("pt-BR").slice(0, 5);
        setNotifications((prev) => {
          const updated = [
            {
              id: Math.random().toString(),
              title: notifTitle,
              desc: notifDesc,
              time: formattedTime,
              type: notifType,
              read: false,
            },
            ...prev,
          ].slice(0, 25);
          return updated;
        });
      }
    }, 15000);

    return () => {
      clearInterval(clockInt);
      clearInterval(simulationInt);
    };
  }, [setores, setAlerts, setNotifications]);

  // INACTIVITY / SCREENSAVER MONITOR
  useEffect(() => {
    if (!screensaver.enabled) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      if (isScreensaverActive) {
        setIsScreensaverActive(false);
        addAudit("Usuario", "Inatividade", "Telas", "Screensaver encerrado");
      }
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    const checkInterval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs >= screensaver.timeout * 1000 && !isScreensaverActive) {
        setIsScreensaverActive(true);
        addAudit("Sistema", "Inatividade", "Telas", "Screensaver ativo");
      }
    }, 2000);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      clearInterval(checkInterval);
    };
  }, [screensaver, isScreensaverActive]);

  // AUTO PERSISTENCE SYNC EFFECTS
  useEffect(() => {
    localStorage.setItem("current_user", currentUser);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("current_role", currentRole);
    localStorage.setItem("current_status", currentStatus);
  }, [currentRole, currentStatus]);

  useEffect(() => {
    localStorage.setItem("active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("active_sector_id", activeSectorId);
  }, [activeSectorId]);

  useEffect(() => {
    localStorage.setItem("screensaver_config", JSON.stringify(screensaver));
  }, [screensaver]);



  // CORE DISPATCHERS & STATE WRITERS
  const addAudit = (user: string, action: string, field: string, nVal: any, pVal?: any) => {
    const logData = {
      data: new Date().toISOString(),
      usuario: user || "Sistema",
      acao: action,
      campo: field,
      valorAnterior: pVal !== undefined ? pVal : null,
      valorNovo: nVal !== undefined ? nVal : null,
      dispositivo: "TOWER_OS_CONSOLE",
    };

    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      ...logData,
    };
    setAudit((prev) => [...prev, newLog]);

    if (authLoading || !fbUser) return;
    FirebaseService.upsert("audit_logs", newLog).catch((err) =>
      console.error("Failed to automatically save audit log to DB:", err)
    );
  };

  const handleUpdateCapacidade = (sid: string, field: "abertura" | "fechoHora", value: number) => {
    if (currentRole === UserRole.Guest) return;
    setCapacidade((prev) =>
      prev.map((c) => {
        if (c.id === sid) {
          addAudit(currentUser, "Edição Metas", `${sid}.${field}`, value, c[field]);
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const handleUpdateSetorProd = (sid: string, field: string, value: number) => {
    if (currentRole === UserRole.Guest) return;
    setSetores((prev) =>
      prev.map((s) => {
        if (s.id === sid) {
          addAudit(currentUser, "Apontamento Prod", `${sid}.${field}`, value, (s as any)[field]);
          const updated = { ...s, [field]: value };
          FirebaseService.upsertRecord("setores", updated).catch((err) =>
            console.error("Failed to upsert sector:", err)
          );
          return updated;
        }
        return s;
      })
    );
  };

  const handleUpdateColaboradorStatus = (index: number, status: ColaboradorStatus) => {
    if (currentRole === UserRole.Guest) return;
    setColaboradores((prev) => {
      const copy = [...prev];
      const prevVal = copy[index].status;
      const updated = { ...copy[index], status };
      copy[index] = updated;
      addAudit(currentUser, "Status Colaborador", copy[index].nome, status, prevVal);
      FirebaseService.upsertRecord("colaboradores", updated).catch((err) =>
        console.error("Failed to upsert collaborator:", err)
      );
      return copy;
    });
  };

  const handleUpdateColaboradorHoras = (index: number, horas: number) => {
    if (currentRole === UserRole.Guest) return;
    setColaboradores((prev) => {
      const copy = [...prev];
      const prevVal = copy[index].horas;
      const updated = { ...copy[index], horas };
      copy[index] = updated;
      addAudit(currentUser, "Horas DKT", copy[index].nome, horas, prevVal);
      FirebaseService.upsertRecord("colaboradores", updated).catch((err) =>
        console.error("Failed to upsert collaborator:", err)
      );
      return copy;
    });
  };

  const handleAddColaborador = (col: Colaborador) => {
    setColaboradores((prev) => [...prev, col]);
    addAudit(currentUser, "Criar Colaborador", col.nome, col.setor);
    FirebaseService.upsertRecord("colaboradores", col).catch((err) =>
      console.error("Failed to upsert collaborator:", err)
    );
  };

  const handleUpdateColaborador = (index: number, col: Colaborador) => {
    setColaboradores((prev) => {
      const copy = [...prev];
      copy[index] = col;
      addAudit(currentUser, "Editar Colaborador", col.nome, col.setor);
      FirebaseService.upsertRecord("colaboradores", col).catch((err) =>
        console.error("Failed to upsert collaborator:", err)
      );
      return copy;
    });
  };

  const handleRemoveColaborador = (index: number) => {
    const col = colaboradores[index];
    setColaboradores((prev) => prev.filter((_, i) => i !== index));
    addAudit(currentUser, "Remover Colaborador", col.nome, "Apagado");
    FirebaseService.deleteRecord("colaboradores", col.id).catch((err) =>
      console.error("Failed to delete collaborator:", err)
    );
  };

  const handleSetColaboradores = async (cols: Colaborador[]) => {
    setColaboradores(cols);
    for (const col of cols) {
      FirebaseService.upsertRecord("colaboradores", col).catch((err) =>
        console.error("Failed to batch upsert collaborator:", err)
      );
    }
  };

  const handleSaveRadar = React.useCallback(
    (newRadar: RadarLoja[]) => {
      // Legacy radar sync disabled. Radar now reads directly from useStoreOperations.
      // Do nothing to prevent ID format mismatch loops.
    },
    []
  );

  const handleMarkAlertLido = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, lido: true } : a)));
  };

  const handleGravarTurno = () => {
    const s = setores.find((x) => x.id === activeSectorId) || setores[0];
    const newReg: HistoricoRegistro = {
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR"),
      semana: "S26",
      turno: "Turno A",
      setor: s.id,
      ativ: s.ativ,
      uph: s.uph,
      repro: s.reproTotal,
      promessa: s.promessa,
      nota5s: s.nota5s,
      erros: s.errosPicking,
    };
    setHistorico((prev) => [...prev, newReg]);

    if (authLoading || !fbUser) {
      addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
      alert(`Turno S${s.id} gravado localmente (sincronização offline).`);
      return;
    }

    FirebaseService.upsert("historico_consolidado", newReg)
      .then(() => {
        addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
        alert(`Turno S${s.id} gravado no histórico com sucesso!`);
      })
      .catch((err) => {
        console.error("Failed to automatically save turn consolidation to DB:", err);
        addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
        alert(`Turno S${s.id} gravado localmente (erro ao sincronizar com banco de dados).`);
      });
  };

  const calcCopilNota = (row: any): string => {
    return calcCopilNotaUtil(row, setores, activeSectorId, capacidade);
  };

  const handleUpdateCopilKPI = (
    sid: string,
    group: string,
    kpiIdx: number,
    field: string,
    value: string
  ) => {
    setCopilData((prev) => {
      const copy = { ...prev };
      const sector = { ...copy[sid] };
      const list = [...((sector[group as keyof CopilSetor] as any[]) || [])];
      list[kpiIdx] = { ...list[kpiIdx], [field]: value };
      (sector as any)[group] = list;
      copy[sid] = sector;
      addAudit(currentUser, "Edição COPIL KPI", `${sid}.${group}.${kpiIdx}.${field}`, value);
      return copy;
    });
  };

  const handleAddCopilKPI = (sid: string, group: string, kpi: string, comp: string) => {
    setCopilData((prev) => {
      const copy = { ...prev };
      const sector = { ...copy[sid] };
      const list = [...((sector[group as keyof CopilSetor] as any[]) || [])];
      list.push({ kpi, comp, real: "0", inverso: false, auto: false });
      (sector as any)[group] = list;
      copy[sid] = sector;
      addAudit(currentUser, "Novo COPIL KPI", kpi, comp);
      return copy;
    });
  };

  const handleRemoveCopilKPI = (sid: string, group: string, kpiIdx: number) => {
    setCopilData((prev) => {
      const copy = { ...prev };
      const sector = { ...copy[sid] };
      const list = [...((sector[group as keyof CopilSetor] as any[]) || [])].filter(
        (_, i) => i !== kpiIdx
      );
      (sector as any)[group] = list;
      copy[sid] = sector;
      addAudit(currentUser, "Remover COPIL KPI", `${sid}.${group}.${kpiIdx}`, "Apagado");
      return copy;
    });
  };

  const handleRestoreDefaultKPIs = (sid: string) => {
    setCopilData((prev) => {
      const copy = { ...prev };
      const standard = initialCopil[sid] || initialCopil["87"];
      copy[sid] = JSON.parse(JSON.stringify(standard));
      addAudit(currentUser, "Restaurar COPIL Padrão", sid, "Sucesso");
      return copy;
    });
    alert(`KPIs padrão do Setor S${sid} restaurados com sucesso!`);
  };

  const handleBulkImportKPIs = (validRows: any[]) => {
    setCopilData((prev) => {
      const copy = { ...prev };

      validRows.forEach((row) => {
        const sid = row.sector;
        if (!copy[sid]) {
          copy[sid] = { operacionais: [], economico: [], seguranca: [] };
        }

        let group: "operacionais" | "economico" | "seguranca" = "operacionais";
        const kpiLower = row.kpi.toLowerCase();
        if (
          kpiLower.includes("variação") ||
          kpiLower.includes("estoque") ||
          kpiLower.includes("demarca") ||
          kpiLower.includes("economico") ||
          kpiLower.includes("econômico")
        ) {
          group = "economico";
        } else if (
          kpiLower.includes("segurança") ||
          kpiLower.includes("seguranca") ||
          kpiLower.includes("infração") ||
          kpiLower.includes("infracao")
        ) {
          group = "seguranca";
        }

        const sectorGroupList = [...copy[sid][group]];
        const existIdx = sectorGroupList.findIndex(
          (k) => k.kpi.toLowerCase() === row.kpi.toLowerCase()
        );

        const isInverse =
          kpiLower.includes("erro") ||
          kpiLower.includes("infraç") ||
          kpiLower.includes("infrac") ||
          kpiLower.includes("reprocesso");

        const newKpiObj = {
          kpi: row.kpi,
          comp: row.meta,
          real: row.real,
          tolerancia: row.tolerancia || row.meta,
          regraCalculo:
            group === "economico" ? "Variação de Estoque" : isInverse ? "Inverso" : "Padrão",
          criterio: row.obs || "Dentro do Limite = A",
          notaManual: row.nota || "auto",
          calcNota: true,
          inverso: isInverse,
          auto: false,
        };

        if (existIdx !== -1) {
          sectorGroupList[existIdx] = {
            ...sectorGroupList[existIdx],
            comp: row.meta,
            real: row.real,
            notaManual: row.nota || sectorGroupList[existIdx].notaManual || "auto",
            tolerancia: row.tolerancia || sectorGroupList[existIdx].tolerancia,
            criterio: row.obs || sectorGroupList[existIdx].criterio,
          };
        } else {
          sectorGroupList.push(newKpiObj);
        }

        copy[sid][group] = sectorGroupList;

        const recordDate = row.data || new Date().toLocaleDateString("pt-BR");
        const recordSemana = row.semana || "S4";
        const calculatedNota = calcCopilNota(newKpiObj);

        if (authLoading || !fbUser) return;
        FirebaseService.upsert("historico_consolidado", {
          data: recordDate,
          hora: new Date().toLocaleTimeString("pt-BR"),
          semana: recordSemana,
          setorId: sid,
          capacidadeAbertura: 1000,
          eficienciaSla: 95,
          auditoria5s: 90,
          reprocessoRate: 0.5,
          segurancaBsi: 100,
          statusGeral: calculatedNota,
          obs: row.obs || `Importado via planilha. KPI: ${row.kpi}`,
        }).catch((err) => console.error("Database save failed:", err));
      });

      addAudit(currentUser, "Importação Planilha COPIL", `${validRows.length} linhas`, "Sucesso");
      return copy;
    });
  };

  const handleToggleSeguranca = (index: number) => {
    setSetores((prev) => {
      const copy = [...prev];
      const prevVal = copy[index].infracaoSeguranca;
      const updated = { ...copy[index], infracaoSeguranca: !prevVal };
      copy[index] = updated;
      addAudit(currentUser, "Segurança Setor", copy[index].id, !prevVal, prevVal);
      FirebaseService.upsertRecord("setores", updated).catch((err) =>
        console.error("Failed to upsert sector safety:", err)
      );
      return copy;
    });
  };

  // REGEX AI COPIL TERMINAL COMMANDS
  const handleTerminalCommand = (cmd: string) => {
    if (!cmd) return;

    setTerminalLogs((prev) => [...prev, `> ${cmd}`]);

    const helpMatch = cmd.match(/^\/ajuda/i);
    const setAtivMatch = cmd.match(/^\/setor\s+(\d+)\s+ativ\s+(\d+)/i);
    const setUphMatch = cmd.match(/^\/setor\s+(\d+)\s+uph\s+(\d+)/i);
    const alertMatch = cmd.match(/^\/alerta\s+(.+)/i);
    const reaproMatch = cmd.match(/^\/reaproveitar/i);
    const suggestMatch = cmd.match(/^\/sugerir/i);

    if (helpMatch) {
      setTerminalLogs((prev) => [
        ...prev,
        "COMANDOS DISPONÍVEIS:",
        "  /setor [id] ativ [val]  - Ajusta ATIV do setor",
        "  /setor [id] uph [val]   - Ajusta UPH do setor",
        "  /alerta [mensagem]       - Dispara alerta operacional",
        "  /reaproveitar           - Limpa volumetria e re-aloca",
        "  /sugerir                - Diagnóstico IA de Gargalos",
      ]);
    } else if (setAtivMatch) {
      const sid = setAtivMatch[1];
      const val = parseInt(setAtivMatch[2]);
      if (setores.some((s) => s.id === sid)) {
        handleUpdateSetorProd(sid, "ativ", val);
        setTerminalLogs((prev) => [...prev, `[Sucesso] Setor S${sid} ATIV definido para ${val}.`]);
      } else {
        setTerminalLogs((prev) => [...prev, `[Erro] Setor S${sid} não cadastrado.`]);
      }
    } else if (setUphMatch) {
      const sid = setUphMatch[1];
      const val = parseInt(setUphMatch[2]);
      if (setores.some((s) => s.id === sid)) {
        handleUpdateSetorProd(sid, "uph", val);
        setTerminalLogs((prev) => [...prev, `[Sucesso] Setor S${sid} UPH definido para ${val}.`]);
      } else {
        setTerminalLogs((prev) => [...prev, `[Erro] Setor S${sid} não cadastrado.`]);
      }
    } else if (alertMatch) {
      const msg = alertMatch[1];
      const newAlert: AlertLog = {
        id: `alt-${Date.now()}`,
        titulo: "Mensagem do Console",
        descricao: msg,
        setor: activeSectorId,
        prioridade: "critica",
        lido: false,
        hora: new Date().toISOString(),
      };
      setAlerts((a) => [newAlert, ...a]);
      setTerminalLogs((prev) => [...prev, "[Notificação] Alerta disparado com prioridade máxima."]);
    } else if (reaproMatch) {
      setSetores((prev) =>
        prev.map((s) => ({
          ...s,
          uph: Math.round(s.uph * 1.15),
          promessa: 100,
        }))
      );
      setTerminalLogs((prev) => [
        ...prev,
        "[REAPRO] Ajustado fluxo logístico. Eficiência de todos os setores incrementada em 15%.",
      ]);
    } else if (suggestMatch) {
      const bottleneck = setores.reduce((min, s) => (s.uph < min.uph ? s : min), setores[0]);
      setTerminalLogs((prev) => [
        ...prev,
        `[IA Copil] DIAGNÓSTICO DE FLUXO EM TEMPO REAL:`,
        `  - Maior gargalo ativo detectado no Setor S${bottleneck.id} (${bottleneck.uph} UPH).`,
        `  - Sugestão: Transferir operadores adicionais (Poli) para equilibrar o escoamento.`,
        `  - Alerta: Certifique-se de que a auditoria 5S está em conformidade (${bottleneck.nota5s}%).`,
      ]);
    } else {
      setTerminalLogs((prev) => [...prev, `[Erro] Comando não identificado. Digite /ajuda.`]);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;
    handleTerminalCommand(cmd);
    setTerminalInput("");
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === UserRole.Admin) {
      setCurrentUser("Admin");
    } else if (role === UserRole.Coordenador) {
      setCurrentUser("Coordenador");
    } else if (role === UserRole.Operador) {
      setCurrentUser("Operador");
    } else {
      setCurrentUser("Guest");
    }
    addAudit("Sistema", "Acesso", "Perfil", role);
  };

  // --- AUTH SEAMLESS GATE ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-zinc-500 text-xs font-black tracking-widest uppercase">
            Inicializando Segurança...
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-black/40 border border-red-500/30 p-8 rounded-2xl text-center max-w-md backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <span className="text-red-500 text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
            Erro de Autenticação
          </h2>
          <p className="text-zinc-400 text-sm mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/10"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  if (!fbUser) {
    return (
      <LoginScreen
        onAuthSuccess={async (user, profile) => {
          setFbUser(user);
          if (profile) {
            setCurrentUser(profile.nome);
            setCurrentRole(profile.role);
            setCurrentStatus(profile.situacao);
          } else {
            const p = (await getUserProfile(user.uid)) || (await ensureUserProfile(user));
            if (p) {
              setCurrentUser(p.nome);
              setCurrentRole(p.role);
              setCurrentStatus(p.situacao);
            } else {
              setCurrentUser(user.displayName || user.email || "Usuário");
              setCurrentRole(UserRole.Consulta);
              setCurrentStatus("Pendente");
            }
          }
        }}
      />
    );
  }

  if (currentStatus === "Pendente") {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-black/40 border border-amber-500/30 p-8 rounded-2xl text-center max-w-md backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <span className="text-amber-500 text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
            Acesso Pendente
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Seu cadastro foi realizado com sucesso e está aguardando aprovação de um Administrador.
            Você será notificado quando seu acesso for liberado.
          </p>
          <button
            onClick={() => auth.signOut()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/10 cursor-pointer"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col antialiased select-none font-sans relative overflow-hidden">
      {/* Background Matrix/Hex grid details */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none"></div>

      {/* HEADER BAR */}
      <HeaderBar
        timeState={timeState}
        activeSectorId={activeSectorId}
        setActiveSectorId={setActiveSectorId}
        setores={setores}
        currentUser={currentUser}
        currentRole={currentRole}
        notifications={notifications}
        setNotifications={setNotifications}
        showNotificationDropdown={showNotificationDropdown}
        setShowNotificationDropdown={setShowNotificationDropdown}
        supabaseOnline={supabaseOnline}
        checkingSupabase={checkingSupabase}
        verifySupabaseConnection={verifySupabaseConnection}
        handleRoleChange={handleRoleChange}
        onLogout={logoutUser}
        addAudit={addAudit}
        fbUser={fbUser}
      />

      {/* TOP COMMAND NAVIGATION PANEL */}
      <NavigationPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        pendingUsersCount={pendingUsers.length}
      />

      {/* CORE WRAPPER */}
      <div className="flex-1 flex flex-col">
        {/* CONTENT STAGE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24">
          {activeTab === "radar_lojas_live" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
              ]}
            >
              <RadarLojasTab
                currentRole={currentRole}
                onSaveRadar={handleSaveRadar}
                activeSectorId={activeSectorId}
              />
            </ProtectedRoute>
          )}

          {activeTab === "dashboard" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]}
            >
              <DashboardTab
                setores={setores}
                referentesSemana={referentesSemana}
                colaboradores={colaboradores}
                radar={radar}
                reaproData={reaproData}
                bolsaoData={bolsaoData}
                copilData={copilData}
                copilActiveSector={activeSectorId}
                setCopilActiveSector={setActiveSectorId}
                onToggleSeguranca={handleToggleSeguranca}
                onSaveRadar={handleSaveRadar}
                onSaveBolsao={setBolsaoData}
                onSaveReapro={setReaproData}
                terminalLogs={terminalLogs}
                onTerminalCommand={handleTerminalCommand}
                currentRole={currentRole}
                historico={historico}
                capacidade={capacidade}
                onUpdateSetor={handleUpdateSetorField}
              />
            </ProtectedRoute>
          )}

          {activeTab === "executivo" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]}
            >
              <ExecutivoTab
                setores={setoresFluctuated}
                capacidade={capacidade}
                alerts={alerts}
                historico={historico}
                copilData={copilData}
                calcCopilNota={calcCopilNota}
              />
            </ProtectedRoute>
          )}

          {activeTab === "analytics" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]}
            >
              <AnalyticsTab setores={setoresFluctuated} historico={historico} />
            </ProtectedRoute>
          )}

          {activeTab === "capacidade" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
              ]}
            >
              <CapacidadeTab
                setores={setores}
                colaboradores={colaboradores}
                capacidade={capacidade}
                onUpdateCapacidade={handleUpdateCapacidade}
              />
            </ProtectedRoute>
          )}

          {activeTab === "produtividade" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
              ]}
            >
              <ProdutividadeTab
                setores={setores}
                colaboradores={colaboradores}
                activeSectorId={activeSectorId}
                setActiveSectorId={setActiveSectorId}
                onUpdateSetorProd={handleUpdateSetorProd}
                onUpdateColaboradorStatus={handleUpdateColaboradorStatus}
                onUpdateColaboradorHoras={handleUpdateColaboradorHoras}
                onGravarTurno={handleGravarTurno}
              />
            </ProtectedRoute>
          )}

          {activeTab === "apresentacao" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
                UserRole.Consulta,
                UserRole.Guest,
              ]}
            >
              <ApresentacaoAtividadeTab
                setores={setores}
                activeSectorId={activeSectorId}
                onChangeSector={setActiveSectorId}
              />
            </ProtectedRoute>
          )}

          {activeTab === "override" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
              ]}
            >
              <OverrideTab
                setores={setores}
                onUpdateSetor={handleUpdateSetorProd}
                currentUser={currentUser}
              />
            </ProtectedRoute>
          )}

          {activeTab === "copil" && (
            <ProtectedRoute
              userRole={currentRole}
              allowedRoles={[
                UserRole.Admin,
                UserRole.Coordenador,
                UserRole.Operador,
                UserRole.Operacao,
                UserRole.Expedicao,
              ]}
            >
              <CopilTab
                setores={setores}
                currentRole={currentRole}
                activeSectorId={activeSectorId}
                setActiveSectorId={setActiveSectorId}
              />
            </ProtectedRoute>
          )}

          {activeTab === "equipa" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <EquipaTab
                colaboradores={colaboradores}
                setores={setores}
                onAddColaborador={handleAddColaborador}
                onUpdateColaborador={handleUpdateColaborador}
                onRemoveColaborador={handleRemoveColaborador}
                onUpdateColaboradorStatus={handleUpdateColaboradorStatus}
                onUpdateColaboradorHoras={handleUpdateColaboradorHoras}
                onSetColaboradores={handleSetColaboradores}
                currentRole={currentRole}
              />
            </ProtectedRoute>
          )}

          {activeTab === "historico" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <HistoricoTab
                historico={historico}
                onClearHistorico={() => {
                  setHistorico([]);
                  if (authLoading || !fbUser) return;
                  FirebaseService.deleteRecord("historico_consolidado", {})
                    .then(() => {
                      addAudit(currentUser, "Limpar Histórico", "Todos", "Apagados");
                    })
                    .catch((err) =>
                      console.error("Failed to clear consolidated history on DB:", err)
                    );
                }}
                currentRole={currentRole}
              />
            </ProtectedRoute>
          )}

          {activeTab === "alerts" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <AlertasTab
                alerts={alerts}
                onMarkAlertLido={handleMarkAlertLido}
                onClearOldAlerts={() => setAlerts([])}
              />
            </ProtectedRoute>
          )}

          {activeTab === "audit" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <AuditoriaTab audit={audit} />
            </ProtectedRoute>
          )}

          {activeTab === "relatorios" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <RelatoriosTab setores={setores} coordenador={currentUser} />
            </ProtectedRoute>
          )}

          {activeTab === "conexoes" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]}>
              <ConexoesTab />
            </ProtectedRoute>
          )}

          {activeTab === "config" && (
            <ProtectedRoute userRole={currentRole} allowedRoles={[UserRole.Admin]}>
              <ConfigTab
                setores={setores}
                colaboradores={colaboradores}
                referentesSemana={referentesSemana}
                screensaver={screensaver}
                coordenador={currentUser}
                fotoCoordenador=""
                onSaveRadar={handleSaveRadar}
                onUpdateReferente={(idx, field, val) => {
                  setReferentesSemana((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], [field]: val };
                    FirebaseService.upsertRecord("escalas_referentes", copy[idx], "dia" as any)
                      .catch((err) => console.error("Failed to persist referente:", err));
                    return copy;
                  });
                }}
                onAddReferente={() => {
                  setReferentesSemana((prev) => {
                    const newRec = { dia: "segunda", ref87: "Novo Líder", refVol: "Apoio Volumoso" };
                    FirebaseService.upsertRecord("escalas_referentes", newRec as any, "dia" as any)
                      .catch((err) => console.error("Failed to persist new referente:", err));
                    return [...prev, newRec];
                  });
                }}
                onRemoveReferente={(idx) => {
                  setReferentesSemana((prev) => {
                    const rec = prev[idx];
                    if (rec && rec.dia) {
                      FirebaseService.deleteRecord("escalas_referentes", rec.dia, "dia")
                        .catch((err) => console.error("Failed to delete referente:", err));
                    }
                    return prev.filter((_, i) => i !== idx);
                  });
                }}
                onAddSetor={async (id, resp, foto) => {
                  const numero = parseInt(id.replace(/\D/g, "")) || 0;
                  const newSec: Setor = {
                    id,
                    numero,
                    nome: id.toUpperCase() === 'E-LOG' ? 'E-LOG' : `Setor ${id}`,
                    resp,
                    ativ: 0,
                    uph: 0,
                    promessa: 100,
                    nota5s: 100,
                    bsi: 100,
                    reproTotal: 0,
                    errosPicking: 0,
                    horasDKT: 0,
                    poliRec: 0,
                    rdl: 0,
                    poliSaid: 0,
                    coletado: 0,
                    varFin: 0,
                    infracaoSeguranca: false,
                    fotoLider: foto,
                    situacao: "Ativo",
                    meta: 0,
                  };
                  
                  // Atomic insert for both Setor and Capacidade via Supabase 
                  // using 'setor' as the unique conflict target for Capacidade
                  try {
                    await FirebaseService.upsertRecord('setores', newSec, 'id');
                    const newCap = { id, setor: id, abertura: 0, fechoHora: 0 };
                    await FirebaseService.upsertRecord('capacidade', newCap, 'setor');
                    
                    // Optimistic update
                    setSetores((prev) => [...prev, newSec]);
                  } catch (err) {
                    console.error("Error creating new sector & capacity:", err);
                    alert("Erro ao criar o setor no servidor.");
                  }
                }}
                onRemoveSetor={(idx) => {
                  setSetores((prev) => prev.filter((_, i) => i !== idx));
                }}
                onUpdateSetor={(sid, field, val) => {
                  setSetores((prev) =>
                    prev.map((s) => (s.id === sid ? { ...s, [field]: val } : s))
                  );
                }}
                onUpdateSetorProd={handleUpdateSetorProd}
                onUpdateCoordenador={(nome) => {
                  setCurrentUser(nome);
                }}
                onUpdateScreensaver={(cfg) => {
                  setScreensaver(cfg);
                  alert("Configuração da tela de descanso gravada.");
                }}
                onExportBackup={() => {
                  const dataStr =
                    "data:text/json;charset=utf-8," +
                    encodeURIComponent(
                      JSON.stringify({
                        setores,
                        colaboradores,
                        capacidade,
                        universos,
                        alerts,
                        audit,
                        historico,
                        referentesSemana,
                        copilData,
                      })
                    );
                  const dlAnchorElem = document.createElement("a");
                  dlAnchorElem.setAttribute("href", dataStr);
                  dlAnchorElem.setAttribute("download", `backup_torre_comando_volumosos.json`);
                  dlAnchorElem.click();
                }}
                onImportBackup={(obj) => {
                  if (obj.setores) setSetores(obj.setores);
                  if (obj.colaboradores) setColaboradores(obj.colaboradores);
                  if (obj.capacidade) setCapacidade(obj.capacidade);
                  if (obj.universos) setUniversos(obj.universos);
                  if (obj.alerts) setAlerts(obj.alerts);
                  if (obj.audit) setAudit(obj.audit);
                  if (obj.historico) setHistorico(obj.historico);
                  if (obj.referentesSemana) setReferentesSemana(obj.referentesSemana);
                  if (obj.copilData) setCopilData(obj.copilData);
                  alert("Backup restaurado com sucesso!");
                }}
                onLogout={() => {
                  handleRoleChange(UserRole.Guest);
                }}
              />
            </ProtectedRoute>
          )}
        </main>
      </div>

      {/* FLOATING TERMINAL TOGGLE */}
      {currentRole === UserRole.Admin && (
        <TerminalDrawer
          showTerminal={showTerminal}
          setShowTerminal={setShowTerminal}
          terminalLogs={terminalLogs}
          terminalInput={terminalInput}
          setTerminalInput={setTerminalInput}
          handleTerminalSubmit={handleTerminalSubmit}
        />
      )}

      {/* TOAST NOTIFICATIONS CONTAINER */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <OperationToastContainer />

      {/* INACTIVITY SCREENSAVER CANVAS OVERLAY */}
      <ScreensaverOverlay
        isScreensaverActive={isScreensaverActive}
        setoresFluctuated={setoresFluctuated}
        setores={setores}
        timeState={timeState}
        currentUser={currentUser}
      />
    </div>
  );
}

export default function AppRoot() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
