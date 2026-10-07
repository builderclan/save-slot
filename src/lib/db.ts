import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function resetDbPool(): void {
  if (globalForDb.pgPool) {
    const oldPool = globalForDb.pgPool;
    globalForDb.pgPool = undefined;
    oldPool.end().catch(() => {});
  }
}

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
      process.env.DB_CONNECTION_TIMEOUT_MS || "20000",
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
      // If idle client encounters socket termination or reset, reset pool reference
      if (isTransientConnectionError(err)) {
        resetDbPool();
      }
    });

    globalForDb.pgPool = pool;
  }
  return globalForDb.pgPool;
}

export function isTransientConnectionError(err: unknown): boolean {
  if (!err) return false;
  const errorMsg = ((err as Error)?.message || "").toLowerCase();
  const errorCode = (err as { code?: string })?.code;

  return (
    errorMsg.includes("timeout exceeded") ||
    errorMsg.includes("connection timeout") ||
    errorMsg.includes("connection terminated") ||
    errorMsg.includes("terminating connection") ||
    errorMsg.includes("econnreset") ||
    errorMsg.includes("etimedout") ||
    errorMsg.includes("enotfound") ||
    errorMsg.includes("eai_again") ||
    errorCode === "ECONNRESET" ||
    errorCode === "ETIMEDOUT" ||
    errorCode === "ENOTFOUND" ||
    errorCode === "EAI_AGAIN" ||
    errorCode === "57P01" ||
    errorCode === "08006" ||
    errorCode === "08001" ||
    errorCode === "08004"
  );
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const db = getDbPool();
    try {
      return await db.query<T>(text, params);
    } catch (err: unknown) {
      lastError = err;
      if (isTransientConnectionError(err) && attempt < maxAttempts) {
        console.warn(
          `Database connection issue encountered (attempt ${attempt}/${maxAttempts}); refreshing connection pool and retrying in ${attempt * 300}ms...`
        );
        resetDbPool();
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  let client: PoolClient;

  try {
    client = await pool.connect();
  } catch (err) {
    if (isTransientConnectionError(err)) {
      console.warn("Database connection issue during withTransaction connect; resetting pool and retrying...");
      resetDbPool();
      client = await getDbPool().connect();
    } else {
      throw err;
    }
  }

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
