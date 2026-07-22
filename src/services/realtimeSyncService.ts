import { supabase, isStaticBuild } from '../lib/supabase';
import { SupabaseService } from '../lib/supabaseService';
import { useStoreOperations } from '../stores/useStoreOperations';
import { useAtividadeLoja } from '../stores/useAtividadeLoja';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useUserStore } from '../stores/useUserStore';
import { 
  StoreOperation, 
  AtividadeLoja, 
  Setor, 
  Colaborador, 
  EscalaColaborador, 
  UniversoMix, 
  CopilMatrizRow, 
  CopilSetor, 
  CopilKPI, 
  RadarLoja,
  CapacidadeSetor,
  ReferenteSemana,
  AlertLog,
  HistoricoRegistro,
  AuditLog,
  Usuario
} from '../types';

export function mapStoreOperationsToRadar(ops: StoreOperation[]): RadarLoja[] {
  return ops.map(op => ({
    corte: op.corte || '17:00',
    loja: op.nomeLoja ? `${op.lojaId} - ${op.nomeLoja}` : (op.lojaId || 'Loja'),
    vol: op.volumes || 0,
    ativ: op.enderecos || 0,
    prog: op.statusColeta === 'Coletada' ? 100 : (op.statusColeta === 'Em andamento' ? 50 : 0)
  }));
}

export function transformUniversos(rows: UniversoMix[]): Record<string, UniversoMix[]> {
  const map: Record<string, UniversoMix[]> = {};
  for (const row of rows) {
    if (!row.setor_id) {
      console.warn("[realtimeSyncService] UniversoMix sem setor_id ignorado:", row);
      continue;
    }
    const sid = row.setor_id;
    if (!map[sid]) map[sid] = [];
    map[sid].push(row);
  }
  return map;
}

export function transformCopilMatriz(rows: CopilMatrizRow[]): Record<string, CopilSetor> {
  const map: Record<string, CopilSetor> = {};
  for (const row of rows) {
    if (!row.setor_id) {
      console.warn("[realtimeSyncService] CopilMatrizRow sem setor_id ignorada:", row);
      continue;
    }
    const sid = row.setor_id;
    if (!map[sid]) {
      map[sid] = {
        operacionais: [],
        economico: [],
        seguranca: []
      };
    }
    const kpiObj: CopilKPI = {
      kpi: row.kpi,
      comp: row.comp,
      real: row.real,
      inverso: Boolean(row.inverso),
      auto: Boolean(row.auto),
      tolerancia: row.tolerancia,
      regraCalculo: row.regraCalculo,
      criterio: row.criterio,
      notaManual: row.notaManual,
      calcNota: Boolean(row.calcNota)
    };
    if (row.grupo === 'operacionais') {
      map[sid].operacionais.push(kpiObj);
    } else if (row.grupo === 'economico') {
      map[sid].economico.push(kpiObj);
    } else if (row.grupo === 'seguranca') {
      map[sid].seguranca.push(kpiObj);
    }
  }
  return map;
}

export const buildCopilSetorMap = transformCopilMatriz;

class RealtimeSyncService {
  private unsubscribes: Map<string, () => void> = new Map();
  private authObservers: Map<string, () => void> = new Map();

  /**
   * Inicia a escuta de todas as operações de uma Programação (Dia) específica.
   */
  public startListeningProgramacao(programacaoId: string) {
    const key = `ops_${programacaoId}`;
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      // Buscar operações iniciais para essa programação
      SupabaseService.fetchTable<StoreOperation>('store_operations')
        .then((dbOps) => {
          if (cancelled) return;
          if (dbOps && dbOps.length > 0) {
            const filtered = dbOps.filter(op => op.programacaoId === programacaoId);
            const opsMap: Record<string, StoreOperation> = {};
            filtered.forEach(op => {
              opsMap[op.id] = op;
            });
            useStoreOperations.getState().setOperations(opsMap);
            const radarData = mapStoreOperationsToRadar(filtered);
            useSectorStore.getState().setRadar(radarData);
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'store_operations',
                filter: `programacaoId=eq.${programacaoId}`
              },
              (payload) => {
                const changeType = payload.eventType;
                const data = payload.new as StoreOperation;
                if (changeType === 'INSERT' || changeType === 'UPDATE') {
                  useStoreOperations.getState().upsertOperation(data);
                } else if (changeType === 'DELETE') {
                  const oldId = payload.old?.id;
                  if (oldId) {
                    useStoreOperations.getState().removeOperation(oldId);
                  }
                }
                const allOps = Object.values(useStoreOperations.getState().operations);
                const radarData = mapStoreOperationsToRadar(allOps);
                useSectorStore.getState().setRadar(radarData);
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar operacoes iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta granularidade de colis (AtividadeLoja) para a mesma programação.
   */
  public startListeningAtividades(programacaoId: string) {
    const key = `ativ_${programacaoId}`;
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      // Buscar atividades iniciais de coleta para essa programação
      SupabaseService.fetchTable<AtividadeLoja>('atividade_loja')
        .then((dbAtivs) => {
          if (cancelled) return;
          if (dbAtivs && dbAtivs.length > 0) {
            const filtered = dbAtivs.filter(ativ => ativ.programacaoId === programacaoId);
            filtered.forEach(ativ => {
              useAtividadeLoja.getState().upsertAtividade(ativ);
            });
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'atividade_loja',
                filter: `programacaoId=eq.${programacaoId}`
              },
              (payload) => {
                const changeType = payload.eventType;
                const data = payload.new as AtividadeLoja;
                if (changeType === 'INSERT' || changeType === 'UPDATE') {
                  useAtividadeLoja.getState().upsertAtividade(data);
                } else if (changeType === 'DELETE') {
                  const oldId = payload.old?.id;
                  if (oldId) {
                    useAtividadeLoja.getState().removeAtividade(oldId);
                  }
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar atividades iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real as mudanças na coleção de setores.
   */
  public startListeningSetores() {
    const key = 'setores_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      const currentSetores = useSectorStore.getState().setores;
      SupabaseService.fetchTable<Setor>('setores', currentSetores)
        .then((dbSetores) => {
          if (cancelled) return;
          if (dbSetores && dbSetores.length > 0) {
            useSectorStore.getState().setSetores(dbSetores);
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'setores'
              },
              async () => {
                const fresh = await SupabaseService.fetchTable<Setor>('setores');
                if (fresh.length > 0) {
                  fresh.sort((a, b) => a.id.localeCompare(b.id));
                  useSectorStore.getState().setSetores(fresh);
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar setores iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real as mudanças na coleção de colaboradores.
   */
  public startListeningColaboradores() {
    const key = 'colaboradores_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      const currentColab = useCollaboratorStore.getState().colaboradores;
      SupabaseService.fetchTable<Colaborador>('colaboradores', currentColab)
        .then((dbColab) => {
          if (cancelled) return;
          if (dbColab && dbColab.length > 0) {
            useCollaboratorStore.getState().setColaboradores(dbColab);
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'colaboradores'
              },
              async () => {
                const fresh = await SupabaseService.fetchTable<Colaborador>('colaboradores');
                if (fresh.length > 0) {
                  fresh.sort((a, b) => a.nome.localeCompare(b.nome));
                  useCollaboratorStore.getState().setColaboradores(fresh);
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar colaboradores iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real as mudanças na coleção de escalas.
   */
  public startListeningEscalas() {
    const key = 'escalas_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<EscalaColaborador>('escalas')
        .then((dbEscalas) => {
          if (cancelled) return;
          if (dbEscalas && dbEscalas.length > 0) {
            useCollaboratorStore.getState().setEscalas(dbEscalas);
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'escalas'
              },
              async () => {
                const fresh = await SupabaseService.fetchTable<EscalaColaborador>('escalas');
                if (fresh.length > 0) {
                  useCollaboratorStore.getState().setEscalas(fresh);
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar escalas iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real universos de trabalho (Mix).
   */
  public startListeningUniversos() {
    const key = 'universos_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<UniversoMix>('universos_trabalho')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useSectorStore.getState().setUniversos(transformUniversos(rows));
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'universos_trabalho'
              },
              async () => {
                const fresh = await SupabaseService.fetchTable<UniversoMix>('universos_trabalho');
                if (fresh.length > 0) {
                  useSectorStore.getState().setUniversos(transformUniversos(fresh));
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar universos iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real a matriz COPIL.
   */
  public startListeningCopil() {
    const key = 'copil_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<CopilMatrizRow>('copil_matriz')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useSectorStore.getState().setCopilData(transformCopilMatriz(rows));
          }

          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'copil_matriz'
              },
              async () => {
                const fresh = await SupabaseService.fetchTable<CopilMatrizRow>('copil_matriz');
                if (fresh.length > 0) {
                  useSectorStore.getState().setCopilData(transformCopilMatriz(fresh));
                }
              }
            )
            .subscribe();

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (channel) channel.unsubscribe();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar copil_matriz inicial:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      });
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real capacidade operacional dos setores.
   */
  public startListeningCapacidade() {
    const key = 'capacidade_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<CapacidadeSetor>('capacidade_operacional')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useSectorStore.getState().setCapacidade(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'capacidade_operacional' }, async () => {
              const fresh = await SupabaseService.fetchTable<CapacidadeSetor>('capacidade_operacional');
              if (fresh.length > 0) useSectorStore.getState().setCapacidade(fresh);
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro capacidade:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real escalas referentes da semana.
   */
  public startListeningReferentes() {
    const key = 'referentes_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<ReferenteSemana>('escalas_referentes')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useSectorStore.getState().setReferentesSemana(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas_referentes' }, async () => {
              const fresh = await SupabaseService.fetchTable<ReferenteSemana>('escalas_referentes');
              if (fresh.length > 0) useSectorStore.getState().setReferentesSemana(fresh);
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro referentes:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real cadastros de usuários (aprovações de admin).
   */
  public startListeningUsuarios() {
    const key = 'usuarios_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<Usuario>('usuarios')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useUserStore.getState().loadPendingUsers();
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, async () => {
              useUserStore.getState().loadPendingUsers();
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro usuarios:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real alertas operacionais (visibilidade simultânea).
   */
  public startListeningAlertas() {
    const key = 'alertas_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<AlertLog>('alertas_operacionais')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useHistoryStore.getState().setAlerts(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_operacionais' }, async () => {
              const fresh = await SupabaseService.fetchTable<AlertLog>('alertas_operacionais');
              if (fresh.length > 0) useHistoryStore.getState().setAlerts(fresh);
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro alertas:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real histórico consolidado.
   */
  public startListeningHistorico() {
    const key = 'historico_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<HistoricoRegistro>('historico_consolidado')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useHistoryStore.getState().setHistorico(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_consolidado' }, async () => {
              const fresh = await SupabaseService.fetchTable<HistoricoRegistro>('historico_consolidado');
              if (fresh.length > 0) useHistoryStore.getState().setHistorico(fresh);
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro historico:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real logs de auditoria.
   */
  public startListeningAudit() {
    const key = 'audit_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = SupabaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;
      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) { existing(); this.unsubscribes.delete(key); }
        return;
      }
      if (this.unsubscribes.has(key)) return;

      let channel: any = null;
      let cancelled = false;

      SupabaseService.fetchTable<AuditLog>('audit_logs')
        .then((rows) => {
          if (cancelled) return;
          if (rows && rows.length > 0) {
            useHistoryStore.getState().setAudit(rows);
          }
          if (isStaticBuild || !supabase) return;

          channel = supabase.channel(key)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, async () => {
              const fresh = await SupabaseService.fetchTable<AuditLog>('audit_logs');
              if (fresh.length > 0) useHistoryStore.getState().setAudit(fresh);
            })
            .subscribe();

          this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
        })
        .catch((err) => console.error("[RealtimeSyncService] Erro audit:", err));

      this.unsubscribes.set(key, () => { cancelled = true; if (channel) channel.unsubscribe(); });
    });
    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Encerra todos os listeners ativos.
   */
  public stopAll() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes.clear();

    this.authObservers.forEach((unsub) => unsub());
    this.authObservers.clear();
  }
}

export const realtimeSync = new RealtimeSyncService();
export default realtimeSync;
