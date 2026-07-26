const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'usuarios\';' });
  console.log(data, error);
}
run();
