import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, redirectUrl: "/" });
  } catch (err: unknown) {
    console.error("[POST /api/auth/logout] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
