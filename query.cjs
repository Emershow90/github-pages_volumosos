const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: cols } = await supabase.from('escala_semanal').select('*').limit(1);
  console.log(cols);
}
run();
