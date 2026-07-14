import { supabase, auth } from './supabase';
import { UserRole, Usuario } from '../types/Usuario';

// ============================================
// EXPORTS DO AUTH
// ============================================
export { supabase, auth };

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * Login com Google (OAuth)
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
};

/**
 * Login com Email e Senha
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Usuário não encontrado');

  const profile = await ensureUserProfile(user);
  return { user, profile };
};

/**
 * Cadastro com Email e Senha
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = UserRole.Consulta
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: role,
      },
    },
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Usuário não encontrado');

  const isOwner = email.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';

  const userProfile: Usuario = {
    id: user.id,
    email,
    nome: name,
    role: isOwner ? UserRole.Admin : role,
    setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
    situacao: isOwner ? 'Ativo' : 'Pendente',
    cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
    unidade: 'CD Principal',
    avatar_url: user.user_metadata?.avatar_url || '',
  };

  const { error: profileError } = await supabase
    .from('usuarios')
    .insert([userProfile]);

  if (profileError) throw profileError;

  return { user, profile: userProfile };
};

/**
 * Recuperar senha (reset password)
 */
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
};

/**
 * Logout
 */
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Limpa cache local de perfis
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('sys_cached_profile_')) {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Busca perfil do usuário
 */
export const getUserProfile = async (userId: string): Promise<Usuario | null> => {
  const localKey = `sys_cached_profile_${userId}`;
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📭 Nenhum perfil encontrado para userId:', userId);
        return null;
      }
      throw error;
    }

    console.log('✅ Perfil encontrado:', data.role);
    const profile = data as Usuario;
    localStorage.setItem(localKey, JSON.stringify(profile));
    return profile;
    
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    
    // Fallback para cache local
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const profile = JSON.parse(cached) as Usuario;
        console.log('💾 Utilizando perfil do cache local (offline):', profile.role);
        return profile;
      } catch (jsonErr) {
        console.error('❌ Error parsing local cached profile:', jsonErr);
      }
    }
  }
  return null;
};

/**
 * Cria ou atualiza perfil do usuário
 */
export const ensureUserProfile = async (user: any): Promise<Usuario | null> => {
  const isOwner = user.email?.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';
  const localKey = `sys_cached_profile_${user.id}`;
  
  try {
    // Verifica se já existe perfil
    const existing = await getUserProfile(user.id);
    
    if (existing) {
      // Se for o owner e não for Admin, eleva para Admin
      if (isOwner && existing.role !== UserRole.Admin) {
        const updated = {
          ...existing,
          role: UserRole.Admin,
          setoresAutorizados: ["S87", "S88", "S89", "S90"],
          situacao: 'Ativo',
          cargo: 'ADMINISTRADOR'
        };
        
        const { error } = await supabase
          .from('usuarios')
          .update(updated)
          .eq('id', user.id);
          
        if (error) throw error;
        
        localStorage.setItem(localKey, JSON.stringify(updated));
        console.log('✅ Perfil elevado para Admin');
        return updated;
      }
      return existing;
    }

    // Se for o proprietário, cria perfil Admin
    if (isOwner) {
      const adminProfile: Usuario = {
        id: user.id,
        email: user.email || '',
        nome: user.user_metadata?.full_name || user.user_metadata?.name || 'Emerson Oliveira',
        role: UserRole.Admin,
        setoresAutorizados: ["S87", "S88", "S89", "S90"],
        situacao: 'Ativo',
        cargo: 'ADMINISTRADOR',
        unidade: 'CD Principal',
        avatar_url: user.user_metadata?.avatar_url || '',
      };
      
      const { error } = await supabase
        .from('usuarios')
        .insert([adminProfile]);
        
      if (error) throw error;
      
      localStorage.setItem(localKey, JSON.stringify(adminProfile));
      console.log('✅ Perfil Admin criado para proprietário');
      return adminProfile;
    }

    // Cria perfil pendente para novos usuários
    console.log('📝 Criando perfil pendente para:', user.email);
    
    const pendingProfile: Usuario = {
      id: user.id,
      email: user.email || '',
      nome: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
      role: UserRole.Consulta,
      setoresAutorizados: [],
      situacao: 'Pendente',
      cargo: 'AGUARDANDO_APROVACAO',
      unidade: 'CD Principal',
      avatar_url: user.user_metadata?.avatar_url || '',
    };

    const { error } = await supabase
      .from('usuarios')
      .insert([pendingProfile]);
      
    if (error) throw error;
    
    localStorage.setItem(localKey, JSON.stringify(pendingProfile));
    console.log('✅ Perfil pendente criado com sucesso');
    return pendingProfile;
    
  } catch (error: any) {
    console.error('❌ Erro crítico em ensureUserProfile:', error);
    
    // Fallback local em caso de erro
    const fallbackProfile: Usuario = {
      id: user.id,
      email: user.email || '',
      nome: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
      role: isOwner ? UserRole.Admin : UserRole.Consulta,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Erro',
      cargo: isOwner ? 'ADMINISTRADOR' : 'ERRO_AO_CARREGAR',
      unidade: 'CD Principal',
      avatar_url: user.user_metadata?.avatar_url || '',
    };
    
    localStorage.setItem(localKey, JSON.stringify(fallbackProfile));
    return fallbackProfile;
  }
};

/**
 * Atualiza perfil do usuário
 */
export const updateUserProfile = async (userId: string, updates: Partial<Usuario>): Promise<Usuario> => {
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Atualiza cache local
  const localKey = `sys_cached_profile_${userId}`;
  localStorage.setItem(localKey, JSON.stringify(data));

  return data as Usuario;
};

/**
 * Lista todos os usuários (apenas para Admins)
 */
export const listUsers = async (): Promise<Usuario[]> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome');

  if (error) throw error;
  return data as Usuario[];
};

/**
 * Aprova usuário pendente (apenas para Admins)
 */
export const approveUser = async (userId: string): Promise<Usuario> => {
  const { data, error } = await supabase
    .from('usuarios')
    .update({
      situacao: 'Ativo',
      cargo: 'OPERADOR'
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Usuario;
};

// ============================================
// FETCH COM AUTENTICAÇÃO
// ============================================

/**
 * Fetch com autenticação automática
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return fetch(url, { ...options, headers });
    
  } catch (err) {
    console.error('[Supabase Auth] Error in fetchWithAuth:', err);
    return fetch(url, options || {});
  }
};

// ============================================
// OBSERVADOR DE ESTADO DE AUTENTICAÇÃO
// ============================================

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * Obtém o usuário atual
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Obtém a sessão atual
 */
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
