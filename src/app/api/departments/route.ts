import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { departments } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await withDbRetry((client) =>
      client
        .select({
          id: departments.id,
          name: departments.name,
          code: departments.code,
          isActive: departments.isActive,
        })
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(asc(departments.name))
    );

    const formatted = rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      is_active: row.isActive,
    }));

    return NextResponse.json(
      { departments: formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[GET /api/departments] Error:", err);
    return NextResponse.json(
      { error: "Failed to load active departments" },
      { status: 500 }
    );
  }
}
