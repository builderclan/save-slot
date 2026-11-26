const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Load local environment files if running via node scripts/seed.js in Node 20+
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
  try {
    process.loadEnvFile(".env");
  } catch {}
}

// Helper utilities aligning with src/lib/config/campus.ts
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

async function seedDatabase() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error(
      "SAFETY VIOLATION: scripts/seed.js cannot be executed in production environments (NODE_ENV=production or VERCEL=1)."
    );
  }

  // Fail-closed verification: only explicitly approved local targets and non-production DB names are permitted without an override
  let targetHost = process.env.DB_HOST || "";
  let targetDatabase = process.env.DB_NAME || "";

  if (process.env.DATABASE_URL) {
    try {
      const dummyClient = new Client({ connectionString: process.env.DATABASE_URL });
      targetHost = dummyClient.connectionParameters.host || "";
      targetDatabase = dummyClient.connectionParameters.database || "";
    } catch {
      targetHost = "";
      targetDatabase = "";
    }
  }

  const isLocalHost =
    targetHost === "localhost" ||
    targetHost === "127.0.0.1" ||
    targetHost === "::1" ||
    targetHost === "db" ||
    targetHost === "postgres";

  const prodLabelRegex = /(^|[_\W])(prod|production|live)($|[_\W])/i;
  const isProductionNamedDb =
    prodLabelRegex.test(targetDatabase) ||
    prodLabelRegex.test(targetHost);

  if (isProductionNamedDb) {
    throw new Error(
      `SAFETY VIOLATION: scripts/seed.js detected production database target (host: '${targetHost}', db: '${targetDatabase}'). ` +
      `Seeding creates fixed demo passwords and can NEVER run against production databases.`
    );
  }

  if (!isLocalHost && process.env.ALLOW_REMOTE_SEED !== "true") {
    throw new Error(
      `SAFETY VIOLATION: scripts/seed.js detected non-local database host '${targetHost}'. ` +
      `Seeding creates fixed demo passwords and must not run against remote or production databases. ` +
      `If you explicitly intend to seed a non-production remote staging database, set ALLOW_REMOTE_SEED=true.`
    );
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

  let client;
  if (process.env.DATABASE_URL) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized },
    });
  } else {
    const password = process.env.DB_PASSWORD || process.env.DB_password;
    const host = process.env.DB_HOST;
    const port = parseInt(process.env.DB_PORT || "6543", 10);
    const database = process.env.DB_NAME || "postgres";
    const user = process.env.DB_USER;

    if (!password || !host || !user) {
      throw new Error(
        "Missing required database environment variables. Provide DATABASE_URL or DB_HOST, DB_USER, and DB_PASSWORD."
      );
    }

    client = new Client({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized },
    });
  }

  await client.connect();
  console.log("Connected to PostgreSQL for Phase 1 Seeding...\n");

  // Database-side pre-write safety check: verify target does not contain live non-demo accounts
  try {
    const tableCheck = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1;"
    );
    if (tableCheck.rows.length > 0) {
      const userCountRes = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM public.users u
         LEFT JOIN auth.users au ON au.id = u.id
         WHERE COALESCE((au.raw_app_meta_data->>'saveslot_demo')::boolean, false) = false
           AND u.email NOT LIKE '%@aisat.edu'
           AND u.email NOT LIKE '%@campus.edu'
           AND u.email NOT LIKE '%@demo.save-slot.internal';`
      );
      const nonDemoUserCount = userCountRes.rows[0]?.count || 0;
      if (nonDemoUserCount > 0 && process.env.ALLOW_POPULATED_DB_SEED !== "true") {
        throw new Error(
          `SAFETY VIOLATION: Target database contains ${nonDemoUserCount} live/non-demo user account(s). ` +
          `scripts/seed.js resets user credentials to fixed demo passwords and cannot execute against populated production databases (even via forwarded local ports). ` +
          `If this is intentional in a local dev testbed, set ALLOW_POPULATED_DB_SEED=true.`
        );
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "message" in err && String(err.message).startsWith("SAFETY VIOLATION:")) {
      throw err;
    }
    throw new Error(
      `SAFETY VIOLATION: Unable to verify target database contents before seeding: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 1. Single-College Settings Row (id = 1)
  const collegeNameOverride = process.env.NEXT_PUBLIC_CAMPUS_NAME || null;
  const shortCodeOverride = process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME || null;
  const timezoneOverride = process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE || null;

  const settingsRes = await client.query(
    `INSERT INTO college_settings (id, college_name, short_code, letterhead_subtitle, academic_year_start_month, timezone)
     VALUES (
       1,
       COALESCE($1, 'AISAT - Albertian Institute of Science & Technology'),
       COALESCE($2, 'AISAT'),
       'Kalamassery, Kochi • NAAC & NBA Accredited Institution',
       7,
       COALESCE($3, 'Asia/Kolkata')
     )
     ON CONFLICT (id) DO UPDATE SET
       college_name = COALESCE($1, college_settings.college_name),
       short_code = COALESCE($2, college_settings.short_code),
       timezone = COALESCE($3, college_settings.timezone),
       updated_at = NOW()
     RETURNING college_name, short_code, academic_year_start_month, timezone;`,
    [collegeNameOverride, shortCodeOverride, timezoneOverride]
  );
  const activeSettings = settingsRes.rows[0];
  console.log(
    `✓ Synchronized college settings: ${activeSettings.short_code} (${activeSettings.college_name})`
  );

  // 2. Venues
  const venuesData = [
    {
      name: "Turing Auditorium",
      building: "Computer Science Center",
      capacity: 250,
      address: "CS Building, 1st Floor",
      notes: "Equipped with dual 4K projectors and stage audio system",
    },
    {
      name: "Seminar Hall A",
      building: "Academic Block 1",
      capacity: 120,
      address: "Block 1, Ground Floor",
      notes: "Acoustic wall panels, tiered seating, podium mic",
    },
    {
      name: "Innovation Lab 201",
      building: "Engineering Quad",
      capacity: 65,
      address: "Engineering Block B, 2nd Floor",
      notes: "Maker tables, high-speed WiFi, lab workstations",
    },
    {
      name: "Central Quad Pavilion",
      building: "Outdoor Grounds",
      capacity: 600,
      address: "Central Lawn between Library and Student Center",
      notes: "Outdoor covered amphitheater and lawn with stage lighting",
    },
  ];

  const venueMap = {};
  for (const v of venuesData) {
    const vRes = await client.query("SELECT id FROM venues WHERE name = $1 LIMIT 1;", [v.name]);
    if (vRes.rows.length > 0) {
      venueMap[v.name] = vRes.rows[0].id;
      console.log(`✓ Venue exists: ${v.name}`);
    } else {
      const insV = await client.query(
        `INSERT INTO venues (name, building, capacity, address, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id;`,
        [v.name, v.building, v.capacity, v.address, v.notes]
      );
      venueMap[v.name] = insV.rows[0].id;
      console.log(`+ Created venue: ${v.name}`);
    }
  }

  // 3. Users (All 7 Governance Roles)
  const usersToSeed = [
    {
      email: "principal@aisat.ac.in",
      fullName: "Dr. S. Jose (Principal)",
      role: "principal",
      designation: "Principal",
      password: "principal123",
    },
    {
      email: "vp@aisat.ac.in",
      fullName: "Dr. Veena V. (Vice Principal)",
      role: "vice_principal",
      designation: "Vice Principal",
      password: "vp123",
    },
    {
      email: "admin@aisat.ac.in",
      fullName: "Rakesh Menon (IT Admin)",
      role: "admin",
      designation: "System Administrator",
      password: "admin123",
    },
    {
      email: "hod.cse@aisat.ac.in",
      fullName: "Dr. Anitha S.",
      role: "hod",
      designation: "Professor & HOD, CSE",
      password: "hod123",
    },
    {
      email: "hod.ece@aisat.ac.in",
      fullName: "Dr. Rajesh Nair",
      role: "hod",
      designation: "Professor & HOD, ECE",
      password: "hod123",
    },
    {
      email: "tic.ieee@aisat.ac.in",
      fullName: "Prof. Deepa George",
      role: "tic",
      designation: "Assistant Professor, ECE",
      password: "tic123",
    },
    {
      email: "staff.cse@aisat.ac.in",
      fullName: "Prof. Arun Kumar",
      role: "staff",
      designation: "Assistant Professor, CSE",
      password: "staff123",
    },
    {
      email: "staff.me@aisat.ac.in",
      fullName: "Prof. Kiran Das",
      role: "staff",
      designation: "Assistant Professor, ME",
      password: "staff123",
    },
    {
      email: "lead.coding@aisat.ac.in",
      fullName: "Alex Chen",
      role: "lead",
      designation: "Student Lead • Coding Club",
      password: "lead123",
    },
    {
      email: "lead.ieee@aisat.ac.in",
      fullName: "Nikhil Thomas",
      role: "lead",
      designation: "Student Chair • IEEE SB",
      password: "lead123",
    },
    {
      email: "lead.iedc@aisat.ac.in",
      fullName: "Diya Menon",
      role: "lead",
      designation: "Student Lead • IEDC",
      password: "lead123",
    },
  ];

  const userMap = {};
  for (const u of usersToSeed) {
    let userId;
    const existing = await client.query("SELECT id FROM auth.users WHERE email = $1;", [u.email]);
    if (existing.rows.length === 0) {
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
          NOW(), '{"provider":"email","providers":["email"],"saveslot_demo":true}'::jsonb,
          jsonb_build_object('full_name', $3::text, 'role', $4::text),
          false, false, false, NOW(), NOW(),
          '', '', '', '', '', '', ''
        )
        RETURNING id;`,
        [u.email, u.password, u.fullName, u.role]
      );
      userId = insAuth.rows[0].id;

      await client.query(
        `INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text),
          'email', $2::text, NOW(), NOW(), NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;`,
        [userId, userId, u.email]
      );
      console.log(`+ Created auth user: ${u.email}`);
    } else {
      userId = existing.rows[0].id;
      await client.query(
        `UPDATE auth.users
         SET encrypted_password = crypt($1, gen_salt('bf')),
             email_confirmed_at = NOW(),
             raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"saveslot_demo":true}'::jsonb
         WHERE id = $2;`,
        [u.password, userId]
      );
      console.log(`✓ Updated password for auth user: ${u.email}`);
    }
    userMap[u.email] = userId;

    await client.query(
      `INSERT INTO public.users (id, email, full_name, role, designation, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (id) DO UPDATE SET full_name = $3, role = $4, designation = $5, is_active = true;`,
      [userId, u.email, u.fullName, u.role, u.designation]
    );
  }

  // 4. Academic Departments (with HOD & Acting HOD setup)
  const departmentsData = [
    {
      name: "Computer Science & Engineering",
      code: "CSE",
      hodEmail: "hod.cse@aisat.ac.in",
      actingHodEmail: "staff.cse@aisat.ac.in",
      isActingHodActive: false,
      memberEmails: ["hod.cse@aisat.ac.in", "staff.cse@aisat.ac.in"],
    },
    {
      name: "Electronics & Communication Engineering",
      code: "ECE",
      hodEmail: "hod.ece@aisat.ac.in",
      actingHodEmail: "tic.ieee@aisat.ac.in",
      isActingHodActive: false,
      memberEmails: ["hod.ece@aisat.ac.in", "tic.ieee@aisat.ac.in"],
    },
    {
      name: "Electrical & Electronics Engineering",
      code: "EEE",
      hodEmail: null,
      actingHodEmail: null,
      isActingHodActive: false,
      memberEmails: [],
    },
    {
      name: "Artificial Intelligence & Data Science",
      code: "AI",
      hodEmail: null,
      actingHodEmail: null,
      isActingHodActive: false,
      memberEmails: [],
    },
    {
      name: "Mechanical Engineering",
      code: "ME",
      hodEmail: null,
      actingHodEmail: "staff.me@aisat.ac.in",
      isActingHodActive: true,
      memberEmails: ["staff.me@aisat.ac.in"],
    },
    {
      name: "Civil Engineering",
      code: "CE",
      hodEmail: null,
      actingHodEmail: null,
      isActingHodActive: false,
      memberEmails: [],
    },
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    const hodId = d.hodEmail ? userMap[d.hodEmail] : null;
    const actingHodId = d.actingHodEmail ? userMap[d.actingHodEmail] : null;
    const existing = await client.query("SELECT id FROM departments WHERE code = $1;", [d.code]);
    let deptId;
    if (existing.rows.length > 0) {
      deptId = existing.rows[0].id;
      await client.query(
        `UPDATE departments SET
           name = $1,
           hod_user_id = $2,
           acting_hod_user_id = $3,
           is_acting_hod_active = $4,
           is_active = true
         WHERE id = $5;`,
        [d.name, hodId, actingHodId, d.isActingHodActive, deptId]
      );
      console.log(`✓ Department synchronized: ${d.code} — ${d.name}`);
    } else {
      const ins = await client.query(
        `INSERT INTO departments (name, code, hod_user_id, acting_hod_user_id, is_acting_hod_active, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id;`,
        [d.name, d.code, hodId, actingHodId, d.isActingHodActive]
      );
      deptId = ins.rows[0].id;
      console.log(`+ Created department: ${d.code} — ${d.name}`);
    }
    deptMap[d.code] = deptId;

    for (const email of d.memberEmails) {
      if (userMap[email]) {
        await client.query("UPDATE public.users SET department_id = $1 WHERE id = $2;", [
          deptId,
          userMap[email],
        ]);
      }
    }
  }

  // 5. Communities & Chapters (Internal vs External + TIC & Lead assignments)
  const commsData = [
    {
      name: "Coding Club",
      code: "CC",
      slug: "coding-club",
      scope: "internal",
      category: "Tech",
      description: "Competitive programming, open source projects, and tech hackathons.",
      logo_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80",
      leadEmail: "lead.coding@aisat.ac.in",
      ticEmails: ["staff.cse@aisat.ac.in"],
    },
    {
      name: "IEEE Student Branch",
      code: "IEEE",
      slug: "ieee",
      scope: "external",
      category: "Tech",
      description: "IEEE Student Branch AISAT — robotics, signal processing, and flagship symposiums.",
      logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80",
      leadEmail: "lead.ieee@aisat.ac.in",
      ticEmails: ["tic.ieee@aisat.ac.in"],
    },
    {
      name: "IEDC AISAT",
      code: "IEDC",
      slug: "iedc",
      scope: "internal",
      category: "Career",
      description: "Startup incubation, founder fireside chats, pitch competitions, and venture mentoring.",
      logo_url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&auto=format&fit=crop&q=80",
      leadEmail: "lead.iedc@aisat.ac.in",
      ticEmails: ["staff.me@aisat.ac.in"],
    },
    {
      name: "National Service Scheme (NSS)",
      code: "NSS",
      slug: "nss",
      scope: "external",
      category: "Social",
      description: "AISAT NSS Unit — community outreach, blood donation camps, and civic engineering.",
      logo_url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&auto=format&fit=crop&q=80",
      leadEmail: null,
      ticEmails: ["hod.ece@aisat.ac.in"],
    },
  ];

  const commMap = {};
  for (const c of commsData) {
    const cRes = await client.query("SELECT id FROM communities WHERE slug = $1 LIMIT 1;", [c.slug]);
    let commId;
    if (cRes.rows.length > 0) {
      commId = cRes.rows[0].id;
      await client.query(
        `UPDATE communities SET name = $1, code = $2, scope = $3, category = $4, description = $5, logo_url = $6, status = 'approved'
         WHERE id = $7;`,
        [c.name, c.code, c.scope, c.category, c.description, c.logo_url, commId]
      );
      console.log(`✓ Community exists: [${c.code}] ${c.name} (${c.scope})`);
    } else {
      const insC = await client.query(
        `INSERT INTO communities (name, code, slug, scope, category, description, logo_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved') RETURNING id;`,
        [c.name, c.code, c.slug, c.scope, c.category, c.description, c.logo_url]
      );
      commId = insC.rows[0].id;
      console.log(`+ Created community: [${c.code}] ${c.name} (${c.scope})`);
    }
    commMap[c.slug] = commId;

    if (c.leadEmail && userMap[c.leadEmail]) {
      await client.query(
        `INSERT INTO public.community_members (id, community_id, user_id, role, status)
         VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
         ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead', status = 'active';`,
        [commId, userMap[c.leadEmail]]
      );
    }
    for (const ticEmail of c.ticEmails) {
      if (userMap[ticEmail]) {
        await client.query(
          `INSERT INTO public.community_members (id, community_id, user_id, role, status)
           VALUES (gen_random_uuid(), $1, $2, 'tic', 'active')
           ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'tic', status = 'active';`,
          [commId, userMap[ticEmail]]
        );
      }
    }
  }

  // 6. Curated v1.0.0 Events (Community + Department + Governance States)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const getDate = (offsetDays, hour, minute = 0) => {
    const d = new Date(year, month, day + offsetDays, hour, minute);
    return d.toISOString();
  };

  const sampleEvents = [
    {
      title: "Rust Systems Programming & Kernel Jam",
      slug: "rust-systems-jam",
      originType: "community",
      communitySlug: "coding-club",
      deptCode: null,
      venueName: "Turing Auditorium",
      category: "Tech",
      targetAudience: ["All Students"],
      description: "Hands-on deep dive into memory safety, concurrency, and async networking in Rust.",
      startTime: getDate(8, 14, 0),
      endTime: getDate(8, 17, 0),
      status: "published",
      referenceNumber: "AISAT/CC/2026-27/001",
      creatorEmail: "lead.coding@aisat.ac.in",
      coordinatorEmail: "staff.cse@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/rust-jam-2026",
    },
    {
      title: "IEEE National Embedded Systems Colloquium",
      slug: "ieee-embedded-colloquium",
      originType: "community",
      communitySlug: "ieee",
      deptCode: null,
      venueName: "Seminar Hall A",
      category: "Workshop",
      targetAudience: ["3rd Year", "Final Year"],
      description: "Industry colloquium on RTOS firmware, RISC-V architectures, and hardware verification.",
      startTime: getDate(9, 10, 0),
      endTime: getDate(9, 16, 0),
      status: "published",
      referenceNumber: "AISAT/IEEE/2026-27/001",
      creatorEmail: "lead.ieee@aisat.ac.in",
      coordinatorEmail: "tic.ieee@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/ieee-colloquium-2026",
    },
    {
      title: "CSE Department Technical Talk: Distributed Databases",
      slug: "cse-distributed-databases",
      originType: "department",
      communitySlug: null,
      deptCode: "CSE",
      venueName: "Turing Auditorium",
      category: "Academic",
      targetAudience: ["3rd Year", "Final Year"],
      description: "Departmental colloquium on consensus algorithms, Raft, and PostgreSQL MVCC internals.",
      startTime: getDate(10, 14, 0),
      endTime: getDate(10, 16, 30),
      status: "published",
      referenceNumber: "AISAT/CSE/2026-27/001",
      creatorEmail: "staff.cse@aisat.ac.in",
      coordinatorEmail: "staff.cse@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "IEDC Startup Pitch Arena: Pre-Seed Showcase",
      slug: "startup-pitch-arena",
      originType: "community",
      communitySlug: "iedc",
      deptCode: null,
      venueName: "Central Quad Pavilion",
      category: "Career",
      targetAudience: ["All Students"],
      description: "5 student founder teams pitch live before Kerala Startup Mission mentors and angel angels.",
      startTime: getDate(11, 16, 0),
      endTime: getDate(11, 19, 30),
      status: "published",
      referenceNumber: "AISAT/IEDC/2026-27/001",
      creatorEmail: "lead.iedc@aisat.ac.in",
      coordinatorEmail: "staff.me@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/pitch-arena-2026",
    },
    {
      title: "Open Source Lightning Talks (Pending Executive)",
      slug: "open-source-lightning-talks",
      originType: "community",
      communitySlug: "coding-club",
      deptCode: null,
      venueName: "Innovation Lab 201",
      category: "Tech",
      targetAudience: ["1st Year", "2nd Year"],
      description: "5-minute lightning talks on contributing to open source, PR etiquette, and maintainer workflows.",
      startTime: getDate(12, 16, 0),
      endTime: getDate(12, 18, 0),
      status: "pending_executive",
      referenceNumber: null,
      creatorEmail: "lead.coding@aisat.ac.in",
      coordinatorEmail: "staff.cse@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "IEEE Signal Processing Bootcamp (Pending Stage 2)",
      slug: "ieee-dsp-bootcamp",
      originType: "community",
      communitySlug: "ieee",
      deptCode: null,
      venueName: "Seminar Hall A",
      category: "Workshop",
      targetAudience: ["2nd Year", "3rd Year"],
      description: "Full-day practical bootcamp on FFT analysis, filter design, and SDR receivers.",
      startTime: getDate(15, 9, 30),
      endTime: getDate(15, 16, 30),
      status: "pending_stage2",
      referenceNumber: null,
      creatorEmail: "lead.ieee@aisat.ac.in",
      coordinatorEmail: "tic.ieee@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Late Night Gaming & LAN Tournament",
      slug: "late-night-lan-tournament",
      originType: "community",
      communitySlug: "coding-club",
      deptCode: null,
      venueName: "Turing Auditorium",
      category: "Social",
      targetAudience: ["All Students"],
      description: "Competitive multiplayer LAN tournament in the main auditorium.",
      startTime: getDate(7, 21, 0),
      endTime: getDate(8, 2, 0),
      status: "rejected",
      rejectionReason: "Auditorium bookings close at 7:00 PM. Please propose a daytime slot.",
      referenceNumber: null,
      creatorEmail: "lead.coding@aisat.ac.in",
      coordinatorEmail: "staff.cse@aisat.ac.in",
      coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    },
  ];

  function computeAcademicYear(isoDate, startMonth = 7, timeZone = "Asia/Kolkata") {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
    }).formatToParts(new Date(isoDate));
    const yr = parseInt(parts.find((p) => p.type === "year")?.value || "", 10);
    const month = parseInt(parts.find((p) => p.type === "month")?.value || "", 10);
    const startYear = month >= startMonth ? yr : yr - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  }

  for (const ev of sampleEvents) {
    const commId = ev.communitySlug ? commMap[ev.communitySlug] : null;
    const deptId = ev.deptCode ? deptMap[ev.deptCode] : null;
    const venueId = venueMap[ev.venueName];
    const creatorId = userMap[ev.creatorEmail];
    const coordinatorId = userMap[ev.coordinatorEmail] || creatorId;
    const eventAcademicYear = computeAcademicYear(
      ev.startTime,
      activeSettings?.academic_year_start_month || 7,
      activeSettings?.timezone || "Asia/Kolkata"
    );
    const refNumber = ev.referenceNumber
      ? ev.referenceNumber
          .replace(/^AISAT\//, `${activeSettings.short_code}/`)
          .replace(/\d{4}-\d{2}/, eventAcademicYear)
      : null;

    const existingEv = await client.query("SELECT id FROM events WHERE slug = $1 LIMIT 1;", [
      ev.slug,
    ]);

    if (existingEv.rows.length === 0) {
      await client.query(
        `INSERT INTO events (
          origin_type, community_id, department_id, venue_id, coordinator_id, created_by,
          reference_number, academic_year, title, slug, description, category, target_audience,
          start_time, end_time, location_name,
          status, rejection_reason, cover_image_url, external_registration_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
        [
          ev.originType,
          commId,
          deptId,
          venueId,
          coordinatorId,
          creatorId,
          refNumber,
          eventAcademicYear,
          ev.title,
          ev.slug,
          ev.description,
          ev.category,
          ev.targetAudience,
          ev.startTime,
          ev.endTime,
          ev.venueName,
          ev.status,
          ev.rejectionReason || null,
          ev.coverImage,
          ev.registrationUrl || null,
        ]
      );
      console.log(`+ Seeded event: "${ev.title}" [${ev.status}]`);
    } else {
      await client.query(
        `UPDATE events SET
          start_time = $1, end_time = $2, status = $3, academic_year = $4,
          rejection_reason = $5, reference_number = $6, updated_at = NOW()
        WHERE id = $7;`,
        [
          ev.startTime,
          ev.endTime,
          ev.status,
          eventAcademicYear,
          ev.rejectionReason || null,
          refNumber,
          existingEv.rows[0].id,
        ]
      );
      console.log(`✓ Updated timeline for event: "${ev.title}" [${ev.status}]`);
    }
  }

  await client.end();
  console.log("\n=======================================================");
  console.log("AISAT v1.0.0 DATABASE & SEED DATA COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
}

seedDatabase().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
