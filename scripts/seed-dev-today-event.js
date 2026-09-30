const { Client } = require('pg');

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Cannot run dev seed script in production environment!');
  process.exit(1);
}

const PG_CONFIG = {
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.dxwumvmscmictbnbfqyb',
  password: 'T5fz8KcpVYxRsuQm',
  ssl: { rejectUnauthorized: false },
};

async function seedTodayEvent() {
  const client = new Client(PG_CONFIG);
  await client.connect();

  try {
    // 1. Find Apex Tech campus
    const campusRes = await client.query("SELECT id, timezone FROM campuses WHERE slug = 'apex-tech' LIMIT 1;");
    if (campusRes.rows.length === 0) {
      throw new Error('Apex Tech campus not found');
    }
    const apexId = campusRes.rows[0].id;

    // 2. Find Developer Student Club community
    const commRes = await client.query("SELECT id FROM communities WHERE slug = 'developer-student-club' AND campus_id = $1 LIMIT 1;", [apexId]);
    if (commRes.rows.length === 0) {
      throw new Error('Developer Student Club community not found');
    }
    const commId = commRes.rows[0].id;

    // 3. Find a venue at Apex Tech
    const venueRes = await client.query("SELECT id, name, building FROM venues WHERE campus_id = $1 LIMIT 1;", [apexId]);
    const venue = venueRes.rows[0];

    // Today is 2026-09-14
    // Start time: 2026-09-14T20:00:00Z (4:00 PM EDT)
    // End time: 2026-09-14T22:00:00Z (6:00 PM EDT)
    const slug = 'systems-programming-rust-study-jam';
    const title = 'Systems Programming & Rust Study Jam';

    // Upsert the event
    await client.query(`
      INSERT INTO events (
        campus_id, community_id, venue_id, title, slug, description,
        category, tags, start_time, end_time, timezone, location_name,
        is_virtual, virtual_link, external_registration_url, cover_image_url,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      ON CONFLICT (id) DO NOTHING;
    `, [
      apexId,
      commId,
      venue?.id || null,
      title,
      slug,
      'Join the Developer Student Club for a hands-on deep dive into memory management, concurrency, and building high-performance command line tools with Rust. Beginners and experienced systems hackers welcome! Bring your laptop.',
      'Tech',
      ['Rust', 'Systems', 'OpenSource', 'Workshop'],
      '2026-09-14T20:00:00.000Z',
      '2026-09-14T22:00:00.000Z',
      'America/New_York',
      venue ? `${venue.name} (${venue.building})` : 'Student Center 302',
      false,
      null,
      null, // Open event - no registration required
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      'published',
    ]);

    console.log(`✓ Dev "Today" event seeded successfully: "${title}" on 2026-09-14`);
  } finally {
    await client.end();
  }
}

seedTodayEvent().catch((err) => {
  console.error('Failed to seed dev today event:', err);
  process.exit(1);
});
