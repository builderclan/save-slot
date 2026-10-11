import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = ResetPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid password";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { password } = parsed.data;

    const supabase = await createClient();
    // Verify that the user has an active authenticated session (provided by the recovery token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Password reset session has expired or is invalid. Please request a new link." },
        { status: 401 }
      );
    }

    // Update the user's password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update password." },
        { status: 400 }
      );
    }

    // Invalidate the recovery session so the user must sign in cleanly with their new credentials
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Password successfully updated.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
