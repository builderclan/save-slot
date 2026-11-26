import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { departments } from "@/db/schema";
import { formatDepartment } from "@/db/adapters";
import { ToggleActingHodSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { dispatchNotifications } from "@/server/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
      return NextResponse.json({ error: "Unauthorized executive access" }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await request.json().catch(() => null);
    const parsed = ToggleActingHodSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid toggle request" },
        { status: 400 }
      );
    }

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const [deptRow] = await tx
          .select()
          .from(departments)
          .where(eq(departments.id, id))
          .for("update")
          .limit(1);

        if (!deptRow) {
          return { ok: false as const, status: 404, error: "Department not found." };
        }
        if (parsed.data.isActingHodActive && !deptRow.actingHodUserId) {
          return {
            ok: false as const,
            status: 400,
            error: "Cannot activate Acting HOD without an assigned Acting HOD user.",
          };
        }

        const [updated] = await tx
          .update(departments)
          .set({
            isActingHodActive: parsed.data.isActingHodActive,
            actingHodToggledBy: session.userId,
            actingHodToggledAt: new Date(),
          })
          .where(eq(departments.id, id))
          .returning();

        const notifyIds = [deptRow.hodUserId, deptRow.actingHodUserId].filter(
          (uid): uid is string => Boolean(uid)
        );
        await dispatchNotifications(
          tx,
          notifyIds.map((userId) => ({
            userId,
            type: "acting_hod_emergency_toggle",
            title: parsed.data.isActingHodActive
              ? `Executive Override: Acting HOD Enabled (${deptRow.code})`
              : `Executive Override: Acting HOD Disabled (${deptRow.code})`,
            message: `${session.profile.full_name} updated Acting HOD cover status for ${deptRow.name}.`,
          }))
        );

        return { ok: true as const, department: updated };
      })
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/principal");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/admin");

    return NextResponse.json({
      success: true,
      department: formatDepartment(result.department),
    });
  } catch (err: unknown) {
    console.error("[PATCH /api/principal/departments/[id]/acting-hod] Error:", err);
    return NextResponse.json({ error: "Failed to toggle Acting HOD" }, { status: 500 });
  }
}
