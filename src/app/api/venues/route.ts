import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { venues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await withDbRetry((client) =>
      client
        .select({
          id: venues.id,
          campus_id: venues.campusId,
          name: venues.name,
          building: venues.building,
          capacity: venues.capacity,
          address: venues.address,
          notes: venues.notes,
          is_active: venues.isActive,
        })
        .from(venues)
        .where(eq(venues.isActive, true))
        .orderBy(asc(venues.name))
    );

    return NextResponse.json(
      { venues: rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load venues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
