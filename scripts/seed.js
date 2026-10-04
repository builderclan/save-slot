const { Client } = require("pg");

async function seedDatabase() {
  const password = process.env.DB_PASSWORD || process.env.DB_password;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || "6543", 10);
  const database = process.env.DB_NAME || "postgres";
  const user = process.env.DB_USER;

  if (!password || !host || !user) {
    throw new Error("Missing required database environment variables (DB_HOST, DB_USER, DB_PASSWORD).");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const rejectUnauthorized =
    process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined
      ? process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
      : isProduction;

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized },
  });

  await client.connect();
  console.log("Connected to PostgreSQL for Phase 1 Seeding...\n");

  // 1. Campus: Albertian Institute of Science & Technology (AISAT)
  let campusId;
  const campusRes = await client.query("SELECT id FROM campuses WHERE slug IN ('aisat', 'apex-tech') LIMIT 1;");
  if (campusRes.rows.length > 0) {
    campusId = campusRes.rows[0].id;
    await client.query(
      "UPDATE campuses SET name = 'Albertian Institute of Science & Technology', slug = 'aisat', timezone = 'Asia/Kolkata' WHERE id = $1;",
      [campusId]
    );
    console.log(`✓ Campus exists: Albertian Institute of Science & Technology (${campusId})`);
  } else {
    const ins = await client.query(`
      INSERT INTO campuses (name, slug, timezone)
      VALUES ('Albertian Institute of Science & Technology', 'aisat', 'Asia/Kolkata')
      RETURNING id;
    `);
    campusId = ins.rows[0].id;
    console.log(`+ Created campus: Albertian Institute of Science & Technology (${campusId})`);
  }

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
    const vRes = await client.query(
      "SELECT id FROM venues WHERE campus_id = $1 AND name = $2;",
      [campusId, v.name]
    );
    if (vRes.rows.length > 0) {
      venueMap[v.name] = vRes.rows[0].id;
      console.log(`✓ Venue exists: ${v.name}`);
    } else {
      const insV = await client.query(
        `INSERT INTO venues (campus_id, name, building, capacity, address, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id;`,
        [campusId, v.name, v.building, v.capacity, v.address, v.notes]
      );
      venueMap[v.name] = insV.rows[0].id;
      console.log(`+ Created venue: ${v.name}`);
    }
  }

  // 3. Communities
  const commsData = [
    {
      name: "Coding Club",
      slug: "coding-club",
      category: "Tech",
      description: "Competitive programming, open source projects, and tech hackathons.",
      logo_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80",
    },
    {
      name: "Design Society",
      slug: "design-society",
      category: "Arts",
      description: "UI/UX, visual storytelling, digital illustration, and creative critiques.",
      logo_url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&auto=format&fit=crop&q=80",
    },
    {
      name: "Entrepreneurship Cell",
      slug: "ecell",
      category: "Career",
      description: "Startup incubation, founder fireside chats, pitch competitions, and venture networking.",
      logo_url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&auto=format&fit=crop&q=80",
    },
  ];

  const commMap = {};
  for (const c of commsData) {
    const cRes = await client.query(
      "SELECT id FROM communities WHERE campus_id = $1 AND slug = $2;",
      [campusId, c.slug]
    );
    if (cRes.rows.length > 0) {
      commMap[c.slug] = cRes.rows[0].id;
      console.log(`✓ Community exists: ${c.name}`);
    } else {
      const insC = await client.query(
        `INSERT INTO communities (campus_id, name, slug, category, description, logo_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved') RETURNING id;`,
        [campusId, c.name, c.slug, c.category, c.description, c.logo_url]
      );
      commMap[c.slug] = insC.rows[0].id;
      console.log(`+ Created community: ${c.name}`);
    }
  }

  // 4. Users (Principal + Admin + 3 Leads)
  const usersToSeed = [
    {
      email: "principal@campus.edu",
      fullName: "Dr. K. S. Mathew (Principal)",
      role: "principal",
      password: "principal123",
      assignedCommunitySlug: null,
    },
    {
      email: "admin@campus.edu",
      fullName: "Campus Dean of Affairs",
      role: "admin",
      password: "admin123",
      assignedCommunitySlug: null,
    },
    {
      email: "lead.coding@campus.edu",
      fullName: "Alex Chen (Coding Lead)",
      role: "organizer",
      password: "lead123",
      assignedCommunitySlug: "coding-club",
    },
    {
      email: "lead.design@campus.edu",
      fullName: "Sarah Lin (Design Lead)",
      role: "organizer",
      password: "lead123",
      assignedCommunitySlug: "design-society",
    },
    {
      email: "lead.ecell@campus.edu",
      fullName: "Marcus Vance (E-Cell Lead)",
      role: "organizer",
      password: "lead123",
      assignedCommunitySlug: "ecell",
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
          NOW(), '{"provider":"email","providers":["email"]}',
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
        "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = NOW() WHERE id = $2;",
        [u.password, userId]
      );
      console.log(`✓ Updated password for auth user: ${u.email}`);
    }
    userMap[u.email] = userId;

    // Upsert public.users
    await client.query(
      `INSERT INTO public.users (id, email, full_name, role, campus_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET full_name = $3, role = $4, campus_id = $5;`,
      [userId, u.email, u.fullName, u.role, campusId]
    );

    // Upsert community membership
    if (u.assignedCommunitySlug && commMap[u.assignedCommunitySlug]) {
      const commId = commMap[u.assignedCommunitySlug];
      await client.query(
        `INSERT INTO public.community_members (id, community_id, user_id, role, status)
         VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
         ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead', status = 'active';`,
        [commId, userId]
      );
      console.log(`  └─ Assigned as lead for: ${u.assignedCommunitySlug}`);
    }
  }

  // 5. Events: Curated Schedule for October 2026
  // Generate ISO dates anchored to current timeframe
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
      communitySlug: "coding-club",
      venueName: "Turing Auditorium",
      category: "Tech",
      description: "Hands-on deep dive into memory safety, concurrency, and async networking in Rust. Bring your laptops with cargo installed.",
      startTime: getDate(8, 14, 0), // 8 days ahead (satisfies 7-day rule)
      endTime: getDate(8, 17, 0),
      status: "published",
      creatorEmail: "lead.coding@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/rust-jam-2026",
    },
    {
      title: "Design Critique & Mobile UI/UX Workshop",
      slug: "ui-ux-design-workshop",
      communitySlug: "design-society",
      venueName: "Seminar Hall A",
      category: "Arts",
      description: "Live redesign of popular student apps. Learn tactile micro-interactions, responsive grids, and typography hierarchy in Figma.",
      startTime: getDate(9, 15, 30), // 9 days ahead
      endTime: getDate(9, 18, 0),
      status: "published",
      creatorEmail: "lead.design@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/design-critique-2026",
    },
    {
      title: "Startup Pitch Arena: From Idea to Pre-Seed",
      slug: "startup-pitch-arena",
      communitySlug: "ecell",
      venueName: "Central Quad Pavilion",
      category: "Career",
      description: "5 student founders pitch live before angel investors and alumni entrepreneurs. Winner receives $2,500 non-dilutive grant.",
      startTime: getDate(11, 16, 0), // 11 days ahead
      endTime: getDate(11, 19, 30),
      status: "published",
      creatorEmail: "lead.ecell@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/pitch-arena-2026",
    },
    {
      title: "AI Agents Hackathon: Autonomous Workflows",
      slug: "ai-agents-hackathon",
      communitySlug: "coding-club",
      venueName: "Innovation Lab 201",
      category: "Tech",
      description: "24-hour hackathon focused on building agentic tools, multi-agent systems, and local LLM pipelines. Refreshments provided.",
      startTime: getDate(14, 10, 0), // 14 days ahead
      endTime: getDate(15, 12, 0),
      status: "published",
      creatorEmail: "lead.coding@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/ai-hackathon-2026",
    },
    {
      title: "Design Portfolio Night & Resume Clinic",
      slug: "design-portfolio-night",
      communitySlug: "design-society",
      venueName: "Seminar Hall A",
      category: "Career",
      description: "Senior design leads from top tech firms review your Behance/Figma portfolio. Open to all majors.",
      startTime: getDate(16, 17, 0),
      endTime: getDate(16, 19, 30),
      status: "published",
      creatorEmail: "lead.design@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/portfolio-night-2026",
    },
    {
      title: "Founder Fireside: Scaling B2B SaaS in College",
      slug: "founder-fireside-saas",
      communitySlug: "ecell",
      venueName: "Turing Auditorium",
      category: "Career",
      description: "Q&A with class of '23 alum who raised $4M for their developer tooling startup while taking senior capstone.",
      startTime: getDate(18, 18, 0),
      endTime: getDate(18, 20, 0),
      status: "published",
      creatorEmail: "lead.ecell@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/founder-fireside-2026",
    },
    // PENDING EVENT (To demonstrate Admin Approval Queue)
    {
      title: "Open Source Lightning Talks (Pending Review)",
      slug: "open-source-lightning-talks",
      communitySlug: "coding-club",
      venueName: "Innovation Lab 201",
      category: "Tech",
      description: "5-minute lightning talks on contributing to open source, submitting first PRs, and maintaining npm/crates packages.",
      startTime: getDate(12, 16, 0), // 12 days ahead
      endTime: getDate(12, 18, 0),
      status: "pending",
      creatorEmail: "lead.coding@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      registrationUrl: "https://forms.gle/lightning-talks-2026",
    },
    // REJECTED EVENT (To demonstrate rejection notes & conflict review)
    {
      title: "Late Night Gaming & LAN Tournament",
      slug: "late-night-lan-tournament",
      communitySlug: "coding-club",
      venueName: "Turing Auditorium",
      category: "Social",
      description: "CS:GO and Rocket League tournament in the main auditorium.",
      startTime: getDate(7, 21, 0),
      endTime: getDate(8, 2, 0),
      status: "rejected",
      rejectionReason: "Auditorium is reserved strictly for academic and keynote presentations. Please re-submit for the Student Center Game Room.",
      creatorEmail: "lead.coding@campus.edu",
      coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    },
  ];

  for (const ev of sampleEvents) {
    const commId = commMap[ev.communitySlug];
    const venueId = venueMap[ev.venueName];
    const creatorId = userMap[ev.creatorEmail];

    const existingEv = await client.query(
      "SELECT id FROM events WHERE campus_id = $1 AND slug = $2;",
      [campusId, ev.slug]
    );

    if (existingEv.rows.length === 0) {
      await client.query(
        `INSERT INTO events (
          campus_id, community_id, venue_id, created_by,
          title, slug, description, category,
          start_time, end_time, location_name,
          status, rejection_reason, cover_image_url, external_registration_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
        [
          campusId,
          commId,
          venueId,
          creatorId,
          ev.title,
          ev.slug,
          ev.description,
          ev.category,
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
          start_time = $1, end_time = $2, status = $3,
          rejection_reason = $4, updated_at = NOW()
        WHERE id = $5;`,
        [ev.startTime, ev.endTime, ev.status, ev.rejectionReason || null, existingEv.rows[0].id]
      );
      console.log(`✓ Updated timeline for event: "${ev.title}" [${ev.status}]`);
    }
  }

  await client.end();
  console.log("\n=======================================================");
  console.log("PHASE 1 DATABASE & SEED DATA COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
}

seedDatabase().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
