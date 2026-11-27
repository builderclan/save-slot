import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getDossierPayload } from "@/server/reports";

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

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    console.error("[GET /api/reports/events/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to load event dossier" }, { status: 500 });
  }
}
