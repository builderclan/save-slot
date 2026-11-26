import { NextResponse } from "next/server";
import { handleStage2DecisionPost } from "@/server/stage2";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await handleStage2DecisionPost(request, id, "fic", "reject");
  } catch (err: unknown) {
    console.error("[POST /api/fic/events/[id]/reject] Error:", err);
    return NextResponse.json({ error: "Failed to reject event at Stage 2" }, { status: 500 });
  }
}
