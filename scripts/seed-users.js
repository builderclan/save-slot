const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'alex.rivera.apex@gmail.com';");
  await client.end();

  const supabase = createClient(
    'https://dxwumvmscmictbnbfqyb.supabase.co',
    'sb_publishable_RybY8XU72-fnFiJPNoiKSw_jcPuF9_K'
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'alex.rivera.apex@gmail.com',
    password: 'Password123!',
  });
  console.log('SignIn successful:', data?.user?.email, 'Token:', Boolean(data?.session?.access_token), 'Error:', error);
}
run();
