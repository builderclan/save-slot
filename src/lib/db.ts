import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function getDbPool(): Pool {
  if (!globalForDb.pgPool) {
    const password = process.env.DB_PASSWORD || process.env.DB_password;
    const host = process.env.DB_HOST;
    const port = parseInt(process.env.DB_PORT || "6543", 10);
    const user = process.env.DB_USER;
    const database = process.env.DB_NAME || "postgres";

    if (!password || !host || !user) {
      throw new Error(
        "Database configuration error: Missing required environment variables (DB_HOST, DB_USER, or DB_PASSWORD)."
      );
    }

    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

    globalForDb.pgPool = new Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const db = getDbPool();
  return db.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

