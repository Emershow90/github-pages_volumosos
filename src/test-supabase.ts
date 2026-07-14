import { supabase } from '@/lib/supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    // Testar conexão com a tabela store_master
    const { data, error } = await supabase
      .from('store_master')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      return false;
    }

    console.log('✅ Conexão com Supabase estabelecida!');
    console.log(`📊 Dados encontrados: ${data?.length || 0} registros`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao testar conexão:', err);
    return false;
  }
};

// Executar automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  testSupabaseConnection();
}
