import { withDbRetry } from "@/lib/db";
import { campuses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { campusConfig } from "@/lib/config/campus";

let cachedPrimaryCampusId: string | null = null;

/**
 * Resolves the primary campus UUID for this single-tenant deployment instance.
 * Looks up the campus strictly by the configured slug in campusConfig.
 * If missing, self-seeds the configured canonical campus entity.
 * Caches the result in memory across invocations for high throughput.
 */
export async function getPrimaryCampusId(): Promise<string> {
  if (cachedPrimaryCampusId) {
    return cachedPrimaryCampusId;
  }

  try {
    // 1. Check for campus strictly matching the configured instance slug
    const rows = await withDbRetry((client) =>
      client
        .select({ id: campuses.id })
        .from(campuses)
        .where(eq(campuses.slug, campusConfig.slug))
        .limit(1)
    );

    if (rows && rows.length > 0) {
      cachedPrimaryCampusId = rows[0].id;
      return cachedPrimaryCampusId;
    }

    // 2. Adopt earliest campus if present (prevents creating duplicate campuses on slug changes)
    const existing = await withDbRetry((client) =>
      client
        .select({ id: campuses.id })
        .from(campuses)
        .orderBy(campuses.createdAt)
        .limit(1)
    );

    if (existing && existing.length > 0) {
      cachedPrimaryCampusId = existing[0].id;
      return cachedPrimaryCampusId;
    }

    // 3. Fresh database: self-seed the configured canonical campus
    const seedRes = await withDbRetry((client) =>
      client
        .insert(campuses)
        .values({
          name: campusConfig.name,
          slug: campusConfig.slug,
          domain: campusConfig.domain,
          timezone: campusConfig.timezone,
        })
        .onConflictDoUpdate({
          target: campuses.slug,
          set: {
            name: sql`EXCLUDED.name`,
            domain: sql`EXCLUDED.domain`,
            timezone: sql`EXCLUDED.timezone`,
          },
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
