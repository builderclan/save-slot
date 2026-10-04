import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { Venue } from "@/types/database";
import { CreateVenueSchema, UpdateVenueSchema } from "@/lib/validations";

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

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateVenueSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid venue data";
      return NextResponse.json({ error: errorMsg, details: parsed.error.issues }, { status: 400 });
    }

    const { name, building, capacity, address, notes } = parsed.data;
    const campusId = session.profile.campus_id;

    const res = await query<Venue>(
      `INSERT INTO public.venues (campus_id, name, building, capacity, address, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *;`,
      [campusId, name.trim(), building, capacity, address || null, notes || null]
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

    const rawBody = await request.json().catch(() => null);
    const parsed = UpdateVenueSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid venue update payload";
      return NextResponse.json({ error: errorMsg, details: parsed.error.issues }, { status: 400 });
    }

    const { id, is_active } = parsed.data;

    const res = await query<Venue>(
      "UPDATE public.venues SET is_active = $1 WHERE id = $2 RETURNING *;",
      [is_active, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, venue: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

