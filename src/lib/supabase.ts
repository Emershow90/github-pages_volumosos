import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
