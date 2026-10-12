import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Venue } from "@/types/database";

export async function GET() {
  try {
    const res = await query<Venue>(
      "SELECT id, campus_id, name, building, capacity, address, notes, is_active FROM public.venues WHERE is_active = true ORDER BY name ASC;"
    );
    return NextResponse.json(
      { venues: res.rows },
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
