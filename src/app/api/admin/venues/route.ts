import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { venues } from "@/db/schema";
import { formatVenue } from "@/db/adapters";
import { CreateVenueSchema, UpdateVenueSchema } from "@/lib/validations";
import { and, asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const rows = await withDbRetry((client) =>
      client
        .select()
        .from(venues)
        .where(eq(venues.campusId, campusId))
        .orderBy(asc(venues.name))
    );

    return NextResponse.json({ venues: rows.map(formatVenue) });
  } catch (err: unknown) {
    console.error("[GET /api/admin/venues] Error:", err);
    return NextResponse.json({ error: "Failed to load venues" }, { status: 500 });
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
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const [newVenue] = await withDbRetry((client) =>
      client
        .insert(venues)
        .values({
          campusId,
          name: name.trim(),
          building: building.trim(),
          capacity: capacity ?? null,
          address: address ? address.trim() : null,
          notes: notes ? notes.trim() : null,
          isActive: true,
        })
        .returning()
    );

    return NextResponse.json({ success: true, venue: formatVenue(newVenue) });
  } catch (err: unknown) {
    console.error("[POST /api/admin/venues] Error:", err);
    return NextResponse.json({ error: "Failed to create venue" }, { status: 500 });
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

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const [updatedVenue] = await withDbRetry((client) =>
      client
        .update(venues)
        .set({
          isActive: is_active,
        })
        .where(
          and(
            eq(venues.id, id),
            eq(venues.campusId, campusId)
          )
        )
        .returning()
    );

    if (!updatedVenue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, venue: formatVenue(updatedVenue) });
  } catch (err: unknown) {
    console.error("[PATCH /api/admin/venues] Error:", err);
    return NextResponse.json({ error: "Failed to update venue" }, { status: 500 });
  }
}

