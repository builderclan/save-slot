import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { departments, events } from "@/db/schema";
import { formatDepartment } from "@/db/adapters";
import { UpdateDepartmentSchema } from "@/lib/validations";
import { and, eq, inArray } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UpdateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid department update data" },
        { status: 400 }
      );
    }

    const [existing] = await withDbRetry((client) =>
      client.select().from(departments).where(eq(departments.id, id)).limit(1)
    );
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // P/VP may only perform emergency Acting HOD toggle; structural edits belong to Admin
    if (!session.isAdmin) {
      if (parsed.data.isActingHodActive === undefined) {
        return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
      }
      const nextActingHodId =
        parsed.data.actingHodUserId !== undefined
          ? parsed.data.actingHodUserId?.trim() || null
          : existing.actingHodUserId;
      if (parsed.data.isActingHodActive && !nextActingHodId) {
        return NextResponse.json(
          { error: "Cannot activate Acting HOD without an assigned Acting HOD user." },
          { status: 400 }
        );
      }
      const [toggled] = await withDbRetry((client) =>
        client
          .update(departments)
          .set({
            isActingHodActive: parsed.data.isActingHodActive,
            actingHodToggledBy: session.userId,
            actingHodToggledAt: new Date(),
          })
          .where(eq(departments.id, id))
          .returning()
      );
      return NextResponse.json({ success: true, department: formatDepartment(toggled) });
    }

    const updateData: Partial<typeof departments.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.code !== undefined) updateData.code = parsed.data.code.trim().toUpperCase();
    if (parsed.data.hodUserId !== undefined) {
      updateData.hodUserId = parsed.data.hodUserId?.trim() || null;
    }
    if (parsed.data.actingHodUserId !== undefined) {
      updateData.actingHodUserId = parsed.data.actingHodUserId?.trim() || null;
    }
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.isActingHodActive !== undefined) {
      const targetActingHod =
        parsed.data.actingHodUserId !== undefined
          ? parsed.data.actingHodUserId?.trim() || null
          : existing.actingHodUserId;
      if (parsed.data.isActingHodActive && !targetActingHod) {
        return NextResponse.json(
          { error: "Assign an Acting HOD user before activating Acting HOD mode." },
          { status: 400 }
        );
      }
      updateData.isActingHodActive = parsed.data.isActingHodActive;
      updateData.actingHodToggledBy = session.userId;
      updateData.actingHodToggledAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await withDbRetry((client) =>
      client.update(departments).set(updateData).where(eq(departments.id, id)).returning()
    );

    return NextResponse.json({ success: true, department: formatDepartment(updated) });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A department with this code already exists." },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/admin/departments/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;

    const activeEvents = await withDbRetry((client) =>
      client
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.departmentId, id),
            inArray(events.status, [
              "pending_stage2",
              "pending_executive",
              "published",
              "pending_report_verification",
            ])
          )
        )
        .limit(1)
    );

    if (activeEvents.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete department with active or pending events. Deactivate the department instead.",
        },
        { status: 400 }
      );
    }

    const deleted = await withDbRetry((client) =>
      client.delete(departments).where(eq(departments.id, id)).returning({ id: departments.id })
    );

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/departments/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
