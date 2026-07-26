const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const rolesToTest = ['Coordenador', 'coordenador', 'COORDENADOR', 'Coordinator'];
  for (let role of rolesToTest) {
    const roleStr = String(role).trim();
    role = roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();
    const { error } = await supabase.from('usuarios').upsert({
      id: 'dc9db7ab-a4c6-4fd8-9dc6-71f9f03ac40e',
      email: 'emerson.oliveira@decathlon.com',
      nome: 'EMERSON',
      role,
      setoresautorizados: [ 'S87' ],
      situacao: 'Ativo'
    });
    console.log(`Role: ${role} -> Error: ${error ? error.message : 'OK'}`);
  }
}
run();
