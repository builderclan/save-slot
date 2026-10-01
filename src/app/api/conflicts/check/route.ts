import { NextResponse } from "next/server";
import { checkEventConflicts } from "@/lib/conflicts/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { venueId, startTime, endTime, category, excludeEventId } = body;

    if (!venueId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "venueId, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
      category,
      excludeEventId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Conflict check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
