import React from 'react';
import { UserRole } from '../types/Usuario';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userRole: UserRole;
  allowedRoles: UserRole[];
  fallbackMessage?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  userRole, 
  allowedRoles,
  fallbackMessage = "Acesso restrito. Você não possui permissão para visualizar este módulo."
}) => {
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-in fade-in zoom-in duration-500">
        <div className="bg-black/40 border border-red-500/30 p-8 rounded-2xl text-center max-w-md backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <span className="text-red-500 text-3xl">🛡️</span>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Acesso Negado</h2>
          <p className="text-zinc-400 text-sm">{fallbackMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
