import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { ExecutiveRejectSchema } from "@/lib/validations";
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
    const rawBody = await request.json().catch(() => null);
    const parsed = ExecutiveRejectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Rejection reason is required",
        },
        { status: 400 },
      );
    }

    const result = await decideExecutiveEvent({
      eventId: id,
      actorSession: session,
      decision: "reject",
      remarks: parsed.data.rejectionReason,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    safeRevalidatePath("/principal");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json({ success: true, ...result.data });
  } catch (err: unknown) {
    console.error("[POST /api/principal/events/[id]/reject] Error:", err);
    return NextResponse.json(
      { error: "Failed to reject event" },
      { status: 500 },
    );
  }
}
