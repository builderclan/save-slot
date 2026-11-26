import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.profile.full_name,
      role: session.profile.role,
      designation: session.profile.designation ?? null,
      departmentId: session.profile.department_id ?? null,
      avatarUrl: session.profile.avatar_url ?? null,
      isAdmin: session.isAdmin,
      isPrincipal: session.isPrincipal,
      isVicePrincipal: session.isVicePrincipal,
      isHod: session.isHod,
      isActingHod: session.isActingHod,
      isFic: session.isFic,
      isStaff: session.isStaff,
      isLead: session.isLead,
      leadCommunities: session.leadCommunities,
      ficCommunities: session.ficCommunities,
      hodDepartments: session.hodDepartments,
    },
  });
}
