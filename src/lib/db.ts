import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const password = process.env.DB_password || "T5fz8KcpVYxRsuQm";
    const host = process.env.DB_HOST || "aws-0-ap-south-1.pooler.supabase.com";
    const port = parseInt(process.env.DB_PORT || "6543", 10);
    const user = process.env.DB_USER || "postgres.dxwumvmscmictbnbfqyb";
    const database = process.env.DB_NAME || "postgres";

    pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const db = getDbPool();
  return db.query<T>(text, params);
}
