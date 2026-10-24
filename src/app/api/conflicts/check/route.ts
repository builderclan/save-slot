import { NextResponse } from "next/server";
import { checkEventConflicts } from "@/lib/conflicts/engine";
import { ConflictCheckSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = ConflictCheckSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid conflict check parameters";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { venueId, startTime, endTime, category, targetAudience, excludeEventId } = parsed.data;

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
      category,
      targetAudience,
      excludeEventId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[POST /api/conflicts/check] Error:", err);
    return NextResponse.json({ error: "Conflict check failed" }, { status: 500 });
  }
}
