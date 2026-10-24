import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = ForgotPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid email address";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email } = parsed.data;
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=/reset-password`;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo,
    });

    if (error) {
      // Check if rate-limited by Supabase Auth (status 429)
      if (
        error.status === 429 ||
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("too many requests")
      ) {
        return NextResponse.json(
          { error: "Too many password reset requests. Please wait a minute before trying again." },
          { status: 429 }
        );
      }
      // Log for observability while keeping client response generic to prevent email enumeration
      console.warn("resetPasswordForEmail note:", error.message);
    }

    // Always return generic success to protect user privacy and prevent enumeration attacks
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (err: unknown) {
    console.error("[POST /api/auth/reset-password/request] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
