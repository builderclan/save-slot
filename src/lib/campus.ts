import { query } from "@/lib/db";

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
    const res = await query<{ id: string }>(
      "SELECT id FROM public.campuses ORDER BY CASE WHEN slug = 'aisat' THEN 0 ELSE 1 END LIMIT 1;"
    );
    if (res && res.rows && res.rows.length > 0) {
      cachedPrimaryCampusId = res.rows[0].id;
      return cachedPrimaryCampusId;
    }

    // Self-seed AISAT campus if campuses table is completely empty in the database
    const seedRes = await query<{ id: string }>(
      `INSERT INTO public.campuses (name, slug, domain, timezone)
       VALUES ('Albertian Institute of Science & Technology', 'aisat', 'aisat.ac.in', 'Asia/Kolkata')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`
    );
    if (seedRes && seedRes.rows && seedRes.rows.length > 0) {
      cachedPrimaryCampusId = seedRes.rows[0].id;
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
