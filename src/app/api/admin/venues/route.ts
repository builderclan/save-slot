import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { Venue } from "@/types/database";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const res = await query<Venue>(
      "SELECT id, campus_id, name, building, capacity, address, notes, is_active FROM public.venues ORDER BY name ASC;"
    );
    return NextResponse.json({ venues: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load venues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json();
    const { name, building, capacity, address, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Venue name is required." }, { status: 400 });
    }

    const campusId = session.profile.campus_id;
    const res = await query<Venue>(
      `INSERT INTO public.venues (campus_id, name, building, capacity, address, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *;`,
      [campusId, name.trim(), building || "Campus", parseInt(capacity || "100", 10), address || null, notes || null]
    );

    return NextResponse.json({ success: true, venue: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Venue ID is required" }, { status: 400 });
    }

    const res = await query<Venue>(
      "UPDATE public.venues SET is_active = $1 WHERE id = $2 RETURNING *;",
      [is_active, id]
    );

    return NextResponse.json({ success: true, venue: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
