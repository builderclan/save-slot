/**
 * SaveSlot Database Migration Runner
 * 
 * Manages timestamped/versioned SQL migrations with transactional safety,
 * concurrency locks, and a persistent ledger table (public._schema_migrations).
 * 
 * Usage:
 *   node scripts/migrate.js              # Apply all pending migrations
 *   node scripts/migrate.js --status     # View ledger history & pending migrations
 *   node scripts/migrate.js --dry-run    # Preview pending migrations without applying
 *   node scripts/migrate.js --env=.env.prod # Run against a specific environment
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");
const ADVISORY_LOCK_ID = "7429184712"; // Unique 64-bit integer for SaveSlot DDL lock

/**
 * Lightweight .env parser to avoid external runtime dependencies
 */
function parseEnv(content) {
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[match[1]] = value;
    }
  }
  return result;
}

/**
 * Loads environment variables from specified or default files if not already set
 */
function loadEnvironment(customEnvFile) {
  if (customEnvFile) {
    const customPath = path.resolve(process.cwd(), customEnvFile);
    if (fs.existsSync(customPath)) {
      const parsed = parseEnv(fs.readFileSync(customPath, "utf-8"));
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[migrate] Loaded environment from: ${customEnvFile}`);
      return;
    } else {
      console.warn(`[migrate] Warning: Specified env file not found: ${customPath}`);
    }
  }

  // Fallback cascade: .env.local -> .env
  const localEnvPath = path.resolve(process.cwd(), ".env.local");
  const defaultEnvPath = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(localEnvPath)) {
    const parsed = parseEnv(fs.readFileSync(localEnvPath, "utf-8"));
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
  }
  if (fs.existsSync(defaultEnvPath)) {
    const parsed = parseEnv(fs.readFileSync(defaultEnvPath, "utf-8"));
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

/**
 * Resolves PostgreSQL client configuration
 */
function getClientConfig() {
  if (process.env.DATABASE_URL) {
    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized },
    };
  }

  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || "6543", 10);
  const database = process.env.DB_NAME || "postgres";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || process.env.DB_password;
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

  if (!host || !user || !password) {
    throw new Error(
      "Missing required database credentials. Please provide DB_HOST, DB_USER, and DB_PASSWORD (or DATABASE_URL)."
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized },
  };
}

/**
 * Reads and sorts all SQL migration files from the migrations directory
 */
function getMigrationFiles(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Ensures ledger table exists and returns applied migrations
 */
async function ensureLedgerTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const res = await client.query(`
    SELECT name, applied_at 
    FROM public._schema_migrations 
    ORDER BY applied_at ASC, name ASC;
  `);

  const appliedMap = new Map();
  for (const row of res.rows) {
    appliedMap.set(row.name, row.applied_at);
  }
  return appliedMap;
}

/**
 * Computes status of all migrations
 */
async function getMigrationStatus(client, dir = MIGRATIONS_DIR) {
  const appliedMap = await ensureLedgerTable(client);
  const files = getMigrationFiles(dir);

  return files.map((file) => ({
    name: file,
    applied: appliedMap.has(file),
    appliedAt: appliedMap.get(file) || null,
  }));
}

/**
 * Displays status table in terminal
 */
async function printStatus(client, dir = MIGRATIONS_DIR) {
  const statuses = await getMigrationStatus(client, dir);
  const appliedCount = statuses.filter((s) => s.applied).length;
  const pendingCount = statuses.length - appliedCount;

  console.log("\n================================================================================");
  console.log(" SaveSlot Database Migrations Ledger Status");
  console.log(` Target: ${process.env.DB_HOST || "connection-string"} (Database: ${process.env.DB_NAME || "default"})`);
  console.log("================================================================================");
  console.log(
    " " +
      "Status".padEnd(12) +
      "| " +
      "Migration File".padEnd(46) +
      "| " +
      "Applied At"
  );
  console.log("-".repeat(84));

  for (const item of statuses) {
    const statusText = item.applied ? "[APPLIED]" : "[PENDING]";
    const appliedText = item.appliedAt ? new Date(item.appliedAt).toISOString() : "-";
    console.log(
      " " +
        statusText.padEnd(12) +
        "| " +
        item.name.padEnd(46) +
        "| " +
        appliedText
    );
  }

  console.log("================================================================================");
  console.log(` Total: ${statuses.length} | Applied: ${appliedCount} | Pending: ${pendingCount}\n`);
}

/**
 * Runs pending migrations with transactional rollback and advisory lock
 */
async function runMigrations({ client, dir = MIGRATIONS_DIR, dryRun = false } = {}) {
  let lockAcquired = false;

  try {
    // Acquire PostgreSQL advisory lock to prevent concurrent CI/deploy runs
    await client.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID});`);
    lockAcquired = true;

    const statuses = await getMigrationStatus(client, dir);
    const pending = statuses.filter((s) => !s.applied);

    if (pending.length === 0) {
      console.log(`✓ Database schema is already up to date. (${statuses.length} migrations applied)`);
      return { appliedCount: 0, total: statuses.length, pending: 0 };
    }

    console.log(`\nFound ${pending.length} pending migration(s) to apply:`);
    for (const p of pending) {
      console.log(`  • ${p.name}`);
    }

    if (dryRun) {
      console.log("\n[DRY RUN] No changes were executed against the database.");
      return { appliedCount: 0, total: statuses.length, pending: pending.length, dryRun: true };
    }

    console.log("\nApplying migrations in order...");
    for (const p of pending) {
      const filePath = path.join(dir, p.name);
      const sql = fs.readFileSync(filePath, "utf-8");
      const startTime = Date.now();

      try {
        await client.query("BEGIN;");
        await client.query(sql);
        await client.query(
          `INSERT INTO public._schema_migrations (name, applied_at)
           VALUES ($1, NOW())
           ON CONFLICT (name) DO UPDATE SET applied_at = EXCLUDED.applied_at;`,
          [p.name]
        );
        await client.query("COMMIT;");
        const duration = Date.now() - startTime;
        console.log(`✓ Applied ${p.name} (${duration}ms)`);
      } catch (err) {
        await client.query("ROLLBACK;");
        console.error(`\n✗ FAILED migration: ${p.name}`);
        console.error(`  Error: ${err.message}`);
        if (err.detail) console.error(`  Detail: ${err.detail}`);
        if (err.position) console.error(`  Position: ${err.position}`);
        throw err;
      }
    }

    console.log(`\n✓ Successfully applied ${pending.length} migration(s). Database is up to date!\n`);
    return { appliedCount: pending.length, total: statuses.length, pending: 0 };
  } finally {
    if (lockAcquired) {
      try {
        await client.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID});`);
      } catch (unlockErr) {
        console.warn(`[migrate] Warning: Failed to release advisory lock: ${unlockErr.message}`);
      }
    }
  }
}

/**
 * CLI Entrypoint
 */
async function main() {
  const args = process.argv.slice(2);
  const isStatus = args.includes("--status");
  const isDryRun = args.includes("--dry-run");
  const isHelp = args.includes("--help") || args.includes("-h");

  const envArg = args.find((a) => a.startsWith("--env="));
  const customEnvFile = envArg ? envArg.split("=")[1] : null;

  if (isHelp) {
    console.log(`
SaveSlot Database Migration Runner

Options:
  --status         Display migration ledger history & status table
  --dry-run        Preview pending migrations without modifying the database
  --env=<path>     Path to custom environment file (e.g. --env=.env.production)
  --help, -h       Display this help message

Environment Variables:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL_REJECT_UNAUTHORIZED
  or DATABASE_URL
`);
    process.exit(0);
  }

  loadEnvironment(customEnvFile);

  let client;
  try {
    const config = getClientConfig();
    client = new Client(config);
    await client.connect();

    if (isStatus) {
      await printStatus(client);
    } else {
      await runMigrations({ client, dryRun: isDryRun });
    }
  } catch (err) {
    console.error(`\n[migrate] Execution aborted: ${err.message}`);
    process.exit(1);
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // Ignore closing errors
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseEnv,
  loadEnvironment,
  getClientConfig,
  getMigrationFiles,
  ensureLedgerTable,
  getMigrationStatus,
  runMigrations,
};
