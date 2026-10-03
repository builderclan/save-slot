import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.profile.full_name,
      role: session.profile.role,
      isAdmin: session.isAdmin,
      isPrincipal: session.isPrincipal,
      isLead: session.isLead,
      leadCommunities: session.leadCommunities,
    },
  });
}
