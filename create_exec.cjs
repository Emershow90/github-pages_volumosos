const { Client } = require('pg');
async function run() {
  const connStr = process.env.POSTGRES_URL_NON_POOLING.replace('?sslmode=require', '');
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    CREATE OR REPLACE FUNCTION public.execute_sql(sql_statement text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result jsonb;
    BEGIN
      EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_statement || ') t' INTO result;
      RETURN COALESCE(result, '[]'::jsonb);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('error', SQLERRM, 'state', SQLSTATE);
    END;
    $$;
  `);
  console.log('Function execute_sql created');
  await client.end();
}
run();
