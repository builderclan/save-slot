import { Pool, QueryResult, QueryResultRow } from "pg";

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

    const isProduction = process.env.NODE_ENV === "production";
    const rejectUnauthorized =
      process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined
        ? process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
        : isProduction;

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
