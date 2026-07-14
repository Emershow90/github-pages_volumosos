import { supabase } from './supabase';
import { useStoreOperations } from '../stores/useStoreOperations';

export class RealtimeSyncService {
  private channels: any[] = [];

  startListeningProgramacao(date: string) {
    const channel = supabase
      .channel(`programacao-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_operations',
          filter: `programacaoId=eq.${date}`,
        },
        (payload) => {
          // Atualiza store
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  startListeningSetores() {
    const channel = supabase
      .channel('setores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setores',
        },
        (payload) => {
          // Atualiza setores
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  startListeningColaboradores() {
    const channel = supabase
      .channel('colaboradores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'colaboradores',
        },
        (payload) => {
          // Atualiza colaboradores
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  stopAll() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
  }
}

export const realtimeSync = new RealtimeSyncService();
