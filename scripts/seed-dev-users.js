const { Client } = require('pg');

async function seedDevData() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected to PostgreSQL for direct dev seeding...');

  // 1. Campus 1: Apex Institute of Technology
  const apexRes = await client.query("SELECT id FROM campuses WHERE slug = 'apex-tech';");
  const apexCampusId = apexRes.rows[0].id;

  // 2. Campus 2: Pacific Coast University
  const pacificRes = await client.query("SELECT id FROM campuses WHERE slug = 'pacific-coast';");
  const pacificCampusId = pacificRes.rows[0].id;

  // Apex communities
  const devClub = (await client.query("SELECT id FROM communities WHERE campus_id = $1 AND slug = 'developer-student-club';", [apexCampusId])).rows[0]?.id;
  const designClub = (await client.query("SELECT id FROM communities WHERE campus_id = $1 AND slug = 'design-collective';", [apexCampusId])).rows[0]?.id;

  // Pacific community
  const pacificComm = (await client.query("SELECT id FROM communities WHERE campus_id = $1;", [pacificCampusId])).rows[0]?.id;

  const devUsers = [
    {
      email: 'student.apex@gmail.com',
      fullName: 'Jordan Smith',
      role: 'student',
      campusId: apexCampusId,
      memberships: [],
    },
    {
      email: 'alex.rivera.apex@gmail.com',
      fullName: 'Alex Rivera (Lead)',
      role: 'organizer',
      campusId: apexCampusId,
      memberships: [{ communityId: devClub, role: 'lead' }],
    },
    {
      email: 'maya.lin.apex@gmail.com',
      fullName: 'Maya Lin (Design Lead)',
      role: 'organizer',
      campusId: apexCampusId,
      memberships: [{ communityId: designClub, role: 'lead' }],
    },
    {
      email: 'admin.apex@gmail.com',
      fullName: 'Campus Admin (Apex)',
      role: 'admin',
      campusId: apexCampusId,
      memberships: [],
    },
    {
      email: 'admin.pacific@gmail.com',
      fullName: 'Campus Admin (Pacific)',
      role: 'admin',
      campusId: pacificCampusId,
      memberships: [],
    },
    {
      email: 'organizer.pacific@gmail.com',
      fullName: 'Kai Vance (Pacific Lead)',
      role: 'organizer',
      campusId: pacificCampusId,
      memberships: [{ communityId: pacificComm, role: 'lead' }],
    },
  ];

  for (const u of devUsers) {
    let userId;
    const existing = await client.query("SELECT id FROM auth.users WHERE email = $1;", [u.email]);
    if (existing.rows.length === 0) {
      const insAuth = await client.query(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          is_super_admin, is_sso_user, is_anonymous, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', $1, crypt('Password123!', gen_salt('bf')),
          NOW(), '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', $2::text, 'role', $3::text),
          false, false, false, NOW(), NOW()
        )
        RETURNING id;
      `, [u.email, u.fullName, u.role]);
      userId = insAuth.rows[0].id;

      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text),
          'email', $2::text, NOW(), NOW(), NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
      `, [userId, userId, u.email]);
    } else {
      userId = existing.rows[0].id;
      await client.query("UPDATE auth.users SET encrypted_password = crypt('Password123!', gen_salt('bf')), email_confirmed_at = NOW() WHERE id = $1;", [userId]);
    }

    // Upsert into public.users
    await client.query(`
      INSERT INTO public.users (id, email, full_name, role, campus_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET full_name = $3, role = $4, campus_id = $5;
    `, [userId, u.email, u.fullName, u.role, u.campusId]);

    // Upsert memberships
    for (const m of u.memberships) {
      if (m.communityId) {
        await client.query(`
          INSERT INTO public.community_members (id, community_id, user_id, role, status)
          VALUES (gen_random_uuid(), $1, $2, $3, 'active')
          ON CONFLICT (community_id, user_id) DO UPDATE SET role = $3, status = 'active';
        `, [m.communityId, userId, m.role]);
      }
    }
    console.log(`✓ Seeded & configured dev user: ${u.email} (${u.role}, campus: ${u.campusId === apexCampusId ? 'Apex' : 'Pacific'})`);
  }

  await client.end();
  console.log('ALL DEV TEST PERSONAS SUCCESSFULLY SEEDED!');
}

seedDevData();
