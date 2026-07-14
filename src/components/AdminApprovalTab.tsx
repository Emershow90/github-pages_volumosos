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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-4xl mx-auto" id="admin-approval-tab">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
            Controle de Acessos Pendentes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Controle e liberação de acessos operacionais para novos colaboradores cadastrados no sistema.
          </p>
        </div>
        <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {pendingUsers.length} Aguardando
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Buscando novos cadastros...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tudo em Dia!</h3>
          <p className="text-sm text-slate-500 mt-1">
            Não há solicitações de acesso pendentes no momento. Todos os colaboradores cadastrados estão ativos ou inativos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div
              key={user.uid}
              id={`user-card-${user.uid}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 border border-slate-300">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {user.nome}
                    <span className="bg-slate-200/60 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                      {user.role}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {user.email}
                    </span>
                    {user.cargo && (
                      <span className="bg-amber-100/60 text-amber-800 font-medium px-1.5 py-0.5 rounded text-[10px]">
                        {user.cargo}
                      </span>
                    )}
                    {user.unidade && (
                      <span className="bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded text-[10px]">
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
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all w-full sm:w-auto"
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
