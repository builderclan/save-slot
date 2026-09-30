import { Event, Community, Venue, Campus, EventStatus, EventCategory, ConflictReport } from "@/types/database";
import { INITIAL_CAMPUS, INITIAL_COMMUNITIES, INITIAL_VENUES, INITIAL_EVENTS } from "./mock-data";
import { detectConflicts } from "../conflicts";

export interface EventFilterParams {
  campusSlug?: string;
  campusId?: string;
  category?: EventCategory | "All";
  communityId?: string | "All";
  venueId?: string | "All";
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  status?: EventStatus | "All";
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && !url.includes("placeholder"));
}

// ---------------------------------------------------------------------------
// 1. IN-MEMORY MOCK SERVICE (Fallback for offline / local demo mode)
// ---------------------------------------------------------------------------
const campusState: Campus = { ...INITIAL_CAMPUS };
let communitiesState: Community[] = [...INITIAL_COMMUNITIES];
let venuesState: Venue[] = [...INITIAL_VENUES];
let eventsState: Event[] = [...INITIAL_EVENTS];

function hydrateMockEvent(event: Event): Event {
  const community = communitiesState.find((c) => c.id === event.community_id);
  const venue = event.venue_id ? venuesState.find((v) => v.id === event.venue_id) : undefined;
  return {
    ...event,
    community,
    venue,
  };
}

const mockService = {
  async getCampus(slug?: string): Promise<Campus> {
    void slug;
    return { ...campusState };
  },

  async updateCampus(updates: Partial<Campus>): Promise<Campus> {
    Object.assign(campusState, updates);
    return { ...campusState };
  },

  async getCommunities(params?: { campusSlug?: string; all?: boolean; status?: "pending" | "approved" | "rejected" }): Promise<Community[]> {
    let list = [...communitiesState];
    if (params?.status) {
      list = list.filter((c) => c.status === params.status);
    } else if (!params?.all) {
      list = list.filter((c) => c.status === "approved");
    }
    return list;
  },

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    return communitiesState.find((c) => c.slug === slug);
  },

  async createCommunity(commData: Omit<Community, "id" | "created_at">): Promise<Community> {
    const newComm: Community = {
      ...commData,
      id: `comm-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    communitiesState = [...communitiesState, newComm];
    return newComm;
  },

  async updateCommunity(id: string, updates: Partial<Community>): Promise<Community> {
    const idx = communitiesState.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Community not found");
    communitiesState[idx] = { ...communitiesState[idx], ...updates };
    return communitiesState[idx];
  },

  async updateCommunityStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    reason?: string
  ): Promise<Community> {
    return this.updateCommunity(id, {
      status,
      rejection_reason: status === "rejected" ? reason || "Rejected by administration" : undefined,
    });
  },

  async getVenues(params?: { campusSlug?: string }): Promise<Venue[]> {
    void params;
    return venuesState.filter((v) => v.is_active);
  },

  async getAllVenues(params?: { campusSlug?: string }): Promise<Venue[]> {
    void params;
    return [...venuesState];
  },

  async getVenueById(id: string): Promise<Venue | undefined> {
    return venuesState.find((v) => v.id === id);
  },

  async createVenue(venueData: Omit<Venue, "id">): Promise<Venue> {
    const newVenue: Venue = {
      ...venueData,
      id: `venue-${Date.now()}`,
    };
    venuesState = [...venuesState, newVenue];
    return newVenue;
  },

  async updateVenue(id: string, updates: Partial<Venue>): Promise<Venue> {
    const idx = venuesState.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error("Venue not found");
    venuesState[idx] = { ...venuesState[idx], ...updates };
    return venuesState[idx];
  },

  async getEvents(filters?: EventFilterParams): Promise<Event[]> {
    let list = eventsState.map(hydrateMockEvent);

    if (!filters) {
      return list.filter((e) => e.status === "published");
    }

    if (filters.status && filters.status !== "All") {
      list = list.filter((e) => e.status === filters.status);
    } else if (!filters.status) {
      list = list.filter((e) => e.status === "published");
    }

    if (filters.category && filters.category !== "All") {
      list = list.filter((e) => e.category === filters.category);
    }

    if (filters.communityId && filters.communityId !== "All") {
      list = list.filter((e) => e.community_id === filters.communityId);
    }

    if (filters.venueId && filters.venueId !== "All") {
      list = list.filter((e) => e.venue_id === filters.venueId);
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== "") {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location_name.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.community?.name.toLowerCase().includes(q)
      );
    }

    if (filters.startDate) {
      list = list.filter((e) => e.end_time >= filters.startDate!);
    }

    if (filters.endDate) {
      list = list.filter((e) => e.start_time <= filters.endDate!);
    }

    return list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  },

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const evt = eventsState.find((e) => e.slug === slug);
    return evt ? hydrateMockEvent(evt) : undefined;
  },

  async getEventById(id: string): Promise<Event | undefined> {
    const evt = eventsState.find((e) => e.id === id);
    return evt ? hydrateMockEvent(evt) : undefined;
  },

  async checkConflicts(params: {
    campusId?: string;
    eventId?: string;
    venueId?: string | null;
    startTime: string;
    endTime: string;
  }): Promise<ConflictReport> {
    return detectConflicts({
      eventId: params.eventId,
      venueId: params.venueId,
      startTime: params.startTime,
      endTime: params.endTime,
      existingEvents: eventsState.map(hydrateMockEvent),
      venues: venuesState,
    });
  },

  async createEvent(eventData: Omit<Event, "id" | "created_at" | "updated_at">): Promise<{
    event: Event;
    conflicts: ConflictReport;
  }> {
    const conflicts = await this.checkConflicts({
      venueId: eventData.venue_id,
      startTime: eventData.start_time,
      endTime: eventData.end_time,
    });

    const now = new Date().toISOString();
    const newEvent: Event = {
      ...eventData,
      external_registration_url: eventData.external_registration_url?.trim() || null,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now,
    };

    eventsState = [newEvent, ...eventsState];
    return { event: hydrateMockEvent(newEvent), conflicts };
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const index = eventsState.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Event not found");

    const updated: Event = {
      ...eventsState[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    eventsState[index] = updated;
    return hydrateMockEvent(updated);
  },

  async updateEventStatus(
    id: string,
    status: EventStatus,
    reason?: { rejection_reason?: string; cancellation_reason?: string }
  ): Promise<Event> {
    return this.updateEvent(id, {
      status,
      rejection_reason: reason?.rejection_reason ?? null,
      cancellation_reason: reason?.cancellation_reason ?? null,
    });
  },
};

// ---------------------------------------------------------------------------
// 2. SUPABASE PRODUCTION SERVICE (Real PostgreSQL persistence via API layer)
// ---------------------------------------------------------------------------
const supabaseService = {
  async getCampus(slug?: string): Promise<Campus> {
    const query = slug ? `?slug=${encodeURIComponent(slug)}` : "";
    const res = await fetch(`/api/campuses${query}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch campus" }));
      throw new Error(err.error || `Failed to fetch campus: ${res.statusText}`);
    }
    const data = await res.json();
    return data.campus;
  },

  async updateCampus(updates: Partial<Campus>): Promise<Campus> {
    const res = await fetch("/api/campuses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update campus" }));
      throw new Error(err.error || `Failed to update campus: ${res.statusText}`);
    }
    const data = await res.json();
    return data.campus;
  },

  async getCommunities(params?: { campusSlug?: string; all?: boolean; status?: "pending" | "approved" | "rejected" }): Promise<Community[]> {
    const search = new URLSearchParams();
    if (params?.campusSlug) search.set("campusSlug", params.campusSlug);
    if (params?.all) search.set("all", "true");
    if (params?.status) search.set("status", params.status);

    const res = await fetch(`/api/communities?${search.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch communities" }));
      throw new Error(err.error || `Failed to fetch communities: ${res.statusText}`);
    }
    const data = await res.json();
    return data.communities;
  },

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    const res = await fetch(`/api/communities/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.status === 404) return undefined;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch community" }));
      throw new Error(err.error || `Failed to fetch community: ${res.statusText}`);
    }
    const data = await res.json();
    return data.community;
  },

  async createCommunity(commData: Omit<Community, "id" | "created_at">): Promise<Community> {
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create community" }));
      throw new Error(err.error || `Failed to create community: ${res.statusText}`);
    }
    const data = await res.json();
    return data.community;
  },

  async updateCommunity(id: string, updates: Partial<Community>): Promise<Community> {
    const res = await fetch(`/api/communities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update community" }));
      throw new Error(err.error || `Failed to update community: ${res.statusText}`);
    }
    const data = await res.json();
    return data.community;
  },

  async updateCommunityStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    reason?: string
  ): Promise<Community> {
    const res = await fetch(`/api/communities/${encodeURIComponent(id)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update community status" }));
      throw new Error(err.error || `Failed to update community status: ${res.statusText}`);
    }
    const data = await res.json();
    return data.community;
  },

  async getVenues(params?: { campusSlug?: string }): Promise<Venue[]> {
    const search = new URLSearchParams();
    if (params?.campusSlug) search.set("campusSlug", params.campusSlug);

    const res = await fetch(`/api/venues?${search.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch venues" }));
      throw new Error(err.error || `Failed to fetch venues: ${res.statusText}`);
    }
    const data = await res.json();
    return data.venues;
  },

  async getAllVenues(params?: { campusSlug?: string }): Promise<Venue[]> {
    const search = new URLSearchParams();
    if (params?.campusSlug) search.set("campusSlug", params.campusSlug);
    search.set("all", "true");

    const res = await fetch(`/api/venues?${search.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch all venues" }));
      throw new Error(err.error || `Failed to fetch all venues: ${res.statusText}`);
    }
    const data = await res.json();
    return data.venues;
  },

  async getVenueById(id: string): Promise<Venue | undefined> {
    const venues = await this.getAllVenues();
    return venues.find((v) => v.id === id);
  },

  async createVenue(venueData: Omit<Venue, "id">): Promise<Venue> {
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venueData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create venue" }));
      throw new Error(err.error || `Failed to create venue: ${res.statusText}`);
    }
    const data = await res.json();
    return data.venue;
  },

  async updateVenue(id: string, updates: Partial<Venue>): Promise<Venue> {
    const res = await fetch(`/api/venues/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update venue" }));
      throw new Error(err.error || `Failed to update venue: ${res.statusText}`);
    }
    const data = await res.json();
    return data.venue;
  },

  async getEvents(filters?: EventFilterParams): Promise<Event[]> {
    const search = new URLSearchParams();
    if (filters?.campusSlug) search.set("campusSlug", filters.campusSlug);
    if (filters?.category && filters.category !== "All") search.set("category", filters.category);
    if (filters?.communityId && filters.communityId !== "All") search.set("communityId", filters.communityId);
    if (filters?.venueId && filters.venueId !== "All") search.set("venueId", filters.venueId);
    if (filters?.searchQuery) search.set("searchQuery", filters.searchQuery);
    if (filters?.startDate) search.set("startDate", filters.startDate);
    if (filters?.endDate) search.set("endDate", filters.endDate);
    if (filters?.status) search.set("status", filters.status);

    const res = await fetch(`/api/events?${search.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch events from database" }));
      throw new Error(err.error || `Database error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.events;
  },

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.status === 404) return undefined;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to fetch event" }));
      throw new Error(err.error || `Database error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.event;
  },

  async getEventById(id: string): Promise<Event | undefined> {
    return this.getEventBySlug(id);
  },

  async checkConflicts(params: {
    campusId?: string;
    eventId?: string;
    venueId?: string | null;
    startTime: string;
    endTime: string;
  }): Promise<ConflictReport> {
    const res = await fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to detect conflicts" }));
      throw new Error(err.error || `Conflict check failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.conflicts;
  },

  async createEvent(eventData: Omit<Event, "id" | "created_at" | "updated_at">): Promise<{
    event: Event;
    conflicts: ConflictReport;
  }> {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create event" }));
      throw new Error(err.error || `Failed to create event: ${res.statusText}`);
    }
    return await res.json();
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update event" }));
      throw new Error(err.error || `Failed to update event: ${res.statusText}`);
    }
    const data = await res.json();
    return data.event;
  },

  async updateEventStatus(
    id: string,
    status: EventStatus,
    reason?: { rejection_reason?: string; cancellation_reason?: string }
  ): Promise<Event> {
    const res = await fetch(`/api/events/${encodeURIComponent(id)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update event status" }));
      throw new Error(err.error || `Failed to update event status: ${res.statusText}`);
    }
    const data = await res.json();
    return data.event;
  },
};

// ---------------------------------------------------------------------------
// 3. UNIFIED EVENT SERVICE PROXY
// Dispatches to Supabase if configured, or Mock store if in offline demo mode.
// CRITICAL: In production mode, failures throw errors and NEVER silently fall back to mock data.
// ---------------------------------------------------------------------------
export const eventService = new Proxy({} as typeof mockService, {
  get(_target, prop: keyof typeof mockService) {
    if (isSupabaseConfigured()) {
      return supabaseService[prop];
    }
    return mockService[prop];
  },
});
