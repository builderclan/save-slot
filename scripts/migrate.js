
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        name VARCHAR PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Check existing tables to see if 001/002 were partially applied
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'campuses';
    `);
    if (tableCheck.rows.length > 0) {
      await client.query(`
        INSERT INTO _schema_migrations (name) VALUES ('001_initial_schema.sql'), ('002_optional_registration_url.sql')
        ON CONFLICT DO NOTHING;
      `);
    }

    const migrationFiles = [
      '001_initial_schema.sql',
      '002_optional_registration_url.sql',
      '003_complete_rls_and_conflict_engine.sql',
      '004_fix_rls_recursion.sql',
      '005_auth_and_multicampus_hardening.sql',
      '006_community_onboarding.sql',
    ];

    for (const file of migrationFiles) {
      const already = await client.query('SELECT 1 FROM _schema_migrations WHERE name = $1', [file]);
      if (already.rows.length > 0) {
        console.log(`- Migration ${file} already applied, skipping.`);
        continue;
      }

      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _schema_migrations (name) VALUES ($1)', [file]);
      console.log(`✓ Migration ${file} applied successfully.`);
    }

    // Check if initial campus exists
    const campusRes = await client.query(`SELECT id FROM campuses WHERE slug = 'apex-tech';`);
    let campusId;

    if (campusRes.rows.length === 0) {
      console.log('Seeding initial campus data...');
      const insertCampus = await client.query(`
        INSERT INTO campuses (name, slug, domain, timezone, is_active)
        VALUES ('Apex Institute of Technology', 'apex-tech', 'apex.edu', 'America/New_York', true)
        RETURNING id;
      `);
      campusId = insertCampus.rows[0].id;
      console.log(`✓ Campus created with ID: ${campusId}`);

      // Seed Venues
      const venues = [
        { name: 'Turing Auditorium', building: 'Computer Science Center', capacity: 250, address: 'CS Building 1st Floor', notes: 'Equipped with dual 4K projectors and stage audio system' },
        { name: 'Innovation Lab 201', building: 'Engineering Quad', capacity: 65, address: 'Engineering Block B, 2nd Floor', notes: 'Configurable maker tables, soldering stations, and fast WiFi' },
        { name: 'Student Union Great Hall', building: 'Campus Center', capacity: 400, address: 'Student Center Level 2', notes: 'High capacity multi-purpose event hall' },
        { name: 'Design Studio 4A', building: 'Media Arts Complex', capacity: 45, address: 'Arts Wing, 4th Floor', notes: 'Apple workstations, large monitors, and design critique pin-up walls' },
        { name: 'Central Quad Pavilion', building: 'Outdoor Grounds', capacity: 600, address: 'Central Lawn between Library and Student Union', notes: 'Outdoor covered pavilion with outdoor power hookups' },
      ];

      const venueMap = {};
      for (const v of venues) {
        const vRes = await client.query(`
          INSERT INTO venues (campus_id, name, building, capacity, address, notes, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id;
        `, [campusId, v.name, v.building, v.capacity, v.address, v.notes]);
        venueMap[v.name] = vRes.rows[0].id;
      }
      console.log('✓ Seeded venues.');

      // Seed Communities
      const communities = [
        {
          name: 'Developer Student Club',
          slug: 'developer-student-club',
          category: 'Tech',
          description: 'Building community through open-source software, hackathons, web & AI workshops, and real-world student projects.',
          logo_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150&auto=format&fit=crop&q=80',
          banner_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
          website: 'https://dsc.apex.edu',
          instagram: '@dsc_apex',
          status: 'approved'
        },
        {
          name: 'Design Collective',
          slug: 'design-collective',
          category: 'Arts',
          description: 'A community for UI/UX designers, brand strategists, illustrators, and visual storytellers on campus.',
          logo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150&auto=format&fit=crop&q=80',
          banner_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
          website: 'https://design.apex.edu',
          instagram: '@apexdesignsociety',
          status: 'approved'
        },
        {
          name: 'Robotics & Automation Club',
          slug: 'robotics-automation-club',
          category: 'Tech',
          description: 'Building competitive battlebots, autonomous drones, and embedded robotic arms.',
          logo_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=80',
          banner_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
          website: 'https://robotics.apex.edu',
          instagram: '@apex_robotics',
          status: 'approved'
        },
        {
          name: 'Collegiate Music Society',
          slug: 'collegiate-music-society',
          category: 'Social',
          description: 'Student-led jam sessions, open mics, acoustic lawn concerts, and sound engineering workshops.',
          logo_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
          banner_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80',
          website: 'https://music.apex.edu',
          instagram: '@apex_music',
          status: 'approved'
        },
      ];

      const commMap = {};
      for (const c of communities) {
        const cRes = await client.query(`
          INSERT INTO communities (campus_id, name, slug, category, description, logo_url, banner_url, website, instagram, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id;
        `, [campusId, c.name, c.slug, c.category, c.description, c.logo_url, c.banner_url, c.website, c.instagram, c.status]);
        commMap[c.slug] = cRes.rows[0].id;
      }
      console.log('✓ Seeded communities.');

      // Seed Events
      const events = [
        {
          community_id: commMap['developer-student-club'],
          venue_id: venueMap['Turing Auditorium'],
          title: 'Apex Annual Fall Hackathon 2026',
          slug: 'apex-annual-fall-hackathon-2026',
          description: 'Join 300+ student creators for 36 hours of coding, mentorship, and building cutting-edge software and hardware projects. $15,000 in prizes, free food, and top tech company recruiters.',
          category: 'Tech',
          tags: ['Hackathon', 'Coding', 'Prizes', 'FreeFood', 'AI'],
          start_time: '2026-09-18T10:00:00Z',
          end_time: '2026-09-19T22:00:00Z',
          location_name: 'Turing Auditorium (Computer Science Center)',
          is_virtual: false,
          external_registration_url: 'https://lu.ma/apex-hackathon-2026',
          cover_image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000&auto=format&fit=crop&q=80',
          status: 'published',
        },
        {
          community_id: commMap['design-collective'],
          venue_id: venueMap['Design Studio 4A'],
          title: 'UI/UX Portfolio Roast & Design Critique',
          slug: 'ui-ux-portfolio-roast-design-critique',
          description: 'Get honest, constructive feedback on your portfolio, case studies, or mobile app prototypes from senior product designers at leading tech firms.',
          category: 'Arts',
          tags: ['Design', 'UI/UX', 'Portfolio', 'Mentorship'],
          start_time: '2026-09-16T18:00:00Z',
          end_time: '2026-09-16T20:30:00Z',
          location_name: 'Design Studio 4A (Media Arts Complex)',
          is_virtual: false,
          external_registration_url: 'https://luma.com/apex-design-critique',
          cover_image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1000&auto=format&fit=crop&q=80',
          status: 'published',
        },
        {
          community_id: commMap['collegiate-music-society'],
          venue_id: venueMap['Central Quad Pavilion'],
          title: 'Sunset Acoustic Sessions & Open Mic',
          slug: 'sunset-acoustic-sessions-open-mic',
          description: 'Bring a picnic blanket and enjoy live indie and acoustic performances by student artists under the central quad pavilion. Free cider & donuts.',
          category: 'Social',
          tags: ['Music', 'Acoustic', 'Social', 'FreeFood'],
          start_time: '2026-09-15T18:30:00Z',
          end_time: '2026-09-15T21:00:00Z',
          location_name: 'Central Quad Pavilion',
          is_virtual: false,
          external_registration_url: null, // Open event
          cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
          status: 'published',
        },
        {
          community_id: commMap['robotics-automation-club'],
          venue_id: venueMap['Innovation Lab 201'],
          title: 'Autonomous Rover Demo & Lab Open House',
          slug: 'autonomous-rover-demo-lab-open-house',
          description: 'Check out our newest Mars Society university rover prototype in action! Live driving demos, ROS2 sensor telemetry, and new member recruitment.',
          category: 'Tech',
          tags: ['Robotics', 'Hardware', 'Autonomous', 'Demo'],
          start_time: '2026-09-17T16:00:00Z',
          end_time: '2026-09-17T18:00:00Z',
          location_name: 'Innovation Lab 201',
          is_virtual: false,
          external_registration_url: null, // Open event
          cover_image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1000&auto=format&fit=crop&q=80',
          status: 'published',
        },
      ];

      for (const e of events) {
        await client.query(`
          INSERT INTO events (campus_id, community_id, venue_id, title, slug, description, category, tags, start_time, end_time, location_name, is_virtual, external_registration_url, cover_image_url, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          campusId, e.community_id, e.venue_id, e.title, e.slug, e.description, e.category,
          e.tags, e.start_time, e.end_time, e.location_name, e.is_virtual, e.external_registration_url,
          e.cover_image_url, e.status
        ]);
      }
      console.log('✓ Seeded events.');
    } else {
      console.log('Campus already exists in database.');
    }

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log('All tables verified in database:', tables.rows.map(r => r.table_name));

    await client.end();
    console.log('MIGRATION COMPLETE! 🎉');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
