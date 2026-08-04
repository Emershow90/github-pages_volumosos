import React, { useState, useEffect } from 'react';
import { Setor } from '../types/Setor';
import { Settings, X, AlertTriangle, Save, Sparkles } from 'lucide-react';
import { SupabaseService as FirebaseService } from '../lib/supabaseService';
import { fetchPublicSpreadsheetMetrics, PublicSpreadsheetMetricsMap } from '../lib/googleSheetsPublicSource';

interface OverrideOperacionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  setores: Setor[];
  onUpdateSetor: (id: string, field: string, value: number) => void;
}

export const OverrideOperacionalModal: React.FC<OverrideOperacionalModalProps> = ({
  isOpen,
  onClose,
  setores,
  onUpdateSetor,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({
    ativ: '',
    uph: '',
    reproTotal: '',
    promessa: '',
    nota5s: '',
    bsi: '',
    errosPicking: '',
  });

  const [publicMetrics, setPublicMetrics] = useState<PublicSpreadsheetMetricsMap | null>(null);
  const [suggestedAtiv, setSuggestedAtiv] = useState<string>('');
  const [suggestedUph, setSuggestedUph] = useState<string>('');
  const [isAtivSuggested, setIsAtivSuggested] = useState(false);
  const [isUphSuggested, setIsUphSuggested] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch public Google Sheets CSV metrics on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedSector('');
      setFormData({
        ativ: '',
        uph: '',
        reproTotal: '',
        promessa: '',
        nota5s: '',
        bsi: '',
        errosPicking: '',
      });
      setSuggestedAtiv('');
      setSuggestedUph('');
      setIsAtivSuggested(false);
      setIsUphSuggested(false);
      setIsConfirming(false);
      setIsSaving(false);

      fetchPublicSpreadsheetMetrics()
        .then((data) => setPublicMetrics(data))
        .catch((err: unknown) => {
          console.error('Erro ao buscar métricas da planilha pública:', err);
          setPublicMetrics(null);
        });
    }
  }, [isOpen]);

  // Pre-fill ATIVIDADE & UPH from public Google Sheets metrics when a sector is selected
  useEffect(() => {
    if (!selectedSector || !publicMetrics) {
      setIsAtivSuggested(false);
      setIsUphSuggested(false);
      setSuggestedAtiv('');
      setSuggestedUph('');
      return;
    }

    const metrics = publicMetrics[selectedSector];
    if (metrics) {
      const ativStr = metrics.atividadeTotal !== null && metrics.atividadeTotal > 0 ? metrics.atividadeTotal.toString() : '';
      const uphStr = metrics.uph > 0 ? metrics.uph.toString() : '';

      setSuggestedAtiv(ativStr);
      setSuggestedUph(uphStr);
      setIsAtivSuggested(Boolean(ativStr));
      setIsUphSuggested(Boolean(uphStr));

      setFormData((prev) => ({
        ...prev,
        ativ: ativStr,
        uph: uphStr,
      }));
    } else {
      setIsAtivSuggested(false);
      setIsUphSuggested(false);
      setSuggestedAtiv('');
      setSuggestedUph('');
    }
  }, [selectedSector, publicMetrics]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'ativ' && isAtivSuggested && value !== suggestedAtiv) {
      setIsAtivSuggested(false);
    }
    if (field === 'uph' && isUphSuggested && value !== suggestedUph) {
      setIsUphSuggested(false);
    }
  };

  const hasChanges = Object.values(formData).some((v) => v !== '');

  const handleReview = () => {
    if (!selectedSector || !hasChanges) return;
    setIsConfirming(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedSector) return;
    setIsSaving(true);
    try {
      const activeS = setores.find((s) => s.id === selectedSector);
      if (!activeS) throw new Error('Setor não encontrado');

      // Update local state for each field
      const updatedFields: Partial<Setor> = {};
      Object.entries(formData).forEach(([field, val]) => {
        if (val !== '') {
          const numVal = Number(val);
          onUpdateSetor(selectedSector, field, numVal);
          (updatedFields as Record<string, unknown>)[field] = numVal;
        }
      });

      // Update Supabase directly to ensure atomic update of just these fields
      const updatedSector = { ...activeS, ...updatedFields };
      await FirebaseService.upsertRecord('setores', updatedSector, 'id');
      
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Erro ao salvar override:', msg);
      alert('Erro ao salvar os dados: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSectorData = setores.find((s) => s.id === selectedSector);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-indigo-400">
            <Settings size={20} />
            <h2 className="font-bold">Override Operacional</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!isConfirming ? (
            <div className="space-y-6">
              
              {/* Sector Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Selecione o Setor
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Selecione --</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSector && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-300 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>Preencha apenas os campos que deseja sobrescrever. Campos em branco manterão o valor atual (sincronizado em tempo real).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput 
                      label="Atividade" 
                      field="ativ" 
                      value={formData.ativ} 
                      placeholder={activeSectorData?.ativ?.toString()} 
                      onChange={handleInputChange} 
                      badge={isAtivSuggested ? "Sugerido pela Planilha" : undefined}
                    />
                    <FieldInput 
                      label="UPH" 
                      field="uph" 
                      value={formData.uph} 
                      placeholder={activeSectorData?.uph?.toString()} 
                      onChange={handleInputChange} 
                      badge={isUphSuggested ? "Sugerido pela Planilha" : undefined}
                    />
                    <FieldInput label="Repro Total" field="reproTotal" value={formData.reproTotal} placeholder={activeSectorData?.reproTotal?.toString()} onChange={handleInputChange} />
                    <FieldInput label="Promessa (%)" field="promessa" value={formData.promessa} placeholder={activeSectorData?.promessa?.toString()} onChange={handleInputChange} />
                    <FieldInput label="Auditoria 5S" field="nota5s" value={formData.nota5s} placeholder={activeSectorData?.nota5s?.toString()} onChange={handleInputChange} />
                    <FieldInput label="BSI" field="bsi" value={formData.bsi} placeholder={activeSectorData?.bsi?.toString()} onChange={handleInputChange} />
                    <FieldInput label="Erros Picking" field="errosPicking" value={formData.errosPicking} placeholder={activeSectorData?.errosPicking?.toString()} onChange={handleInputChange} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white mb-2">Resumo da Atualização</h3>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">Setor Alvo:</span>
                  <span className="text-white font-bold">{activeSectorData?.nome}</span>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(formData).map(([field, val]) => {
                    const isChanged = val !== '';
                    const oldVal = (activeSectorData as Record<string, unknown>)?.[field];
                    const isSuggested = (field === 'ativ' && isAtivSuggested) || (field === 'uph' && isUphSuggested);
                    return (
                      <div key={field} className="flex justify-between text-sm items-center">
                        <span className="text-zinc-400 font-mono capitalize">{field}</span>
                        {isChanged ? (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 line-through">{String(oldVal ?? 0)}</span>
                            <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                              → {val}
                              {isSuggested && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-sans border border-indigo-500/30">
                                  [Planilha]
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">Mantido ({String(oldVal ?? 0)})</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          {isConfirming && !isSaving && (
            <button
              onClick={() => setIsConfirming(false)}
              className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Voltar
            </button>
          )}
          
          {!isConfirming ? (
            <button
              onClick={handleReview}
              disabled={!selectedSector || !hasChanges}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              Revisar Alterações
            </button>
          ) : (
            <button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <span className="animate-pulse">Salvando...</span>
              ) : (
                <>
                  <Save size={16} />
                  Confirmar e Salvar
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

const FieldInput = ({ 
  label, 
  field, 
  value, 
  placeholder,
  onChange,
  badge
}: { 
  label: string; 
  field: string; 
  value: string; 
  placeholder?: string;
  onChange: (f: string, v: string) => void;
  badge?: string;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <label className="text-xs text-zinc-400 font-medium">{label}</label>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium flex items-center gap-1">
          <Sparkles size={10} className="text-indigo-400 animate-pulse" />
          {badge}
        </span>
      )}
    </div>
    <input
      type="number"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(field, e.target.value)}
      className={`bg-zinc-900 border text-white p-2 rounded-md focus:ring-1 outline-none text-sm placeholder:text-zinc-600 transition-all ${
        badge ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-zinc-700 focus:ring-indigo-500'
      }`}
    />
  </div>
);
