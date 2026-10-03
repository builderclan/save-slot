import { createClient } from "@/lib/supabase/server";
import { query } from "@/lib/db";
import { UserProfile, Community } from "@/types/database";

export interface AuthSession {
  userId: string;
  email: string;
  profile: UserProfile;
  leadCommunities: Community[];
  isAdmin: boolean;
  isPrincipal: boolean;
  isLead: boolean;
}

export async function getCurrentUser(): Promise<AuthSession | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Query user profile from public.users via direct pool for maximum speed
    const profileRes = await query<UserProfile>(
      "SELECT id, email, full_name, role, avatar_url, campus_id FROM public.users WHERE id = $1;",
      [user.id]
    );

    if (profileRes.rows.length === 0) {
      return null;
    }

    const profile = profileRes.rows[0];

    // Query community memberships if lead
    const commsRes = await query<Community>(
      `SELECT c.id, c.name, c.slug, c.category, c.description, c.logo_url
       FROM public.communities c
       JOIN public.community_members cm ON cm.community_id = c.id
       WHERE cm.user_id = $1 AND cm.role = 'lead' AND cm.status = 'active';`,
      [user.id]
    );

    const isAdmin = profile.role === "admin";
    const isPrincipal = profile.role === "principal";
    const isLead = profile.role === "organizer" || commsRes.rows.length > 0;

    return {
      userId: user.id,
      email: user.email || profile.email,
      profile,
      leadCommunities: commsRes.rows,
      isAdmin,
      isPrincipal,
      isLead,
    };
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    return null;
  }
}
