import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};

export const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || "";

export const isStaticBuild = !SUPABASE_URL || !SUPABASE_ANON_KEY;

if (isStaticBuild) {
  console.warn('[Supabase Init Log] No VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY found. Running in offline/mock mode.');
}

export const supabase = isStaticBuild
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
