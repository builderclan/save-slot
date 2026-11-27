import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import {
  formatSummaryCsv,
  getSummaryRegister,
  type SummaryRegisterFilters,
} from "@/server/reports";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const originParam = searchParams.get("originType");
    const scopeParam = searchParams.get("communityScope");

    const filters: SummaryRegisterFilters = {
      academicYear: searchParams.get("academicYear") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      originType:
        originParam === "community" || originParam === "department" || originParam === "college"
          ? originParam
          : undefined,
      communityScope:
        scopeParam === "internal" || scopeParam === "external" ? scopeParam : undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const result = await getSummaryRegister(filters, session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (searchParams.get("format") === "csv") {
      const csv = formatSummaryCsv(result.data.rows);
      const filename = `saveslot-register-${filters.academicYear || "all"}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    console.error("[GET /api/reports/summary] Error:", err);
    return NextResponse.json({ error: "Failed to load summary register" }, { status: 500 });
  }
}
