import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/reset-password";
  const errorDescription = searchParams.get("error_description");
  const error = searchParams.get("error");

  // Handle explicit error sent from Supabase redirect
  if (error || errorDescription) {
    const reason = encodeURIComponent(errorDescription || error || "invalid_token");
    return NextResponse.redirect(`${origin}/reset-password?error=${reason}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // If no code or exchange failed, redirect to reset-password with invalid token query
  return NextResponse.redirect(`${origin}/reset-password?error=invalid_token`);
}
