import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withDbRetry } from "@/lib/db";
import { users, communityMembers } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { formatUser } from "@/db/adapters";
import { getPrimaryCampusId } from "@/lib/campus";
import { LoginSchema } from "@/lib/validations";
import {
  getClientRateLimitKey,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  clearAuthRateLimit,
  clearRateLimitMemoryCacheForTesting,
} from "@/lib/rate-limit";

export { clearRateLimitMemoryCacheForTesting as clearLoginAttemptsForTesting };

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid login credentials";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const rateLimitKey = getClientRateLimitKey(request, normalizedEmail);

    // 1. Check if user/IP is currently in cooldown period (SEC-11 Brute-Force & DoS defense)
    const rateLimit = await checkAuthRateLimit(rateLimitKey);
    if (rateLimit.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${rateLimit.remainingMinutes} minute${
            rateLimit.remainingMinutes === 1 ? "" : "s"
          } before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.remainingSeconds),
          },
        }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      await recordFailedAuthAttempt(rateLimitKey);

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Clear failed attempt history upon successful authentication
    await clearAuthRateLimit(rateLimitKey);

    // Fetch user profile from public.users via Drizzle
    const userRows = await withDbRetry((client) =>
      client
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          campusId: users.campusId,
        })
        .from(users)
        .where(eq(users.id, authData.user.id))
        .limit(1)
    );

    const profile = userRows[0] ? formatUser(userRows[0]) : null;

    // Self-heal: ensure user is bound to the primary campus (AISAT) upon login
    if (profile && !profile.campus_id) {
      try {
        const primaryCampusId = await getPrimaryCampusId();
        if (primaryCampusId) {
          await withDbRetry((client) =>
            client
              .update(users)
              .set({ campusId: primaryCampusId })
              .where(and(eq(users.id, profile.id), isNull(users.campusId)))
          );
        }
      } catch (healErr) {
        console.error("[login] Campus self-heal non-blocking error:", healErr);
      }
    }

    let role = profile?.role || "student";

    // If not flagged as admin/principal/vice_principal/organizer directly, check community_members
    if (
      role !== "admin" &&
      role !== "principal" &&
      role !== "vice_principal" &&
      role !== "organizer"
    ) {
      const commCheck = await withDbRetry((client) =>
        client
          .select({ one: sql`1` })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.userId, authData.user.id),
              eq(communityMembers.role, "lead"),
              eq(communityMembers.status, "active")
            )
          )
          .limit(1)
      );

      if (commCheck.length > 0) {
        role = "organizer";
      }
    }

    const redirectUrl =
      role === "principal" || role === "vice_principal"
        ? "/principal"
        : role === "admin"
        ? "/admin"
        : role === "organizer"
        ? "/lead"
        : "/";

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile?.full_name,
        role,
      },
      redirectUrl,
    });
  } catch (err: unknown) {
    console.error("[POST /api/auth/login] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
