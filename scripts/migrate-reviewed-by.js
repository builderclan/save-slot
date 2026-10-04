const { Client } = require("pg");

async function migrateReviewedBy() {
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
  console.log("Connected to PostgreSQL for reviewed_by column migration...");

  try {
    // 1. Add reviewed_by column if not exists
    console.log("Adding reviewed_by column to public.events...");
    await client.query(`
      ALTER TABLE public.events 
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    `);
    console.log("✓ Added column public.events.reviewed_by");

    // 2. Add performance index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_reviewed_by ON public.events (reviewed_by);
    `);
    console.log("✓ Created index idx_events_reviewed_by");

    // 3. Backfill existing decisions with Principal user id so history view is populated
    const principalRes = await client.query("SELECT id FROM public.users WHERE role = 'principal' LIMIT 1;");
    const principalId = principalRes.rows[0]?.id;

    if (principalId) {
      const updateRes = await client.query(`
        UPDATE public.events 
        SET reviewed_by = $1 
        WHERE status IN ('published', 'rejected') AND reviewed_by IS NULL;
      `, [principalId]);
      console.log(`✓ Backfilled ${updateRes.rowCount} existing decided events with Principal author attribution`);
    }

    console.log("\nreviewed_by migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateReviewedBy();
