import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { venues } from "@/db/schema";
import { formatVenue } from "@/db/adapters";
import { getPrimaryCampusId } from "@/lib/campus";
import { CreateVenueSchema, UpdateVenueSchema } from "@/lib/validations";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const rows = await withDbRetry((client) =>
      client
        .select()
        .from(venues)
        .orderBy(asc(venues.name))
    );

    return NextResponse.json({ venues: rows.map(formatVenue) });
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
    const campusId = session.profile.campus_id || (await getPrimaryCampusId());
    if (!campusId) {
      return NextResponse.json(
        { error: "No active campus found in the system." },
        { status: 400 }
      );
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

    const [updatedVenue] = await withDbRetry((client) =>
      client
        .update(venues)
        .set({
          isActive: is_active,
        })
        .where(eq(venues.id, id))
        .returning()
    );

    if (!updatedVenue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, venue: formatVenue(updatedVenue) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

