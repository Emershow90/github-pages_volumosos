import { supabase, isStaticBuild } from '../lib/supabase';
import { SupabaseService } from '../lib/supabaseService';
import { useStoreOperations } from '../stores/useStoreOperations';
import { useAtividadeLoja } from '../stores/useAtividadeLoja';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { StoreOperation, AtividadeLoja, Setor, Colaborador } from '../types';

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
      if (isStaticBuild) return;

      const channel = supabase!.channel(key)
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
          }
        )
        .subscribe();

      this.unsubscribes.set(key, () => {
        channel.unsubscribe();
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
      if (isStaticBuild) return;

      const channel = supabase!.channel(key)
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
        channel.unsubscribe();
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

          if (isStaticBuild) return;

          channel = supabase!.channel(key)
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

          if (isStaticBuild) return;

          channel = supabase!.channel(key)
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
