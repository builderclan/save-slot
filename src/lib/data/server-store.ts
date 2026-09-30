import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Event, Community, Campus } from "@/types/database";
import { INITIAL_CAMPUS, INITIAL_COMMUNITIES, INITIAL_EVENTS } from "./mock-data";

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project")
  );
}

export const serverEventService = {
  async getCampus(slug?: string): Promise<Campus> {
    if (!isSupabaseConfigured()) {
      return INITIAL_CAMPUS;
    }
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error("Database connection unavailable");

    let query = supabase.from("campuses").select("*");
    if (slug) {
      query = query.eq("slug", slug);
    } else {
      query = query.eq("is_active", true).order("created_at", { ascending: true }).limit(1);
    }
    const { data, error } = await query.single();
    if (error || !data) throw new Error(error?.message || "Campus not found in database");
    return data;
  },

  async getCommunities(params?: { campusSlug?: string; all?: boolean }): Promise<Community[]> {
    if (!isSupabaseConfigured()) {
      return INITIAL_COMMUNITIES;
    }
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error("Database connection unavailable");

    let query = supabase.from("communities").select("*");

    if (params?.campusSlug) {
      const { data: campus } = await supabase
        .from("campuses")
        .select("id")
        .eq("slug", params.campusSlug)
        .single();
      if (campus) {
        query = query.eq("campus_id", campus.id);
      }
    }

    if (!params?.all) {
      query = query.eq("status", "approved");
    }
    const { data, error } = await query.order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getCommunityBySlug(slug: string): Promise<Community | null> {
    if (!isSupabaseConfigured()) {
      return INITIAL_COMMUNITIES.find((c) => c.slug === slug) || null;
    }
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error("Database connection unavailable");

    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return data;
  },

  async getEvents(params?: { status?: string; campusSlug?: string; communityId?: string }): Promise<Event[]> {
    if (!isSupabaseConfigured()) {
      let filtered = INITIAL_EVENTS;
      if (params?.status && params.status !== "All") {
        filtered = filtered.filter((e) => e.status === params.status);
      }
      if (params?.communityId && params.communityId !== "All") {
        filtered = filtered.filter((e) => e.community_id === params.communityId);
      }
      return filtered;
    }
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error("Database connection unavailable");

    let query = supabase
      .from("events")
      .select("*, community:communities(*), venue:venues(*)")
      .order("start_time", { ascending: true });

    if (params?.campusSlug) {
      const { data: campus } = await supabase
        .from("campuses")
        .select("id")
        .eq("slug", params.campusSlug)
        .single();
      if (campus) {
        query = query.eq("campus_id", campus.id);
      }
    }

    if (params?.status && params.status !== "All") {
      query = query.eq("status", params.status);
    }
    if (params?.communityId && params.communityId !== "All") {
      query = query.eq("community_id", params.communityId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as unknown as Event[]) || [];
  },

  async getEventBySlug(slug: string): Promise<Event | null> {
    if (!isSupabaseConfigured()) {
      return INITIAL_EVENTS.find((e) => e.slug === slug) || null;
    }
    const supabase = await createServerSupabaseClient();
    if (!supabase) throw new Error("Database connection unavailable");

    const { data, error } = await supabase
      .from("events")
      .select("*, community:communities(*), venue:venues(*)")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return data as unknown as Event;
  },
};
