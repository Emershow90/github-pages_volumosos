import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebaseAuth';
import { useStoreOperations } from '../stores/useStoreOperations';
import { useAtividadeLoja } from '../stores/useAtividadeLoja';
import { useSectorStore } from '../stores/useSectorStore';
import { useCollaboratorStore } from '../stores/useCollaboratorStore';
import { StoreOperation, AtividadeLoja, Setor, Colaborador } from '../types';
import { handleFirestoreError, OperationType, FirebaseService } from '../lib/firebaseService';

class RealtimeSyncService {
  private unsubscribes: Map<string, () => void> = new Map();
  private authObservers: Map<string, () => void> = new Map();

  /**
   * Inicia a escuta de todas as operações de uma Programação (Dia) específica.
   */
  public startListeningProgramacao(programacaoId: string) {
    const key = `ops_${programacaoId}`;
    if (this.authObservers.has(key)) return; // Já possui gerenciador reativo

    const unsubscribeAuth = FirebaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      // state === 'authenticated'
      if (this.unsubscribes.has(key)) return;

      const qOps = query(
        collection(db, 'store_operations'),
        where('programacaoId', '==', programacaoId)
      );

      const unsubscribeOps = onSnapshot(qOps, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as StoreOperation;
          if (change.type === 'added' || change.type === 'modified') {
            useStoreOperations.getState().upsertOperation(data);
          }
          if (change.type === 'removed') {
            useStoreOperations.getState().removeOperation(data.id);
          }
        });
      }, (error) => {
        console.error("[RealtimeSyncService] Erro no Listener de StoreOperations:", error);
        handleFirestoreError(error, OperationType.LIST, 'store_operations');
      });

      this.unsubscribes.set(key, unsubscribeOps);
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta granularidade de colis (AtividadeLoja) para a mesma programação.
   */
  public startListeningAtividades(programacaoId: string) {
    const key = `ativ_${programacaoId}`;
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = FirebaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      // state === 'authenticated'
      if (this.unsubscribes.has(key)) return;

      const qAtiv = query(
        collection(db, 'atividade_loja'),
        where('programacaoId', '==', programacaoId)
      );

      const unsubscribeAtiv = onSnapshot(qAtiv, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as AtividadeLoja;
          if (change.type === 'added' || change.type === 'modified') {
            useAtividadeLoja.getState().upsertAtividade(data);
          }
          if (change.type === 'removed') {
            useAtividadeLoja.getState().removeAtividade(data.id);
          }
        });
      }, (error) => {
        console.error("[RealtimeSyncService] Erro no Listener de Atividades:", error);
        handleFirestoreError(error, OperationType.LIST, 'atividade_loja');
      });

      this.unsubscribes.set(key, unsubscribeAtiv);
    });

    this.authObservers.set(key, unsubscribeAuth);
  }

  /**
   * Escuta em tempo real as mudanças na coleção de setores.
   */
  public startListeningSetores() {
    const key = 'setores_live';
    if (this.authObservers.has(key)) return;

    const unsubscribeAuth = FirebaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      // state === 'authenticated'
      if (this.unsubscribes.has(key)) return;

      let unsubscribeSetores: Unsubscribe | null = null;
      let cancelled = false;

      const currentSetores = useSectorStore.getState().setores;
      FirebaseService.fetchTable<Setor>('setores', currentSetores)
        .then((dbSetores) => {
          if (cancelled) return;
          if (dbSetores && dbSetores.length > 0) {
            useSectorStore.getState().setSetores(dbSetores);
          }

          const qSetores = query(collection(db, 'setores'));
          unsubscribeSetores = onSnapshot(qSetores, (snapshot) => {
            const list: Setor[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Setor);
            });
            if (list.length > 0) {
              list.sort((a, b) => a.id.localeCompare(b.id));
              useSectorStore.getState().setSetores(list);
            }
          }, (error) => {
            console.error("[RealtimeSyncService] Erro no Listener de Setores:", error);
            handleFirestoreError(error, OperationType.LIST, 'setores');
          });

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (unsubscribeSetores) unsubscribeSetores();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar setores iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (unsubscribeSetores) unsubscribeSetores();
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

    const unsubscribeAuth = FirebaseService.onAuthStateResolved((state) => {
      if (state === 'loading') return;

      if (state === 'unauthenticated') {
        const existing = this.unsubscribes.get(key);
        if (existing) {
          existing();
          this.unsubscribes.delete(key);
        }
        return;
      }

      // state === 'authenticated'
      if (this.unsubscribes.has(key)) return;

      let unsubscribeColab: Unsubscribe | null = null;
      let cancelled = false;

      const currentColab = useCollaboratorStore.getState().colaboradores;
      FirebaseService.fetchTable<Colaborador>('colaboradores', currentColab)
        .then((dbColab) => {
          if (cancelled) return;
          if (dbColab && dbColab.length > 0) {
            useCollaboratorStore.getState().setColaboradores(dbColab);
          }

          const qColab = query(collection(db, 'colaboradores'));
          unsubscribeColab = onSnapshot(qColab, (snapshot) => {
            const list: Colaborador[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Colaborador);
            });
            if (list.length > 0) {
              list.sort((a, b) => a.nome.localeCompare(b.nome));
              useCollaboratorStore.getState().setColaboradores(list);
            }
          }, (error) => {
            console.error("[RealtimeSyncService] Erro no Listener de Colaboradores:", error);
            handleFirestoreError(error, OperationType.LIST, 'colaboradores');
          });

          this.unsubscribes.set(key, () => {
            cancelled = true;
            if (unsubscribeColab) unsubscribeColab();
          });
        })
        .catch((err) => {
          console.error("[RealtimeSyncService] Falha ao sincronizar colaboradores iniciais:", err);
        });

      this.unsubscribes.set(key, () => {
        cancelled = true;
        if (unsubscribeColab) unsubscribeColab();
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
