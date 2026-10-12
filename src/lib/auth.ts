import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { withDbRetry } from "@/lib/db";
import { users, communities, communityMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { UserProfile, Community, UserRole, EventCategory } from "@/types/database";

export interface AuthSession {
  userId: string;
  email: string;
  profile: UserProfile;
  leadCommunities: Community[];
  isAdmin: boolean;
  isPrincipal: boolean;
  isVicePrincipal: boolean;
  isLead: boolean;
}

export const getCurrentUser = cache(async (): Promise<AuthSession | null> => {
  try {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore
      .getAll()
      .some(
        (c) =>
          c.name.startsWith("sb-") &&
          (c.name.includes("-auth-token") || c.name.includes("token"))
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

    // Run user profile and community memberships concurrently for lowest latency via Drizzle
    const [userProfiles, leadComms] = await withDbRetry((client) =>
      Promise.all([
        client
          .select({
            id: users.id,
            email: users.email,
            full_name: users.fullName,
            role: users.role,
            avatar_url: users.avatarUrl,
            campus_id: users.campusId,
            created_at: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1),
        client
          .select({
            id: communities.id,
            campus_id: communities.campusId,
            name: communities.name,
            slug: communities.slug,
            category: communities.category,
            description: communities.description,
            logo_url: communities.logoUrl,
          })
          .from(communities)
          .innerJoin(
            communityMembers,
            eq(communityMembers.communityId, communities.id)
          )
          .where(
            and(
              eq(communityMembers.userId, user.id),
              eq(communityMembers.role, "lead"),
              eq(communityMembers.status, "active")
            )
          ),
      ])
    );

    if (userProfiles.length === 0) {
      return null;
    }

    const row = userProfiles[0];
    const profile: UserProfile = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role as UserRole,
      avatar_url: row.avatar_url || undefined,
      campus_id: row.campus_id || undefined,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at || undefined),
    };

    const leadCommunities: Community[] = leadComms.map((c) => ({
      id: c.id,
      campus_id: c.campus_id,
      name: c.name,
      slug: c.slug,
      category: c.category as EventCategory,
      description: c.description || undefined,
      logo_url: c.logo_url || undefined,
    }));

    const isAdmin = profile.role === "admin";
    const isVicePrincipal = profile.role === "vice_principal";
    const isPrincipal = (profile.role === "principal" || isVicePrincipal) && !isAdmin;
    const isLead = !isAdmin && !isPrincipal && (profile.role === "organizer" || leadCommunities.length > 0);

    return {
      userId: user.id,
      email: user.email || profile.email,
      profile,
      leadCommunities,
      isAdmin,
      isPrincipal,
      isVicePrincipal,
      isLead,
    };
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    return null;
  }
});
