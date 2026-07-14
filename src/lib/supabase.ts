import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojuewwutcymfqxzpdtci.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CgGDu_1Z6Bptd4mA3Ri33w_v0KuKcW7';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error('Missing Supabase environment variables');
}

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
      eventsPerSecond: import.meta.env.VITE_SUPABASE_REALTIME_ENABLED === 'true' ? 10 : 0,
    },
  },
  db: {
    schema: import.meta.env.VITE_SUPABASE_SCHEMA || 'public',
  },
});

export const auth = supabase.auth;
export const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'avatars';

// Informações do projeto
export const PROJECT_INFO = {
  url: supabaseUrl,
  projectId: 'ojuewwutcymfqxzpdtci',
  region: 'us-east-1',
};

console.log(`[Supabase] URL: ${supabaseUrl}`);
console.log(`[Supabase] Project ID: ${PROJECT_INFO.projectId}`);
console.log(`[Supabase] Status: ✅ Configurado`);
