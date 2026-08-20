import React, { useState, useEffect } from 'react';
import { Setor } from '../types/Setor';
import { Settings, X, AlertTriangle, Save, Sparkles, RefreshCw } from 'lucide-react';
import { fetchPublicSpreadsheetMetrics, PublicSpreadsheetMetricsMap } from '../lib/googleSheetsPublicSource';
import { useSectorStore } from '../stores/useSectorStore';
import { useToast } from '../hooks/useToast';

export interface OverrideOperacionalFormProps {
  setores: Setor[];
  onUpdateSetor?: (id: string, field: string, value: number) => void;
  onClose?: () => void;
  currentUser: string;
}

export const OverrideOperacionalForm: React.FC<OverrideOperacionalFormProps> = ({
  setores,
  onUpdateSetor,
  onClose,
  currentUser,
}) => {
  const toast = useToast();
  const { updateSectorOverride, applySuggestedMetrics } = useSectorStore();
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
  const [suggestedRepro, setSuggestedRepro] = useState<string>('');
  const [suggestedPromessa, setSuggestedPromessa] = useState<string>('');
  const [suggestedBsi, setSuggestedBsi] = useState<string>('');
  const [suggestedErros, setSuggestedErros] = useState<string>('');

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch public Google Sheets CSV metrics on modal open
  useEffect(() => {
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

    setIsConfirming(false);
    setIsSaving(false);

    fetchPublicSpreadsheetMetrics()
      .then((pubData) => {
        setPublicMetrics(pubData);
        // Aplica globalmente na store
        const convertedMap: Record<string, any> = {};
        Object.entries(pubData).forEach(([sec, val]) => {
          convertedMap[sec] = {
            ativ: val.atividadeTotal,
            uph: val.uph,
            promessa: val.promessa,
            bsi: val.bsi,
            errosPicking: val.errosPicking,
            reproTotal: val.caixasDisponiveis,
          };
        });
        applySuggestedMetrics(convertedMap);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Erro ao carregar dados da planilha: ${msg}`);
      });
  }, []);

  // Pre-fill metrics when a sector is selected
  useEffect(() => {
    if (!selectedSector) {
      setSuggestedAtiv('');
      setSuggestedUph('');
      setSuggestedRepro('');
      setSuggestedPromessa('');
      setSuggestedBsi('');
      setSuggestedErros('');
      setFormData({
        ativ: '',
        uph: '',
        reproTotal: '',
        promessa: '',
        nota5s: '',
        bsi: '',
        errosPicking: '',
      });
      return;
    }

    const currentSec = setores.find((s) => s.id === selectedSector);
    const pub = publicMetrics?.[selectedSector] || publicMetrics?.[selectedSector.replace('-', '')];

    const sugAtiv = pub?.atividadeTotal?.toString() || currentSec?.suggestedMetrics?.ativ?.toString() || '';
    const sugUph = (pub?.uph && pub.uph > 0) ? pub.uph.toString() : currentSec?.suggestedMetrics?.uph?.toString() || '';
    const sugRepro = pub?.caixasDisponiveis?.toString() || currentSec?.suggestedMetrics?.reproTotal?.toString() || '';
    const sugProm = pub?.promessa != null ? pub.promessa.toString() : '100';
    const sugBsi = pub?.bsi != null ? pub.bsi.toString() : '100';
    const sugErr = pub?.errosPicking != null ? pub.errosPicking.toString() : '0';

    setSuggestedAtiv(sugAtiv);
    setSuggestedUph(sugUph);
    setSuggestedRepro(sugRepro);
    setSuggestedPromessa(sugProm);
    setSuggestedBsi(sugBsi);
    setSuggestedErros(sugErr);

    // Carrega overrides existentes se houver
    const ov = currentSec?.overrides || {};
    setFormData({
      ativ: ov.ativ !== undefined && ov.ativ !== null ? ov.ativ.toString() : '',
      uph: ov.uph !== undefined && ov.uph !== null ? ov.uph.toString() : '',
      reproTotal: ov.reproTotal !== undefined && ov.reproTotal !== null ? ov.reproTotal.toString() : '',
      promessa: ov.promessa !== undefined && ov.promessa !== null ? ov.promessa.toString() : '',
      nota5s: ov.nota5s !== undefined && ov.nota5s !== null ? ov.nota5s.toString() : '',
      bsi: ov.bsi !== undefined && ov.bsi !== null ? ov.bsi.toString() : '',
      errosPicking: ov.errosPicking !== undefined && ov.errosPicking !== null ? ov.errosPicking.toString() : '',
    });
  }, [selectedSector, publicMetrics, setores]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearOverride = (field: string) => {
    setFormData((prev) => ({ ...prev, [field]: '' }));
  };

  const handleReview = () => {
    if (!selectedSector) return;
    setIsConfirming(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedSector) return;
    setIsSaving(true);
    try {
      const parsedOverrides: Record<string, number | null> = {};
      Object.entries(formData).forEach(([field, val]) => {
        if (val.trim() === '') {
          parsedOverrides[field] = null; // Remove override, volta ao sugerido
        } else {
          parsedOverrides[field] = Number(val);
        }
      });

      await updateSectorOverride(selectedSector, parsedOverrides, currentUser || 'operador');

      if (onUpdateSetor) {
        Object.entries(parsedOverrides).forEach(([field, val]) => {
          if (val !== null) {
            onUpdateSetor(selectedSector, field, val);
          }
        });
      }

      toast.success('Parâmetros e overrides salvos com sucesso!');
      onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erro ao salvar os dados: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSectorData = setores.find((s) => s.id === selectedSector);

  return (
    <div className="bg-zinc-900/60 border border-white/5 rounded-xl w-full mx-auto shadow-xl overflow-hidden flex flex-col">
      <div className="p-6">
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
                    {s.nome} (Setor {s.id})
                  </option>
                ))}
              </select>
            </div>

            {selectedSector && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>
                    <strong>Regra de Override:</strong> O campo preenchido tem prioridade máxima no Painel. Deixe em branco para usar automaticamente o <strong>Valor Sugerido da Planilha</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldInput 
                    label="Atividade" 
                    field="ativ" 
                    value={formData.ativ} 
                    suggestedValue={suggestedAtiv}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('ativ')}
                  />
                  <FieldInput 
                    label="UPH" 
                    field="uph" 
                    value={formData.uph} 
                    suggestedValue={suggestedUph}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('uph')}
                  />
                  <FieldInput 
                    label="Caixas Disponíveis (Repro Total)" 
                    field="reproTotal" 
                    value={formData.reproTotal} 
                    suggestedValue={suggestedRepro}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('reproTotal')}
                  />
                  <FieldInput 
                    label="Promessa (%)" 
                    field="promessa" 
                    value={formData.promessa} 
                    suggestedValue={suggestedPromessa}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('promessa')}
                  />
                  <FieldInput 
                    label="Auditoria 5S" 
                    field="nota5s" 
                    value={formData.nota5s} 
                    suggestedValue="100"
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('nota5s')}
                  />
                  <FieldInput 
                    label="BSI (%)" 
                    field="bsi" 
                    value={formData.bsi} 
                    suggestedValue={suggestedBsi}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('bsi')}
                  />
                  <FieldInput 
                    label="Erros Picking" 
                    field="errosPicking" 
                    value={formData.errosPicking} 
                    suggestedValue={suggestedErros}
                    onChange={handleInputChange} 
                    onClear={() => handleClearOverride('errosPicking')}
                  />
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
                <span className="text-white font-bold">{activeSectorData?.nome} (Setor {activeSectorData?.id})</span>
              </div>
              
              <div className="space-y-2">
                {Object.entries(formData).map(([field, val]) => {
                  const hasOverride = val.trim() !== '';
                  let sugVal = '';
                  if (field === 'ativ') sugVal = suggestedAtiv;
                  if (field === 'uph') sugVal = suggestedUph;
                  if (field === 'reproTotal') sugVal = suggestedRepro;
                  if (field === 'promessa') sugVal = suggestedPromessa;
                  if (field === 'bsi') sugVal = suggestedBsi;
                  if (field === 'errosPicking') sugVal = suggestedErros;

                  return (
                    <div key={field} className="flex justify-between text-sm items-center py-1 border-b border-white/5 last:border-0">
                      <span className="text-zinc-400 font-mono capitalize">{field}</span>
                      {hasOverride ? (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold flex items-center gap-1.5">
                            ⚡ Override: {val}
                          </span>
                          {sugVal && (
                            <span className="text-[10px] text-zinc-500 line-through">
                              (Planilha: {sugVal})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <Sparkles size={11} /> Usando Sugerido ({sugVal || '0'})
                        </span>
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
            className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Voltar
          </button>
        )}
        
        {!isConfirming ? (
          <button
            onClick={handleReview}
            disabled={!selectedSector}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            Revisar Parâmetros
          </button>
        ) : (
          <button
            onClick={handleConfirmSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
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
  );
};

const FieldInput = ({ 
  label, 
  field, 
  value, 
  suggestedValue,
  onChange,
  onClear,
}: { 
  label: string; 
  field: string; 
  value: string; 
  suggestedValue?: string;
  onChange: (f: string, v: string) => void;
  onClear: () => void;
}) => {
  const hasOverride = value.trim() !== '';

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-300 font-semibold">{label}</label>
        {suggestedValue && (
          <span className="text-[10px] text-zinc-400 font-mono">
            Sugerido: <strong className="text-indigo-300">{suggestedValue}</strong>
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="number"
          value={value}
          placeholder={suggestedValue ? `Sugerido: ${suggestedValue}` : '0'}
          onChange={(e) => onChange(field, e.target.value)}
          className={`w-full bg-black border text-white p-2.5 rounded-lg focus:ring-2 outline-none text-sm placeholder:text-zinc-600 transition-all font-mono ${
            hasOverride ? 'border-amber-500 text-amber-300 focus:ring-amber-500' : 'border-zinc-700 focus:ring-indigo-500 text-zinc-300'
          }`}
        />
        {hasOverride && (
          <button
            type="button"
            onClick={onClear}
            title="Limpar override e usar valor da planilha"
            className="absolute right-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw size={10} /> Auto
          </button>
        )}
      </div>
      <div className="text-[10px] flex items-center justify-between">
        {hasOverride ? (
          <span className="text-amber-400 font-medium flex items-center gap-1">
            ⚡ Override ativo (sobrescreve o sugerido)
          </span>
        ) : (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            ✓ Utilizando valor sugerido da planilha
          </span>
        )}
      </div>
    </div>
  );
};

