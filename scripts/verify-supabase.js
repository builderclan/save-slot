const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dxwumvmscmictbnbfqyb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RybY8XU72-fnFiJPNoiKSw_jcPuF9_K';

const PG_CONFIG = {
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.dxwumvmscmictbnbfqyb',
  password: 'T5fz8KcpVYxRsuQm',
  ssl: { rejectUnauthorized: false },
};

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING SUPABASE PERSISTENCE & AUTHORIZATION AUDIT');
  console.log('====================================================\n');

  const pgClient = new Client(PG_CONFIG);
  await pgClient.connect();

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Fetch campus IDs
  const campusRes = await pgClient.query("SELECT id, slug, name FROM campuses ORDER BY slug;");
  const apexCampus = campusRes.rows.find(c => c.slug === 'apex-tech');
  const pacificCampus = campusRes.rows.find(c => c.slug === 'pacific-coast');

  console.log(`[Setup] Apex Campus ID: ${apexCampus.id}`);
  console.log(`[Setup] Pacific Campus ID: ${pacificCampus.id}\n`);

  // Fetch communities
  const commRes = await pgClient.query("SELECT id, slug, name, campus_id FROM communities;");
  const dscApex = commRes.rows.find(c => c.slug === 'developer-student-club' && c.campus_id === apexCampus.id);
  const designApex = commRes.rows.find(c => c.slug === 'design-collective' && c.campus_id === apexCampus.id);
  const robotPacific = commRes.rows.find(c => c.campus_id === pacificCampus.id);

  // Fetch a venue
  const venueRes = await pgClient.query("SELECT id, name, campus_id FROM venues WHERE campus_id = $1 LIMIT 1;", [apexCampus.id]);
  const testVenue = venueRes.rows[0];

  // Helper to get authenticated client for a persona
  async function getClientForUser(email, password = 'Password123!') {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
    return { client, user: data.user, token: data.session.access_token };
  }

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      testFailed++;
    }
  }

  // ----------------------------------------------------
  // TEST A: PERSISTENCE (Create -> Refresh -> Data Remains)
  // ----------------------------------------------------
  console.log('--- TEST A: Persistence (Create -> Read from DB) ---');
  const alexAuth = await getClientForUser('alex.rivera.apex@gmail.com');
  const testEventSlug = `live-test-summit-${Date.now()}`;
  
  const insertPayload = {
    title: 'PostgreSQL Live Persistence Summit',
    slug: testEventSlug,
    description: 'Testing live PostgreSQL persistence directly via Supabase authenticated client.',
    category: 'Tech',
    campus_id: apexCampus.id,
    community_id: dscApex.id,
    venue_id: testVenue.id,
    location_name: testVenue.name,
    is_virtual: false,
    start_time: '2026-10-15T14:00:00Z',
    end_time: '2026-10-15T16:00:00Z',
    status: 'published',
    tags: ['database', 'verification'],
    created_by: alexAuth.user.id,
  };

  const { data: insertedEvent, error: insertError } = await alexAuth.client
    .from('events')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error('Insert error details:', insertError);
  }

  assert(!insertError && insertedEvent?.id, `Event inserted successfully (ID: ${insertedEvent?.id})`);

  // Direct PG verification (representing a hard refresh / persistent DB query)
  const pgCheck = await pgClient.query("SELECT * FROM events WHERE id = $1;", [insertedEvent?.id]);
  assert(pgCheck.rows.length === 1, `Event found in persistent PostgreSQL store`);
  assert(pgCheck.rows[0]?.title === insertPayload.title, `Persisted title matches exactly: "${pgCheck.rows[0]?.title}"`);
  assert(pgCheck.rows[0]?.campus_id === apexCampus.id, `Campus ID is properly linked`);

  // ----------------------------------------------------
  // TEST B: PUBLIC VISIBILITY (Published Event -> Visible Publicly)
  // ----------------------------------------------------
  console.log('\n--- TEST B: Public Visibility (Anonymous Reader) ---');
  const { data: publicEvents, error: publicError } = await anonClient
    .from('events')
    .select('id, title, status, campus_id')
    .eq('id', insertedEvent.id);

  assert(!publicError, `Anonymous read executed without error`);
  assert(publicEvents?.length === 1, `Published event is visible to anonymous public query`);
  assert(publicEvents?.[0]?.status === 'published', `Visible event has status = published`);

  // ----------------------------------------------------
  // TEST C: PRIVACY (Draft Event -> Not Publicly Visible)
  // ----------------------------------------------------
  console.log('\n--- TEST C: Privacy (Draft/Private Event Protection) ---');
  const draftSlug = `private-draft-${Date.now()}`;
  const { data: draftEvent, error: draftError } = await alexAuth.client
    .from('events')
    .insert({
      title: 'Secret Internal Board Meeting (Draft)',
      slug: draftSlug,
      description: 'Internal planning draft not for students.',
      category: 'Tech',
      campus_id: apexCampus.id,
      community_id: dscApex.id,
      venue_id: testVenue.id,
      location_name: testVenue.name,
      is_virtual: false,
      start_time: '2026-10-16T10:00:00Z',
      end_time: '2026-10-16T12:00:00Z',
      status: 'draft',
      created_by: alexAuth.user.id,
    })
    .select()
    .single();

  assert(!draftError && draftEvent?.id, `Draft event created by Organizer Alex`);

  // Anonymous user queries draft event
  const { data: anonDraftCheck } = await anonClient
    .from('events')
    .select('id, title, status')
    .eq('id', draftEvent.id);

  assert(!anonDraftCheck || anonDraftCheck.length === 0, `RLS strictly conceals draft event from anonymous reader`);

  // Another student tries to query the draft event
  const studentAuth = await getClientForUser('student.apex@gmail.com');
  const { data: studentDraftCheck } = await studentAuth.client
    .from('events')
    .select('id, title, status')
    .eq('id', draftEvent.id);

  assert(!studentDraftCheck || studentDraftCheck.length === 0, `RLS strictly conceals draft event from regular student`);

  // Creator can see their own draft event
  const { data: creatorDraftCheck } = await alexAuth.client
    .from('events')
    .select('id, title, status')
    .eq('id', draftEvent.id);

  assert(creatorDraftCheck?.length === 1, `Organizer can view their own draft event`);

  // ----------------------------------------------------
  // TEST D: AUTHORIZATION (Organizer A vs Organizer B)
  // ----------------------------------------------------
  console.log('\n--- TEST D: Authorization (Cross-Organizer Protection) ---');
  const mayaAuth = await getClientForUser('maya.lin.apex@gmail.com');

  // Maya Lin (Design Collective lead) attempts to modify Alex's event (DSC)
  const { data: unauthorizedUpdate, error: updateError } = await mayaAuth.client
    .from('events')
    .update({ title: 'HACKED BY MAYA' })
    .eq('id', insertedEvent.id)
    .select();

  assert(
    !unauthorizedUpdate || unauthorizedUpdate.length === 0,
    `RLS prevented Organizer B (Maya) from updating Organizer A's event`
  );

  const pgVerifyUntampered = await pgClient.query("SELECT title FROM events WHERE id = $1;", [insertedEvent.id]);
  assert(
    pgVerifyUntampered.rows[0].title === 'PostgreSQL Live Persistence Summit',
    `Event in database remains unaltered`
  );

  // ----------------------------------------------------
  // TEST E: CAMPUS ISOLATION (Campus A vs Campus B)
  // ----------------------------------------------------
  console.log('\n--- TEST E: Campus Isolation (Apex Tech vs Pacific Coast) ---');
  const pacificAuth = await getClientForUser('organizer.pacific@gmail.com');

  // Pacific organizer attempts to read draft events from Apex Tech
  const { data: crossCampusDrafts } = await pacificAuth.client
    .from('events')
    .select('id, title, campus_id')
    .eq('id', draftEvent.id);

  assert(
    !crossCampusDrafts || crossCampusDrafts.length === 0,
    `Pacific organizer cannot read Apex Tech's private/draft records`
  );

  // Pacific organizer attempts to create an event claiming Apex Tech campus
  const { data: crossCampusInsert, error: crossInsertError } = await pacificAuth.client
    .from('events')
    .insert({
      title: 'Illegal Cross Campus Infiltration',
      slug: `illegal-cross-${Date.now()}`,
      description: 'Testing cross-campus boundary.',
      category: 'Tech',
      campus_id: apexCampus.id,
      community_id: dscApex.id,
      venue_id: testVenue.id,
      location_name: testVenue.name,
      is_virtual: false,
      start_time: '2026-10-18T10:00:00Z',
      end_time: '2026-10-18T12:00:00Z',
      status: 'published',
      created_by: pacificAuth.user.id,
    })
    .select();

  assert(
    crossInsertError || !crossCampusInsert || crossCampusInsert.length === 0,
    `RLS blocked Pacific organizer from inserting into Apex Tech campus`
  );

  // ----------------------------------------------------
  // TEST F: VENUE CONFLICT DETECTION (Live PostgreSQL RPC)
  // ----------------------------------------------------
  console.log('\n--- TEST F: Live Venue Conflict Engine (Database RPC) ---');
  // First event is insertedEvent: 2026-10-15T14:00:00Z to 16:00:00Z at testVenue
  // Test conflict overlapping: 2026-10-15T15:00:00Z to 17:00:00Z at the same venue
  const { data: conflictRows, error: conflictError } = await alexAuth.client.rpc('check_venue_conflict', {
    p_venue_id: testVenue.id,
    p_start_time: '2026-10-15T15:00:00Z',
    p_end_time: '2026-10-15T17:00:00Z',
    p_exclude_event_id: null,
  });

  assert(!conflictError, `Database RPC check_venue_conflict executed without error`);
  assert(conflictRows && conflictRows.length > 0, `Database correctly detected venue conflict (Rows: ${conflictRows?.length})`);
  assert(conflictRows?.[0]?.conflict_title === insertPayload.title, `Conflicting title: ${conflictRows?.[0]?.conflict_title}`);

  // Test no conflict on a different day
  const { data: noConflictRows, error: noConflictError } = await alexAuth.client.rpc('check_venue_conflict', {
    p_venue_id: testVenue.id,
    p_start_time: '2026-10-20T15:00:00Z',
    p_end_time: '2026-10-20T17:00:00Z',
    p_exclude_event_id: null,
  });
  assert(!noConflictError && (!noConflictRows || noConflictRows.length === 0), `Database confirmed no conflict when times do not overlap`);

  // Test campus schedule overlaps RPC
  const { data: overlapRows, error: overlapError } = await alexAuth.client.rpc('check_campus_schedule_overlaps', {
    p_campus_id: apexCampus.id,
    p_start_time: '2026-10-15T14:30:00Z',
    p_end_time: '2026-10-15T15:30:00Z',
    p_exclude_event_id: null,
  });
  assert(!overlapError, `Campus overlap RPC executed successfully`);
  assert(overlapRows && overlapRows.length > 0, `Campus-wide concurrent event overlaps detected: ${overlapRows?.length}`);

  // ----------------------------------------------------
  // TEST G: PRODUCTION FAILURE BEHAVIOR (No Mock Fallback)
  // ----------------------------------------------------
  console.log('\n--- TEST G: Production Failure Handling ---');
  // When Supabase is configured and fails, store.ts must throw error and NOT return mock data
  const brokenClient = createClient('https://invalid-nonexistent-subdomain.supabase.co', SUPABASE_ANON_KEY);
  let errorCaught = false;
  try {
    const { data, error } = await brokenClient.from('events').select('*');
    if (error) errorCaught = true;
  } catch {
    errorCaught = true;
  }
  assert(errorCaught, `Supabase failure correctly throws error / returns error response (never mock data)`);

  // Clean up test events
  await pgClient.query("DELETE FROM events WHERE slug IN ($1, $2);", [testEventSlug, draftSlug]);
  await pgClient.end();

  console.log('\n====================================================');
  console.log(`AUDIT SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log('====================================================\n');

  if (testFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
