const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: 'SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = \'usuarios_role_check\';' });
  console.log(data, error);
}
run();
