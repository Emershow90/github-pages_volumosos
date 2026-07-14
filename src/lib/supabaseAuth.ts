import { supabase, auth } from './supabase';
import { UserRole, Usuario } from '../types/Usuario';

export { supabase, auth };

// Funções de autenticação
export const getUserProfile = async (userId: string): Promise<Usuario | null> => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Usuario;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const ensureUserProfile = async (user: any): Promise<Usuario | null> => {
  try {
    const existing = await getUserProfile(user.id);
    if (existing) return existing;

    const isOwner = user.email?.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';
    
    const newProfile: Usuario = {
      id: user.id,
      email: user.email || '',
      nome: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
      role: isOwner ? UserRole.Admin : UserRole.Consulta,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Pendente',
      cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
      unidade: 'CD Principal',
      avatar_url: user.user_metadata?.avatar_url || '',
    };

    const { error } = await supabase
      .from('usuarios')
      .insert([newProfile]);

    if (error) throw error;

    return newProfile;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return null;
  }
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
};
