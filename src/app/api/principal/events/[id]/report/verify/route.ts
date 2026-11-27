import { NextResponse } from "next/server";
import { handleReportVerifyPatch } from "@/server/reports";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleReportVerifyPatch(request, id, "executive");
  } catch (err: unknown) {
    console.error("[PATCH /api/principal/events/[id]/report/verify] Error:", err);
    return NextResponse.json({ error: "Failed to verify closure report" }, { status: 500 });
  }
}
