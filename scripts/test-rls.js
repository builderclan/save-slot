const { Client } = require('pg');

async function testRlsWithPg() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const apexCampus = (await client.query("SELECT id FROM campuses WHERE slug = 'apex-tech'")).rows[0].id;
  const comm = (await client.query("SELECT id FROM communities WHERE campus_id = $1 LIMIT 1", [apexCampus])).rows[0].id;

  // Let's create a test user in public.users who is a lead for this community
  const testUserId = 'a0000000-0000-0000-0000-000000000001';
  await client.query(`
    INSERT INTO public.users (id, email, full_name, role, campus_id)
    VALUES ($1, 'lead@test.com', 'Test Lead', 'organizer', $2)
    ON CONFLICT (id) DO UPDATE SET role = 'organizer', campus_id = $2;
  `, [testUserId, apexCampus]);

  await client.query(`
    INSERT INTO public.community_members (id, community_id, user_id, role, status)
    VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
    ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead';
  `, [comm, testUserId]);

  // Now, in a transaction, switch to role 'authenticated' with this user ID claim:
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true);`, [testUserId]);

  // Check auth.uid()
  const uidRes = await client.query('SELECT auth.uid() as current_uid, auth.role() as current_role;');
  console.log('PostgreSQL Auth Context:', uidRes.rows[0]);

  // Try insert event under RLS
  const insertRes = await client.query(`
    INSERT INTO events (
      campus_id, community_id, title, slug, description, category,
      start_time, end_time, location_name, status, created_by
    )
    VALUES (
      $1, $2, 'RLS Verified Event', 'rls-verified-event', 'Description', 'Tech',
      NOW() + interval '1 day', NOW() + interval '1 day 2 hours', 'Turing Auditorium',
      'published', $3
    )
    RETURNING id, title, created_by;
  `, [apexCampus, comm, testUserId]);

  console.log('Inserted under RLS successfully:', insertRes.rows[0]);

  // Now test an unauthorized user trying to insert for this community
  const unauthorizedUserId = 'b0000000-0000-0000-0000-000000000002';
  await client.query(`SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true);`, [unauthorizedUserId]);

  try {
    await client.query(`
      INSERT INTO events (
        campus_id, community_id, title, slug, description, category,
        start_time, end_time, location_name, status, created_by
      )
      VALUES (
        $1, $2, 'Unauthorized Event', 'unauth-event', 'Description', 'Tech',
        NOW() + interval '2 days', NOW() + interval '2 days 2 hours', 'Turing Auditorium',
        'published', $3
      );
    `, [apexCampus, comm, unauthorizedUserId]);
    console.log('ERROR: Unauthorized insert should have failed!');
  } catch (err) {
    console.log('Expected RLS rejection for unauthorized user:', err.message);
  }

  await client.query('ROLLBACK');
  await client.end();
}

testRlsWithPg();
