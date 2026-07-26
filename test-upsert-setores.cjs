const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const payload = {
    id: '89',
    numero: 89,
    nome: 'Picking 89',
    resp: 'IAGO ANDERSON',
    fotolider: null,
    meta: 90,
    situacao: 'Ativo'
  };
  const { data, error } = await supabase.from('setores').insert(payload).select();
  console.log('Result:', data, error);
}
run();
