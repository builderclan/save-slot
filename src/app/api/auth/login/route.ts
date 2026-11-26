import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthSessionForUser, getDefaultRedirectPath } from "@/server/auth";
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
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await clearAuthRateLimit(rateLimitKey);

    const session = await resolveAuthSessionForUser(authData.user.id, authData.user.email);
    if (!session) {
      return NextResponse.json(
        { error: "Account is inactive or not provisioned. Please contact Campus Admin." },
        { status: 403 }
      );
    }

    const redirectUrl = getDefaultRedirectPath(session);

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        email: session.email,
        fullName: session.profile.full_name,
        role: session.profile.role,
      },
      redirectUrl,
    });
  } catch (err: unknown) {
    console.error("[POST /api/auth/login] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
