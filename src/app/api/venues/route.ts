import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

// GET /api/venues
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const campusSlug = request.nextUrl.searchParams.get("campusSlug");
  const allParam = request.nextUrl.searchParams.get("all");

  try {
    let targetCampusId: string | null = null;
    if (campusSlug) {
      const { data: campus } = await supabase
        .from("campuses")
        .select("id")
        .eq("slug", campusSlug)
        .single();
      targetCampusId = campus?.id || null;
    } else {
      const { data: defaultCampus } = await supabase
        .from("campuses")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      targetCampusId = defaultCampus?.id || null;
    }

    const authContext = await getServerAuthContext();
    const canSeeAll = authContext && authContext.isCampusAdmin && allParam === "true";

    let query = supabase.from("venues").select("*");
    if (targetCampusId) {
      query = query.eq("campus_id", targetCampusId);
    }
    if (!canSeeAll) {
      query = query.eq("is_active", true);
    }

    query = query.order("name", { ascending: true });

    const { data: venues, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venues: venues || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/venues
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authContext = await getServerAuthContext();
  if (!authContext || !authContext.isCampusAdmin) {
    return NextResponse.json({ error: "Forbidden: Campus admin required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, building, capacity, address, notes, is_active } = body;

    if (!name || !building) {
      return NextResponse.json(
        { error: "Name and building are required" },
        { status: 400 }
      );
    }

    const { data: newVenue, error } = await supabase
      .from("venues")
      .insert({
        campus_id: authContext.campus.id, // Derived strictly from verified admin campus
        name: name.trim(),
        building: building.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venue: newVenue }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
