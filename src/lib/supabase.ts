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
      message: 'Ambas as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão ausentes. O sistema está rodando em modo Mock/Estático.',
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
      message: 'A variável de ambiente VITE_SUPABASE_ANON_KEY está ausente. O sistema está rodando em modo Mock/Estático.',
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

