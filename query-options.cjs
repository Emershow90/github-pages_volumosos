async function run() {
  const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/usuarios', {
    method: 'OPTIONS',
    headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
  });
  console.log('Headers:', res.headers);
  const text = await res.text();
  console.log('Result:', text);
}
run();
