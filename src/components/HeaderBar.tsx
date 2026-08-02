import React from "react";
import { Setor, UserRole } from "../types";
import { Bell } from "lucide-react";

export interface HeaderBarNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "info" | "success" | "warning" | "danger" | string;
  read: boolean;
}

interface HeaderBarProps {
  timeState: { local: string; utc: string };
  activeSectorId: string;
  setActiveSectorId: (sector: string) => void;
  setores: Setor[];
  currentUser: string;
  currentRole: UserRole;
  notifications: HeaderBarNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<HeaderBarNotification[]>>;
  showNotificationDropdown: boolean;
  setShowNotificationDropdown: (show: boolean) => void;
  supabaseOnline: boolean | null;
  checkingSupabase: boolean;
  verifySupabaseConnection: () => void;
  handleRoleChange: (role: UserRole) => void;
  onLogout: () => Promise<void>;
  addAudit: (user: string, action: string, field: string, nVal: unknown, pVal?: unknown) => void;
  fbUser: unknown;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  timeState,
  activeSectorId,
  setActiveSectorId,
  setores,
  currentUser,
  currentRole,
  notifications,
  setNotifications,
  showNotificationDropdown,
  setShowNotificationDropdown,
  supabaseOnline,
  checkingSupabase,
  verifySupabaseConnection,
  handleRoleChange,
  onLogout,
  addAudit,
  fbUser,
}) => {
  return (
    <header className="header border-b border-white/5 bg-[#0b0b0d]/90 backdrop-blur-md sticky top-0 z-[50000] px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          T
        </div>
        <div>
          <h1 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-1.5 leading-none">
            Torre de Comando{" "}
            <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-mono">
              OS V18.5
            </span>
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
            <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">
              Local Time
            </p>
          </div>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <div className="text-right">
            <p className="text-sky-400 font-bold">{timeState.utc || "00:00:00 UTC"}</p>
            <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">
              Global UTC
            </p>
          </div>
        </div>

        {/* Seletor de Setor para o Radar Live */}
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider hidden lg:inline">
            Setor:
          </span>
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
                Setor {s.id} — {s.resp ? s.resp.split(" ")[0] : ""}
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
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      Nenhum aviso no momento
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    let typeColor = "bg-blue-400";
                    if (n.type === "success") {
                      typeColor = "bg-emerald-400";
                    } else if (n.type === "warning") {
                      typeColor = "bg-amber-400";
                    } else if (n.type === "danger") {
                      typeColor = "bg-red-400";
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifications((prev) => {
                            const updated = prev.map((item) =>
                              item.id === n.id ? { ...item, read: true } : item
                            );
                            localStorage.setItem(
                              "sys_notifications",
                              JSON.stringify(updated)
                            );
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
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-tight">
                              {n.title}
                            </h4>
                            <span className="text-[8px] text-zinc-500 font-mono font-bold">
                              {n.time}
                            </span>
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
        {Boolean(fbUser) && (
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
            <p className="text-[10px] font-black text-white leading-none uppercase">
              {currentUser || "Usuário"}
            </p>
            <p className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">
              {currentRole}
            </p>
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
          {Boolean(fbUser) && (
            <button
              onClick={onLogout}
              className="bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 rounded px-2.5 py-1 text-[10px] text-red-400 font-black hover:text-red-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              SAIR
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
