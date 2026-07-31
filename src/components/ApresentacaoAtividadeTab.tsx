import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Activity, 
  Users, 
  ClipboardList, 
  Download, 
  TrendingUp, 
  CheckCircle2, 
  UserCheck, 
  Zap, 
  Shield, 
  Layers, 
  Award,
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  BarChart3,
  PieChart,
  X,
  Sparkles
} from 'lucide-react';
import { useSectorStore } from '../stores/useSectorStore';
import { useUserStore } from '../stores/useUserStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { Setor, UserRole, ColaboradorStatus } from '../types';

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
  const { currentUser, currentRole, currentUserUid, allUsers, addToast } = useUserStore();
  const { colaboradores } = useCollaboratorStore();
  const { activityEntries, incrementActivityCategory, updateActivityTextField, updateAdhocCategory } = useSectorStore();

  const [isTvMode, setIsTvMode] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  const [liveDate, setLiveDate] = useState('');

  const isReadOnly = currentRole === UserRole.Consulta || currentRole === UserRole.Guest;
  const currentUserId = currentUserUid || 'local-user';

  // Live Clock effect for TV Mode
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('pt-BR', { hour12: false }));
      setLiveDate(now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected sector data
  const activeSector = setores.find(s => s.id === activeSectorId || s.numero.toString() === activeSectorId) || setores[0];

  // Active sector collaborators
  const sectorCollaborators = colaboradores.filter(
    c => activeSector && (c.setor === activeSector.id || c.setor === activeSector.nome || c.setor === `S${activeSector.numero}`)
  );

  const today = new Date().toISOString().split('T')[0];
  const entriesToday = activityEntries.filter(e => e.sectorId === (activeSector?.id || activeSectorId) && e.activityDate === today);

  // Totals calculated from entries
  const totalAlimento = entriesToday.reduce((acc, curr) => acc + (curr.alimento || 0), 0);
  const totalMontanha = entriesToday.reduce((acc, curr) => acc + (curr.montanha || 0), 0);
  const totalL7Mochila = entriesToday.reduce((acc, curr) => acc + (curr.l7Mochila || 0), 0);
  const totalColis = entriesToday.reduce((acc, curr) => acc + (curr.colis || 0), 0);
  
  const totalNumeric = totalAlimento + totalMontanha + totalL7Mochila + totalColis;
  const distinctUsers = new Set(entriesToday.map(e => e.userId)).size;

  // Sector Goal Progress Percentage
  const sectorMeta = activeSector?.meta || 1000;
  const goalProgressPct = Math.min(Math.round((totalNumeric / Math.max(sectorMeta, 1)) * 100), 100);

  // Operator Volume Aggregation
  const operatorVolumes: Record<string, number> = {};
  entriesToday.forEach(e => {
    const sum = (e.alimento || 0) + (e.montanha || 0) + (e.l7Mochila || 0) + (e.colis || 0);
    operatorVolumes[e.userId] = (operatorVolumes[e.userId] || 0) + sum;
  });

  const sortedOperators = Object.entries(operatorVolumes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxOperatorVol = sortedOperators.length > 0 ? sortedOperators[0][1] : 1;

  // Quick Increment States
  const [incValues, setIncValues] = useState({ alimento: '', montanha: '', l7Mochila: '', colis: '' });
  const [textValues, setTextValues] = useState({ elog: '', reapro: '' });
  const [newAdhocName, setNewAdhocName] = useState('');
  const [newAdhocValue, setNewAdhocValue] = useState('');
  const [adhocUpdates, setAdhocUpdates] = useState<Record<string, string>>({});

  const handleIncrement = (category: 'alimento' | 'montanha' | 'l7Mochila' | 'colis', customQty?: number) => {
    if (isReadOnly) {
      addToast('Modo de leitura ativo. Não é possível alterar.', 'warning');
      return;
    }
    const qty = customQty !== undefined ? customQty : (parseInt(incValues[category]) || 0);
    if (qty > 0 && activeSector) {
      incrementActivityCategory(activeSector.id, today, currentUserId, category, qty);
      setIncValues(prev => ({ ...prev, [category]: '' }));
      addToast(`+${qty} adicionado a ${category.toUpperCase()} com sucesso!`, 'success');
    }
  };

  const handleUpdateText = (field: 'elog' | 'reapro') => {
    if (isReadOnly) {
      addToast('Modo de leitura ativo. Não é possível alterar.', 'warning');
      return;
    }
    if (textValues[field].trim() !== '' && activeSector) {
      updateActivityTextField(activeSector.id, today, currentUserId, field, textValues[field]);
      setTextValues(prev => ({ ...prev, [field]: '' }));
      addToast(`Campo ${field.toUpperCase()} atualizado!`, 'success');
    }
  };

  const handleAddAdhoc = () => {
    if (isReadOnly) {
      addToast('Modo de leitura ativo.', 'warning');
      return;
    }
    if (newAdhocName.trim() !== '' && newAdhocValue.trim() !== '' && activeSector) {
      const numVal = Number(newAdhocValue);
      const finalVal = isNaN(numVal) ? newAdhocValue : numVal;
      updateAdhocCategory(activeSector.id, today, currentUserId, newAdhocName.trim(), finalVal);
      setNewAdhocName('');
      setNewAdhocValue('');
      addToast(`Categoria Ad-hoc "${newAdhocName}" registrada!`, 'success');
    }
  };

  const handleUpdateAdhoc = (catName: string) => {
    if (isReadOnly) {
      addToast('Modo de leitura ativo.', 'warning');
      return;
    }
    const val = adhocUpdates[catName];
    if (val !== undefined && val.trim() !== '' && activeSector) {
      const numVal = Number(val);
      const finalVal = isNaN(numVal) ? val : numVal;
      updateAdhocCategory(activeSector.id, today, currentUserId, catName, finalVal);
      setAdhocUpdates(prev => ({ ...prev, [catName]: '' }));
      addToast(`Ad-hoc "${catName}" atualizada!`, 'success');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (entriesToday.length === 0) {
      addToast('Nenhum dado registrado hoje para exportar.', 'info');
      return;
    }
    const headers = ['Data', 'Setor ID', 'Setor Nome', 'Usuario ID', 'Alimento', 'Montanha', 'L7 Mochila', 'Colis', 'E-LOG', 'REAPRO', ...adhocCategoriesList];
    const rows = entriesToday.map(e => [
      e.activityDate,
      activeSector?.numero || activeSectorId,
      `"${(activeSector?.nome || '').replace(/"/g, '""')}"`,
      e.userId,
      e.alimento || 0,
      e.montanha || 0,
      e.l7Mochila || 0,
      e.colis || 0,
      `"${(e.elog || '').replace(/"/g, '""')}"`,
      `"${(e.reapro || '').replace(/"/g, '""')}"`,
      ...adhocCategoriesList.map(cat => `"${(e.adhocCategories?.[cat] ?? '').toString().replace(/"/g, '""')}"`)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apontamentos_S${activeSector?.numero || '00'}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Relatório CSV exportado com sucesso!', 'success');
  };

  // Get unique adhoc categories from today's entries
  const allAdhocCategories = new Set<string>();
  entriesToday.forEach(e => {
    if (e.adhocCategories) {
      Object.keys(e.adhocCategories).forEach(k => allAdhocCategories.add(k));
    }
  });
  const adhocCategoriesList = Array.from(allAdhocCategories);

  // Helper to resolve User display name from ID
  const getUserDisplayName = (uid: string) => {
    if (uid === currentUserUid || uid === 'local-user') return `${currentUser || 'Você'} (Você)`;
    const found = allUsers.find(u => u.uid === uid);
    if (found) return found.nome;
    return `Operador (${uid.substring(0, 6)}...)`;
  };

  // =========================================================================
  // MODO APRESENTAÇÃO (TV MONITOR COMMAND CENTER)
  // =========================================================================
  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#031427] text-slate-100 flex flex-col p-6 gap-6 overflow-hidden select-none font-sans">
        {/* TV HEADER */}
        <header className="flex justify-between items-center border-l-8 border-orange-500 bg-[#0b1c30] pl-6 pr-8 py-4 rounded-xl shadow-2xl border border-slate-700/50">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-orange-500 font-extrabold tracking-widest text-xs uppercase flex items-center gap-2">
                <Radio size={14} className="animate-pulse text-emerald-400" />
                Torre de Comando — TV Monitor
              </span>
              <h1 className="text-white text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                S{activeSector?.numero || '00'} {activeSector?.nome || 'COMMAND'}
              </h1>
            </div>

            <div className="h-12 w-[1px] bg-slate-700/60 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Status do Turno</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-emerald-400 font-black text-sm uppercase">Shift Alpha — Ativo</span>
              </div>
            </div>

            {/* Sector Selector directly in TV Mode Header */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Layers size={14} className="text-indigo-400" />
              <select
                value={activeSector?.id || activeSectorId}
                onChange={(e) => onChangeSector(e.target.value)}
                className="bg-transparent text-white text-xs font-bold uppercase focus:outline-none cursor-pointer"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    Setor {s.numero} — {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-slate-400 text-xs font-mono font-bold">{liveDate}</span>
              <span className="text-white font-mono text-3xl sm:text-4xl font-black tracking-tight">{liveClock}</span>
            </div>

            <button
              onClick={() => setIsTvMode(false)}
              className="bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg"
              title="Sair do Modo TV"
            >
              <Minimize2 size={16} />
              <span className="hidden sm:inline">Sair do Modo TV</span>
            </button>
          </div>
        </header>

        {/* TV MAIN GRID */}
        <main className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          {/* LEFT COLUMN: PERFORMANCE & METRICS */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            
            {/* TOP BENTO: META & UPH INDICATOR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* META DA PRODUÇÃO */}
              <div className="bg-[#0b1c30] border border-slate-700/60 p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-emerald-400"></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Meta do Turno</span>
                  <span className="text-emerald-400 font-mono font-black text-2xl">{goalProgressPct}%</span>
                </div>
                <div className="my-3">
                  <p className="text-4xl font-black text-white font-mono tracking-tight">
                    {totalNumeric.toLocaleString("pt-BR")} <span className="text-xs text-slate-400 font-sans font-medium">/ {sectorMeta.toLocaleString("pt-BR")} pkts</span>
                  </p>
                </div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-orange-500 via-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${goalProgressPct}%` }}
                  ></div>
                </div>
              </div>

              {/* PERFORMANCE UPH */}
              <div className="bg-[#0b1c30] border border-slate-700/60 p-5 rounded-2xl flex flex-col justify-between shadow-xl border-l-4 border-l-emerald-400">
                <span className="text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" /> UPH do Setor
                </span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-emerald-400 font-mono">{activeSector?.uph || 0}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase">un / hora</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Promessa: <strong className="text-slate-200 font-mono">{activeSector?.promessa?.toLocaleString("pt-BR") || 0}</strong>
                </p>
              </div>

              {/* OPERADORES ATIVOS */}
              <div className="bg-[#0b1c30] border border-slate-700/60 p-5 rounded-2xl flex flex-col justify-between shadow-xl border-l-4 border-l-indigo-500">
                <span className="text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-400" /> Operadores em Campo
                </span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-indigo-300 font-mono">{distinctUsers}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase">ativos hoje</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  Líder: <strong className="text-white">{activeSector?.resp || 'Indefinido'}</strong>
                </p>
              </div>
            </div>

            {/* MIDDLE BENTO: CATEGORY BREAKDOWN & OPERATOR VOLUMES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              
              {/* BREAKDOWN DE CATEGORIAS */}
              <div className="bg-[#0b1c30] border border-slate-700/60 p-6 rounded-2xl flex flex-col shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <PieChart size={16} className="text-orange-400" /> Distribuição por Categoria
                </h3>

                <div className="grid grid-cols-2 gap-3 flex-1 items-center">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-emerald-400 font-black uppercase">Alimento</span>
                    <span className="text-2xl font-black text-white font-mono mt-1">{totalAlimento.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {totalNumeric > 0 ? Math.round((totalAlimento / totalNumeric) * 100) : 0}% do total
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-indigo-400 font-black uppercase">Montanha</span>
                    <span className="text-2xl font-black text-white font-mono mt-1">{totalMontanha.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {totalNumeric > 0 ? Math.round((totalMontanha / totalNumeric) * 100) : 0}% do total
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-purple-400 font-black uppercase">L7 Mochila</span>
                    <span className="text-2xl font-black text-white font-mono mt-1">{totalL7Mochila.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {totalNumeric > 0 ? Math.round((totalL7Mochila / totalNumeric) * 100) : 0}% do total
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-sky-400 font-black uppercase">Colis</span>
                    <span className="text-2xl font-black text-white font-mono mt-1">{totalColis.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {totalNumeric > 0 ? Math.round((totalColis / totalNumeric) * 100) : 0}% do total
                    </span>
                  </div>
                </div>
              </div>

              {/* TOP VOLUMES POR OPERADOR */}
              <div className="bg-[#0b1c30] border border-slate-700/60 p-6 rounded-2xl flex flex-col shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <BarChart3 size={16} className="text-emerald-400" /> Volume por Operador
                </h3>

                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  {sortedOperators.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center">Nenhum volume registrado por operadores hoje.</p>
                  ) : (
                    sortedOperators.map(([uid, vol], idx) => {
                      const pct = Math.round((vol / maxOperatorVol) * 100);
                      return (
                        <div key={uid} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-200 font-bold truncate max-w-[160px]">
                              {idx + 1}. {getUserDisplayName(uid)}
                            </span>
                            <span className="text-emerald-400 font-mono font-bold">{vol.toLocaleString("pt-BR")} pkts</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: LIVE FEED DE LANÇAMENTOS */}
          <div className="col-span-12 lg:col-span-4 bg-[#071322] border border-slate-700/60 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#0d223a] border-b border-slate-700/80 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-orange-400" /> Live Feed Operacional
              </h3>
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                AO VIVO
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {entriesToday.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Clock size={32} className="opacity-40" />
                  <p className="text-xs font-bold">Aguardando lançamentos do turno...</p>
                </div>
              ) : (
                entriesToday.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="bg-[#0b1c30] p-3.5 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {getUserDisplayName(entry.userId)}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje'}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center bg-slate-900/80 p-2 rounded-lg text-[10px] font-mono border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">ALIM</span>
                        <span className="text-emerald-400 font-bold">{entry.alimento || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">MONT</span>
                        <span className="text-indigo-300 font-bold">{entry.montanha || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">L7</span>
                        <span className="text-purple-300 font-bold">{entry.l7Mochila || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">COL</span>
                        <span className="text-sky-300 font-bold">{entry.colis || 0}</span>
                      </div>
                    </div>

                    {(entry.elog || entry.reapro) && (
                      <div className="text-[11px] space-y-1 pt-1 border-t border-slate-800/60">
                        {entry.elog && <p className="text-amber-300 truncate"><strong>E-LOG:</strong> {entry.elog}</p>}
                        {entry.reapro && <p className="text-sky-300 truncate"><strong>REAPRO:</strong> {entry.reapro}</p>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* TV FOOTER SECURITY */}
        <footer className="h-10 flex justify-between items-center px-6 bg-[#0b1c30] border border-slate-700/50 rounded-xl text-[11px] text-slate-400 font-mono">
          <div className="flex gap-6">
            <span>SETOR: S{activeSector?.numero} — {activeSector?.nome}</span>
            <span className="hidden sm:inline">CRIPTOGRAFIA: AES-256 REALTIME</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>TERMINAL SINCRONIZADO</span>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // MODO OPERACIONAL PADRÃO (STANDARD OPERATIONAL TERMINAL VIEW)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* HEADER BANNER - CONECTADO AO SETOR */}
      <div className="glass-card p-6 border-l-4 border-indigo-500 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          
          {/* Info do Setor Selecionado */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-800 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              S{activeSector?.numero || '00'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {activeSector?.nome || 'Setor Operacional'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Ativo / {activeSector?.situacao || 'Operando'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Líder Responsável: <strong className="text-white">{activeSector?.resp || 'Não atribuído'}</strong></span>
                <span>•</span>
                <span>Promessa: <strong className="text-indigo-300 font-mono">{activeSector?.promessa?.toLocaleString("pt-BR") || 0}</strong></span>
              </p>
            </div>
          </div>

          {/* Seletor de Setor & Ações */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
              <Layers size={16} className="text-indigo-400 ml-1" />
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Setor:</label>
              <select
                value={activeSector?.id || activeSectorId}
                onChange={(e) => onChangeSector(e.target.value)}
                className="bg-zinc-900 text-white text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-white/10 cursor-pointer"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    Setor {s.numero} — {s.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTAO MODO APRESENTACAO / TV MONITOR */}
            <button
              onClick={() => setIsTvMode(true)}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-xs px-4 py-2.5 rounded-xl border border-orange-400/30 flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
              title="Alternar para o Modo TV / Painel de Apresentação"
            >
              <Tv size={16} />
              <span>Modo Apresentação (TV)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/10 flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Exportar dados de hoje em CSV"
            >
              <Download size={15} className="text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso da Meta do Turno */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-400" /> Cumprimento da Meta do Turno
              </span>
              <span className="font-mono font-bold text-white">
                {totalNumeric.toLocaleString("pt-BR")} / {sectorMeta.toLocaleString("pt-BR")} ({goalProgressPct}%)
              </span>
            </div>
            <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/5 p-0.5">
              <div 
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 bg-black/30 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">UPH Atual</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {activeSector?.uph || 0} <span className="text-xs text-zinc-500 font-normal">un/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* METRICAS CHAVE DO TURNO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-b-2 border-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-bold">Total Processado</p>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Activity size={16} />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-white font-mono">{totalNumeric.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-zinc-500 mt-1 font-medium">Soma de todas categorias hoje</p>
        </div>

        <div className="glass-card p-4 border-b-2 border-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-bold">Operadores Ativos</p>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-emerald-400 font-mono">{distinctUsers}</p>
          <p className="text-[10px] text-zinc-500 mt-1 font-medium">Usuários com apontamentos hoje</p>
        </div>

        <div className="glass-card p-4 border-b-2 border-amber-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-bold">E-LOG Observações</p>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ClipboardList size={16} />
            </div>
          </div>
          <p className="text-sm font-bold text-amber-300 truncate" title={entriesToday.find(e => e.elog)?.elog || 'Sem registro'}>
            {entriesToday.find(e => e.elog)?.elog || 'Nenhuma obs.'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 font-medium">Última informação operacional</p>
        </div>

        <div className="glass-card p-4 border-b-2 border-sky-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-bold">REAPRO Ativo</p>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Zap size={16} />
            </div>
          </div>
          <p className="text-sm font-bold text-sky-300 truncate" title={entriesToday.find(e => e.reapro)?.reapro || 'Sem registro'}>
            {entriesToday.find(e => e.reapro)?.reapro || 'Sem registro'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 font-medium">Situação do reaproveitamento</p>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: APONTAMENTO OPERACIONAL & PAINEL DE COLABORADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1 & 2: PAINEL DE LANÇAMENTO RÁPIDO */}
        <div className="glass-card p-6 lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-white text-base uppercase tracking-wide flex items-center gap-2">
                <Zap size={18} className="text-amber-400" /> Terminal de Apontamento Rápido
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Registre incrementos rápidos e observações no setor S{activeSector?.numero}</p>
            </div>
            {isReadOnly && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <Shield size={12} /> Somente Leitura
              </span>
            )}
          </div>

          {/* CATEGORIAS NUMÉRICAS COM BOTOES DE INCREMENTO RÁPIDO */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500"></span>
              Categorias Numéricas Principais
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'alimento', name: 'Alimento', total: totalAlimento, color: 'emerald' },
                { key: 'montanha', name: 'Montanha', total: totalMontanha, color: 'indigo' },
                { key: 'l7Mochila', name: 'L7 Mochila', total: totalL7Mochila, color: 'purple' },
                { key: 'colis', name: 'Colis', total: totalColis, color: 'sky' },
              ].map((cat) => (
                <div key={cat.key} className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      {cat.name}
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/10 text-zinc-200 px-2.5 py-0.5 rounded-full">
                      Hoje: <strong className="text-emerald-400">{cat.total}</strong>
                    </span>
                  </div>

                  {/* Atalhos Rápidos +1, +5, +10 */}
                  <div className="flex items-center gap-1.5">
                    {[1, 5, 10, 50].map((qty) => (
                      <button
                        key={qty}
                        onClick={() => handleIncrement(cat.key as any, qty)}
                        disabled={isReadOnly}
                        className="flex-1 bg-zinc-800 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-zinc-800 text-white font-bold text-xs py-1.5 rounded-lg border border-white/10 transition-colors active:scale-95"
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>

                  {/* Campo de Entrada Manual */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="1"
                      value={incValues[cat.key as keyof typeof incValues]}
                      onChange={(e) => setIncValues(prev => ({ ...prev, [cat.key]: e.target.value }))}
                      className="flex-1 bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Valor personalizado"
                      disabled={isReadOnly}
                    />
                    <button
                      onClick={() => handleIncrement(cat.key as any)}
                      disabled={isReadOnly || !incValues[cat.key as keyof typeof incValues]}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs flex items-center gap-1 active:scale-95"
                    >
                      <Plus size={14} /> Somar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CAMPOS DE TEXTO OPERACIONAIS (E-LOG / REAPRO) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Registros e Observações Operacionais
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-2">
                <label className="text-xs font-bold text-amber-300 uppercase block">E-LOG (Logística Externa)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={textValues.elog}
                    onChange={(e) => setTextValues(prev => ({ ...prev, elog: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Ex: 2J RA FALC (174)"
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => handleUpdateText('elog')}
                    disabled={isReadOnly || !textValues.elog.trim()}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors font-bold text-xs active:scale-95"
                  >
                    Gravar
                  </button>
                </div>
              </div>

              <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-2">
                <label className="text-xs font-bold text-sky-300 uppercase block">REAPRO (Reaproveitamento)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={textValues.reapro}
                    onChange={(e) => setTextValues(prev => ({ ...prev, reapro: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Ex: 143 CX triadas"
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => handleUpdateText('reapro')}
                    disabled={isReadOnly || !textValues.reapro.trim()}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors font-bold text-xs active:scale-95"
                  >
                    Gravar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORIAS AD-HOC (DINÂMICAS) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              Categorias Personalizadas Ad-Hoc
            </h4>

            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newAdhocName}
                  onChange={(e) => setNewAdhocName(e.target.value)}
                  className="w-full sm:w-1/3 bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Nome da Categoria"
                  disabled={isReadOnly}
                />
                <input
                  type="text"
                  value={newAdhocValue}
                  onChange={(e) => setNewAdhocValue(e.target.value)}
                  className="w-full sm:flex-1 bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Valor / Quantidade"
                  disabled={isReadOnly}
                />
                <button
                  onClick={handleAddAdhoc}
                  disabled={isReadOnly || !newAdhocName.trim() || !newAdhocValue.trim()}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors font-bold text-xs whitespace-nowrap active:scale-95"
                >
                  + Criar Ad-hoc
                </button>
              </div>

              {adhocCategoriesList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Categorias Ativas Hoje:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {adhocCategoriesList.map(cat => (
                      <div key={cat} className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-lg border border-white/5">
                        <span className="text-xs font-bold text-sky-300 truncate w-1/3" title={cat}>
                          {cat}
                        </span>
                        <input
                          type="text"
                          value={adhocUpdates[cat] ?? ''}
                          onChange={(e) => setAdhocUpdates(prev => ({ ...prev, [cat]: e.target.value }))}
                          className="flex-1 bg-black/50 border border-white/10 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500"
                          placeholder="Novo valor"
                          disabled={isReadOnly}
                        />
                        <button
                          onClick={() => handleUpdateAdhoc(cat)}
                          disabled={isReadOnly || !adhocUpdates[cat]?.trim()}
                          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-2 py-1 rounded text-xs font-bold"
                        >
                          Salvar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA 3: COLABORADORES EM ESCALA NO SETOR */}
        <div className="space-y-6">
          <div className="glass-card p-5 border-l-2 border-emerald-500">
            <h3 className="font-bold text-white text-sm uppercase mb-3 flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-2">
                <UserCheck size={16} className="text-emerald-400" />
                Equipe em Escala
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {sectorCollaborators.length}
              </span>
            </h3>

            {sectorCollaborators.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3 text-center">
                Nenhum colaborador diretamente cadastrado para este setor na escala atual.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {sectorCollaborators.map((c) => (
                  <div key={c.id} className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {c.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{c.nome}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{c.cargo || 'Operador'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      c.status === ColaboradorStatus.Operacao ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      c.status === ColaboradorStatus.Ausente ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {c.status || 'Operacao'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RESUMO OPERACIONAL DO SEU PERFIL */}
          <div className="glass-card p-5 border-l-2 border-indigo-500 space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Award size={16} className="text-indigo-400" />
              Seu Perfil de Lançamento
            </h3>
            
            <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Usuário Conectado:</span>
                <span className="font-bold text-white">{currentUser}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Função de Acesso:</span>
                <span className="font-bold text-indigo-400 uppercase">{currentRole}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>ID do Usuário:</span>
                <span className="font-mono text-[10px] text-zinc-300 bg-black/50 px-1.5 py-0.5 rounded">
                  {currentUserId.substring(0, 12)}...
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* HISTÓRICO EM TEMPO REAL COM ATRIBUIÇÃO COMPLETA */}
      <div className="glass-card p-6 border-t-2 border-indigo-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="font-bold text-white text-base uppercase flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-400" /> Histórico Operacional do Dia (Realtime)
            </h3>
            <p className="text-xs text-zinc-400">
              Registros consolidados para o setor S{activeSector?.numero} na data de hoje ({today})
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            Total de Registros: <strong className="text-white">{entriesToday.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs bg-black/20 border border-white/5 rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-zinc-400 uppercase text-[0.65rem] font-bold">
                <th className="p-3">Operador / Usuário</th>
                <th className="p-3 text-center">Alimento</th>
                <th className="p-3 text-center">Montanha</th>
                <th className="p-3 text-center">L7 Mochila</th>
                <th className="p-3 text-center">Colis</th>
                <th className="p-3">E-LOG</th>
                <th className="p-3">REAPRO</th>
                {adhocCategoriesList.map(cat => (
                  <th key={cat} className="p-3 text-sky-400 max-w-[120px] truncate" title={cat}>{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
              {entriesToday.length === 0 ? (
                <tr>
                  <td colSpan={7 + adhocCategoriesList.length} className="text-center p-6 text-zinc-500 italic">
                    Nenhum lançamento efetuado hoje no setor S{activeSector?.numero}. Utilize o painel acima para iniciar o apontamento.
                  </td>
                </tr>
              ) : (
                entriesToday.map(entry => {
                  const isMe = entry.userId === currentUserId || entry.userId === currentUserUid;
                  return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-white/5 transition-colors ${isMe ? 'bg-indigo-500/10 font-bold' : ''}`}
                    >
                      <td className="p-3 text-white font-sans flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isMe ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {isMe ? '✓' : 'OP'}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-white">
                            {getUserDisplayName(entry.userId)}
                          </p>
                          {isMe && <span className="text-[9px] text-emerald-400 font-bold uppercase">Lançamento Seu</span>}
                        </div>
                      </td>
                      <td className="p-3 text-center text-white font-bold">{entry.alimento || 0}</td>
                      <td className="p-3 text-center text-white font-bold">{entry.montanha || 0}</td>
                      <td className="p-3 text-center text-white font-bold">{entry.l7Mochila || 0}</td>
                      <td className="p-3 text-center text-white font-bold">{entry.colis || 0}</td>
                      <td className="p-3 text-amber-300 font-sans max-w-[150px] truncate" title={entry.elog || ''}>
                        {entry.elog || '-'}
                      </td>
                      <td className="p-3 text-sky-300 font-sans max-w-[150px] truncate" title={entry.reapro || ''}>
                        {entry.reapro || '-'}
                      </td>
                      {adhocCategoriesList.map(cat => (
                        <td key={cat} className="p-3 text-sky-300 font-sans">
                          {entry.adhocCategories?.[cat] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
