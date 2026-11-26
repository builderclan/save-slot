import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { withDbRetry } from "@/lib/db";
import { users, communities, communityMembers, departments } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { formatUser } from "@/db/adapters";
import {
  UserProfile,
  Community,
  CommunityScope,
  EventCategory,
} from "@/types/database";

export interface HodDepartmentScope {
  id: string;
  name: string;
  code: string;
  isActing: boolean;
}

export interface AuthSession {
  userId: string;
  email: string;
  profile: UserProfile;
  leadCommunities: Community[];
  ticCommunities: Community[];
  hodDepartments: HodDepartmentScope[];
  isAdmin: boolean;
  isPrincipal: boolean;
  isVicePrincipal: boolean;
  isHod: boolean;
  isActingHod: boolean;
  isTic: boolean;
  isStaff: boolean;
  isLead: boolean;
}

/**
 * Resolves a user's profile and effective v1.0.0 governance roles from both
 * `users.role` and assignment tables (`departments`, `community_members`).
 */
export async function resolveAuthSessionForUser(
  userId: string,
  fallbackEmail?: string | null,
): Promise<AuthSession | null> {
  const [userProfiles, memberComms, deptRoles] = await withDbRetry((client) =>
    Promise.all([
      client
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          designation: users.designation,
          departmentId: users.departmentId,
          avatarUrl: users.avatarUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      client
        .select({
          memberRole: communityMembers.role,
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          code: communities.code,
          scope: communities.scope,
          category: communities.category,
          description: communities.description,
          logoUrl: communities.logoUrl,
        })
        .from(communityMembers)
        .innerJoin(
          communities,
          eq(communities.id, communityMembers.communityId),
        )
        .where(
          and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.status, "active"),
          ),
        ),
      client
        .select({
          id: departments.id,
          name: departments.name,
          code: departments.code,
          hodUserId: departments.hodUserId,
          actingHodUserId: departments.actingHodUserId,
          isActingHodActive: departments.isActingHodActive,
        })
        .from(departments)
        .where(
          and(
            eq(departments.isActive, true),
            or(
              eq(departments.hodUserId, userId),
              and(
                eq(departments.isActingHodActive, true),
                eq(departments.actingHodUserId, userId),
              ),
            ),
          ),
        ),
    ]),
  );

  if (!userProfiles || userProfiles.length === 0) {
    return null;
  }

  const row = userProfiles[0];
  if (row.isActive === false) {
    return null;
  }

  const profile = formatUser(row);

  const mapCommunity = (c: (typeof memberComms)[number]): Community => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    code:
      c.code ||
      c.slug
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10)
        .toUpperCase(),
    scope: (c.scope === "external" ? "external" : "internal") as CommunityScope,
    category: (c.category as EventCategory) || "Social",
    description: c.description || undefined,
    logo_url: c.logoUrl || undefined,
  });

  const leadCommunities: Community[] = (memberComms || [])
    .filter((c) => c.memberRole === "lead")
    .map(mapCommunity);

  const ticCommunities: Community[] = (memberComms || [])
    .filter((c) => c.memberRole === "tic")
    .map(mapCommunity);

  const hodDepartments: HodDepartmentScope[] = (deptRoles || []).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    isActing:
      d.hodUserId !== userId &&
      d.isActingHodActive &&
      d.actingHodUserId === userId,
  }));

  // Strict role boundary enforcement: Admin is IT/Ops only; P/VP are Executive only
  const isAdmin = profile.role === "admin";
  const isVicePrincipal = profile.role === "vice_principal";
  const isPrincipal =
    (profile.role === "principal" || isVicePrincipal) && !isAdmin;
  const isHod =
    !isAdmin &&
    !isPrincipal &&
    (profile.role === "hod" || hodDepartments.length > 0);
  const isActingHod =
    !isAdmin && !isPrincipal && hodDepartments.some((d) => d.isActing);
  const isTic =
    !isAdmin &&
    !isPrincipal &&
    (profile.role === "tic" || ticCommunities.length > 0);
  const isStaff =
    !isAdmin &&
    !isPrincipal &&
    (profile.role === "staff" || profile.role === "hod");
  const isLead =
    !isAdmin &&
    !isPrincipal &&
    (profile.role === "lead" || leadCommunities.length > 0);

  return {
    userId,
    email: fallbackEmail || profile.email,
    profile,
    leadCommunities,
    ticCommunities,
    hodDepartments,
    isAdmin,
    isPrincipal,
    isVicePrincipal,
    isHod,
    isActingHod,
    isTic,
    isStaff,
    isLead,
  };
}

export function getDefaultRedirectPath(session: AuthSession | null): string {
  if (!session) return "/";
  if (session.isPrincipal || session.isVicePrincipal) return "/principal";
  if (session.isAdmin) return "/admin";
  if (
    session.isHod ||
    session.isActingHod ||
    session.isTic ||
    session.isStaff ||
    session.isLead
  ) {
    return "/lead";
  }
  return "/";
}

export const getCurrentUser = cache(async (): Promise<AuthSession | null> => {
  try {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore
      .getAll()
      .some(
        (c) =>
          c.name.startsWith("sb-") &&
          (c.name.includes("-auth-token") || c.name.includes("token")),
      );

    // Fast path: Unauthenticated request skips remote Supabase Auth network call
    if (!hasAuthCookie) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return await resolveAuthSessionForUser(user.id, user.email);
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    return null;
  }
});
