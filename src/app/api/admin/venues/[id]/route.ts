import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { UpdateVenueFullSchema } from "@/lib/validations";
import { Venue } from "@/types/database";

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

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const { name, building, capacity, address, notes, is_active } = parsed.data;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (building !== undefined) {
      updates.push(`building = $${idx++}`);
      values.push(building.trim());
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${idx++}`);
      values.push(capacity);
    }
    if (address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(address?.trim() || null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes?.trim() || null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE public.venues SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *;`;
    const res = await query<Venue>(sql, values);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, venue: res.rows[0] });
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
    const activeEventsRes = await query<{ count: string; titles: string }>(
      `SELECT count(*)::text as count, string_agg(title, ', ') as titles
       FROM public.events 
       WHERE venue_id = $1 AND status IN ('pending', 'published');`,
      [id]
    );

    const activeCount = parseInt(activeEventsRes.rows[0]?.count || "0", 10);
    if (activeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete facility: ${activeCount} upcoming or pending event(s) are scheduled here. Please reassign those events or set the facility status to 'Under Maintenance' instead.`,
        },
        { status: 400 }
      );
    }

    const deleted = await withTransaction(async (client) => {
      // Detach any rejected or historical events before deletion
      await client.query("UPDATE public.events SET venue_id = NULL WHERE venue_id = $1;", [id]);

      const res = await client.query("DELETE FROM public.venues WHERE id = $1 RETURNING id;", [id]);
      return res.rows.length > 0;
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
