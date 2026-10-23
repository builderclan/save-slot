import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/reset-password";
  // Prevent open redirect attacks by ensuring next is an internal relative route
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/reset-password";
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
      const requestHost = new URL(request.url).host;
      const trustedSiteHost = process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
        : null;

      const isTrustedForwardedHost =
        forwardedHost &&
        (forwardedHost === requestHost || (trustedSiteHost && forwardedHost === trustedSiteHost));

      if (isTrustedForwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange failed, redirect to reset-password with invalid token query
  return NextResponse.redirect(`${origin}/reset-password?error=invalid_token`);
}
