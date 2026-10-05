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
    const connectionTimeoutMillis = parseInt(
      process.env.DB_CONNECTION_TIMEOUT_MS || "15000",
      10
    );

    const pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on("error", (err) => {
      console.warn("Unexpected error on idle PostgreSQL client:", err?.message || err);
    });

    globalForDb.pgPool = pool;
  }
  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const db = getDbPool();
  try {
    return await db.query<T>(text, params);
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || "";
    const errorCode = (err as { code?: string })?.code;
    const isConnectionError =
      errorMsg.includes("Connection terminated") ||
      errorMsg.includes("connection timeout") ||
      errorCode === "ECONNRESET" ||
      errorCode === "57P01";

    if (isConnectionError) {
      console.warn("Database connection issue encountered; retrying query once...");
      return await db.query<T>(text, params);
    }
    throw err;
  }
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

