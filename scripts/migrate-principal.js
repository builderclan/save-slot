const { Client } = require("pg");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractAcronym(text) {
  const clean = String(text || "").trim();
  if (!clean) return "CAMPUS";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 6).toUpperCase();
  }
  const stopWords = new Set(["of", "in", "at", "the", "for"]);
  const meaningfulWords = words.filter((w) => !stopWords.has(w.toLowerCase()));
  const initials = (meaningfulWords.length > 0 ? meaningfulWords : words)
    .map((w) => (w === "&" ? "" : w[0].toUpperCase()))
    .join("");
  return initials.slice(0, 8);
}

function deriveCampusSlug(name, shortName, explicitSlug) {
  if (explicitSlug && explicitSlug.trim()) {
    return explicitSlug.trim();
  }
  const rawShortName = shortName || (name ? extractAcronym(name) : "CAMPUS");
  return slugify(rawShortName || name) || "campus";
}

async function migrateAndSeedPrincipal() {
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
  console.log("Connected to PostgreSQL for Principal Role Migration...");

  try {
    // 1. Update check constraint on public.users
    console.log("Updating users_role_check constraint...");
    await client.query("ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;");
    await client.query(`
      ALTER TABLE public.users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('student', 'organizer', 'admin', 'principal'));
    `);
    console.log("✓ users_role_check updated to include 'principal'");

    // 2. Fetch primary campus ID for this single-instance deployment
    const campusName = process.env.NEXT_PUBLIC_CAMPUS_NAME || "Campus";
    const targetSlug = deriveCampusSlug(
      campusName,
      process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME,
      process.env.NEXT_PUBLIC_CAMPUS_SLUG
    );
    const campusRes = await client.query(
      "SELECT id FROM public.campuses ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END, created_at ASC LIMIT 1;",
      [targetSlug]
    );
    let campusId = campusRes.rows[0]?.id;

    if (!campusId) {
      const campusTimezone = process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE || "Asia/Kolkata";
      const campusDomain =
        process.env.NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN ||
        process.env.CAMPUS_EMAIL_DOMAIN ||
        "campus.edu";

      const ins = await client.query(
        `INSERT INTO public.campuses (name, slug, domain, timezone)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [campusName, targetSlug, campusDomain, campusTimezone]
      );
      campusId = ins.rows[0].id;
    }

    // 3. Create or update Principal user in auth.users & public.users
    const principalEmail = "principal@campus.edu";
    const principalPassword = "principal123";
    const principalName = "Dr. K. S. Mathew";

    let principalId;
    const existingAuth = await client.query("SELECT id FROM auth.users WHERE email = $1;", [principalEmail]);

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
          jsonb_build_object('full_name', $3::text, 'role', 'principal'),
          false, false, false, NOW(), NOW(),
          '', '', '', '', '', '', ''
        )
        RETURNING id;`,
        [principalEmail, principalPassword, principalName]
      );
      principalId = insAuth.rows[0].id;

      await client.query(
        `INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text),
          'email', $2::text, NOW(), NOW(), NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;`,
        [principalId, principalId, principalEmail]
      );
      console.log(`+ Created auth user: ${principalEmail}`);
    } else {
      principalId = existingAuth.rows[0].id;
      await client.query(
        "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = NOW(), raw_user_meta_data = jsonb_build_object('full_name', $2::text, 'role', 'principal') WHERE id = $3;",
        [principalPassword, principalName, principalId]
      );
      console.log(`✓ Updated password & metadata for auth user: ${principalEmail}`);
    }

    // 4. Upsert public.users
    await client.query(
      `INSERT INTO public.users (id, email, full_name, role, campus_id)
       VALUES ($1, $2, $3, 'principal', $4)
       ON CONFLICT (id) DO UPDATE SET full_name = $3, role = 'principal', campus_id = $4;`,
      [principalId, principalEmail, principalName, campusId]
    );
    console.log(`✓ Public user record created/updated for ${principalEmail} with role 'principal'`);

    console.log("\nMigration & Principal seeding complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateAndSeedPrincipal();
