import { createClient } from '@supabase/supabase-js';

// NOTE: removed hardcoded default URL / anon key to avoid silent fallback to a different Supabase project.
// The application MUST receive Supabase settings via environment variables in CI / preview / production.
const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {};

export const SUPABASE_URL = 
  env.VITE_SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL || 
  env.SUPABASE_URL;

export const SUPABASE_ANON_KEY = 
  env.VITE_SUPABASE_ANON_KEY || 
  env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  env.SUPABASE_PUBLISHABLE_KEY || 
  env.SUPABASE_ANON_KEY;

export const isStaticBuild = !SUPABASE_URL || !SUPABASE_ANON_KEY;

// Diagnostic logs: explicit error messages when required env vars are missing to avoid silent fallbacks.
if (!SUPABASE_URL) {
  console.error('[Supabase Init Error] Missing Supabase URL. Provide one of: VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL.');
}
if (!SUPABASE_ANON_KEY) {
  console.error('[Supabase Init Error] Missing Supabase ANON key. Provide one of: VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY.');
}
if (isStaticBuild) {
  console.warn('[Supabase Init] Running in offline/mock mode because Supabase URL or ANON key is missing. See previous errors for required env vars.');
}

export const supabase = isStaticBuild
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Diagnostica se as variáveis de ambiente do Supabase estão configuradas corretamente.
 * Previne erros de 'undefined' no fluxo de autenticação e comunicação.
 */
export function checkSupabaseConnection(): {
  success: boolean;
  message: string;
  url: string;
  hasKey: boolean;
} {
  const url = SUPABASE_URL;
  const hasKey = !!SUPABASE_ANON_KEY;
  if (!url && !hasKey) {
    return {
      success: false,
      message: 'Ambas as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY estão ausentes. O sistema está rodando em modo Mock/Estático.',
      url: '',
      hasKey: false
    };
  }
  if (!url) {
    return {
      success: false,
      message: 'A variável de ambiente VITE_SUPABASE_URL está ausente. O sistema está rodando em modo Mock/Estático.',
      url: '',
      hasKey
    };
  }
  if (!hasKey) {
    return {
      success: false,
      message: 'A chave da API (VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_PUBLISHABLE_KEY) está ausente. O sistema está rodando em modo Mock/Estático.',
      url,
      hasKey: false
    };
  }
  return {
    success: true,
    message: 'Variáveis de ambiente do Supabase carregadas com sucesso.',
    url,
    hasKey: true
  };
}
