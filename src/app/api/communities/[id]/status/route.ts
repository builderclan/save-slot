import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/communities/[id]/status
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // 1. Authenticate caller strictly
  const authContext = await getServerAuthContext();
  if (!authContext) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, reason } = body;

    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved', 'rejected', or 'pending'." },
        { status: 400 }
      );
    }

    // 2. Fetch community to verify campus ownership
    const { data: community, error: fetchErr } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // 3. Authorize: Caller must be campus admin for this community's campus
    if (!authContext.isCampusAdmin || authContext.campus.id !== community.campus_id) {
      return NextResponse.json(
        { error: "Forbidden: Only campus administrators can moderate community requests." },
        { status: 403 }
      );
    }

    // 4. Perform database RPC or status update
    if (status === "approved") {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("approve_community", {
        p_community_id: community.id,
        p_admin_id: authContext.userId,
      });

      if (rpcErr) {
        // Fallback to direct update if RPC fails
        await supabase
          .from("communities")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: authContext.userId,
            rejection_reason: null,
          })
          .eq("id", community.id);

        // Associate user if exists
        const applicantEmail = community.applicant_email;
        if (applicantEmail) {
          const { data: userRecord } = await supabase
            .from("users")
            .select("id, role")
            .eq("email", applicantEmail)
            .single();

          if (userRecord) {
            await supabase.from("community_members").upsert({
              community_id: community.id,
              user_id: userRecord.id,
              role: "lead",
              status: "active",
            });

            if (userRecord.role === "student") {
              await supabase
                .from("users")
                .update({ role: "organizer" })
                .eq("id", userRecord.id);
            }
          }
        }
      } else if (!rpcResult?.success) {
        return NextResponse.json({ error: rpcResult?.error || "Approval failed" }, { status: 400 });
      }
    } else if (status === "rejected") {
      const { error: rejectErr } = await supabase
        .from("communities")
        .update({
          status: "rejected",
          rejection_reason: reason?.trim() || "Rejected by campus administration",
          reviewed_at: new Date().toISOString(),
          reviewed_by: authContext.userId,
        })
        .eq("id", community.id);

      if (rejectErr) {
        return NextResponse.json({ error: rejectErr.message }, { status: 500 });
      }
    }

    // 5. Fetch updated community
    const { data: updatedCommunity } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ community: updatedCommunity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
