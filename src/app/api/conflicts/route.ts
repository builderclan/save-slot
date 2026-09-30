import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ConflictReport } from "@/types/database";

// POST /api/conflicts
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { campusId, venueId, startTime, endTime, eventId } = body;

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 }
      );
    }

    let targetCampusId = campusId;
    if (!targetCampusId) {
      const { data: defaultCampus } = await supabase
        .from("campuses")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      targetCampusId = defaultCampus?.id;
    }

    let hasVenueConflict = false;
    let venueConflicts: ConflictReport["venueConflicts"] = [];

    // 1. Check physical venue collision
    if (venueId) {
      const { data: vConf, error: vErr } = await supabase.rpc("check_venue_conflict", {
        p_venue_id: venueId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_event_id: eventId || null,
      });

      if (!vErr && vConf && vConf.length > 0) {
        hasVenueConflict = true;
        venueConflicts = vConf.map(
          (c: {
            conflict_event_id: string;
            conflict_title: string;
            conflict_start: string;
            conflict_end: string;
            conflict_venue_name: string;
          }) => ({
            type: "venue",
            venueId,
            venueName: c.conflict_venue_name || "Selected Venue",
            conflictingEvent: {
              id: c.conflict_event_id,
              title: c.conflict_title,
              start_time: c.conflict_start,
              end_time: c.conflict_end,
            } as unknown as ConflictReport["venueConflicts"][0]["conflictingEvent"],
            message: `Warning: "${c.conflict_title}" is already scheduled in this venue during this timeframe.`,
          })
        );
      }
    }

    // 2. Check campus-wide schedule overlaps
    let scheduleOverlaps: ConflictReport["scheduleOverlaps"] = [];
    if (targetCampusId) {
      const { data: sOver, error: sErr } = await supabase.rpc("check_campus_schedule_overlaps", {
        p_campus_id: targetCampusId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_event_id: eventId || null,
      });

      if (!sErr && sOver && sOver.length > 0) {
        scheduleOverlaps = sOver.map(
          (o: {
            overlap_event_id: string;
            overlap_title: string;
            overlap_start: string;
            overlap_end: string;
            overlap_community_name: string;
          }) => ({
            type: "schedule",
            conflictingEvent: {
              id: o.overlap_event_id,
              title: o.overlap_title,
              start_time: o.overlap_start,
              end_time: o.overlap_end,
            } as unknown as ConflictReport["scheduleOverlaps"][0]["conflictingEvent"],
            message: `Informational: Overlaps with "${o.overlap_title}" by ${o.overlap_community_name}.`,
          })
        );
      }
    }

    const report: ConflictReport = {
      hasVenueConflict,
      hasScheduleOverlap: scheduleOverlaps.length > 0,
      venueConflicts,
      scheduleOverlaps,
    };

    return NextResponse.json({ conflicts: report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
