import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { departments } from "@/db/schema";
import { formatDepartment } from "@/db/adapters";
import { safeRevalidatePath } from "@/lib/revalidate";
import { dispatchNotifications } from "@/server/notifications";

const HodToggleSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID").optional(),
  isActingHodActive: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isHod && !session.isActingHod)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = HodToggleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const primaryDept = parsed.data.departmentId
      ? session.hodDepartments.find((d) => d.id === parsed.data.departmentId)
      : session.hodDepartments[0];

    if (!primaryDept) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to this department." },
        { status: 403 }
      );
    }

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const [deptRow] = await tx
          .select()
          .from(departments)
          .where(and(eq(departments.id, primaryDept.id), eq(departments.isActive, true)))
          .for("update")
          .limit(1);

        if (!deptRow) {
          return { ok: false as const, status: 404, error: "Department not found." };
        }

        // Strictly only the primary HOD (hod_user_id) toggles cover mode via HOD desk
        if (deptRow.hodUserId !== session.userId) {
          return {
            ok: false as const,
            status: 403,
            error: "Only the primary Department HOD can toggle Acting HOD leave mode.",
          };
        }

        if (parsed.data.isActingHodActive && !deptRow.actingHodUserId) {
          return {
            ok: false as const,
            status: 400,
            error: "No Acting HOD user is configured for this department. Contact IT Admin.",
          };
        }

        const [updated] = await tx
          .update(departments)
          .set({
            isActingHodActive: parsed.data.isActingHodActive,
            actingHodToggledBy: session.userId,
            actingHodToggledAt: new Date(),
          })
          .where(eq(departments.id, deptRow.id))
          .returning();

        if (deptRow.actingHodUserId) {
          await dispatchNotifications(tx, [
            {
              userId: deptRow.actingHodUserId,
              type: "acting_hod_toggled",
              title: parsed.data.isActingHodActive
                ? `Acting HOD Activated (${deptRow.code})`
                : `Acting HOD Deactivated (${deptRow.code})`,
              message: parsed.data.isActingHodActive
                ? `${session.profile.full_name} enabled Acting HOD leave cover for ${deptRow.name}. You now have Stage 2 review access.`
                : `${session.profile.full_name} resumed primary HOD duties for ${deptRow.name}.`,
            },
          ]);
        }

        return { ok: true as const, department: updated };
      })
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/hod");
    safeRevalidatePath("/admin");

    return NextResponse.json({
      success: true,
      department: formatDepartment(result.department),
    });
  } catch (err: unknown) {
    console.error("[PATCH /api/hod/acting-hod] Error:", err);
    return NextResponse.json({ error: "Failed to update Acting HOD mode" }, { status: 500 });
  }
}
