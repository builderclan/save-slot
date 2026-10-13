import { withDbRetry } from "@/lib/db";
import { campuses } from "@/db/schema";
import { sql } from "drizzle-orm";

let cachedPrimaryCampusId: string | null = null;

/**
 * Resolves the primary campus UUID (AISAT) for the deployment.
 * Caches the result in memory across invocations for high throughput.
 */
export async function getPrimaryCampusId(): Promise<string> {
  if (cachedPrimaryCampusId) {
    return cachedPrimaryCampusId;
  }

  try {
    const rows = await withDbRetry((client) =>
      client
        .select({ id: campuses.id })
        .from(campuses)
        .orderBy(sql`CASE WHEN ${campuses.slug} = 'aisat' THEN 0 ELSE 1 END`)
        .limit(1)
    );

    if (rows && rows.length > 0) {
      cachedPrimaryCampusId = rows[0].id;
      return cachedPrimaryCampusId;
    }

    // Self-seed AISAT campus if campuses table is completely empty in the database
    const seedRes = await withDbRetry((client) =>
      client
        .insert(campuses)
        .values({
          name: "Albertian Institute of Science & Technology",
          slug: "aisat",
          domain: "aisat.ac.in",
          timezone: "Asia/Kolkata",
        })
        .onConflictDoUpdate({
          target: campuses.slug,
          set: { name: sql`EXCLUDED.name` },
        })
        .returning({ id: campuses.id })
    );

    if (seedRes && seedRes.length > 0) {
      cachedPrimaryCampusId = seedRes[0].id;
      return cachedPrimaryCampusId;
    }
  } catch (err) {
    console.error("[getPrimaryCampusId] Failed to resolve primary campus:", err);
  }

  return "";
}

/**
 * Resets the in-memory primary campus cache (for testing/mocking).
 */
export function resetCampusCache(): void {
  cachedPrimaryCampusId = null;
}
