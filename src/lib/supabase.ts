// ---------------------------------------------------------------------------
// SAFE ENVIRONMENT POLYFILLS FOR AI STUDIO IFRAME SANDBOX
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  // 1. Unhandled Rejection Filter to suppress benign iframe/sandbox warnings
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (typeof reason === 'string' && reason.includes('WebSocket closed')) ||
      (reason.message && typeof reason.message === 'string' && (
        reason.message.includes('WebSocket closed') || 
        reason.message.includes('closed without opened')
      )) ||
      (reason.name === 'TypeError' && reason.message && reason.message.includes('fetch of #<Window> which has only a getter'))
    )) {
      console.warn('[SafeEnvironment] Suppressed benign unhandled sandbox rejection:', reason);
      event.preventDefault();
    }
  });

  // 2. Safe WebSocket Interceptor and Wrapper
  if ('WebSocket' in window) {
    const OriginalWebSocket = window.WebSocket;
    if (typeof OriginalWebSocket === 'function') {
      const SafeWebSocket = function (url: string | URL, protocols?: string | string[]) {
        try {
          const urlStr = typeof url === 'string' ? url : url.toString();
          
          if (typeof Reflect !== 'undefined' && typeof Reflect.construct === 'function') {
            try {
              return Reflect.construct(OriginalWebSocket, [url, protocols]);
            } catch (reflectErr) {
              console.warn('[SafeWebSocket] Reflect.construct failed, falling back to standard new:', reflectErr);
              return new OriginalWebSocket(urlStr as any, protocols);
            }
          } else {
            return new OriginalWebSocket(urlStr as any, protocols);
          }
        } catch (err) {
          console.error('[SafeWebSocket] WebSocket creation failed:', err);
          const mockSocket = new EventTarget() as any;
          mockSocket.url = typeof url === 'string' ? url : url.toString();
          mockSocket.readyState = 3; // CLOSED
          mockSocket.close = () => {};
          mockSocket.send = () => {};
          return mockSocket;
        }
      };

      SafeWebSocket.prototype = OriginalWebSocket.prototype;
      Object.setPrototypeOf(SafeWebSocket, OriginalWebSocket);

      try {
        window.WebSocket = SafeWebSocket as any;
        console.log('[SafeWebSocket] Global WebSocket safety interceptor successfully installed.');
      } catch (e) {
        console.warn('[SafeWebSocket] Could not overwrite window.WebSocket:', e);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SUPABASE IMPORTS
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserRole, Usuario } from '../types/Usuario';

// ---------------------------------------------------------------------------
// SUPABASE CONFIGURATION
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error('Missing Supabase environment variables');
}

console.log(`[Supabase Init Log] URL: ${supabaseUrl}`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export auth instance for easy access
export const auth = supabase.auth;

// ---------------------------------------------------------------------------
// USER PROFILE MANAGEMENT
// ---------------------------------------------------------------------------

/**
 * Busca perfil do usuário no Supabase
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
    
  } catch (error: any) {
    console.error('❌ Error fetching user profile:', error.code || error.name, error.message);
    
    // Fallback para cache local
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const profile = JSON.parse(cached) as Usuario;
        console.log('💾 Utilizando perfil recuperado do cache local (offline):', profile.role);
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
export const ensureUserProfile = async (user: User): Promise<Usuario | null> => {
  const isOwner = user.email?.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';
  const localKey = `sys_cached_profile_${user.id}`;
  
  try {
    let existing = await getUserProfile(user.id);
    
    if (existing) {
      // Se for o owner e não for Admin, eleva para Admin
      if (isOwner && existing.role !== UserRole.Admin) {
        existing = {
          ...existing,
          role: UserRole.Admin,
          setoresAutorizados: ["S87", "S88", "S89", "S90"],
          situacao: 'Ativo',
          cargo: 'ADMINISTRADOR'
        };
        
        const { error } = await supabase
          .from('usuarios')
          .update(existing)
          .eq('id', user.id);
          
        if (error) throw error;
        
        localStorage.setItem(localKey, JSON.stringify(existing));
        console.log('✅ Perfil elevado para Admin');
      }
      return existing;
    }

    // Se estiver offline e for o proprietário, gera perfil Admin local
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
      localStorage.setItem(localKey, JSON.stringify(adminProfile));
      console.log('💾 Proprietário offline: Perfil de Admin gerado localmente.');
      return adminProfile;
    }

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

    try {
      const { error } = await supabase
        .from('usuarios')
        .insert([pendingProfile]);
        
      if (error) throw error;
      
      localStorage.setItem(localKey, JSON.stringify(pendingProfile));
      console.log('✅ Perfil pendente criado com sucesso');
      return pendingProfile;
      
    } catch (writeError: any) {
      console.error('❌ Erro ao criar perfil:', writeError.code, writeError.message);
      
      // Armazena localmente mesmo em erro
      localStorage.setItem(localKey, JSON.stringify(pendingProfile));
      
      if (writeError.code === '42501' || writeError.message?.includes('permission')) {
        console.warn('⚠️ Sem permissão para criar perfil online - usando perfil temporário local');
        return pendingProfile;
      }
      
      return pendingProfile;
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico em ensureUserProfile:', error);
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
    return fallbackProfile;
  }
};

// ---------------------------------------------------------------------------
// AUTHENTICATION FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Login com Google
 */
export const signInWithGoogle = async (): Promise<{ user: User; profile: Usuario | null }> => {
  try {
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

    // Após o redirect, o usuário já está autenticado
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    
    if (!user) throw new Error('Usuário não encontrado após login');

    const profile = await ensureUserProfile(user);
    return { user, profile };
    
  } catch (error: any) {
    console.error('❌ Sign in with Google error:', error);
    throw error;
  }
};

/**
 * Login com Email e Senha
 */
export const signInWithEmail = async (email: string, password: string): Promise<{ user: User; profile: Usuario | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('Usuário não encontrado');

    const profile = await ensureUserProfile(user);
    return { user, profile };
    
  } catch (error: any) {
    console.error('❌ Sign in with email error:', error);
    throw error;
  }
};

/**
 * Cadastro com Email e Senha
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = UserRole.Consulta
): Promise<{ user: User; profile: Usuario | null }> => {
  try {
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
    };

    const { error: profileError } = await supabase
      .from('usuarios')
      .insert([userProfile]);

    if (profileError) throw profileError;

    return { user, profile: userProfile };
    
  } catch (error: any) {
    console.error('❌ Sign up with email error:', error);
    throw error;
  }
};

/**
 * Recuperar senha
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    throw error;
  }
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpa cache local
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sys_cached_profile_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    throw error;
  }
};

/**
 * Atualizar perfil do usuário
 */
export const updateUserProfile = async (userId: string, updates: Partial<Usuario>): Promise<Usuario> => {
  try {
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
    
  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// AUTH STATE OBSERVER
// ---------------------------------------------------------------------------

export const onAuthStateChange = (
  onAuthSuccess?: (user: User, profile: Usuario | null) => void,
  onAuthFailure?: () => void
) => {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user || null;
    
    if (user) {
      try {
        const profile = await ensureUserProfile(user);
        if (onAuthSuccess) onAuthSuccess(user, profile);
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  return data.subscription;
};

// ---------------------------------------------------------------------------
// FETCH WITH AUTH - for API calls
// ---------------------------------------------------------------------------

/**
 * Fetch com autenticação automática
 */
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return fetch(input, { ...init, headers });
    
  } catch (err) {
    console.error('[Supabase Auth] Error in fetchWithAuth:', err);
    return fetch(input, init || {});
  }
};

// ---------------------------------------------------------------------------
// GLOBAL FETCH INTERCEPTOR
// ---------------------------------------------------------------------------

const originalFetch = window.fetch;

const patchedFetch: typeof window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  
  if (url.includes('/api/')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      
      console.log(`[Supabase Interceptor] Intercepted URL: ${url}`);
      console.log(`[Supabase Interceptor] User: ${session?.user?.email || 'Anonymous'}`);
      console.log(`[Supabase Interceptor] Token: ${token ? token.substring(0, 20) + '...' : 'none'}`);

      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      
      return originalFetch(input, { ...init, headers });
      
    } catch (err) {
      console.error('[Supabase Interceptor] Error:', err);
    }
  }
  
  return originalFetch(input, init);
};

try {
  (window as any).fetch = patchedFetch;
  console.log('[Supabase] Global fetch interceptor installed successfully.');
} catch (err) {
  console.warn('[Supabase] Could not install global fetch interceptor:', err);
}

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

export default {
  supabase,
  auth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  logout,
  getUserProfile,
  ensureUserProfile,
  updateUserProfile,
  onAuthStateChange,
  fetchWithAuth,
};
