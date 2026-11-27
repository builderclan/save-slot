import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { ClosureReportSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getDossierPayload, submitClosureReport } from "@/server/reports";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getDossierPayload(id, session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      event: result.data.event,
      report: result.data.event.report ?? null,
      mentors: result.data.event.mentors ?? [],
    });
  } catch (err: unknown) {
    console.error("[GET /api/workspace/events/[id]/report] Error:", err);
    return NextResponse.json({ error: "Failed to load closure report" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = ClosureReportSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid closure report payload" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const result = await submitClosureReport({
      eventId: id,
      actorSession: session,
      input: parsed.data,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/lead");
    safeRevalidatePath("/fic");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/principal");
    safeRevalidatePath(`/reports/events/${id}`);

    return NextResponse.json({ success: true, ...result.data });
  } catch (err: unknown) {
    console.error("[POST /api/workspace/events/[id]/report] Error:", err);
    return NextResponse.json({ error: "Failed to submit closure report" }, { status: 500 });
  }
}
