import { NextResponse } from "next/server";
import { handleStage2QueueGet } from "@/server/stage2";

export async function GET() {
  try {
    return await handleStage2QueueGet("fic");
  } catch (err: unknown) {
    console.error("[GET /api/fic/queue] Error:", err);
    return NextResponse.json({ error: "Failed to load FIC queue" }, { status: 500 });
  }
}
