const { Client } = require('pg');
async function run() {
  const connStr = process.env.POSTGRES_URL_NON_POOLING.replace('?sslmode=require', '');
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    REVOKE EXECUTE ON FUNCTION public.execute_sql(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;
  `);
  console.log('Function execute_sql secured');
  await client.end();
}
run();
