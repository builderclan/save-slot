import { NextResponse } from "next/server";
import { handleStage2DecisionPost } from "@/server/stage2";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleStage2DecisionPost(request, id, "hod", "approve");
  } catch (err: unknown) {
    console.error("[POST /api/hod/events/[id]/approve] Error:", err);
    return NextResponse.json({ error: "Failed to approve event at Stage 2" }, { status: 500 });
  }
}
