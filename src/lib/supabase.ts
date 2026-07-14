import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { UserRole, Usuario } from '../types/Usuario';

// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojuewwutcymfqxzpdtci.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CgGDu_1Z6Bptd4mA3Ri33w_v0KuKcW7';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error('Missing Supabase environment variables');
}

console.log(`[Supabase] URL: ${supabaseUrl}`);
console.log(`[Supabase] Status: ✅ Configurado`);

// ============================================
// CRIAÇÃO DO CLIENTE SUPABASE
// ============================================
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
  db: {
    schema: 'public',
  },
});

// ============================================
// EXPORTS PRINCIPAIS
// ============================================
export const auth = supabase.auth;

export const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'avatars';

// ============================================
// INFORMAÇÕES DO PROJETO
// ============================================
export const PROJECT_INFO = {
  url: supabaseUrl,
  projectId: 'ojuewwutcymfqxzpdtci',
  region: 'us-east-1',
};

// ============================================
// FUNÇÕES DE VERIFICAÇÃO
// ============================================
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ [Supabase] Conexão estabelecida com sucesso!');
    return true;
  } catch (err) {
    console.error('❌ [Supabase] Erro ao conectar:', err);
    return false;
  }
};
