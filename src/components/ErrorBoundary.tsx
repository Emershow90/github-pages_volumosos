import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled render error:", error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
  };

  handleHardReload = () => {
    localStorage.removeItem("radar_offline_queue");
    window.location.reload();
  };

  render() {
    const state = (this as any).state as ErrorBoundaryState;
    const props = (this as any).props as ErrorBoundaryProps;

    if (state?.hasError) {
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 bg-[#0a0a10] border border-rose-500/30 rounded-2xl text-center space-y-4 my-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            {props.fallbackTitle || "Ocorreu um erro no módulo"}
          </h2>
          <p className="text-sm text-slate-400 max-w-lg">
            Um problema temporário de renderização ocorreu neste componente. Você pode tentar reiniciar o módulo ou recarregar a página.
          </p>
          {state.error && (
            <div className="bg-black/60 border border-rose-500/20 p-3 rounded-lg text-left text-xs font-mono text-rose-300 max-w-xl w-full overflow-x-auto">
              <p className="font-bold">{state.error.name}: {state.error.message}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <RotateCcw size={14} />
              Tentar Novamente
            </button>
            <button
              onClick={this.handleHardReload}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-zinc-700"
            >
              <RefreshCw size={14} />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
