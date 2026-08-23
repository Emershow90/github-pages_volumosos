import { useMemo, useCallback } from 'react';
import { Setor, Colaborador, HistoricoRegistro, ColaboradorStatus } from '../types';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useUIStore } from '../stores/useUIStore';
import { SupabaseService as FirebaseService } from '../lib/supabaseService';

export interface DailyActivityHealthInfo {
  dataHoje: string;
  totalSetoresAtivos: number;
  setoresComRegistroHoje: string[];
  setoresPendentes: Setor[];
  hasPendingDailyRecord: boolean;
  registrosHojeCount: number;
  ultimoRegistroHora: string | null;
  consolidarRegistrosDoDia: (setores: Setor[], colaboradores: Colaborador[], coordenador?: string) => Promise<number>;
}

export function useDailyActivityHealth(
  setores: Setor[],
  colaboradores: Colaborador[],
  coordenador?: string
): DailyActivityHealthInfo {
  const { historico, addHistorico, setHistorico } = useHistoryStore();
  const { addToast } = useNotificationStore();

  const dataHoje = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

  // Filter today's records
  const registrosHoje = useMemo(() => {
    return historico.filter((h) => h.data === dataHoje);
  }, [historico, dataHoje]);

  const setoresAtivos = useMemo(() => {
    return setores.filter((s) => s.situacao !== 'Inativo');
  }, [setores]);

  // Set of sector IDs recorded today
  const setoresComRegistroHoje = useMemo(() => {
    const ids = new Set<string>();
    registrosHoje.forEach((r) => {
      const cleanId = (r.setor || '').replace(/^S/i, '').trim();
      if (cleanId) ids.add(cleanId);
    });
    return Array.from(ids);
  }, [registrosHoje]);

  // Sectors pending today's record
  const setoresPendentes = useMemo(() => {
    return setoresAtivos.filter((s) => !setoresComRegistroHoje.includes(s.id));
  }, [setoresAtivos, setoresComRegistroHoje]);

  const hasPendingDailyRecord = setoresPendentes.length > 0 || registrosHoje.length === 0;

  const ultimoRegistroHora = useMemo(() => {
    if (registrosHoje.length === 0) return null;
    return registrosHoje[0]?.hora || null;
  }, [registrosHoje]);

  // Consolidate current snapshot for all active sectors into history
  const consolidarRegistrosDoDia = useCallback(
    async (
      setoresList: Setor[],
      colaboradoresList: Colaborador[],
      coordNome?: string
    ): Promise<number> => {
      const hoje = new Date().toLocaleDateString('pt-BR');
      const agoraHora = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
      const targetSectors = setoresList.filter((s) => s.situacao !== 'Inativo');

      if (targetSectors.length === 0) {
        addToast({
          title: 'Nenhum Setor Ativo',
          message: 'Não há setores ativos disponíveis para consolidar.',
          type: 'warning',
        });
        return 0;
      }

      const novosRegistros: HistoricoRegistro[] = [];

      for (const s of targetSectors) {
        const pessoasSetor = colaboradoresList.filter(
          (c) => c.setor === `Setor ${s.id}` || c.setor === s.id
        ).length;

        const novoItem: HistoricoRegistro = {
          id: `hist_${s.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          data: hoje,
          hora: agoraHora,
          semana: 'S4',
          turno: '1º Turno',
          setor: s.id,
          ativ: s.ativ || 0,
          uph: s.uph || 0,
          repro: s.reproTotal || 0,
          colis: s.colis || 0,
          pessoas: pessoasSetor,
          promessa: s.promessa || 0,
          nota5s: s.nota5s || 0,
          erros: s.errosPicking || 0,
          coordenador: coordNome || coordenador || 'Torre de Comando',
          obs: `Consolidação diária automática do Setor S${s.id}`,
        };

        novosRegistros.push(novoItem);
        // Persist each in local store and DB
        try {
          await addHistorico(novoItem);
          await FirebaseService.upsert('historico_consolidado', novoItem);
        } catch (err) {
          console.warn(`[DailyActivity] Falha na sincronização do setor S${s.id}:`, err);
        }
      }

      // Add to Header notification log
      const uiStore = useUIStore.getState();
      uiStore.setNotifications([
        {
          id: `notif_consol_${Date.now()}`,
          title: 'Registros do Dia Atualizados',
          desc: `Consolidação diária concluída para ${novosRegistros.length} setores ativos em ${hoje}.`,
          time: agoraHora,
          type: 'success',
          read: false,
        },
        ...uiStore.notifications,
      ]);

      addToast({
        title: 'Registros do Dia Atualizados',
        message: `Foram consolidados com sucesso ${novosRegistros.length} setores para o dia de hoje (${hoje})!`,
        type: 'success',
      });

      return novosRegistros.length;
    },
    [addHistorico, addToast, coordenador]
  );

  return {
    dataHoje,
    totalSetoresAtivos: setoresAtivos.length,
    setoresComRegistroHoje,
    setoresPendentes,
    hasPendingDailyRecord,
    registrosHojeCount: registrosHoje.length,
    ultimoRegistroHora,
    consolidarRegistrosDoDia,
  };
}
