const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const payload = {
    id: "dc9db7ab-a4c6-4fd8-9dc6-71f9f03ac40e",
    email: "emerson.oliveira@decathlon.com",
    nome: "EMERSON",
    role: "coordenador",
    situacao: "Ativo",
    data_aprovacao: "2024-01-01"
  };
  const { data, error } = await supabase.from('usuarios').insert(payload).select();
  console.log('Result:', data, error);
}
run();
