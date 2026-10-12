import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { communities } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await withDbRetry((client) =>
      client
        .select({
          id: communities.id,
          campus_id: communities.campusId,
          name: communities.name,
          slug: communities.slug,
          category: communities.category,
          description: communities.description,
          logo_url: communities.logoUrl,
        })
        .from(communities)
        .orderBy(asc(communities.name))
    );

    return NextResponse.json(
      { communities: rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load communities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
