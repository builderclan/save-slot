const { Client } = require("pg");

async function migrateAndSeedVicePrincipal() {
  const password = process.env.DB_PASSWORD || process.env.DB_password;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || "6543", 10);
  const database = process.env.DB_NAME || "postgres";
  const user = process.env.DB_USER;

  if (!password || !host || !user) {
    throw new Error("Missing required database environment variables (DB_HOST, DB_USER, DB_PASSWORD).");
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized },
  });

  await client.connect();
  console.log("Connected to PostgreSQL for Vice Principal Role Migration...");

  try {
    // 1. Update check constraint on public.users
    console.log("Updating users_role_check constraint to include 'vice_principal'...");
    await client.query("ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;");
    await client.query(`
      ALTER TABLE public.users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('student', 'organizer', 'admin', 'principal', 'vice_principal'));
    `);
    console.log("✓ users_role_check updated to include 'vice_principal'");

    // 2. Fetch primary campus ID
    const campusRes = await client.query("SELECT id FROM public.campuses LIMIT 1;");
    const campusId = campusRes.rows[0]?.id;

    // 3. Create or update Vice Principal user in auth.users & public.users
    const vpEmail = "viceprincipal@campus.edu";
    const vpPassword = "viceprincipal123";
    const vpName = "Dr. Sarah Varghese (Vice Principal)";

    let vpId;
    const existingAuth = await client.query("SELECT id FROM auth.users WHERE email = $1;", [vpEmail]);

    if (existingAuth.rows.length === 0) {
      const insAuth = await client.query(
        `INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          is_super_admin, is_sso_user, is_anonymous, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token
        )
        VALUES (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')),
          NOW(), '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', $3::text, 'role', 'vice_principal'),
          false, false, false, NOW(), NOW(),
          '', '', '', '', '', '', ''
        )
        RETURNING id;`,
        [vpEmail, vpPassword, vpName]
      );
      vpId = insAuth.rows[0].id;

      await client.query(
        `INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text),
          'email', $2::text, NOW(), NOW(), NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;`,
        [vpId, vpId, vpEmail]
      );
      console.log(`+ Created auth user: ${vpEmail}`);
    } else {
      vpId = existingAuth.rows[0].id;
      await client.query(
        "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = NOW(), raw_user_meta_data = jsonb_build_object('full_name', $2::text, 'role', 'vice_principal') WHERE id = $3;",
        [vpPassword, vpName, vpId]
      );
      console.log(`✓ Updated password & metadata for auth user: ${vpEmail}`);
    }

    // 4. Upsert public.users
    await client.query(
      `INSERT INTO public.users (id, email, full_name, role, campus_id)
       VALUES ($1, $2, $3, 'vice_principal', $4)
       ON CONFLICT (id) DO UPDATE SET full_name = $3, role = 'vice_principal', campus_id = $4;`,
      [vpId, vpEmail, vpName, campusId]
    );
    console.log(`✓ Public user record created/updated for ${vpEmail} with role 'vice_principal'`);

    console.log("\nMigration & Vice Principal seeding complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateAndSeedVicePrincipal();
