// ---------------------------------------------------------------------------
// SAFE ENVIRONMENT POLYFILLS FOR AI STUDIO IFRAME SANDBOX
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
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
              console.warn('[SafeWebSocket] Reflect.construct failed, falling back:', reflectErr);
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
        console.log('[SafeWebSocket] Global WebSocket safety interceptor installed.');
      } catch (e) {
        console.warn('[SafeWebSocket] Could not overwrite window.WebSocket:', e);
      }
    }
  }
}

import { supabase, isStaticBuild } from './supabase';
import { UserRole, Usuario } from '../types/Usuario';
import { IndexedDBService } from './indexedDb';

// Define a safe mock user interface
export interface SupabaseUser {
  uid: string;
  id: string;
  email?: string;
  displayName?: string;
  user_metadata?: {
    displayName?: string;
    full_name?: string;
  };
  getIdToken: () => Promise<string>;
}

// In-memory current user tracker for the app
let currentMockUser: SupabaseUser | null = null;

export function ensureGetIdToken(user: any): any {
  if (!user) return null;
  if (typeof user.getIdToken !== 'function') {
    user.getIdToken = async () => {
      if (!isStaticBuild && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token || "local-token";
        } catch (e) {
          return "local-token";
        }
      }
      return "local-token";
    };
  }
  return user;
}

// Sincronizar usuário logado inicial do localStorage se houver
if (typeof window !== 'undefined') {
  const cachedUser = localStorage.getItem('sys_active_user_session');
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      currentMockUser = ensureGetIdToken(parsed);
    } catch (e) {
      console.error('Error loading cached user session', e);
    }
  }
}

// Emulate getAuth().currentUser or similar
export const auth = {
  get currentUser() {
    return ensureGetIdToken(currentMockUser);
  },
  onAuthStateChanged: (cb: (user: any) => void, errorCb?: (err: any) => void) => {
    if (isStaticBuild) {
      setTimeout(() => cb(auth.currentUser), 100);
      return () => {};
    }
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        currentMockUser = {
          uid: u.id,
          id: u.id,
          email: u.email,
          displayName: u.user_metadata?.displayName || u.user_metadata?.full_name || u.email?.split('@')[0],
          getIdToken: async () => session.access_token || ""
        };
        localStorage.setItem('sys_active_user_session', JSON.stringify(currentMockUser));
        cb(auth.currentUser);
      } else {
        currentMockUser = null;
        localStorage.removeItem('sys_active_user_session');
        cb(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  },
  signOut: async () => {
    if (!isStaticBuild) {
      await supabase!.auth.signOut();
    }
    currentMockUser = null;
    localStorage.removeItem('sys_active_user_session');
    localStorage.removeItem('current_user');
    localStorage.removeItem('current_role');
    localStorage.removeItem('current_status');
    // Clear profile caches
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sys_cached_profile_')) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const getUserProfile = async (uid: string): Promise<Usuario | null> => {
  const localKey = `sys_cached_profile_${uid}`;
  
  if (isStaticBuild) {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        return JSON.parse(cached) as Usuario;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  try {
    const { data, error } = await supabase!
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) throw error;
    if (data) {
      const dbRecord = data as any;
      const profile: Usuario = {
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
        data_aprovacao: dbRecord.data_aprovacao
      };
      localStorage.setItem(localKey, JSON.stringify(profile));
      return profile;
    }
  } catch (error: any) {
    console.error('❌ Error fetching user profile from Supabase:', error.message);
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        return JSON.parse(cached) as Usuario;
      } catch (jsonErr) {
        console.error('❌ Error parsing local cached profile:', jsonErr);
      }
    }
  }
  return null;
};

export const ensureUserProfile = async (user: any): Promise<Usuario | null> => {
  const email = user.email || '';
  const isOwner = email.toLowerCase() === 'emersonoliveira.goncalves@gmail.com' || email.toLowerCase() === 'emerson.oliveira@decathlon.com';
  const localKey = `sys_cached_profile_${user.uid}`;

  try {
    let existing = await getUserProfile(user.uid);
    if (existing) {
      if (isOwner && existing.role !== UserRole.Admin) {
        existing = {
          ...existing,
          role: UserRole.Admin,
          setoresAutorizados: ["S87", "S88", "S89", "S90"],
          situacao: 'Ativo',
          cargo: 'ADMINISTRADOR'
        };
        if (!isStaticBuild) {
          try {
            await supabase!
              .from('usuarios')
              .upsert({
                id: user.uid,
                email: existing.email,
                nome: existing.nome,
                role: existing.role,
                setoresAutorizados: existing.setoresAutorizados,
                situacao: existing.situacao,
                cargo: existing.cargo,
                unidade: existing.unidade || 'CD Principal',
                avatar_url: existing.foto || '',
                aprovado_por: existing.aprovado_por || null,
                data_aprovacao: existing.data_aprovacao || null
              });
          } catch (e) {
            console.warn("Could not elevate to admin online", e);
          }
        }
        localStorage.setItem(localKey, JSON.stringify(existing));
      }
      return existing;
    }

    const defaultProfile: Usuario = {
      email,
      nome: user.displayName || user.user_metadata?.full_name || 'Usuário',
      role: isOwner ? UserRole.Admin : UserRole.Consulta,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Pendente',
      cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
      unidade: 'CD Principal'
    };

    if (!isStaticBuild) {
      await supabase!
        .from('usuarios')
        .upsert({
          id: user.uid,
          email: defaultProfile.email,
          nome: defaultProfile.nome,
          role: defaultProfile.role,
          setoresAutorizados: defaultProfile.setoresAutorizados,
          situacao: defaultProfile.situacao,
          cargo: defaultProfile.cargo,
          unidade: defaultProfile.unidade || 'CD Principal',
          avatar_url: defaultProfile.foto || '',
          aprovado_por: defaultProfile.aprovado_por || null,
          data_aprovacao: defaultProfile.data_aprovacao || null
        });
    }
    localStorage.setItem(localKey, JSON.stringify(defaultProfile));
    return defaultProfile;

  } catch (error: any) {
    console.error('❌ Erro crítico em ensureUserProfile:', error);
    const fallbackProfile: Usuario = {
      email,
      nome: user.displayName || 'Usuário',
      role: isOwner ? UserRole.Admin : UserRole.Consulta,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Erro',
      cargo: isOwner ? 'ADMINISTRADOR' : 'ERRO_AO_CARREGAR',
      unidade: 'CD Principal'
    };
    return fallbackProfile;
  }
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return auth.onAuthStateChanged(async (user: any) => {
    if (user) {
      const safeUser = ensureGetIdToken(user);
      const token = safeUser && typeof safeUser.getIdToken === 'function' ? await safeUser.getIdToken() : '';
      if (onAuthSuccess) onAuthSuccess(safeUser, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  if (isStaticBuild) {
    const mockUser: SupabaseUser = {
      uid: "local-google",
      id: "local-google",
      email: "google@local.com",
      displayName: "Usuário Google Local",
      getIdToken: async () => "local-token"
    };
    currentMockUser = mockUser;
    localStorage.setItem('sys_active_user_session', JSON.stringify(mockUser));
    await ensureUserProfile(mockUser);
    return { user: mockUser, accessToken: "mock-token" };
  }

  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const { data, error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
      }
    });

    if (error) throw error;
    return null; // OAuth redireciona a página
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
};

export const loginWithEmail = async (email: string, password: string): Promise<any> => {
  if (isStaticBuild) {
    const mockUser: SupabaseUser = {
      uid: "local-user",
      id: "local-user",
      email,
      displayName: email.split('@')[0],
      getIdToken: async () => "local-token"
    };
    currentMockUser = mockUser;
    localStorage.setItem('sys_active_user_session', JSON.stringify(mockUser));
    return mockUser;
  }

  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  const u = data.user!;
  const mappedUser: SupabaseUser = {
    uid: u.id,
    id: u.id,
    email: u.email,
    displayName: u.user_metadata?.displayName || u.email?.split('@')[0],
    getIdToken: async () => data.session?.access_token || ""
  };
  currentMockUser = mappedUser;
  localStorage.setItem('sys_active_user_session', JSON.stringify(mappedUser));
  return mappedUser;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<{ user: any; profile: Usuario }> => {
  if (isStaticBuild) {
    const mockUser: SupabaseUser = {
      uid: "local-user",
      id: "local-user",
      email,
      displayName: name,
      getIdToken: async () => "local-token"
    };
    currentMockUser = mockUser;
    localStorage.setItem('sys_active_user_session', JSON.stringify(mockUser));
    
    const isOwner = email.toLowerCase() === 'emersonoliveira.goncalves@gmail.com' || email.toLowerCase() === 'emerson.oliveira@decathlon.com';
    const profile: Usuario = {
      email,
      nome: name,
      role: isOwner ? UserRole.Admin : role,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Pendente',
      cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
      unidade: "CD Principal"
    };
    localStorage.setItem(`sys_cached_profile_${mockUser.uid}`, JSON.stringify(profile));
    return { user: mockUser, profile };
  }

  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        displayName: name
      }
    }
  });

  if (error) throw error;
  const u = data.user!;
  const mappedUser: SupabaseUser = {
    uid: u.id,
    id: u.id,
    email: u.email,
    displayName: name,
    getIdToken: async () => data.session?.access_token || ""
  };

  currentMockUser = mappedUser;
  localStorage.setItem('sys_active_user_session', JSON.stringify(mappedUser));

  const isOwner = email.toLowerCase() === 'emersonoliveira.goncalves@gmail.com' || email.toLowerCase() === 'emerson.oliveira@decathlon.com';
  const userProfile: Usuario = {
    email,
    nome: name,
    role: isOwner ? UserRole.Admin : role,
    setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
    situacao: isOwner ? 'Ativo' : 'Pendente',
    cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
    unidade: "CD Principal"
  };

  await supabase!
    .from('usuarios')
    .upsert({
      id: u.id,
      email: userProfile.email,
      nome: userProfile.nome,
      role: userProfile.role,
      setoresAutorizados: userProfile.setoresAutorizados,
      situacao: userProfile.situacao,
      cargo: userProfile.cargo,
      unidade: userProfile.unidade || 'CD Principal',
      avatar_url: userProfile.foto || '',
      aprovado_por: userProfile.aprovado_por || null,
      data_aprovacao: userProfile.data_aprovacao || null
    });

  localStorage.setItem(`sys_cached_profile_${u.id}`, JSON.stringify(userProfile));
  return { user: mappedUser, profile: userProfile };
};

export const recoverPassword = async (email: string): Promise<void> => {
  if (isStaticBuild) return;
  const { error } = await supabase!.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

export const logoutUser = async (): Promise<void> => {
  await auth.signOut();
};

const IS_STATIC_BUILD = true; // For GitHub Pages / static hosting without backend

// Explicit Fetch Wrapper with Auth for absolute reliability
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  try {
    const user = auth.currentUser;
    const token = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
    
    if (IS_STATIC_BUILD && url.includes('/api/')) {
      return simulateBackendRequest(url, init);
    }

    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return window.fetch(input, { ...init, headers });
  } catch (err) {
    console.error('[SupabaseAuth Log] Error in fetchWithAuth:', err);
    return window.fetch(input, init);
  }
};

async function simulateBackendRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method || 'GET';
  const urlObj = new URL(url, window.location.origin);
  const pathParts = urlObj.pathname.split('/api/');
  const tableName = pathParts.length > 1 ? pathParts[1] : '';
  
  if (!tableName) return new Response("Not found", { status: 404 });

  try {
    if (method === 'GET') {
      const data = await IndexedDBService.getAll(tableName);
      return new Response(JSON.stringify(data), { status: 200, headers: {'Content-Type': 'application/json'} });
    }
    if (method === 'POST') {
      const body = JSON.parse(init?.body as string);
      const saved = await IndexedDBService.put(tableName, body);
      return new Response(JSON.stringify(saved), { status: 200, headers: {'Content-Type': 'application/json'} });
    }
    if (method === 'PUT') {
      const body = JSON.parse(init?.body as string);
      if (Array.isArray(body)) {
        await Promise.all(body.map(item => IndexedDBService.put(tableName, item)));
      } else {
        await IndexedDBService.put(tableName, body);
      }
      return new Response(JSON.stringify(body), { status: 200, headers: {'Content-Type': 'application/json'} });
    }
    if (method === 'DELETE') {
      const id = urlObj.searchParams.get('id');
      if (id) {
         await IndexedDBService.delete(tableName, id);
      } else {
         await IndexedDBService.clear(tableName);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response("Method Not Allowed", { status: 405 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

const originalFetch = window.fetch;

const patchedFetch: typeof window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  if (url.includes('/api/')) {
    if (IS_STATIC_BUILD) {
      return simulateBackendRequest(url, init);
    }
    try {
      const user = auth.currentUser;
      const token = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return originalFetch(input, { ...init, headers });
    } catch (err) {
      console.error('Error in global fetch auth interceptor:', err);
    }
  }
  return originalFetch(input, init);
};

try {
  (window as any).fetch = patchedFetch;
  console.log('[SupabaseAuth] Global fetch interceptor installed.');
} catch (err) {
  console.warn('Could not install global fetch interceptor in this sandbox:', err);
}
