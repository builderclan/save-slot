import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Community } from "@/types/database";

export async function GET() {
  try {
    const res = await query<Community>(
      "SELECT id, campus_id, name, slug, category, description, logo_url FROM public.communities ORDER BY name ASC;"
    );
    return NextResponse.json({ communities: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load communities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
