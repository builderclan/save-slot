import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { venues, events } from "@/db/schema";
import { formatVenue } from "@/db/adapters";
import { UpdateVenueFullSchema } from "@/lib/validations";
import { eq, and, inArray } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UpdateVenueFullSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid venue data" },
        { status: 400 }
      );
    }

    const { name, building, capacity, address, notes, is_active } = parsed.data;

    const updateData: Partial<typeof venues.$inferInsert> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (building !== undefined) {
      updateData.building = building.trim();
    }
    if (capacity !== undefined) {
      updateData.capacity = capacity;
    }
    if (address !== undefined) {
      updateData.address = address?.trim() || null;
    }
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }
    if (is_active !== undefined) {
      updateData.isActive = is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updatedVenue] = await withDbRetry((client) =>
      client
        .update(venues)
        .set(updateData)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;

    // Safety guard: Check for active or pending events scheduled in this venue
    const activeEvents = await withDbRetry((client) =>
      client
        .select({
          id: events.id,
          title: events.title,
        })
        .from(events)
        .where(
          and(
            eq(events.venueId, id),
            inArray(events.status, ["pending", "published"])
          )
        )
    );

    if (activeEvents.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete facility: ${activeEvents.length} upcoming or pending event(s) are scheduled here. Please reassign those events or set the facility status to 'Under Maintenance' instead.`,
        },
        { status: 400 }
      );
    }

    const deleted = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        // Detach any rejected or historical events before deletion
        await tx
          .update(events)
          .set({ venueId: null })
          .where(eq(events.venueId, id));

        const res = await tx
          .delete(venues)
          .where(eq(venues.id, id))
          .returning({ id: venues.id });

        return res.length > 0;
      });
    });

    if (!deleted) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
