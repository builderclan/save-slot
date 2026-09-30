import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserProfile, Campus, CommunityMember } from "@/types/database";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  profile: UserProfile;
  campus: Campus;
  memberships: CommunityMember[];
  isCampusAdmin: boolean;
  leadCommunityIds: string[];
}

export async function getServerAuthContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Load user profile from public.users
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Load campus
  const { data: campus, error: campusError } = await supabase
    .from("campuses")
    .select("*")
    .eq("id", profile.campus_id)
    .single();

  if (campusError || !campus) {
    return null;
  }

  // Load community memberships
  const { data: memberships } = await supabase
    .from("community_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  const memberList: CommunityMember[] = memberships || [];
  const isCampusAdmin = profile.role === "admin";
  const leadCommunityIds = memberList
    .filter((m) => m.role === "lead")
    .map((m) => m.community_id);

  return {
    userId: user.id,
    email: user.email || profile.email,
    profile,
    campus,
    memberships: memberList,
    isCampusAdmin,
    leadCommunityIds,
  };
}
