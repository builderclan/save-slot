import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";
import { slugify } from "@/lib/utils";

// GET /api/communities
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const campusSlug = request.nextUrl.searchParams.get("campusSlug");
  const allParam = request.nextUrl.searchParams.get("all");
  const statusParam = request.nextUrl.searchParams.get("status");

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
    const isCallerAdmin = authContext && authContext.isCampusAdmin && (!targetCampusId || authContext.campus.id === targetCampusId);
    const canSeeAll = isCallerAdmin && (allParam === "true" || Boolean(statusParam));

    let query = supabase.from("communities").select("*");
    if (targetCampusId) {
      query = query.eq("campus_id", targetCampusId);
    }

    if (canSeeAll) {
      if (statusParam && statusParam !== "All") {
        query = query.eq("status", statusParam);
      }
    } else {
      // Public reader: strictly approved only
      query = query.eq("status", "approved");
    }

    query = query.order("name", { ascending: true });

    const { data: rawCommunities, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sanitize sensitive applicant info from public responses if not admin
    const communities = (rawCommunities || []).map((comm) => {
      if (isCallerAdmin) return comm;
      // Strip private applicant information for public
      const {
        applicant_name: _aName,
        applicant_email: _aEmail,
        rejection_reason: _rReason,
        ...publicProps
      } = comm;
      void _aName; void _aEmail; void _rReason;
      return publicProps;
    });

    return NextResponse.json({ communities });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/communities (Handles public /join applications & authenticated creation)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authContext = await getServerAuthContext();

  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      website,
      instagram,
      logo_url,
      applicant_name,
      applicant_email,
      campus_id: requestedCampusId,
      campusSlug,
    } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Community name is required." }, { status: 400 });
    }
    if (!category || !category.trim()) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    // Determine applicant identity: prefer authContext if signed in, otherwise body
    const effectiveApplicantName = authContext?.profile.full_name || applicant_name?.trim();
    const effectiveApplicantEmail = authContext?.email || applicant_email?.trim();

    if (!effectiveApplicantName) {
      return NextResponse.json({ error: "Applicant name is required." }, { status: 400 });
    }
    if (!effectiveApplicantEmail || !effectiveApplicantEmail.includes("@")) {
      return NextResponse.json({ error: "Valid college email address is required." }, { status: 400 });
    }

    // 2. Resolve Campus ID
    let targetCampusId: string | null = null;
    if (authContext && !requestedCampusId && !campusSlug) {
      targetCampusId = authContext.campus.id;
    } else if (requestedCampusId) {
      targetCampusId = requestedCampusId;
    } else if (campusSlug) {
      const { data: campus } = await supabase
        .from("campuses")
        .select("id")
        .eq("slug", campusSlug)
        .single();
      targetCampusId = campus?.id || null;
    } else {
      // Default to first active campus
      const { data: defaultCampus } = await supabase
        .from("campuses")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      targetCampusId = defaultCampus?.id || null;
    }

    if (!targetCampusId) {
      return NextResponse.json({ error: "Campus is required." }, { status: 400 });
    }

    // 3. Generate unique slug within this campus
    const baseSlug = slugify(name);
    let finalSlug = baseSlug;

    const { data: existingSlugs } = await supabase
      .from("communities")
      .select("slug")
      .eq("campus_id", targetCampusId)
      .ilike("slug", `${baseSlug}%`);

    if (existingSlugs && existingSlugs.length > 0) {
      const slugs = existingSlugs.map((s) => s.slug);
      if (slugs.includes(baseSlug)) {
        finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // 4. Initial moderation state:
    // Only verified campus admin can directly create an approved community.
    // All other submissions (students, public applicants) start as 'pending'.
    const isCampusAdmin = authContext && authContext.isCampusAdmin && authContext.campus.id === targetCampusId;
    const initialStatus = isCampusAdmin ? "approved" : "pending";

    const newCommunityPayload = {
      campus_id: targetCampusId,
      name: name.trim(),
      slug: finalSlug,
      category: category.trim(),
      description: description.trim(),
      website: website ? website.trim() : null,
      instagram: instagram ? instagram.trim() : null,
      logo_url: logo_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
      status: initialStatus,
      applicant_name: effectiveApplicantName,
      applicant_email: effectiveApplicantEmail.toLowerCase(),
      created_by: authContext?.userId || null,
    };

    const { data: community, error: insertError } = await supabase
      .from("communities")
      .insert(newCommunityPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If already approved (by admin), associate creator as lead
    if (initialStatus === "approved" && authContext?.userId) {
      await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: authContext.userId,
        role: "lead",
        status: "active",
      });
    }

    return NextResponse.json({ community }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
