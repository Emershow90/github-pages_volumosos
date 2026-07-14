/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Setor,
  Colaborador,
  CapacidadeSetor,
  AlertLog,
  AuditLog,
  HistoricoRegistro,
  ReferenteSemana,
  ScreensaverConfig,
  UserRole,
  ColaboradorStatus,
  CopilSetor,
  RadarLoja,
  ReaproData,
  BolsaoData,
} from "./types";
import {
  initialSetores,
  initialColaboradores,
  initialCapacidade,
  initialUniversos,
  initialReferentesSemana,
  initialCopil,
  initialSystemState,
  initialRadar,
  initialReapro,
  initialBolsao,
} from "./initialData";

// Components
import { DashboardTab } from "./components/DashboardTab";
import { ExecutivoTab, AnalyticsTab } from "./components/ExecutiveAndAnalyticsTabs";
import {
  CapacidadeTab,
  ProdutividadeTab,
  MixTab,
  CopilTab,
} from "./components/TransactionalAndOperationalTabs";
import {
  EquipaTab,
  HistoricoTab,
  AlertasTab,
  AuditoriaTab,
  RelatoriosTab,
  ConfigTab,
} from "./components/AdminAndSupportTabs";
import { AdminApprovalTab } from "./components/AdminApprovalTab";
import { useUserStore } from "./stores/useUserStore";
import RadarLojasTab from "./components/RadarLojasTab";
import { useStoreOperations } from "./stores/useStoreOperations";
import { useSectorStore } from "./stores/useSectorStore";
import { useHistoryStore } from "./stores/useHistoryStore";
import { useCollaboratorStore } from "./stores/useCollaboratorStore";
import { useUIStore } from "./stores/useUIStore";
import { realtimeSync } from "./services/realtimeSyncService";
import { SupabaseService as FirebaseService } from "./lib/supabaseService";

// --- AUTH & LOGIN INTEGRATION ---
import { auth, getUserProfile, ensureUserProfile, logoutUser, fetchWithAuth } from "./lib/supabaseAuth";
import LoginScreen from "./components/LoginScreen";

import { ProtectedRoute } from "./components/ProtectedRoute";
import {
  Activity,
  User,
  Shield,
  Bell,
  Terminal as TerminalIcon,
  Play,
  Moon,
  Volume2,
  FileText,
  Clock,
  Layers,
  BarChart,
  UserCheck,
  RotateCcw,
  Radio,
  ShieldAlert,
} from "lucide-react";

export default function App() {
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
    loadPendingUsers
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
      const { supabase, isStaticBuild } = await import('./lib/supabase');
      if (isStaticBuild || !supabase) {
        setSupabaseOnline(false);
        setCheckingSupabase(false);
        return;
      }
      
      const checkPromise = supabase.from('usuarios').select('id').limit(1);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000));
      
      await Promise.race([checkPromise, timeoutPromise]);
      setSupabaseOnline(true);
      console.log('✅ [Supabase Connection Log] Supabase está acessível e online.');
    } catch (err) {
      console.warn('❌ [Supabase Connection Log] Erro ou timeout ao conectar com o Supabase:', err);
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

    // Timeout de segurança: se o Supabase Auth não responder em 8s,
    // sai do estado de loading e mostra um erro explícito em vez de travar para sempre.
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
        // Callback de erro do próprio onAuthStateChanged (ex: configuração inválida do Supabase)
        resolved = true;
        clearTimeout(timeoutId);
        console.error("[Supabase Auth Error]", error);
        setAuthError(`Erro do Supabase Auth: ${error.message}`);
        setAuthLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Listen for active user's status changes in database to fire toast and update page layout
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
    setBolsaoData
  } = useSectorStore();

  const {
    historico,
    setHistorico,
    alerts,
    setAlerts,
    audit,
    setAudit
  } = useHistoryStore();

  const {
    colaboradores,
    setColaboradores
  } = useCollaboratorStore();

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
    setScreensaver
  } = useUIStore();

  const [isScreensaverActive, setIsScreensaverActive] = useState<boolean>(false);
  const [ticker, setTicker] = useState(0);

  // Unified fluctuation selector (No state duplication!)
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
    try {
      const s = localStorage.getItem("sys_referentes");
      return s ? JSON.parse(s) : initialReferentesSemana;
    } catch {
      return initialReferentesSemana;
    }
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 10000);
    return () => clearInterval(clockTimer);
  }, []);

  // Multi-site & Notifications States
  const [currentSite, setCurrentSite] = useState<string>(() => {
    return localStorage.getItem("sys_active_site") || "Campinas";
  });

  // Zustand Operations Store for Radar live sync
  const operations = useStoreOperations((state) => state.operations);

  // Real-time synchronization for store operations, sectors, collaborators & live radar syncing
  useEffect(() => {
    if (!fbUser?.uid) {
      realtimeSync.stopAll();
      return;
    }

    // Start listening in real-time to programming day: 2026-07-05
    const targetDate = "2026-07-05";
    realtimeSync.startListeningProgramacao(targetDate);
    realtimeSync.startListeningAtividades(targetDate);
    realtimeSync.startListeningSetores();
    realtimeSync.startListeningColaboradores();

    return () => {
      realtimeSync.stopAll();
    };
  }, [fbUser?.uid]);

  // Synchronize radar with store_operations in real-time
  useEffect(() => {
    const opsList = Object.values(operations);
    if (opsList.length > 0) {
      const mapped = opsList.map(op => ({
        corte: op.corte,
        loja: `${op.lojaId} - ${op.nomeLoja}`,
        vol: op.volumes,
        ativ: op.enderecos,
        prog: op.statusColeta === 'Coletada' ? 100 : (op.statusColeta === 'Em andamento' ? 50 : 0)
      }));
      setRadar(mapped);
      localStorage.setItem(`sys_radar_${currentSite}`, JSON.stringify(mapped));
    }
  }, [operations, currentSite]);



  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const addNotification = (title: string, desc: string, type: "info" | "success" | "warning" | "danger" = "info") => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR").slice(0, 5);
    const newNotif = {
      id: Math.random().toString(),
      title,
      desc,
      time: formattedTime,
      type,
      read: false,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 25);
      localStorage.setItem("sys_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to load site-specific data
  const loadSiteData = (site: string) => {
    try {
      const sSetores = localStorage.getItem(`sys_setores_${site}`);
      const sRadar = localStorage.getItem(`sys_radar_${site}`);
      const sColab = localStorage.getItem(`sys_colaboradores_${site}`);
      const sCopil = localStorage.getItem(`sys_copil_${site}`);
      
      if (sSetores) {
        setSetores(JSON.parse(sSetores));
      } else {
        let baseSetores = JSON.parse(JSON.stringify(initialSetores)) as Setor[];
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
        localStorage.setItem(`sys_setores_${site}`, JSON.stringify(baseSetores));
      }

      if (sRadar) {
        setRadar(JSON.parse(sRadar));
      } else {
        let baseRadar = JSON.parse(JSON.stringify(initialRadar)) as RadarLoja[];
        if (site === "Extrema") {
          baseRadar[0].loja = "2722 - EXTREMA MALL";
          baseRadar[1].loja = "2360 - POUSO ALEGRE";
        } else if (site === "Recife") {
          baseRadar[0].loja = "2722 - RECIFE SHOPPING";
          baseRadar[1].loja = "2360 - OLINDA CENTRO";
        }
        setRadar(baseRadar);
        localStorage.setItem(`sys_radar_${site}`, JSON.stringify(baseRadar));
      }

      if (sColab) {
        setColaboradores(JSON.parse(sColab));
      } else {
        setColaboradores(initialColaboradores);
        localStorage.setItem(`sys_colaboradores_${site}`, JSON.stringify(initialColaboradores));
      }

      if (sCopil) {
        setCopilData(JSON.parse(sCopil));
      } else {
        setCopilData(initialCopil);
        localStorage.setItem(`sys_copil_${site}`, JSON.stringify(initialCopil));
      }
    } catch (e) {
      console.error("Error loading site-specific data:", e);
    }
  };

  // Run on mount or site changes
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
          FirebaseService.upsertRecord('setores', updated).catch(err => console.error("Failed to upsert sector:", err));
          return updated;
        }
        return s;
      })
    );
  };

  const lastActivityRef = useRef<number>(Date.now());

  // ---------------------------------------------------------------------------
  // TIMERS & BACKGROUND SIMULATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Clock updates
    const clockInt = setInterval(() => {
      const now = new Date();
      setTimeState({
        local: now.toLocaleTimeString("pt-BR"),
        utc: now.toISOString().slice(11, 19) + " UTC",
      });
    }, 1000);

    // Dynamic alert and notification simulation (no state duplication!)
    const simulationInt = setInterval(() => {
      if (!setores || setores.length === 0) return;
      const s = setores[Math.floor(Math.random() * setores.length)];

      // Randomly trigger safety or SLA alert
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

      // Randomly trigger notification simulation
      if (Math.random() > 0.85) {
        const types: ("info" | "success" | "warning" | "danger")[] = ["info", "success", "warning", "danger"];
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
            ...prev
          ].slice(0, 25);
          localStorage.setItem("sys_notifications", JSON.stringify(updated));
          return updated;
        });
      }
    }, 15000);

    return () => {
      clearInterval(clockInt);
      clearInterval(simulationInt);
    };
  }, [setores]);

  // ---------------------------------------------------------------------------
  // INACTIVITY / SCREENSAVER MONITOR
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // DATABASE SYNCHRONIZATION (PostgreSQL Cloud SQL)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || !fbUser) {
      return;
    }

    let active = true;
    let abortController: AbortController | null = null;

    const fetchFromDb = async () => {
      // Cancel previous pending requests if they exist
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const signal = abortController.signal;

      try {
        // 1. Fetch weekly schedule
        const resEscala = await fetchWithAuth("/api/escala_semanal", { signal });
        if (resEscala.ok && active) {
          const dbEscala = await resEscala.json();
          if (dbEscala && dbEscala.length > 0) {
            const mappedEscala = dbEscala.map((item: any) => ({
              dia: item.dia,
              ref87: item.referente_sb7 || "",
              refVol: item.referente_volumosos || "",
              apoios: item.apoio || "",
            }));
            setReferentesSemana((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(mappedEscala)) {
                return mappedEscala;
              }
              return prev;
            });
          }
        }

        // 2. Fetch coordinator / leadership
        const resLideranca = await fetchWithAuth("/api/lideranca", { signal });
        if (resLideranca.ok && active) {
          const dbLider = await resLideranca.json();
          if (dbLider && dbLider.nome) {
            if (currentUser !== dbLider.nome) {
              setCurrentUser(dbLider.nome);
            }
          }
        }

        // 3. Fetch audit logs from database
        const resAudit = await fetchWithAuth("/api/audit_logs", { signal });
        if (resAudit.ok && active) {
          const dbAudit = await resAudit.json();
          if (dbAudit) {
            const mappedAudit = dbAudit.map((a: any) => {
              let campo = "";
              let valorAnterior: any = null;
              let valorNovo: any = null;
              let dispositivo = "TOWER_OS_CONSOLE";

              try {
                if (a.alteracao && a.alteracao.startsWith("{")) {
                  const parsed = JSON.parse(a.alteracao);
                  campo = parsed.campo || "";
                  valorAnterior = parsed.valorAnterior;
                  valorNovo = parsed.valorNovo;
                  dispositivo = parsed.dispositivo || "TOWER_OS_CONSOLE";
                } else {
                  campo = "Ação Geral";
                  valorNovo = a.alteracao || "";
                }
              } catch {
                campo = "Ação Geral";
                valorNovo = a.alteracao || "";
              }

              return {
                id: `aud-db-${a.id}`,
                data: a.data || new Date().toISOString(),
                usuario: a.usuario || "Sistema",
                acao: a.tabela || "Geral",
                campo,
                valorAnterior,
                valorNovo,
                dispositivo,
              };
            });

            setAudit((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(mappedAudit)) {
                return mappedAudit;
              }
              return prev;
            });
          }
        }

        // 4. Fetch consolidated history from database
        const resConsolidado = await fetchWithAuth("/api/historico_consolidado", { signal });
        if (resConsolidado.ok && active) {
          const dbConsolidado = await resConsolidado.json();
          if (dbConsolidado) {
            const mappedConsolidado = dbConsolidado.map((h: any) => ({
              data: h.dataRegistro,
              hora: h.hora,
              semana: h.semana,
              turno: h.turno,
              setor: h.setor,
              ativ: h.ativ,
              uph: h.uph,
              repro: h.repro,
              promessa: parseFloat(h.promessa),
              nota5s: parseFloat(h.nota5s),
              erros: parseFloat(h.erros),
            }));

            setHistorico((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(mappedConsolidado)) {
                return mappedConsolidado;
              }
              return prev;
            });
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Silent on Abort
        }
        console.error("Database sync fetch failed:", err);
      }
    };

    fetchFromDb();

    // Poll every 5 seconds for real-time synchronization across devices (with AbortController cancellation)
    const interval = setInterval(fetchFromDb, 30000);
    return () => {
      active = false;
      clearInterval(interval);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [fbUser, authLoading]);

  // ---------------------------------------------------------------------------
  // AUTO PERSISTENCE SYNC EFFECTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem("current_user", currentUser);
    if (authLoading || !fbUser) return;
    if (currentUser) {
      fetchWithAuth("/api/lideranca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: currentUser, foto: "" }),
      }).catch((err) => console.error("Failed to push coordinator to DB:", err));
    }
  }, [currentUser, fbUser, authLoading]);

  useEffect(() => {
    localStorage.setItem("current_role", currentRole);
    localStorage.setItem("current_status", currentStatus);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem("active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("active_sector_id", activeSectorId);
  }, [activeSectorId]);

  useEffect(() => {
    localStorage.setItem("screensaver_config", JSON.stringify(screensaver));
  }, [screensaver]);

  useEffect(() => {
    localStorage.setItem("sys_setores", JSON.stringify(setores));
    if (authLoading || !fbUser) return;
    if (setores && setores.length > 0) {
      fetchWithAuth("/api/setores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setores),
      }).catch((err) => console.error("Failed to push sectors to DB:", err));
    }
  }, [setores, fbUser, authLoading]);

  useEffect(() => {
    localStorage.setItem("sys_colaboradores", JSON.stringify(colaboradores));
  }, [colaboradores]);

  useEffect(() => {
    localStorage.setItem("sys_capacidade", JSON.stringify(capacidade));
  }, [capacidade]);

  useEffect(() => {
    localStorage.setItem("sys_universos", JSON.stringify(universos));
  }, [universos]);

  useEffect(() => {
    localStorage.setItem("sys_referentes", JSON.stringify(referentesSemana));
    if (authLoading || !fbUser) return;
    if (referentesSemana && referentesSemana.length > 0) {
      fetchWithAuth("/api/escala_semanal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referentesSemana),
      }).catch((err) => console.error("Failed to push schedule to DB:", err));
    }
  }, [referentesSemana, fbUser, authLoading]);

  useEffect(() => {
    localStorage.setItem("sys_copil", JSON.stringify(copilData));
  }, [copilData]);

  useEffect(() => {
    localStorage.setItem("sys_radar", JSON.stringify(radar));
  }, [radar]);

  useEffect(() => {
    localStorage.setItem("sys_reapro", JSON.stringify(reaproData));
  }, [reaproData]);

  useEffect(() => {
    localStorage.setItem("sys_bolsao", JSON.stringify(bolsaoData));
  }, [bolsaoData]);

  useEffect(() => {
    localStorage.setItem("sys_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("sys_audit", JSON.stringify(audit));
  }, [audit]);

  useEffect(() => {
    localStorage.setItem("sys_historico", JSON.stringify(historico));
  }, [historico]);

  // ---------------------------------------------------------------------------
  // CORE DISPATCHERS & STATE WRITERS
  // ---------------------------------------------------------------------------
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
      ...logData
    };
    setAudit((prev) => [...prev, newLog]);

    // Save to PostgreSQL automatically if authenticated
    if (authLoading || !fbUser) return;
    fetchWithAuth("/api/audit_logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData)
    }).catch(err => console.error("Failed to automatically save audit log to DB:", err));
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
          FirebaseService.upsertRecord('setores', updated).catch(err => console.error("Failed to upsert sector:", err));
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
      FirebaseService.upsertRecord('colaboradores', updated).catch(err => console.error("Failed to upsert collaborator:", err));
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
      FirebaseService.upsertRecord('colaboradores', updated).catch(err => console.error("Failed to upsert collaborator:", err));
      return copy;
    });
  };

  const handleAddColaborador = (col: Colaborador) => {
    setColaboradores((prev) => [...prev, col]);
    addAudit(currentUser, "Criar Colaborador", col.nome, col.setor);
    FirebaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to upsert collaborator:", err));
  };

  const handleUpdateColaborador = (index: number, col: Colaborador) => {
    setColaboradores((prev) => {
      const copy = [...prev];
      copy[index] = col;
      addAudit(currentUser, "Editar Colaborador", col.nome, col.setor);
      FirebaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to upsert collaborator:", err));
      return copy;
    });
  };

  const handleRemoveColaborador = (index: number) => {
    const col = colaboradores[index];
    setColaboradores((prev) => prev.filter((_, i) => i !== index));
    addAudit(currentUser, "Remover Colaborador", col.nome, "Apagado");
    FirebaseService.deleteRecord('colaboradores', col.id).catch(err => console.error("Failed to delete collaborator:", err));
  };

  const handleSetColaboradores = async (cols: Colaborador[]) => {
    setColaboradores(cols);
    for (const col of cols) {
      FirebaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to batch upsert collaborator:", err));
    }
  };

  const handleSaveRadar = React.useCallback(async (newRadar: RadarLoja[]) => {
    setRadar(newRadar);
    
    // Push the changes to Firestore store_operations to keep them in perfect sync!
    const currentOps = useStoreOperations.getState().operations;
    for (const r of newRadar) {
      const parts = r.loja.split(" - ");
      const lojaId = parts[0] || `LJ`;
      const nomeLoja = parts[1] || `Loja ${lojaId}`;
      const opId = `op-${lojaId}-${r.corte}`;
      
      let statusColeta: 'Não iniciada' | 'Em andamento' | 'Coletada' = 'Não iniciada';
      if (r.prog === 100) statusColeta = 'Coletada';
      else if (r.prog > 0) statusColeta = 'Em andamento';
      
      const existing = currentOps[opId];
      const updatedOp = {
        id: opId,
        programacaoId: existing?.programacaoId || "2026-07-05", // Default targetDate
        lojaId,
        nomeLoja,
        setor: existing?.setor || 'S87',
        transportadora: existing?.transportadora || 'MOBI',
        corte: r.corte,
        carregamento: existing?.carregamento || '15:00',
        volumes: r.vol,
        enderecos: r.ativ,
        statusSoltura: existing?.statusSoltura || 'Solta',
        horarioSoltura: existing?.horarioSoltura || null,
        soltoPor: existing?.soltoPor || null,
        statusColeta,
        horarioColeta: existing?.horarioColeta || null,
        coletadoPor: existing?.coletadoPor || null,
        statusCarregamento: existing?.statusCarregamento || (r.prog === 100 ? 'Carregada' : 'Não carregada'),
        horarioCarregamento: existing?.horarioCarregamento || null,
        carregadoPor: existing?.carregadoPor || null,
        statusExpedicao: existing?.statusExpedicao || 'Pendente',
        perdeuCorte: existing?.perdeuCorte || false,
        updated_at: new Date().toISOString(),
        updated_by: currentUser || 'Sistema'
      };
      
      await FirebaseService.upsertRecord('store_operations', updatedOp).catch(err => 
        console.error("Failed to upsert store operation from radar edit:", err)
      );
    }
  }, [currentUser, setRadar]);

  const handleMarkAlertLido = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, lido: true } : a))
    );
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

    // Save to PostgreSQL automatically if authenticated
    if (authLoading || !fbUser) {
      addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
      alert(`Turno S${s.id} gravado localmente (sincronização offline).`);
      return;
    }

    fetchWithAuth("/api/historico_consolidado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReg)
    })
    .then(() => {
      addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
      alert(`Turno S${s.id} gravado no histórico com sucesso!`);
    })
    .catch(err => {
      console.error("Failed to automatically save turn consolidation to DB:", err);
      addAudit(currentUser, "Consolidação Turno", `Setor ${s.id}`, s.ativ);
      alert(`Turno S${s.id} gravado localmente (erro ao sincronizar com banco de dados).`);
    });
  };

  // ---------------------------------------------------------------------------
  // COPIL DYNAMIC KPI COMPUTING (SaaS Standard A, B, C, D)
  // ---------------------------------------------------------------------------
  const calcCopilNota = (row: any): string => {
    // If there is a manual note override, respect it immediately
    if (row.notaManual && ["A", "B", "C", "D"].includes(row.notaManual)) {
      return row.notaManual;
    }

    let ratioVal = -1;

    // Check if it is an auto KPI or contains specific keywords
    if (row.auto) {
      const s = setores.find((x) => x.id === activeSectorId) || setores[0];
      const kpiLower = row.kpi.toLowerCase();
      
      if (kpiLower.includes("volume") || kpiLower.includes("produtividade")) {
        const cap = capacidade.find((c) => c.id === s.id) || { abertura: 1000 };
        const calculatedVal = cap.abertura > 0 ? (s.ativ / cap.abertura) : 0;
        const meta = parseFloat(row.comp) || 1.0;
        ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
      }
      else if (kpiLower.includes("promessa") || kpiLower.includes("sla") || kpiLower.includes("eficiência")) {
        const calculatedVal = s.promessa / 100;
        const meta = (parseFloat(row.comp) || 95) / 100;
        ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
      }
      else if (kpiLower.includes("5s") || kpiLower.includes("auditoria") || kpiLower.includes("área")) {
        const calculatedVal = s.nota5s / 100;
        const meta = (parseFloat(row.comp) || 90) / 100;
        ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
      }
      else if (kpiLower.includes("reprocesso") || kpiLower.includes("erro")) {
        const realReproRate = s.ativ > 0 ? (s.reproTotal || 0) / s.ativ : 0;
        const metaReproRate = (parseFloat(row.comp) || 1.0) / 100;
        ratioVal = realReproRate <= metaReproRate ? 1.0 : (realReproRate === 0 ? 0 : metaReproRate / realReproRate);
      }
      else if (kpiLower.includes("segurança") || kpiLower.includes("bsi")) {
        const calculatedVal = s.bsi / 100;
        const meta = (parseFloat(row.comp) || 98) / 100;
        ratioVal = meta > 0 ? calculatedVal / meta : calculatedVal;
      }
    }

    if (ratioVal === -1) {
      if (!row.comp || !row.real || String(row.comp).trim() === "" || String(row.real).trim() === "") {
        return "—";
      }

      const meta = parseFloat(row.comp);
      const real = parseFloat(row.real);

      if (isNaN(meta) || isNaN(real)) {
        return "—";
      }

      const isVariacaoEstoque = row.regraCalculo === "Variação de Estoque" || row.kpi.toLowerCase().includes("variação") || row.kpi.toLowerCase().includes("variacao");

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

      const isInverse = row.regraCalculo === "Inverso" || row.inverso || row.kpi.toLowerCase().includes("erro") || row.kpi.toLowerCase().includes("infraç") || row.kpi.toLowerCase().includes("infrac");
      if (isInverse) {
        ratioVal = real <= meta ? 1.0 : (real === 0 ? 0 : meta / real);
      } else {
        ratioVal = meta > 0 ? real / meta : 1.0;
      }
    }

    if (ratioVal >= 1.00) return "A";
    if (ratioVal >= 0.95) return "B";
    if (ratioVal >= 0.90) return "C";
    return "D";
  };

  const handleUpdateCopilKPI = (sid: string, group: string, kpiIdx: number, field: string, value: string) => {
    setCopilData((prev) => {
      const copy = { ...prev };
      const sector = { ...copy[sid] };
      const list = [...(sector[group as keyof CopilSetor] as any[])];
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
      const list = [...(sector[group as keyof CopilSetor] as any[])];
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
      const list = [...(sector[group as keyof CopilSetor] as any[])].filter((_, i) => i !== kpiIdx);
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
      localStorage.setItem("sys_copil", JSON.stringify(copy));
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
        if (kpiLower.includes("variação") || kpiLower.includes("estoque") || kpiLower.includes("demarca") || kpiLower.includes("economico") || kpiLower.includes("econômico")) {
          group = "economico";
        } else if (kpiLower.includes("segurança") || kpiLower.includes("seguranca") || kpiLower.includes("infração") || kpiLower.includes("infracao")) {
          group = "seguranca";
        }

        const sectorGroupList = [...copy[sid][group]];
        const existIdx = sectorGroupList.findIndex(k => k.kpi.toLowerCase() === row.kpi.toLowerCase());

        const isInverse = kpiLower.includes("erro") || kpiLower.includes("infraç") || kpiLower.includes("infrac") || kpiLower.includes("reprocesso");

        const newKpiObj = {
          kpi: row.kpi,
          comp: row.meta,
          real: row.real,
          tolerancia: row.tolerancia || row.meta,
          regraCalculo: group === "economico" ? "Variação de Estoque" : (isInverse ? "Inverso" : "Padrão"),
          criterio: row.obs || "Dentro do Limite = A",
          notaManual: row.nota || "auto",
          calcNota: true,
          inverso: isInverse,
          auto: false
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
        fetchWithAuth("/api/historico_consolidado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
            obs: row.obs || `Importado via planilha. KPI: ${row.kpi}`
          })
        }).catch(err => console.error("Database save failed:", err));
      });

      addAudit(currentUser, "Importação Planilha COPIL", `${validRows.length} linhas`, "Sucesso");
      localStorage.setItem("sys_copil", JSON.stringify(copy));
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
      FirebaseService.upsertRecord('setores', updated).catch(err => console.error("Failed to upsert sector safety:", err));
      return copy;
    });
  };

  // ---------------------------------------------------------------------------
  // REGEX AI COPIL TERMINAL COMMANDS
  // ---------------------------------------------------------------------------
  const handleTerminalCommand = (cmd: string) => {
    if (!cmd) return;

    setTerminalLogs((prev) => [...prev, `> ${cmd}`]);

    // Command matching
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
      // Trigger reapro
      setSetores((prev) =>
        prev.map((s) => ({
          ...s,
          uph: Math.round(s.uph * 1.15), // Increase efficiency 15%
          promessa: 100,
        }))
      );
      setTerminalLogs((prev) => [
        ...prev,
        "[REAPRO] Ajustado fluxo logístico. Eficiência de todos os setores incrementada em 15%.",
      ]);
    } else if (suggestMatch) {
      // Diagnostic suggestion based on current state
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

  // ---------------------------------------------------------------------------
  // ROLE GATE HELPER
  // ---------------------------------------------------------------------------
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
          <p className="text-zinc-500 text-xs font-black tracking-widest uppercase">Inicializando Segurança...</p>
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
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Erro de Autenticação</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {authError}
          </p>
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
            const p = await getUserProfile(user.uid) || await ensureUserProfile(user);
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
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Acesso Pendente</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Seu cadastro foi realizado com sucesso e está aguardando aprovação de um Administrador.
            Você será notificado quando seu acesso for liberado.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/10"
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
      <header className="header border-b border-white/5 bg-[#0b0b0d]/90 backdrop-blur-md sticky top-0 z-[50000] px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            T
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-1.5 leading-none">
              Torre de Comando <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-mono">OS V18.5</span>
            </h1>
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider leading-none mt-1">
              Volumosos &amp; S87 Real-Time Operating Console — WAR ROOM EDITION
            </p>
          </div>
        </div>

        {/* Real-Time clocks and profiles */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <p className="text-white font-black">{timeState.local || "00:00:00"}</p>
              <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Local Time</p>
            </div>
            <div className="h-6 w-[1px] bg-white/10"></div>
            <div className="text-right">
              <p className="text-sky-400 font-bold">{timeState.utc || "00:00:00 UTC"}</p>
              <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Global UTC</p>
            </div>
          </div>

          {/* Seletor de Setor para o Radar Live */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider hidden lg:inline">Setor:</span>
            <select
              value={activeSectorId}
              onChange={(e) => {
                const sector = e.target.value;
                setActiveSectorId(sector);
                localStorage.setItem("active_sector_id", sector);
                addAudit(currentUser, "Mudar Setor (Radar)", "Geral", sector);
              }}
              className="bg-[#0b0b0d] border border-white/10 rounded px-2 py-0.5 text-[10px] text-zinc-300 font-bold focus:outline-none cursor-pointer uppercase font-mono"
            >
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  Setor {s.id} — {s.resp.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className={`p-2 rounded-xl border transition-all duration-200 relative flex items-center justify-center cursor-pointer ${
                showNotificationDropdown
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                  : "bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
              }`}
              title="Notificações em Tempo Real"
            >
              <Bell size={14} />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-red-600 text-white text-[8px] font-black rounded-full shadow-[0_0_8px_rgba(220,38,38,0.6)] animate-pulse font-mono">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-[#0d0d11]/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[999999] overflow-hidden">
                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Central de Avisos
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotifications((prev) => {
                          const updated = prev.map((n) => ({ ...n, read: true }));
                          localStorage.setItem("sys_notifications", JSON.stringify(updated));
                          return updated;
                        });
                      }}
                      className="text-[8px] text-indigo-400 hover:text-indigo-300 font-bold uppercase"
                    >
                      Lidas
                    </button>
                    <span className="text-zinc-700 text-[8px]">•</span>
                    <button
                      onClick={() => {
                        setNotifications([]);
                        localStorage.removeItem("sys_notifications");
                      }}
                      className="text-[8px] text-zinc-500 hover:text-zinc-300 font-bold uppercase"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                      <Bell size={20} className="text-zinc-600 stroke-1" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Nenhum aviso no momento</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let typeColor = "bg-blue-400";
                      let bgTint = "bg-blue-400/5";
                      if (n.type === "success") {
                        typeColor = "bg-emerald-400";
                        bgTint = "bg-emerald-400/5";
                      } else if (n.type === "warning") {
                        typeColor = "bg-amber-400";
                        bgTint = "bg-amber-400/5";
                      } else if (n.type === "danger") {
                        typeColor = "bg-red-400";
                        bgTint = "bg-red-400/5";
                      }

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifications((prev) => {
                              const updated = prev.map((item) =>
                                item.id === n.id ? { ...item, read: true } : item
                              );
                              localStorage.setItem("sys_notifications", JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className={`p-3 transition-colors duration-150 text-left cursor-pointer hover:bg-white/[0.02] flex items-start gap-2.5 relative ${
                            !n.read ? "bg-white/[0.01]" : ""
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${typeColor} mt-1 flex-shrink-0`} />
                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-baseline gap-1">
                              <h4 className="text-[10px] font-bold text-white uppercase tracking-tight">{n.title}</h4>
                              <span className="text-[8px] text-zinc-500 font-mono font-bold">{n.time}</span>
                            </div>
                            <p className="text-[9px] text-zinc-400 leading-snug">{n.desc}</p>
                          </div>
                          {!n.read && (
                            <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Supabase Connection Indicator */}
          {fbUser && (
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5 font-mono text-[9px] font-bold">
              {checkingSupabase ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></span>
                  <span className="text-zinc-400 uppercase">Verificando Supabase...</span>
                </>
              ) : supabaseOnline === true ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <span className="text-emerald-400 uppercase">Supabase Conectado</span>
                </>
              ) : supabaseOnline === false ? (
                <button
                  onClick={verifySupabaseConnection}
                  title="Clique para tentar reconectar ao Supabase"
                  className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-all uppercase bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-500/30 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span>Supabase Indisponível (Reconectar)</span>
                </button>
              ) : null}
            </div>
          )}

          {/* Capability Gate Profile Switcher */}
          <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <div className="avatar w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-xs uppercase">
              {currentUser ? currentUser[0] : "?"}
            </div>
            <div className="hidden md:block text-left min-w-20">
              <p className="text-[10px] font-black text-white leading-none uppercase">{currentUser || "Usuário"}</p>
              <p className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">{currentRole}</p>
            </div>
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="bg-[#0b0b0d] border border-white/10 rounded px-2 py-0.5 text-[10px] text-zinc-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value={UserRole.Guest}>Guest</option>
              <option value={UserRole.Operador}>Operador</option>
              <option value={UserRole.Coordenador}>Coordenador</option>
              <option value={UserRole.Admin}>Admin</option>
            </select>
            {fbUser && (
              <button 
                onClick={async () => {
                  await logoutUser();
                }}
                className="bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 rounded px-2.5 py-1 text-[10px] text-red-400 font-black hover:text-red-300 transition-all flex items-center gap-1 cursor-pointer"
              >
                SAIR
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TOP COMMAND NAVIGATION PANEL - CATEGORIZED NAVIGATION */}
      <nav className="bg-[#08080a] border-b border-white/5 px-4 md:px-6 py-2.5 grid grid-cols-1 md:grid-cols-4 gap-3 relative z-40 shadow-[0_4px_15px_rgba(0,0,0,0.6)]">
        
        {/* MONITORAMENTO */}
        <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-indigo-400 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Monitoramento
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "dashboard" ? "active" : ""}`}
              title="Dashboard Principal"
            >
              <Layers size={11} />
              <span className="truncate">Painel</span>
            </button>
            <button
              onClick={() => setActiveTab("executivo")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "executivo" ? "active" : ""}`}
              title="Vista Executiva"
            >
              <Shield size={11} />
              <span className="truncate">Executivo</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "analytics" ? "active" : ""}`}
              title="Analytics &amp; SLAs"
            >
              <BarChart size={11} />
              <span className="truncate">SLA</span>
            </button>
          </div>
        </div>

        {/* LOGÍSTICA */}
        <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-cyan-400 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            Logística
          </div>
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => setActiveTab("capacidade")}
              className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "capacidade" ? "active" : ""}`}
              title="Escala Capacidade"
            >
              <Layers size={10} />
              <span className="truncate">Escala</span>
            </button>
            <button
              onClick={() => setActiveTab("produtividade")}
              className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "produtividade" ? "active" : ""}`}
              title="Cálculo Produtividade"
            >
              <Activity size={10} />
              <span className="truncate">Prod</span>
            </button>
            <button
              onClick={() => setActiveTab("mix")}
              className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "mix" ? "active" : ""}`}
              title="Mix Atividades"
            >
              <Layers size={10} />
              <span className="truncate">Mix</span>
            </button>
            <button
              onClick={() => setActiveTab("copil")}
              className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "copil" ? "active" : ""}`}
              title="Matriz COPIL"
            >
              <UserCheck size={10} />
              <span className="truncate">COPIL</span>
            </button>
            <button
              onClick={() => setActiveTab("radar_lojas_live")}
              className={`nav-btn py-1 px-1 text-[9px] ${activeTab === "radar_lojas_live" ? "active" : ""}`}
              title="Radar de Lojas Live (Sincronizado)"
            >
              <Radio size={10} className="text-rose-400 animate-pulse" />
              <span className="truncate font-bold text-rose-300">Radar Live</span>
            </button>
          </div>
        </div>

        {/* GESTÃO */}
        <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-amber-500 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Gestão
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab("equipa")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "equipa" ? "active" : ""}`}
              title="Equipe / Volumosos"
            >
              <User size={11} />
              <span className="truncate">Equipe</span>
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "historico" ? "active" : ""}`}
              title="Histórico Consolidados"
            >
              <Layers size={11} />
              <span className="truncate">Logs</span>
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "alerts" ? "active" : ""}`}
              title="Central de Alertas"
            >
              <Bell size={11} />
              <span className="truncate">Alertas</span>
            </button>
          </div>
        </div>

        {/* SISTEMA */}
        <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-purple-400 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Sistema
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab("audit")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "audit" ? "active" : ""}`}
              title="Auditoria Geral"
            >
              <Shield size={11} />
              <span className="truncate">Auditoria</span>
            </button>
            <button
              onClick={() => setActiveTab("relatorios")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "relatorios" ? "active" : ""}`}
              title="Relatórios &amp; Handovers"
            >
              <FileText size={11} />
              <span className="truncate">Relatos</span>
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`nav-btn py-1 px-1 text-[10px] ${activeTab === "config" ? "active" : ""}`}
              title="Ajustes OS"
            >
              <Layers size={11} />
              <span className="truncate">Ajustes</span>
            </button>
          </div>
        </div>

        {currentRole === UserRole.Admin && (
          <div className="border border-white/5 bg-[#0b0b0f] rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-rose-500 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Administração
            </div>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={() => setActiveTab("aprovacoes")}
                className={`nav-btn py-1 px-1 text-[10px] flex items-center justify-center gap-2 ${activeTab === "aprovacoes" ? "active" : ""}`}
                title="Aprovações de Usuários"
              >
                <ShieldAlert size={11} className="text-rose-500" />
                <span className="truncate flex items-center justify-between w-full">
                  <span>Aprovações</span>
                  {pendingUsers.length > 0 && (
                    <span className="bg-amber-500 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                      {pendingUsers.length}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

      </nav>

      {/* CORE WRAPPER */}
      <div className="flex-1 flex flex-col">
        {/* CONTENT STAGE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24">
          {activeTab === "radar_lojas_live" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
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
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
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
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
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

                    {activeTab === "mix" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
            >
              <MixTab
              setores={setores}
              universos={universos}
              onAddUniverso={(sid, nome, meta) => {
                setUniversos((prev) => {
                  const list = prev[sid] || [];
                  return { ...prev, [sid]: [...list, { nome, meta, feito: 0 }] };
                });
                addAudit(currentUser, "Novo Mix Universo", sid, nome);
              }}
              onRemoveUniverso={(sid, uIdx) => {
                setUniversos((prev) => {
                  const list = (prev[sid] || []).filter((_, i) => i !== uIdx);
                  return { ...prev, [sid]: list };
                });
                addAudit(currentUser, "Remover Mix Universo", sid, uIdx);
              }}
              onIncrementUniverso={(sid, uIdx, delta) => {
                setUniversos((prev) => {
                  const list = [...(prev[sid] || [])];
                  if (list[uIdx]) {
                    list[uIdx] = { ...list[uIdx], feito: list[uIdx].feito + delta };
                  }
                  return { ...prev, [sid]: list };
                });
                addAudit(currentUser, "Apontar Mix", `${sid}.${uIdx}`, delta);
              }}
              onZerarMix={() => {
                if (currentRole !== UserRole.Admin) return;
                setUniversos((prev) => {
                  const copy = { ...prev };
                  Object.keys(copy).forEach((k) => {
                    copy[k] = (copy[k] as any[]).map((u: any) => ({ ...u, feito: 0 }));
                  });
                  return copy;
                });
                addAudit(currentUser, "Zerar Mix Completo", "Tudo", 0);
              }}
              onExportMixCSV={() => {
                let csv = "Setor;Universo;Meta;Feito;Progresso\n";
                Object.entries(universos).forEach(([sid, list]) => {
                  (list as any[]).forEach((u: any) => {
                    const pct = u.meta ? ((u.feito / u.meta) * 100).toFixed(1) : "0.0";
                    csv += `${sid};${u.nome};${u.meta};${u.feito};${pct}%\n`;
                  });
                });
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `backup_mix_volumosos.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              currentRole={currentRole}
            />
            </ProtectedRoute>
          )}

                    {activeTab === "copil" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
            >
              <CopilTab
              setores={setores}
              copilData={copilData}
              activeSectorId={activeSectorId}
              setActiveSectorId={setActiveSectorId}
              onUpdateCopilKPI={handleUpdateCopilKPI}
              onAddCopilKPI={handleAddCopilKPI}
              onRemoveCopilKPI={handleRemoveCopilKPI}
              onSaveCopil={() => {
                localStorage.setItem("sys_copil", JSON.stringify(copilData));
                addAudit(currentUser, "Gravação COPIL", "Estado", "Sucesso");
                alert(`KPIs do Setor S${activeSectorId} salvos e sincronizados com sucesso.`);
              }}
              onExportCopilCSV={() => {
                let csv = "Pilar;Indicador;Meta;Realizado;Resultado\n";
                const activeCopil = copilData[activeSectorId];
                if (activeCopil) {
                  ["operacionais", "economico", "seguranca"].forEach((g) => {
                    const list = (activeCopil as any)[g] || [];
                    list.forEach((k: any) => {
                      csv += `${g.toUpperCase()};${k.kpi};${k.comp};${k.real};${calcCopilNota(k)}\n`;
                    });
                  });
                }
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `copil_matriz_S${activeSectorId}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              currentRole={currentRole}
              calcCopilNota={calcCopilNota}
              onRestoreDefaultKPIs={handleRestoreDefaultKPIs}
              onBulkImportKPIs={handleBulkImportKPIs}
            />
            </ProtectedRoute>
          )}

                    {activeTab === "aprovacoes" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
              <AdminApprovalTab />
            </ProtectedRoute>
          )}

          {activeTab === "equipa" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
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
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
              <HistoricoTab
              historico={historico}
              onClearHistorico={() => {
                setHistorico([]);
                // Save to PostgreSQL automatically if authenticated
                if (authLoading || !fbUser) return;
                fetchWithAuth("/api/historico_consolidado", { method: "DELETE" })
                  .then(() => {
                    addAudit(currentUser, "Limpar Histórico", "Todos", "Apagados");
                  })
                  .catch(err => console.error("Failed to clear consolidated history on DB:", err));
              }}
              currentRole={currentRole}
            />
            </ProtectedRoute>
          )}

                    {activeTab === "alerts" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
              <AlertasTab
              alerts={alerts}
              onMarkAlertLido={handleMarkAlertLido}
              onClearOldAlerts={() => setAlerts([])}
            />
            </ProtectedRoute>
          )}

                    {activeTab === "audit" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
              <AuditoriaTab
              audit={audit}
              onClearAudit={() => {
                setAudit([]);
                // Save to PostgreSQL automatically if authenticated
                if (authLoading || !fbUser) return;
                fetchWithAuth("/api/audit_logs", { method: "DELETE" })
                  .then(() => {
                    addAudit(currentUser, "Limpar Auditoria", "Todos", "Apagados");
                  })
                  .catch(err => console.error("Failed to clear audit logs on DB:", err));
              }}
            />
            </ProtectedRoute>
          )}

                    {activeTab === "relatorios" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
              <RelatoriosTab setores={setores} coordenador={currentUser} />
            </ProtectedRoute>
          )}

                    {activeTab === "config" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin]}
            >
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
                  return copy;
                });
              }}
              onAddReferente={() => {
                setReferentesSemana((prev) => [
                  ...prev,
                  { dia: "segunda", ref87: "Novo Líder", refVol: "Apoio Volumoso" },
                ]);
              }}
              onRemoveReferente={(idx) => {
                setReferentesSemana((prev) => prev.filter((_, i) => i !== idx));
              }}
              onAddSetor={(id, resp, foto) => {
                const newSec: Setor = { id, resp, ativ: 0, uph: 0, promessa: 100, nota5s: 100, bsi: 100, reproTotal: 0, errosPicking: 0, horasDKT: 0, poliRec: 0, rdl: 0, poliSaid: 0, coletado: 0, varFin: 0, infracaoSeguranca: false, fotoLider: foto };
                setSetores((prev) => [...prev, newSec]);
              }}
              onRemoveSetor={(idx) => {
                setSetores((prev) => prev.filter((_, i) => i !== idx));
              }}
              onUpdateSetor={(sid, field, val) => {
                setSetores((prev) =>
                  prev.map((s) => (s.id === sid ? { ...s, [field]: val } : s))
                );
              }}
              onUpdateCoordenador={(nome) => {
                setCurrentUser(nome);
              }}
              onUpdateScreensaver={(cfg) => {
                setScreensaver(cfg);
                alert("Configuração da tela de descanso gravada.");
              }}
              onExportBackup={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
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
                if (obj.setores) {
                  setSetores(obj.setores);
                }
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
      <div className="fixed bottom-6 right-6 z-[60000] flex flex-col items-end gap-3">
        {showTerminal && (
          <div className="w-80 md:w-96 bg-[#070709]/98 border border-indigo-500/30 rounded-2xl p-4 flex flex-col h-96 shadow-[0_0_40px_rgba(79,70,229,0.25)] backdrop-blur-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2 mb-2 text-xs font-black uppercase text-indigo-400 font-mono">
              <span className="flex items-center gap-1.5 tracking-wider">
                <TerminalIcon size={12} className="pulse-anim text-indigo-400" /> Co-Pilot OS Console
              </span>
              <button
                onClick={() => setShowTerminal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar space-y-1.5 mb-2 pr-1">
              {terminalLogs.map((log, i) => {
                let colorClass = "text-zinc-400";
                if (log.startsWith("> ")) {
                  colorClass = "text-sky-400 font-semibold";
                } else if (log.includes("[Sucesso]")) {
                  colorClass = "text-emerald-400";
                } else if (log.includes("[Erro]")) {
                  colorClass = "text-red-400 font-medium";
                } else if (log.includes("[REAPRO]") || log.includes("[BOLSAO]") || log.includes("[RADAR]")) {
                  colorClass = "text-amber-400 font-medium";
                } else if (log.includes("[IA Copil]") || log.includes("DIAGNÓSTICO")) {
                  colorClass = "text-indigo-400 font-semibold text-[11.5px]";
                }
                return (
                  <div key={i} className={`whitespace-pre-wrap ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleTerminalSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: /sugerir, /setor 87 ativ 25000..."
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="flex-1 bg-black text-emerald-400 font-mono text-xs border border-indigo-500/20 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest px-3 rounded cursor-pointer transition-colors"
              >
                Exec
              </button>
            </form>
          </div>
        )}
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center hover:opacity-95 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-transform duration-300 active:scale-95 cursor-pointer"
        >
          <TerminalIcon size={20} />
        </button>
      </div>

      {/* TOAST NOTIFICATIONS CONTAINER */}
      <div className="fixed bottom-24 right-5 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`p-4 rounded-xl shadow-2xl border text-white font-semibold flex items-center justify-between gap-3 transition-all duration-300 pointer-events-auto backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-600/95 border-emerald-500' :
              toast.type === 'error' ? 'bg-rose-600/95 border-rose-500' :
              toast.type === 'warning' ? 'bg-amber-600/95 border-amber-500' :
              'bg-blue-600/95 border-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span className="text-xs md:text-sm">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/70 hover:text-white text-xs font-black p-1 hover:bg-white/10 rounded transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* INACTIVITY SCREENSAVER CANVAS OVERLAY */}
      {isScreensaverActive && (() => {
        // Safe retrieve of 4 main sectors
        const ssSectors = ["87", "88", "89", "90"].map(id => 
          setoresFluctuated.find(s => s.id === id) || 
          setores.find(s => s.id === id)
        ).filter(Boolean) as Setor[];

        const getSectorKpisForScreensaver = (s: Setor) => {
          // 1. Pilotagem
          const pilotReal = s.id === "87" ? 100 : s.id === "88" ? 99.2 : s.id === "89" ? 98.0 : 99.5;
          const pilotScore = pilotReal / 100;

          // 2. Produtividade
          const prodReal = s.uph;
          const prodScore = s.uph / 550;

          // 3. Picking
          const pickReal = s.id === "87" ? 99.8 : s.id === "88" ? 99.0 : s.id === "89" ? 97.5 : 99.2;
          const pickScore = pickReal / 100;

          // 4. Promessa
          const promReal = s.promessa;
          const promScore = s.promessa / 95;

          // 5. Lead Time
          const ltReal = Math.max(30, Math.round(35 + (100 - s.promessa) * 1.5));
          const ltScore = 45 / ltReal;

          // 6. Aderência ao Corte
          const cutReal = s.id === "87" ? 100 : s.id === "88" ? 99.4 : s.id === "89" ? 98.1 : 99.8;
          const cutScore = cutReal / 100;

          // 7. Erro de Picking
          const errReal = s.errosPicking;
          const errScore = errReal <= 0 ? 1.2 : (1.0 / Math.max(0.01, errReal));

          // 8. PPM Erro de Picking
          const ppmReal = Math.round(s.errosPicking * 1000);
          const ppmScore = ppmReal <= 0 ? 1.2 : (1000 / Math.max(10, ppmReal));

          // 9. SAC Logístico
          const sacReal = parseFloat((s.errosPicking * 0.45).toFixed(2));
          const sacScore = sacReal <= 0 ? 1.2 : (0.50 / Math.max(0.01, sacReal));

          // 10. Taxa de Inventário
          const invReal = s.id === "87" ? 99.8 : s.id === "88" ? 99.6 : s.id === "89" ? 99.1 : 99.7;
          const invScore = invReal / 99.5;

          // 11. 5S Área
          const s5Real = s.nota5s;
          const s5Score = s.nota5s / 90;

          // 12. Variação de Estoque
          const stockReal = s.id === "87" ? 1250 : s.id === "88" ? 1480 : s.id === "89" ? 2100 : 950;
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
            { name: "Variação de Estoque", meta: "< R$ 2.000", real: `R$ ${stockReal.toLocaleString("pt-BR")}`, score: stockScore },
            { name: "BSI Cruzado", meta: "98%", real: `${bsiReal}%`, score: bsiScore },
            { name: "Infrações Segurança", meta: "0", real: infReal === 0 ? "Nenhuma" : "1 Infração", score: infScore },
          ];
        };

        const getKpiStyle = (score: number) => {
          if (score >= 1.0) {
            return {
              bg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
              arrow: "▲",
              cls: "text-emerald-400 font-black"
            };
          } else if (score >= 0.8) {
            return {
              bg: "bg-amber-500/10 border-amber-500/25 text-amber-400",
              arrow: "▶",
              cls: "text-amber-400 font-black"
            };
          } else if (score >= 0.6) {
            return {
              bg: "bg-orange-500/10 border-orange-500/25 text-orange-400",
              arrow: "▶",
              cls: "text-orange-400 font-black"
            };
          } else {
            return {
              bg: "bg-red-500/15 border-red-500/35 text-red-400 pulse-anim",
              arrow: "▼",
              cls: "text-red-400 font-black"
            };
          }
        };

        const formattedDate = new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).toUpperCase();

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
                            {s.ativ.toLocaleString("pt-BR")}{" "}
                            <span className="text-[10px] font-bold text-zinc-400 font-sans">{unitText}</span>
                          </p>
                        </div>

                        {/* Status Indicator badge */}
                        <div className={`px-2 py-1 rounded text-[8px] font-black tracking-widest uppercase ${
                          isRisk 
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 pulse-anim"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        }`}>
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
                            <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-black flex items-center gap-1 border ${style.bg}`}>
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
                SISTEMA OPERACIONAL COPIL LOGÍSTICA V4.2
              </p>
              <p className="text-[10px] text-indigo-400/80 font-black uppercase tracking-widest animate-pulse">
                [ PRESSIONE QUALQUER TECLA OU MOVA O MOUSE PARA RETORNAR AO MÓDULO OPERACIONAL ]
              </p>
            </footer>
          </div>
        );
      })()}
    </div>
  );
}