import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('store_operations').select('loja_id');
  if (error) console.error(error);
  else {
    const ids = Array.from(new Set(data.map(d => d.loja_id))).slice(0, 20);
    console.log("Distinct loja_id:", ids);
  }
}
test();
