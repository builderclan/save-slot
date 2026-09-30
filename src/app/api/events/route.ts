import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";
import { slugify } from "@/lib/utils";
import { ConflictReport } from "@/types/database";

// GET /api/events
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  const campusSlug = searchParams.get("campusSlug");
  const category = searchParams.get("category");
  const communityId = searchParams.get("communityId");
  const venueId = searchParams.get("venueId");
  const searchQuery = searchParams.get("searchQuery");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const statusParam = searchParams.get("status") || "published";

  try {
    // 1. Resolve campus from route / query
    let targetCampusId: string | null = null;
    if (campusSlug) {
      const { data: campusData, error: cErr } = await supabase
        .from("campuses")
        .select("id")
        .eq("slug", campusSlug)
        .single();
      if (cErr || !campusData) {
        return NextResponse.json({ error: `Campus not found for slug: ${campusSlug}` }, { status: 404 });
      }
      targetCampusId = campusData.id;
    } else {
      // Default to primary campus (Apex Institute)
      const { data: defaultCampus } = await supabase
        .from("campuses")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (defaultCampus) {
        targetCampusId = defaultCampus.id;
      }
    }

    // 2. Determine allowed status based on session context
    const authContext = await getServerAuthContext();
    let effectiveStatus = "published";

    if (statusParam !== "published" && authContext) {
      // If user is campus admin for this campus or lead of a community
      if (authContext.isCampusAdmin && (!targetCampusId || authContext.campus.id === targetCampusId)) {
        effectiveStatus = statusParam; // Admin can view All, pending, draft, etc.
      } else if (communityId && authContext.leadCommunityIds.includes(communityId)) {
        effectiveStatus = statusParam; // Organizer can view their own community's drafts/pending
      }
    }

    // 3. Build query
    let query = supabase
      .from("events")
      .select("*, community:communities(*), venue:venues(*)");

    if (targetCampusId) {
      query = query.eq("campus_id", targetCampusId);
    }

    if (effectiveStatus !== "All") {
      query = query.eq("status", effectiveStatus);
    }

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (communityId && communityId !== "All") {
      query = query.eq("community_id", communityId);
    }

    if (venueId && venueId !== "All") {
      query = query.eq("venue_id", venueId);
    }

    if (startDate) {
      query = query.gte("end_time", startDate);
    }

    if (endDate) {
      query = query.lte("start_time", endDate);
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.trim();
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location_name.ilike.%${q}%`);
    }

    query = query.order("start_time", { ascending: true });

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/events
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // 1. Authenticate user strictly
  const authContext = await getServerAuthContext();
  if (!authContext) {
    return NextResponse.json(
      { error: "Authentication required to create events." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      community_id,
      venue_id,
      title,
      description,
      category,
      tags,
      start_time,
      end_time,
      timezone,
      is_virtual,
      virtual_link,
      external_registration_url,
      cover_image_url,
      status: requestedStatus,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 });
    }
    if (!start_time || !end_time) {
      return NextResponse.json({ error: "Start and end times are required." }, { status: 400 });
    }
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    }
    if (!community_id) {
      return NextResponse.json({ error: "Community ID is required." }, { status: 400 });
    }

    // 2. Authorization guard: User must lead this community OR be campus admin
    const isAuthorizedLead = authContext.leadCommunityIds.includes(community_id);
    const isCampusAdmin = authContext.isCampusAdmin;

    if (!isAuthorizedLead && !isCampusAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to create events for this community." },
        { status: 403 }
      );
    }

    // 3. Verify community belongs to user's authorized campus
    const { data: community, error: commError } = await supabase
      .from("communities")
      .select("id, name, campus_id")
      .eq("id", community_id)
      .single();

    if (commError || !community) {
      return NextResponse.json({ error: "Community not found." }, { status: 404 });
    }

    if (community.campus_id !== authContext.campus.id) {
      return NextResponse.json(
        { error: "Cross-campus violation: Community does not belong to your authorized campus." },
        { status: 403 }
      );
    }

    // 4. Derive campus_id directly from the authorized campus
    const verifiedCampusId = authContext.campus.id;

    // 5. Verify physical venue belongs to this campus
    let locationName = is_virtual ? "Virtual Event" : "Campus Location";
    if (!is_virtual && venue_id) {
      const { data: venue, error: vError } = await supabase
        .from("venues")
        .select("id, name, building, campus_id")
        .eq("id", venue_id)
        .single();

      if (vError || !venue) {
        return NextResponse.json({ error: "Venue not found." }, { status: 404 });
      }

      if (venue.campus_id !== verifiedCampusId) {
        return NextResponse.json(
          { error: "Venue does not belong to this campus." },
          { status: 403 }
        );
      }
      locationName = `${venue.name} (${venue.building})`;
    }

    // 6. Real-time Conflict Detection via database RPCs
    let hasVenueConflict = false;
    let venueConflicts: ConflictReport["venueConflicts"] = [];

    if (!is_virtual && venue_id) {
      const { data: vConf } = await supabase.rpc("check_venue_conflict", {
        p_venue_id: venue_id,
        p_start_time: start_time,
        p_end_time: end_time,
      });

      if (vConf && vConf.length > 0) {
        hasVenueConflict = true;
        venueConflicts = vConf.map((c: { conflict_event_id: string; conflict_title: string; conflict_start: string; conflict_end: string; conflict_venue_name: string }) => ({
          type: "venue",
          venueId: venue_id,
          venueName: c.conflict_venue_name || "Selected Venue",
          conflictingEvent: {
            id: c.conflict_event_id,
            title: c.conflict_title,
            start_time: c.conflict_start,
            end_time: c.conflict_end,
          } as unknown as ConflictReport["venueConflicts"][0]["conflictingEvent"],
          message: `Warning: "${c.conflict_title}" is already scheduled in this venue during this timeframe.`,
        }));
      }
    }

    // Check campus-wide schedule overlaps
    const { data: sOver } = await supabase.rpc("check_campus_schedule_overlaps", {
      p_campus_id: verifiedCampusId,
      p_start_time: start_time,
      p_end_time: end_time,
    });

    const scheduleOverlaps: ConflictReport["scheduleOverlaps"] = (sOver || []).map((o: { overlap_event_id: string; overlap_title: string; overlap_start: string; overlap_end: string; overlap_community_name: string }) => ({
      type: "schedule",
      conflictingEvent: {
        id: o.overlap_event_id,
        title: o.overlap_title,
        start_time: o.overlap_start,
        end_time: o.overlap_end,
      } as unknown as ConflictReport["scheduleOverlaps"][0]["conflictingEvent"],
      message: `Informational: Overlaps with "${o.overlap_title}" by ${o.overlap_community_name}.`,
    }));

    const conflictReport: ConflictReport = {
      hasVenueConflict,
      hasScheduleOverlap: scheduleOverlaps.length > 0,
      venueConflicts,
      scheduleOverlaps,
    };

    // 7. Status transition rules
    let finalStatus = requestedStatus || "draft";
    if (!["draft", "pending", "published"].includes(finalStatus)) {
      finalStatus = "draft";
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

    // 8. Insert into PostgreSQL with RLS enforcement
    const newEventPayload = {
      campus_id: verifiedCampusId,
      community_id,
      venue_id: is_virtual ? null : venue_id || null,
      title: title.trim(),
      slug,
      description: description ? description.trim() : "",
      category: category || "Tech",
      tags: Array.isArray(tags) ? tags : [category || "Tech"],
      start_time,
      end_time,
      timezone: timezone || authContext.campus.timezone || "America/New_York",
      location_name: locationName,
      is_virtual: Boolean(is_virtual),
      virtual_link: is_virtual && virtual_link ? virtual_link.trim() : null,
      external_registration_url:
        external_registration_url && external_registration_url.trim()
          ? external_registration_url.trim()
          : null,
      cover_image_url: cover_image_url ? cover_image_url.trim() : null,
      status: finalStatus,
      created_by: authContext.userId,
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from("events")
      .insert(newEventPayload)
      .select("*, community:communities(*), venue:venues(*)")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      { event: insertedEvent, conflicts: conflictReport },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
