import { create } from 'zustand';
import { UserRole, Usuario } from '../types';
import { supabase, isStaticBuild } from '../lib/supabase';
import { SupabaseService } from '../lib/supabaseService';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface UserState {
  currentUser: string;
  currentRole: UserRole;
  currentStatus: string;
  currentUserUid: string;
  pendingUsers: Usuario[];
  toasts: ToastMessage[];
  
  setCurrentUser: (user: string) => void;
  setCurrentRole: (role: UserRole) => void;
  setCurrentStatus: (status: string) => void;
  setCurrentUserUid: (uid: string) => void;
  
  // Toast operations
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  // Admin approval operations
  loadPendingUsers: () => Promise<void>;
  approveUser: (uid: string, approvedBy: string) => Promise<void>;
  
  // Listener for user status change
  startListeningUserStatus: (uid: string) => () => void;
}

// Get initial values from localStorage to preserve current operational settings
const initialUser = localStorage.getItem('current_user') || 'Admin';
const initialRole = (localStorage.getItem('current_role') as UserRole) || UserRole.Admin;
const initialStatus = localStorage.getItem('current_status') || 'Pendente';
const initialUid = localStorage.getItem('current_user_uid') || '';

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: initialUser,
  currentRole: initialRole,
  currentStatus: initialStatus,
  currentUserUid: initialUid,
  pendingUsers: [],
  toasts: [],
  
  setCurrentUser: (user) => set(() => {
    localStorage.setItem('current_user', user);
    return { currentUser: user };
  }),
  
  setCurrentRole: (role) => set(() => {
    localStorage.setItem('current_role', role);
    return { currentRole: role };
  }),

  setCurrentStatus: (status) => set(() => {
    localStorage.setItem('current_status', status);
    return { currentStatus: status };
  }),

  setCurrentUserUid: (uid) => set(() => {
    localStorage.setItem('current_user_uid', uid);
    return { currentUserUid: uid };
  }),
  
  // Toast operations
  addToast: (message, type = 'success') => set((state) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Auto remove after 5 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
    return { toasts: [...state.toasts, { id, message, type }] };
  }),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
  
  // Admin approval operations
  loadPendingUsers: async () => {
    if (!isStaticBuild && supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('situacao', 'Pendente');
        
        if (error) throw error;
        
        if (data) {
          const mapped: Usuario[] = data.map((dbRecord: any) => ({
            uid: dbRecord.id,
            email: dbRecord.email,
            nome: dbRecord.nome,
            role: dbRecord.role as UserRole,
            setoresAutorizados: dbRecord.setoresAutorizados || [],
            foto: dbRecord.avatar_url,
            cargo: dbRecord.cargo,
            unidade: dbRecord.unidade,
            situacao: dbRecord.situacao,
            aprovado_por: dbRecord.aprovado_por,
            data_aprovacao: dbRecord.data_aprovacao,
          }));
          set({ pendingUsers: mapped });
          return;
        }
      } catch (err: any) {
        console.error('Error loading pending users online:', err.message);
      }
    }
    
    // Offline / Fallback scanning of localStorage
    const mapped: Usuario[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sys_cached_profile_')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached) as Usuario;
            if (parsed.situacao === 'Pendente') {
              mapped.push(parsed);
            }
          }
        } catch (e) {
          console.error('Error parsing local cached profile during scan:', e);
        }
      }
    }
    set({ pendingUsers: mapped });
  },

  approveUser: async (uid, approvedBy) => {
    const now = new Date().toISOString();
    
    if (!isStaticBuild && supabase) {
      try {
        const payload = SupabaseService.filterRecordColumns('usuarios', {
          situacao: 'Ativo',
          aprovado_por: approvedBy,
          data_aprovacao: now
        });
        const { error } = await supabase
          .from('usuarios')
          .update(payload)
          .eq('id', uid);
          
        if (error) throw error;
      } catch (err: any) {
        console.error('Error approving user online:', err.message);
        throw err;
      }
    }
    
    // Always sync offline cache/localStorage
    const localKey = `sys_cached_profile_${uid}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const p = JSON.parse(cached) as Usuario;
        p.situacao = 'Ativo';
        p.aprovado_por = approvedBy;
        p.data_aprovacao = now;
        localStorage.setItem(localKey, JSON.stringify(p));
      } catch (e) {}
    }

    get().addToast('Usuário aprovado com sucesso!', 'success');
    // Refresh pending users list
    await get().loadPendingUsers();
  },
  
  // Real-time or polled listener for the active logged-in user's status
  startListeningUserStatus: (uid) => {
    if (!uid) return () => {};
    
    if (!isStaticBuild && supabase) {
      const channel = supabase
        .channel(`user_status_sync_${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'usuarios',
            filter: `id=eq.${uid}`
          },
          (payload) => {
            const updatedProfile = payload.new as any;
            if (updatedProfile && updatedProfile.situacao === 'Ativo') {
              get().addToast(`Sua conta foi aprovada por ${updatedProfile.aprovado_por || 'um administrador'}!`, 'success');
              get().setCurrentStatus('Ativo');
              
              // Cache locally too
              const localKey = `sys_cached_profile_${uid}`;
              const cached = localStorage.getItem(localKey);
              if (cached) {
                try {
                  const p = JSON.parse(cached);
                  p.situacao = 'Ativo';
                  p.aprovado_por = updatedProfile.aprovado_por;
                  p.data_aprovacao = updatedProfile.data_aprovacao;
                  localStorage.setItem(localKey, JSON.stringify(p));
                } catch (e) {}
              }
            }
          }
        )
        .subscribe();
        
      return () => {
        channel.unsubscribe();
      };
    }
    
    // Offline simulated poll (every 3 seconds)
    const intervalId = setInterval(() => {
      const localKey = `sys_cached_profile_${uid}`;
      const cached = localStorage.getItem(localKey);
      if (cached) {
        try {
          const p = JSON.parse(cached) as Usuario;
          if (p.situacao === 'Ativo' && get().currentStatus === 'Pendente') {
            get().addToast(`Sua conta foi aprovada por ${p.aprovado_por || 'um administrador'}!`, 'success');
            get().setCurrentStatus('Ativo');
            clearInterval(intervalId);
          }
        } catch (e) {}
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }
}));
