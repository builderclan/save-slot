import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { ExecutiveApproveSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { decideExecutiveEvent } from "@/server/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
      return NextResponse.json(
        { error: "Unauthorized executive access" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const rawBody = await request.json().catch(() => ({}));
    const parsed = ExecutiveApproveSchema.safeParse(rawBody || {});
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid approval payload",
        },
        { status: 400 },
      );
    }

    const result = await decideExecutiveEvent({
      eventId: id,
      actorSession: session,
      decision: "approve",
      overrideLeadTime: parsed.data.overrideLeadTime,
      overrideReason: parsed.data.overrideReason,
      remarks: parsed.data.remarks,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status },
      );
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/principal");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json({ success: true, ...result.data });
  } catch (err: unknown) {
    console.error("[POST /api/principal/events/[id]/approve] Error:", err);
    return NextResponse.json(
      { error: "Failed to approve event" },
      { status: 500 },
    );
  }
}
