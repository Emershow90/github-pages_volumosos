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
import RadarLojasTab from "./components/RadarLojasTab";
import { useStoreOperations } from "./stores/useStoreOperations";
import { useSectorStore } from "./stores/useSectorStore";
import { useHistoryStore } from "./stores/useHistoryStore";
import { useCollaboratorStore } from "./stores/useCollaboratorStore";
import { useUIStore } from "./stores/useUIStore";
import { realtimeSync } from "./services/realtimeSyncService";

// --- SUPABASE AUTH INTEGRATION ---
import { supabase, auth, getUserProfile, ensureUserProfile, logoutUser, fetchWithAuth } from "./lib/supabase";
import { SupabaseService } from "./lib/supabaseService";
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
} from "lucide-react";

// Re-export SupabaseService as FirebaseService for backward compatibility
const FirebaseService = SupabaseService;

export default function App() {
  // Global States
  const [currentUser, setCurrentUser] = useState<string>(() => localStorage.getItem("current_user") || "Admin");
  const [currentRole, setCurrentRole] = useState<UserRole>(() => (localStorage.getItem("current_role") as UserRole) || UserRole.Admin);
  const [currentStatus, setCurrentStatus] = useState<string>(() => localStorage.getItem("current_status") || "Pendente");

  // Auth States
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Supabase connection tracking states
  const [supabaseOnline, setSupabaseOnline] = useState<boolean | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);

  const checkSupabaseConnection = async () => {
    setCheckingSupabase(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      setSupabaseOnline(true);
      console.log('✅ [Supabase Connection Log] Supabase está acessível e online.');
    } catch (err) {
      console.warn('❌ [Supabase Connection Log] Erro ao conectar com o Supabase:', err);
      setSupabaseOnline(false);
    } finally {
      setCheckingSupabase(false);
    }
  };

  useEffect(() => {
    if (supabaseUser?.id) {
      checkSupabaseConnection();
    } else {
      setSupabaseOnline(null);
    }
  }, [supabaseUser?.id]);

  // Sync with Supabase Auth state
  useEffect(() => {
    let resolved = false;

    // Timeout de segurança: se o Supabase Auth não responder em 8s
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        resolved = true;
        clearTimeout(timeoutId);
        
        try {
          const user = session?.user || null;
          
          if (user) {
            setSupabaseUser(user);
            const profile = await ensureUserProfile(user);
            if (profile) {
              setCurrentUser(profile.nome);
              setCurrentRole(profile.role);
              setCurrentStatus(profile.situacao);
            }
          } else {
            setSupabaseUser(null);
            setCurrentUser("");
            setCurrentRole(UserRole.Guest);
          }
        } catch (err) {
          console.error("[Auth Error] Falha ao carregar perfil do usuário:", err);
          setAuthError("Erro ao carregar perfil do usuário. Tente recarregar a página.");
        } finally {
          setAuthLoading(false);
        }
      }
    );

    // Verifica estado inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!resolved) {
        const user = session?.user || null;
        if (user) {
          setSupabaseUser(user);
          ensureUserProfile(user).then(profile => {
            if (profile) {
              setCurrentUser(profile.nome);
              setCurrentRole(profile.role);
              setCurrentStatus(profile.situacao);
            }
            setAuthLoading(false);
          }).catch(() => setAuthLoading(false));
        } else {
          setSupabaseUser(null);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

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
    if (!supabaseUser?.id) {
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
  }, [supabaseUser?.id]);

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
          SupabaseService.upsertRecord('setores', updated).catch(err => console.error("Failed to upsert sector:", err));
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
  // DATABASE SYNCHRONIZATION (Supabase)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || !supabaseUser) {
      return;
    }

    let active = true;
    let abortController: AbortController | null = null;

    const fetchFromDb = async () => {
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
            setCurrentUser((prev) => (prev !== dbLider.nome ? dbLider.nome : prev));
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
          return;
        }
        console.error("Database sync fetch failed:", err);
      }
    };

    fetchFromDb();

    // Poll every 30 seconds
    const interval = setInterval(fetchFromDb, 30000);
    return () => {
      active = false;
      clearInterval(interval);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [supabaseUser, authLoading]);

  // ---------------------------------------------------------------------------
  // AUTO PERSISTENCE SYNC EFFECTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem("current_user", currentUser);
    if (authLoading || !supabaseUser) return;
    if (currentUser) {
      fetchWithAuth("/api/lideranca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: currentUser, foto: "" }),
      }).catch((err) => console.error("Failed to push coordinator to DB:", err));
    }
  }, [currentUser, supabaseUser, authLoading]);

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
    if (authLoading || !supabaseUser) return;
    if (setores && setores.length > 0) {
      fetchWithAuth("/api/setores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setores),
      }).catch((err) => console.error("Failed to push sectors to DB:", err));
    }
  }, [setores, supabaseUser, authLoading]);

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
    if (authLoading || !supabaseUser) return;
    if (referentesSemana && referentesSemana.length > 0) {
      fetchWithAuth("/api/escala_semanal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referentesSemana),
      }).catch((err) => console.error("Failed to push schedule to DB:", err));
    }
  }, [referentesSemana, supabaseUser, authLoading]);

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

    // Save to Supabase automatically if authenticated
    if (authLoading || !supabaseUser) return;
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
          SupabaseService.upsertRecord('setores', updated).catch(err => console.error("Failed to upsert sector:", err));
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
      SupabaseService.upsertRecord('colaboradores', updated).catch(err => console.error("Failed to upsert collaborator:", err));
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
      SupabaseService.upsertRecord('colaboradores', updated).catch(err => console.error("Failed to upsert collaborator:", err));
      return copy;
    });
  };

  const handleAddColaborador = (col: Colaborador) => {
    setColaboradores((prev) => [...prev, col]);
    addAudit(currentUser, "Criar Colaborador", col.nome, col.setor);
    SupabaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to upsert collaborator:", err));
  };

  const handleUpdateColaborador = (index: number, col: Colaborador) => {
    setColaboradores((prev) => {
      const copy = [...prev];
      copy[index] = col;
      addAudit(currentUser, "Editar Colaborador", col.nome, col.setor);
      SupabaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to upsert collaborator:", err));
      return copy;
    });
  };

  const handleRemoveColaborador = (index: number) => {
    const col = colaboradores[index];
    setColaboradores((prev) => prev.filter((_, i) => i !== index));
    addAudit(currentUser, "Remover Colaborador", col.nome, "Apagado");
    SupabaseService.deleteRecord('colaboradores', col.id).catch(err => console.error("Failed to delete collaborator:", err));
  };

  const handleSetColaboradores = async (cols: Colaborador[]) => {
    setColaboradores(cols);
    for (const col of cols) {
      SupabaseService.upsertRecord('colaboradores', col).catch(err => console.error("Failed to batch upsert collaborator:", err));
    }
  };

  const handleSaveRadar = React.useCallback(async (newRadar: RadarLoja[]) => {
    setRadar(newRadar);
    
    // Push the changes to Supabase store_operations
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
        programacaoId: existing?.programacaoId || "2026-07-05",
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
      
      await SupabaseService.upsertRecord('store_operations', updatedOp).catch(err => 
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
    if (!s) {
      console.error('Nenhum setor encontrado');
      return;
    }
    
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

    if (authLoading || !supabaseUser) {
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
  // RENDER
  // ---------------------------------------------------------------------------
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

  if (!supabaseUser) {
    return (
      <LoginScreen 
        onAuthSuccess={async (user, profile) => {
          setSupabaseUser(user);
          if (profile) {
            setCurrentUser(profile.nome);
            setCurrentRole(profile.role);
            setCurrentStatus(profile.situacao);
          } else {
            const p = await getUserProfile(user.id) || await ensureUserProfile(user);
            if (p) {
              setCurrentUser(p.nome);
              setCurrentRole(p.role);
              setCurrentStatus(p.situacao);
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
            onClick={() => logoutUser()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/10"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    // ... resto do seu JSX
  );
}

export default App;
