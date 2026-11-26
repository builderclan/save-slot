import { NextResponse } from "next/server";
import { handleStage2QueueGet } from "@/server/stage2";

export async function GET() {
  try {
    return await handleStage2QueueGet("hod");
  } catch (err: unknown) {
    console.error("[GET /api/hod/queue] Error:", err);
    return NextResponse.json({ error: "Failed to load HOD queue" }, { status: 500 });
  }
}
