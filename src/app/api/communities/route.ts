import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { communities } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

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
        .where(eq(communities.status, "approved"))
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
    console.error("[GET /api/communities] Error:", err);
    return NextResponse.json({ error: "Failed to load communities" }, { status: 500 });
  }
}
