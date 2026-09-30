const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function fixUsers() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(`
    UPDATE auth.users
    SET recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        confirmation_token = COALESCE(confirmation_token, encode(gen_random_bytes(32), 'hex')),
        is_super_admin = NULL,
        reauthentication_token = '',
        phone_change = '',
        phone_change_token = '',
        email_change_token_current = '',
        email_confirmed_at = NOW()
    WHERE recovery_token IS NULL OR email_change IS NULL;
  `);

  await client.end();
  console.log('Fixed auth.users tokens.');

  const supabase = createClient(
    'https://dxwumvmscmictbnbfqyb.supabase.co',
    'sb_publishable_RybY8XU72-fnFiJPNoiKSw_jcPuF9_K'
  );

  const users = [
    'student.apex@gmail.com',
    'alex.rivera.apex@gmail.com',
    'maya.lin.apex@gmail.com',
    'admin.apex@gmail.com',
    'admin.pacific@gmail.com',
    'organizer.pacific@gmail.com',
  ];

  for (const email of users) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Password123!'
    });
    console.log('SignIn:', email, '=>', Boolean(data?.session?.access_token), error ? `Error: ${error.message}` : 'SUCCESS');
  }
}

fixUsers();
