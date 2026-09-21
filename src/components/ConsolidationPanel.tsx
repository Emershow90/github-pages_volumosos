import React, { useState, useEffect } from 'react';
import { fetchSimpleSheet } from '../services/simpleSheetService';

export const ConsolidationPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  const runHealthCheck = async () => {
    if (!sheetUrl) return alert('Insira a URL da planilha publicada (CSV)');
    setIsChecking(true);
    try {
      const data: any = await fetchSimpleSheet(sheetUrl);
      
      const diagnostics = data.map((row: any, rowIndex: number) => ({
        rowIndex,
        row,
        isValid: Object.values(row).every(v => v !== null && v !== ''), // Simple validation
        issues: null
      }));
      
      setDiagnostics(diagnostics || []);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar planilha: ' + e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const checkReminder = async () => {
      const hour = new Date().getHours();
      if (hour >= 18) {
         setNeedsUpdate(true);
      }
    };
    checkReminder();
  }, []);

  return (
    <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Consolidação de Planilha (CSV)</h3>
      <input 
        type="text" 
        placeholder="Cole a URL da Planilha CSV publicada aqui" 
        value={sheetUrl}
        onChange={(e) => setSheetUrl(e.target.value)}
        className="w-full p-3 bg-zinc-950 rounded-lg text-sm text-white border border-zinc-700"
      />
      {needsUpdate && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-xs">
          ⚠️ Lembrete: Consolidação diária pendente (após 18h).
        </div>
      )}
      <button onClick={runHealthCheck} className="px-4 py-2 bg-indigo-600 rounded-lg text-white text-xs">
        {isChecking ? 'Verificando...' : 'Executar Health Check'}
      </button>
      
      {diagnostics.length > 0 && (
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr><th>Linha</th><th>Status</th></tr>
          </thead>
          <tbody>
            {diagnostics.slice(0, 20).map((d, i) => (
              <tr key={i} className={!d.isValid ? 'bg-red-900/20' : ''}>
                <td>{d.rowIndex}</td>
                <td>{d.isValid ? 'OK' : 'Erro'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
