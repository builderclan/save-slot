"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  parseISO,
  isToday,
  isWeekend,
  isWithinInterval,
  addDays,
} from "date-fns";
import { useCalendar } from "@/context/calendar-context";
import { useAuth } from "@/context/auth-context";
import { CampusEvent, EventCategory, Venue } from "@/types/database";
import { eventsApi } from "@/features/events/api";
import { venuesApi } from "@/features/venues/api";

export const NOTICE_BOARD_CATEGORIES: EventCategory[] = [
  "Tech",
  "Arts",
  "Sports",
  "Career",
  "Academic",
  "Social",
  "Workshop",
];

export function toDate(val: string | Date): Date {
  return typeof val === "string" ? parseISO(val) : new Date(val);
}

export interface UserSessionState {
  authenticated: boolean;
  user?: {
    fullName: string;
    isLead: boolean;
    isAdmin: boolean;
    isPrincipal: boolean;
    isVicePrincipal?: boolean;
    role?: string;
    leadCommunities?: Array<{ id: string; name: string }>;
  };
}

export interface UseNoticeBoardOptions {
  initialEvents: CampusEvent[];
  initialVenues: Venue[];
  initialUserSession?: UserSessionState | null;
}

export function useNoticeBoard({
  initialEvents,
  initialVenues,
  initialUserSession = null,
}: UseNoticeBoardOptions) {
  const router = useRouter();
  const [events, setEvents] = useState<CampusEvent[]>(initialEvents);
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calendar = useCalendar();
  const activeDate = calendar?.activeDate || new Date();
  const setActiveDate = calendar?.setActiveDate || (() => {});
  const viewMode = calendar?.viewMode || "month";
  const setViewMode = calendar?.setViewMode || (() => {});
  const search = calendar?.search || "";
  const setSearch = useMemo(
    () => calendar?.setSearch || (() => {}),
    [calendar?.setSearch]
  );

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>(NOTICE_BOARD_CATEGORIES);
  const [selectedHorizon, setSelectedHorizon] = useState<"all" | "today" | "week" | "weekend">("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Auth & Proposal modal
  const { user: authUser } = useAuth();
  const activeUser = authUser || initialUserSession?.user;
  const isPrivileged = Boolean(
    activeUser?.isLead || activeUser?.isAdmin || activeUser?.isPrincipal
  );
  const [isProposeOpen, setIsProposeOpen] = useState(false);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedEvent(null);
    if (typeof window !== "undefined" && window.location.search.includes("event=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("event");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, venuesRes] = await Promise.allSettled([
        eventsApi.getPublished(),
        venuesApi.getVenues(),
      ]);

      if (eventsRes.status === "fulfilled") {
        setEvents(eventsRes.value.events || []);
      } else {
        throw new Error("Failed to load events");
      }

      if (venuesRes.status === "fulfilled") {
        setVenues(venuesRes.value.venues || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching events");
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate events on mount if initial pre-render had empty dataset (e.g. offline CI build)
  useEffect(() => {
    if (initialEvents.length === 0) {
      loadData();
    }
  }, [initialEvents.length, loadData]);

  // Toggle category in checklist
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = () => setSelectedCategories(NOTICE_BOARD_CATEGORIES);
  const clearCategories = () => setSelectedCategories([]);

  // Handle Create Event button
  const handleCreateEventClick = () => {
    if (isPrivileged) {
      setIsProposeOpen(true);
    } else {
      router.push("/login");
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Search Query
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description.toLowerCase().includes(q);
        const matchesClub = ev.community?.name.toLowerCase().includes(q) || false;
        const matchesVenue = ev.venue?.name.toLowerCase().includes(q) || false;
        const matchesAudience = (ev.target_audience || []).some((aud) =>
          aud.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesDesc && !matchesClub && !matchesVenue && !matchesAudience) {
          return false;
        }
      }

      // 2. Category multi-select
      if (selectedCategories.length > 0 && !selectedCategories.includes(ev.category)) {
        return false;
      }

      // 3. Date Horizon
      if (selectedHorizon !== "all") {
        const evDate = toDate(ev.start_time);
        const now = new Date();

        if (selectedHorizon === "today") {
          if (!isToday(evDate)) return false;
        } else if (selectedHorizon === "weekend") {
          if (!isWeekend(evDate)) return false;
        } else if (selectedHorizon === "week") {
          const nextWeek = addDays(now, 7);
          if (!isWithinInterval(evDate, { start: now, end: nextWeek })) return false;
        }
      }

      return true;
    });
  }, [events, search, selectedCategories, selectedHorizon]);

  const hasActiveFilters = Boolean(
    search.trim() !== "" ||
      selectedCategories.length !== NOTICE_BOARD_CATEGORIES.length ||
      selectedHorizon !== "all"
  );

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setSelectedCategories(NOTICE_BOARD_CATEGORIES);
    setSelectedHorizon("all");
  }, [setSearch]);

  return {
    events,
    setEvents,
    venues,
    setVenues,
    loading,
    error,
    loadData,

    activeDate,
    setActiveDate,
    viewMode,
    setViewMode,
    search,
    setSearch,

    selectedCategories,
    setSelectedCategories,
    selectedHorizon,
    setSelectedHorizon,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    toggleCategory,
    selectAllCategories,
    clearCategories,
    filteredEvents,
    hasActiveFilters,
    handleResetFilters,

    selectedEvent,
    setSelectedEvent,
    handleCloseDetailModal,

    isProposeOpen,
    setIsProposeOpen,
    handleCreateEventClick,

    activeUser,
    isPrivileged,
  };
}
