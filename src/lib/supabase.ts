import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseRealtimeEnabled = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true';
const supabaseStorageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'avatars';
const supabaseSchema = import.meta.env.VITE_SUPABASE_SCHEMA || 'public';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  throw new Error('Missing Supabase environment variables');
}

console.log(`[Supabase] URL: ${supabaseUrl}`);
console.log(`[Supabase] Realtime: ${supabaseRealtimeEnabled ? '✅' : '❌'}`);
console.log(`[Supabase] Storage Bucket: ${supabaseStorageBucket}`);
console.log(`[Supabase] Schema: ${supabaseSchema}`);

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
      eventsPerSecond: supabaseRealtimeEnabled ? 10 : 0,
    },
  },
  db: {
    schema: supabaseSchema,
  },
});

export const auth = supabase.auth;

// Exportar configurações
export const config = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseRealtimeEnabled,
  supabaseStorageBucket,
  supabaseSchema,
};

export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

console.log(`[Supabase] Configuration status: ${isSupabaseConfigured() ? '✅ OK' : '❌ Missing'}`);
