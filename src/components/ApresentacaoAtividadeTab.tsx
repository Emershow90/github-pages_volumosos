import React, { useState } from 'react';
import { Plus, Save, Activity, Users, ClipboardList } from 'lucide-react';
import { useSectorStore } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { Setor } from '../types';

interface ApresentacaoAtividadeTabProps {
  setores: Setor[];
  activeSectorId: string;
  onChangeSector: (id: string) => void;
}

export const ApresentacaoAtividadeTab: React.FC<ApresentacaoAtividadeTabProps> = ({
  setores,
  activeSectorId,
  onChangeSector
}) => {
  const { currentUser } = useUserStore();
  const currentRole = currentUser?.role?.toLowerCase() || 'consulta';
  const isReadOnly = currentRole === 'consulta' || currentRole === 'guest';
  
  const { activityEntries, incrementActivityCategory, updateActivityTextField, updateAdhocCategory } = useSectorStore();
  
  const today = new Date().toISOString().split('T')[0];
  const entriesToday = activityEntries.filter(e => e.sectorId === activeSectorId && e.activityDate === today);
  
  const totalNumeric = entriesToday.reduce((acc, curr) => acc + (curr.alimento || 0) + (curr.montanha || 0) + (curr.l7Mochila || 0) + (curr.colis || 0), 0);
  const distinctUsers = new Set(entriesToday.map(e => e.userId)).size;

  const [incValues, setIncValues] = useState({ alimento: '', montanha: '', l7Mochila: '', colis: '' });
  const [textValues, setTextValues] = useState({ elog: '', reapro: '' });
  const [newAdhocName, setNewAdhocName] = useState('');
  const [newAdhocValue, setNewAdhocValue] = useState('');
  
  const [adhocUpdates, setAdhocUpdates] = useState<Record<string, string>>({});

  const handleIncrement = (category: 'alimento' | 'montanha' | 'l7Mochila' | 'colis') => {
    if (isReadOnly || !currentUser) return;
    const qty = parseInt(incValues[category]) || 0;
    if (qty > 0) {
      incrementActivityCategory(activeSectorId, today, currentUser.uid, category, qty);
      setIncValues(prev => ({ ...prev, [category]: '' }));
    }
  };

  const handleUpdateText = (field: 'elog' | 'reapro') => {
    if (isReadOnly || !currentUser) return;
    updateActivityTextField(activeSectorId, today, currentUser.uid, field, textValues[field]);
    setTextValues(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddAdhoc = () => {
    if (isReadOnly || !currentUser) return;
    if (newAdhocName.trim() !== '' && newAdhocValue.trim() !== '') {
      const numVal = Number(newAdhocValue);
      const finalVal = isNaN(numVal) ? newAdhocValue : numVal;
      updateAdhocCategory(activeSectorId, today, currentUser.uid, newAdhocName.trim(), finalVal);
      setNewAdhocName('');
      setNewAdhocValue('');
    }
  };

  const handleUpdateAdhoc = (catName: string) => {
    if (isReadOnly || !currentUser) return;
    const val = adhocUpdates[catName];
    if (val !== undefined && val.trim() !== '') {
      const numVal = Number(val);
      const finalVal = isNaN(numVal) ? val : numVal;
      updateAdhocCategory(activeSectorId, today, currentUser.uid, catName, finalVal);
      setAdhocUpdates(prev => ({ ...prev, [catName]: '' }));
    }
  };

  // Get unique adhoc categories from today's entries
  const allAdhocCategories = new Set<string>();
  entriesToday.forEach(e => {
    if (e.adhocCategories) {
      Object.keys(e.adhocCategories).forEach(k => allAdhocCategories.add(k));
    }
  });
  const adhocCategoriesList = Array.from(allAdhocCategories);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Apresentação de Atividade</h2>
          <p className="text-[0.65rem] text-zinc-500 uppercase font-semibold tracking-wider">
            Lançamento Rápido — {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Setor:</label>
          <select
            value={activeSectorId}
            onChange={(e) => onChangeSector(e.target.value)}
            className="bg-zinc-900 border border-white/10 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.numero})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-b-2 border-indigo-500">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Total de Atividades</p>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            <p className="text-3xl font-black text-indigo-400 font-mono">{totalNumeric.toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="glass-card p-5">
          <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider font-bold mb-1">Lançamentos (Usuários)</p>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-300" />
            <p className="text-3xl font-black text-white font-mono">{distinctUsers}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-bold text-white text-sm uppercase mb-4 border-b border-white/5 pb-3">Apontamento Rápido</h3>
          
          <div className="space-y-4">
            <h4 className="text-[0.65rem] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Categorias Numéricas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['alimento', 'montanha', 'l7Mochila', 'colis'] as const).map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
                  <span className="text-xs font-bold text-zinc-300 uppercase w-24">
                    {cat === 'l7Mochila' ? 'L7 Mochila' : cat}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={incValues[cat]}
                    onChange={(e) => setIncValues(prev => ({ ...prev, [cat]: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Qtd"
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => handleIncrement(cat)}
                    disabled={isReadOnly || !incValues[cat]}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1 rounded transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>

            <h4 className="text-[0.65rem] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mt-6">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Campos de Texto
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['elog', 'reapro'] as const).map(field => (
                <div key={field} className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
                  <span className="text-xs font-bold text-zinc-300 uppercase w-24">
                    {field === 'elog' ? 'E-LOG' : 'REAPRO'}
                  </span>
                  <input
                    type="text"
                    value={textValues[field]}
                    onChange={(e) => setTextValues(prev => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder={field === 'elog' ? "Ex: 2J RA FALC (174)" : "Ex: 143 CX"}
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => handleUpdateText(field)}
                    disabled={isReadOnly || !textValues[field].trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1 px-2 rounded transition-colors text-xs font-bold"
                  >
                    Atualizar
                  </button>
                </div>
              ))}
            </div>

            <h4 className="text-[0.65rem] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 mt-6">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Categorias Ad-hoc
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
                <input
                  type="text"
                  value={newAdhocName}
                  onChange={(e) => setNewAdhocName(e.target.value)}
                  className="w-1/3 bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Nome Categoria"
                  disabled={isReadOnly}
                />
                <input
                  type="text"
                  value={newAdhocValue}
                  onChange={(e) => setNewAdhocValue(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Valor"
                  disabled={isReadOnly}
                />
                <button
                  onClick={handleAddAdhoc}
                  disabled={isReadOnly || !newAdhocName.trim() || !newAdhocValue.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1 px-2 rounded transition-colors text-xs font-bold whitespace-nowrap"
                >
                  + Nova Categoria
                </button>
              </div>

              {adhocCategoriesList.map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5 pl-4">
                  <span className="text-xs font-bold text-zinc-300 uppercase w-1/3 truncate" title={cat}>
                    • {cat}
                  </span>
                  <input
                    type="text"
                    value={adhocUpdates[cat] ?? ''}
                    onChange={(e) => setAdhocUpdates(prev => ({ ...prev, [cat]: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Novo valor"
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => handleUpdateAdhoc(cat)}
                    disabled={isReadOnly || !adhocUpdates[cat]?.trim()}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1 px-2 rounded transition-colors text-xs font-bold"
                  >
                    Atualizar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold text-zinc-400 text-[0.65rem] uppercase tracking-wide mb-3">Ações Administrativas</h3>
          <div className="space-y-2">
            <button
              onClick={() => {}}
              className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs py-2 rounded border border-white/10 transition cursor-not-allowed opacity-50"
              disabled
            >
              Exportar CSV (Em breve)
            </button>
            <button
              onClick={() => {}}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs py-2 rounded border border-rose-500/20 transition cursor-not-allowed opacity-50"
              disabled
            >
              Zerar Turno (Em breve)
            </button>
          </div>
          
          <div className="mt-8 border-t border-white/5 pt-4">
             <h3 className="font-bold text-zinc-400 text-[0.65rem] uppercase tracking-wide mb-3">Alertas Ativos</h3>
             <p className="text-[10px] text-emerald-400 opacity-60 italic">Nenhum alerta ativo no momento.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-white text-sm uppercase mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
          <ClipboardList size={16} className="text-indigo-400" /> Histórico Diário
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-zinc-400 uppercase">
                <th className="p-2 font-black">Usuário ID</th>
                <th className="p-2 font-black text-center">Alimento</th>
                <th className="p-2 font-black text-center">Montanha</th>
                <th className="p-2 font-black text-center">L7 Mochila</th>
                <th className="p-2 font-black text-center">Colis</th>
                <th className="p-2 font-black">E-LOG</th>
                <th className="p-2 font-black">REAPRO</th>
                {adhocCategoriesList.map(cat => (
                  <th key={cat} className="p-2 font-black text-sky-400 max-w-[100px] truncate" title={cat}>{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entriesToday.length === 0 ? (
                <tr>
                  <td colSpan={7 + adhocCategoriesList.length} className="text-center p-4 text-zinc-500 italic">
                    Nenhum lançamento efetuado hoje neste setor.
                  </td>
                </tr>
              ) : (
                entriesToday.map(entry => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-2 text-zinc-300 truncate max-w-[120px]" title={entry.userId}>
                      {currentUser?.uid === entry.userId ? <span className="text-emerald-400 font-bold">Você</span> : entry.userId.substring(0, 8) + '...'}
                    </td>
                    <td className="p-2 text-center text-white font-mono">{entry.alimento}</td>
                    <td className="p-2 text-center text-white font-mono">{entry.montanha}</td>
                    <td className="p-2 text-center text-white font-mono">{entry.l7Mochila}</td>
                    <td className="p-2 text-center text-white font-mono">{entry.colis}</td>
                    <td className="p-2 text-zinc-300 max-w-[150px] truncate" title={entry.elog}>{entry.elog || '-'}</td>
                    <td className="p-2 text-zinc-300 max-w-[150px] truncate" title={entry.reapro}>{entry.reapro || '-'}</td>
                    {adhocCategoriesList.map(cat => (
                      <td key={cat} className="p-2 text-sky-300">
                        {entry.adhocCategories?.[cat] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
