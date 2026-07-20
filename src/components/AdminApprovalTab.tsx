import React, { useEffect, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { UserCheck, Clock, ShieldAlert, CheckCircle, Mail, User } from "lucide-react";

export const AdminApprovalTab: React.FC = () => {
  const { pendingUsers, loadPendingUsers, approveUser, currentUser, addToast } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      setLoading(true);
      await loadPendingUsers();
      setLoading(false);
    };
    fetchPending();
  }, [loadPendingUsers]);

  const handleApprove = async (uid: string, nome: string) => {
    try {
      setApprovingId(uid);
      await approveUser(uid, currentUser);
      addToast(`Acesso de ${nome} liberado com sucesso!`, "success");
    } catch (err: any) {
      addToast(`Falha ao aprovar usuário: ${err.message || err}`, "error");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="glass-card p-6 border border-white/10 bg-zinc-950/40 max-w-4xl mx-auto rounded-[20px] shadow-2xl" id="admin-approval-tab">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
            Controle de Acessos Pendentes
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Controle e liberação de acessos operacionais para novos colaboradores cadastrados no sistema.
          </p>
        </div>
        <span className="bg-amber-500/15 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {pendingUsers.length} Aguardando
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <div className="w-8 h-8 border-4 border-white/10 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium font-mono">Buscando novos cadastros...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-white font-sans">Tudo em Dia!</h3>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Não há solicitações de acesso pendentes no momento. Todos os colaboradores cadastrados estão ativos ou inativos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div
              key={user.uid}
              id={`user-card-${user.uid}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold shrink-0 border border-white/10">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {user.nome}
                    <span className="bg-white/10 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                      {user.role}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {user.email}
                    </span>
                    {user.cargo && (
                      <span className="bg-amber-500/15 text-amber-400 font-medium px-1.5 py-0.5 rounded text-[10px] font-sans border border-amber-500/10">
                        {user.cargo}
                      </span>
                    )}
                    {user.unidade && (
                      <span className="bg-sky-500/15 text-sky-400 font-medium px-1.5 py-0.5 rounded text-[10px] font-sans border border-sky-500/10">
                        {user.unidade}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto justify-end">
                <button
                  id={`btn-approve-${user.uid}`}
                  onClick={() => user.uid && handleApprove(user.uid, user.nome)}
                  disabled={approvingId === user.uid}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all w-full sm:w-auto uppercase cursor-pointer"
                >
                  {approvingId === user.uid ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Aprovando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Aprovar Acesso
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
