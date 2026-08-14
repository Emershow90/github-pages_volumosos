/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash2, X, Edit3 } from "lucide-react";
import { SectorActivityMix, Universe } from "../types";

interface UniverseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectorId: string;
  currentMix: SectorActivityMix;
  onSave: (updated: SectorActivityMix) => void;
  availableUniverses: Universe[];
  onAddUniverse?: (universe: Universe) => void;
}

export const UniverseEditorModal: React.FC<UniverseEditorModalProps> = ({
  isOpen,
  onClose,
  sectorId,
  currentMix,
  onSave,
  availableUniverses,
  onAddUniverse,
}) => {
  const [localMix, setLocalMix] = useState<SectorActivityMix>(currentMix);
  const [newUniverseName, setNewUniverseName] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localMix);
    onClose();
  };

  const handleAddCustomUniverse = () => {
    if (!newUniverseName.trim()) return;
    
    const newUniverse: Universe = {
      id: newUniverseName.toLowerCase().replace(/\s+/g, "-"),
      name: newUniverseName,
      color: "indigo",
      icon: "📦",
      description: `Universo customizado: ${newUniverseName}`,
      active: true,
    };

    if (onAddUniverse) {
      onAddUniverse(newUniverse);
    }
    setNewUniverseName("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f11] border border-indigo-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0f0f11]/95">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              Editor de Universos
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Setor S{sectorId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* UNIVERSOS PRINCIPAIS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <span>📊</span> Universos Principais
            </h3>

            {/* Alimento */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>🍎</span> Alimento
                </label>
                <span className="text-xs text-amber-300 font-mono">
                  {localMix.alimentoPct}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={localMix.alimento}
                  onChange={(e) =>
                    setLocalMix({
                      ...localMix,
                      alimento: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 bg-black/40 border border-amber-500/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Quantidade"
                />
                <span className="text-zinc-500 text-xs font-bold">unidades</span>
              </div>
            </div>

            {/* Montanha (inclui Mochila) */}
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <span>⛰️</span> Montanha (+ Mochila)
                </label>
                <span className="text-xs text-purple-300 font-mono">
                  {localMix.montanhaPct}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={localMix.montanha}
                  onChange={(e) =>
                    setLocalMix({
                      ...localMix,
                      montanha: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 bg-black/40 border border-purple-500/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Quantidade"
                />
                <span className="text-zinc-500 text-xs font-bold">unidades</span>
              </div>
              <p className="text-[11px] text-purple-300/70 mt-2 italic">
                ℹ️ Mochila é subgrupo de Montanha
              </p>
            </div>
          </div>

          {/* CARD DE COLIS (DECATHLON) */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <span>📦</span> Card de Coleta (Decathlon)
            </h3>

            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-base font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📮</span> Colis
                </label>
                <span className="text-lg font-black text-emerald-300 font-mono">
                  {localMix.colisPct}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={localMix.colis}
                  onChange={(e) =>
                    setLocalMix({
                      ...localMix,
                      colis: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 bg-black/40 border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-400 font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="Artigos para coleta"
                />
                <span className="text-emerald-300 text-sm font-black">artigos</span>
              </div>
              <p className="text-[11px] text-emerald-300/70 mt-2 italic">
                ℹ️ Nomenclatura Decathlon Logística - Quantidade de artigos em coleta
              </p>
            </div>
          </div>

          {/* RESUMO TOTAL */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-3">
              Total de Atividade
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white font-mono">
                {localMix.total.toLocaleString("pt-BR")}
              </span>
              <span className="text-zinc-400 text-sm font-bold">unidades</span>
            </div>
          </div>

          {/* ADICIONAR NOVO UNIVERSO */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} /> Adicionar Novo Universo
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newUniverseName}
                onChange={(e) => setNewUniverseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomUniverse();
                }}
                className="flex-1 bg-black/40 border border-indigo-500/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Nome do novo universo (ex: Eletrônicos)"
              />
              <button
                onClick={handleAddCustomUniverse}
                disabled={!newUniverseName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 italic">
              ℹ️ Você poderá rastrear novos universos conforme necessário
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10 bg-black/20 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-white/20 hover:bg-white/5 text-white font-bold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 size={16} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
