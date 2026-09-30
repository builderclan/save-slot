import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

// GET /api/campuses
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const id = request.nextUrl.searchParams.get("id");
  const all = request.nextUrl.searchParams.get("all") === "true";

  try {
    if (all) {
      const { data: campuses, error } = await supabase
        .from("campuses")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ campuses });
    }

    let query = supabase.from("campuses").select("*");
    if (slug) {
      query = query.eq("slug", slug);
    } else if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("is_active", true).order("created_at", { ascending: true }).limit(1);
    }

    const { data: campus, error } = await query.single();
    if (error || !campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    const { data: allCampuses } = await supabase
      .from("campuses")
      .select("id, name, slug, domain, timezone")
      .eq("is_active", true)
      .order("name", { ascending: true });

    return NextResponse.json({ campus, campuses: allCampuses || [campus] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/campuses
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authContext = await getServerAuthContext();
  if (!authContext || !authContext.isCampusAdmin) {
    return NextResponse.json({ error: "Forbidden: Campus admin authorization required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const targetCampusId = body.id || authContext.campus.id;

    // Must be admin of this exact campus
    if (targetCampusId !== authContext.campus.id) {
      return NextResponse.json({ error: "Forbidden: Cannot update another campus" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.domain !== undefined) updates.domain = body.domain.trim();
    if (body.timezone !== undefined) updates.timezone = body.timezone.trim();
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data: updatedCampus, error } = await supabase
      .from("campuses")
      .update(updates)
      .eq("id", targetCampusId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campus: updatedCampus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
