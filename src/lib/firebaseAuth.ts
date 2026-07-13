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
      event.preventDefault(); // Prevent crash overlays in development/preview
    }
  });

  // 2. Safe WebSocket Interceptor and Wrapper
  if ('WebSocket' in window) {
    const OriginalWebSocket = window.WebSocket;
    if (typeof OriginalWebSocket === 'function') {
      const SafeWebSocket = function (url: string | URL, protocols?: string | string[]) {
        try {
          const urlStr = typeof url === 'string' ? url : url.toString();
          
          // Apply safety filters only to URLs we want or generally wrap it
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
          // Return a robust mock socket object to prevent immediate application crash
          const mockSocket = new EventTarget() as any;
          mockSocket.url = typeof url === 'string' ? url : url.toString();
          mockSocket.readyState = 3; // CLOSED
          mockSocket.close = () => {};
          mockSocket.send = () => {};
          return mockSocket;
        }
      };

      // Copy prototype and static properties to maintain instanceof and compatibility
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

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { UserRole, Usuario } from '../types/Usuario';
import firebaseConfigJson from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID,
  appId: firebaseConfigJson.appId || metaEnv.VITE_FIREBASE_APP_ID,
  apiKey: firebaseConfigJson.apiKey || metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigJson.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: firebaseConfigJson.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigJson.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: firebaseConfigJson.measurementId || metaEnv.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let databaseId = firebaseConfigJson.firestoreDatabaseId || metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
if (!databaseId || databaseId === "(default)" || databaseId.includes("default")) {
  databaseId = "ai-studio-volumosos-f719ac6b-da94-4363-9514-963a0caa3036";
}

console.log(`[Firebase Init Log] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase Init Log] Database ID: ${databaseId}`);

// Use experimentalForceLongPolling to force HTTPS long-polling instead of WebSockets.
// This is the industry-standard way to solve WebSocket connection blockages and "closed without opened"
// issues in heavily sandboxed preview environments like Google AI Studio.
export const db = databaseId 
  ? initializeFirestore(app, { 
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true 
    }, databaseId) 
  : initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true
    });

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const getUserProfile = async (uid: string): Promise<Usuario | null> => {
  const localKey = `sys_cached_profile_${uid}`;
  try {
    // Attempt Firestore fetch
    const docSnap = await getDoc(doc(db, 'usuarios', uid));
    if (docSnap.exists()) {
      console.log('✅ Perfil encontrado:', docSnap.data().role);
      const profile = docSnap.data() as Usuario;
      localStorage.setItem(localKey, JSON.stringify(profile));
      return profile;
    }
    console.log('📭 Nenhum perfil encontrado para uid:', uid);
  } catch (error: any) {
    console.error('❌ Error fetching user profile:', error.code || error.name, error.message);
    
    // Attempt local storage cache fallback
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

export const ensureUserProfile = async (user: User): Promise<Usuario | null> => {
  const isOwner = user.email?.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';
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
        try {
          await setDoc(doc(db, 'usuarios', user.uid), existing);
          localStorage.setItem(localKey, JSON.stringify(existing));
        } catch (e) {
          console.warn("Could not elevate to admin online", e);
        }
      }
      return existing;
    }

    // Se estiver completamente offline e sem cache local, mas for o proprietário, gera o perfil de Admin offline
    if (isOwner) {
      const adminProfile: Usuario = {
        email: user.email || '',
        nome: user.displayName || 'Emerson Oliveira',
        role: UserRole.Admin,
        setoresAutorizados: ["S87", "S88", "S89", "S90"],
        situacao: 'Ativo',
        cargo: 'ADMINISTRADOR',
        unidade: 'CD Principal',
      };
      localStorage.setItem(localKey, JSON.stringify(adminProfile));
      console.log('💾 Proprietário offline: Perfil de Admin gerado com sucesso localmente.');
      return adminProfile;
    }

    console.log('📝 Criando perfil pendente para:', user.email);
    
    // VALORES CORRETOS DO ENUM
    const pendingProfile: Usuario = {
      email: user.email || '',
      nome: user.displayName || 'Usuário',
      role: UserRole.Consulta,
      setoresAutorizados: [],
      situacao: 'Pendente',
      cargo: 'AGUARDANDO_APROVACAO',
      unidade: 'CD Principal',
    };

    try {
      await setDoc(doc(db, 'usuarios', user.uid), pendingProfile);
      localStorage.setItem(localKey, JSON.stringify(pendingProfile));
      console.log('✅ Perfil pendente criado com sucesso');
      return pendingProfile;
    } catch (writeError: any) {
      console.error('❌ Erro ao criar perfil:', writeError.code, writeError.message);
      
      // Armazena localmente o perfil pendente mesmo em caso de erro/offline
      localStorage.setItem(localKey, JSON.stringify(pendingProfile));
      
      if (writeError.code === 'permission-denied' || writeError.code === 'unavailable') {
        console.warn('⚠️ Sem conexão ou permissão para criar perfil online - usando perfil temporário local');
        return pendingProfile;
      }
      
      return pendingProfile;
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico em ensureUserProfile:', error);
    const fallbackProfile: Usuario = {
      email: user.email || '',
      nome: user.displayName || 'Usuário',
      role: isOwner ? UserRole.Admin : UserRole.Consulta,
      setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
      situacao: isOwner ? 'Ativo' : 'Erro',
      cargo: isOwner ? 'ADMINISTRADOR' : 'ERRO_AO_CARREGAR',
      unidade: 'CD Principal',
    };
    return fallbackProfile;
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    await ensureUserProfile(result.user);
    return { user: result.user, accessToken: cachedAccessToken };
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
  cachedAccessToken = null;
};

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<{ user: User; profile: Usuario }> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName: name });

  const isOwner = email.toLowerCase() === 'emersonoliveira.goncalves@gmail.com';

  // SEGURANÇA: Respeita o papel escolhido pelo usuário (que começará como Pendente e necessitará aprovação do Admin, exceto para o proprietário)
  const userProfile: Usuario = {
    email,
    nome: name,
    role: isOwner ? UserRole.Admin : role,
    setoresAutorizados: isOwner ? ["S87", "S88", "S89", "S90"] : [],
    situacao: isOwner ? 'Ativo' : 'Pendente',
    cargo: isOwner ? 'ADMINISTRADOR' : 'AGUARDANDO_APROVACAO',
    unidade: "CD Principal"
  };

  await setDoc(doc(db, 'usuarios', user.uid), userProfile);
  return { user, profile: userProfile };
};

export const recoverPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

import { IndexedDBService } from './indexedDb';

const IS_STATIC_BUILD = true; // For GitHub Pages / static hosting without backend

// Explicit Fetch Wrapper with Auth for absolute reliability
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    
    // GITHUB PAGES / STATIC HOSTING FALLBACK
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
    console.error('[FirebaseAuth Log] Error in fetchWithAuth:', err);
    return window.fetch(input, init);
  }
};

async function simulateBackendRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method || 'GET';
  const urlObj = new URL(url, 'http://localhost');
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

// Global Fetch interceptor to automatically attach Firebase ID Token to all backend /api/* calls
const originalFetch = window.fetch;

const patchedFetch: typeof window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  if (url.includes('/api/')) {
    if (IS_STATIC_BUILD) {
      return simulateBackendRequest(url, init);
    }
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      console.log(`[FirebaseAuth Interceptor Log] Intercepted URL: ${url}`);
      console.log(`[FirebaseAuth Interceptor Log] User: ${user?.email || 'Anonymous'}`);
      console.log(`[FirebaseAuth Interceptor Log] Project ID: ${firebaseConfig.projectId}`);
      console.log(`[FirebaseAuth Interceptor Log] Database ID: ${databaseId}`);
      console.log(`[FirebaseAuth Interceptor Log] Token sample: ${token ? token.substring(0, 20) + '...' : 'none'}`);

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
  console.log('[FirebaseAuth] Interceptor global de fetch instalado via atribuição direta.');
} catch (err) {
  // Ambiente não permite sobrescrever window.fetch (ex.: iframe sandboxado do AI Studio).
  // O app continua funcionando, mas sem o interceptor automático de token nessas chamadas.
  console.warn('Não foi possível instalar o interceptor global de fetch neste ambiente:', err);
}