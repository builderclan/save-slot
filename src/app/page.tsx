"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Event, EventCategory, Community, Venue, Campus } from "@/types/database";
import { FilterBar, ViewMode } from "@/components/events/filter-bar";
import { PublicEventCard } from "@/components/events/public-event-card";
import { ListView } from "@/components/calendar/list-view";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { groupEventsByCampusDate, isValidTimezone } from "@/lib/date-grouping";
import {
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CalendarHomePageProps {
  campusSlug?: string;
}

export default function CalendarHomePage({ campusSlug }: CalendarHomePageProps) {
  const [campus, setCampus] = React.useState<Campus | null>(null);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Tab State: "feed" (What's Happening) vs "calendar" (Full Calendar)
  const [activeTab, setActiveTab] = React.useState<"feed" | "calendar">("feed");

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<EventCategory | "All">("All");
  const [selectedCommunityId, setSelectedCommunityId] = React.useState<string | "All">("All");
  const [selectedVenueId, setSelectedVenueId] = React.useState<string | "All">("All");
  const [selectedDateFilter, setSelectedDateFilter] = React.useState<"all" | "today" | "tomorrow" | "this-week">("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  // Detail Modal State
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);

  // Sync modal state with shallow URL query parameter (?event=slug) for shareability
  const handleSelectEvent = React.useCallback((event: Event | null) => {
    setSelectedEvent(event);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (event) {
        url.searchParams.set("event", event.slug);
      } else {
        url.searchParams.delete("event");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Auto-switch to list/agenda on small screens for calendar view
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("list");
    }
  }, []);

  // Load campus details, communities, venues, and published events
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [campusData, commData, venueData, eventData] = await Promise.all([
        eventService.getCampus(campusSlug),
        eventService.getCommunities({ campusSlug }),
        eventService.getVenues({ campusSlug }),
        eventService.getEvents({
          campusSlug,
          status: "published",
        }),
      ]);

      if (!campusData.timezone || !isValidTimezone(campusData.timezone)) {
        throw new Error(
          `Database configuration error: Campus "${campusData.name}" has an invalid timezone ("${campusData.timezone || "null"}").`
        );
      }

      setCampus(campusData);
      setCommunities(commData);
      setVenues(venueData);
      setEvents(eventData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campus events");
    } finally {
      setLoading(false);
    }
  }, [campusSlug]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open modal if ?event=[slug] query param exists on load or URL share
  React.useEffect(() => {
    if (typeof window !== "undefined" && events.length > 0 && !selectedEvent) {
      const params = new URLSearchParams(window.location.search);
      const eventSlug = params.get("event");
      if (eventSlug) {
        const match = events.find((e) => e.slug === eventSlug);
        if (match) setSelectedEvent(match);
      }
    }
  }, [events, selectedEvent]);

  // Client-side search and filtering across Title, Community, Venue, Category, Description
  const filteredEvents = React.useMemo(() => {
    return events.filter((evt) => {
      // Status check (only published)
      if (evt.status !== "published") return false;

      // Category filter
      if (selectedCategory !== "All" && evt.category !== selectedCategory) {
        return false;
      }

      // Community filter
      if (selectedCommunityId !== "All" && evt.community_id !== selectedCommunityId) {
        return false;
      }

      // Venue filter
      if (selectedVenueId !== "All" && evt.venue_id !== selectedVenueId) {
        return false;
      }

      // Search query (title, community name, venue name, category, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = evt.title.toLowerCase().includes(q);
        const commMatch = evt.community?.name?.toLowerCase().includes(q) || false;
        const venueMatch = evt.location_name.toLowerCase().includes(q);
        const categoryMatch = evt.category.toLowerCase().includes(q);
        const descMatch = evt.description.toLowerCase().includes(q);

        if (!titleMatch && !commMatch && !venueMatch && !categoryMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedCategory, selectedCommunityId, selectedVenueId, searchQuery]);

  // Date Grouping using campus database timezone
  const eventGroups = React.useMemo(() => {
    if (!campus?.timezone || !isValidTimezone(campus.timezone)) {
      return { today: [], tomorrow: [], thisWeek: [], upcoming: [] };
    }
    return groupEventsByCampusDate(filteredEvents, campus.timezone);
  }, [filteredEvents, campus]);

  // Campus local date labels
  const dateLabels = React.useMemo(() => {
    if (!campus?.timezone || !isValidTimezone(campus.timezone)) {
      return { todayLabel: "Today", tomorrowLabel: "Tomorrow" };
    }
    try {
      const now = new Date();
      const todayFormatted = new Intl.DateTimeFormat("en-US", {
        timeZone: campus.timezone,
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(now);

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowFormatted = new Intl.DateTimeFormat("en-US", {
        timeZone: campus.timezone,
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(tomorrow);

      return {
        todayLabel: todayFormatted,
        tomorrowLabel: tomorrowFormatted,
      };
    } catch {
      return { todayLabel: "Today", tomorrowLabel: "Tomorrow" };
    }
  }, [campus]);

  // Filter events further if selectedDateFilter is active
  const displayedEvents = React.useMemo(() => {
    if (selectedDateFilter === "today") return eventGroups.today;
    if (selectedDateFilter === "tomorrow") return eventGroups.tomorrow;
    if (selectedDateFilter === "this-week") {
      const weekIds = new Set([
        ...eventGroups.today.map((e) => e.id),
        ...eventGroups.tomorrow.map((e) => e.id),
        ...eventGroups.thisWeek.map((e) => e.id),
      ]);
      return filteredEvents.filter((e) => weekIds.has(e.id));
    }
    return filteredEvents;
  }, [eventGroups, filteredEvents, selectedDateFilter]);

  const todayEvents = React.useMemo(() => {
    const todayIds = new Set(eventGroups.today.map((e) => e.id));
    return displayedEvents.filter((e) => todayIds.has(e.id));
  }, [displayedEvents, eventGroups.today]);

  const tomorrowEvents = React.useMemo(() => {
    const tomorrowIds = new Set(eventGroups.tomorrow.map((e) => e.id));
    return displayedEvents.filter((e) => tomorrowIds.has(e.id));
  }, [displayedEvents, eventGroups.tomorrow]);

  const thisWeekEvents = React.useMemo(() => {
    const weekIds = new Set(eventGroups.thisWeek.map((e) => e.id));
    return displayedEvents.filter((e) => weekIds.has(e.id));
  }, [displayedEvents, eventGroups.thisWeek]);

  const otherEvents = React.useMemo(() => {
    const categorizedIds = new Set([
      ...todayEvents.map((e) => e.id),
      ...tomorrowEvents.map((e) => e.id),
      ...thisWeekEvents.map((e) => e.id),
    ]);
    return displayedEvents.filter((e) => !categorizedIds.has(e.id));
  }, [displayedEvents, todayEvents, tomorrowEvents, thisWeekEvents]);

  const totalFilteredCount = displayedEvents.length;
  const isSearchActive = searchQuery.trim().length > 0;
  const isAnyFilterActive =
    selectedCategory !== "All" ||
    selectedCommunityId !== "All" ||
    selectedVenueId !== "All" ||
    selectedDateFilter !== "all" ||
    isSearchActive;

  return (
    <div className="space-y-6">
      {/* Compact Editorial Campus Masthead */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-stone-500">
              CAMPUS DISPATCH
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-semibold text-stone-700">
              {campus ? campus.name : "Campus Calendar"}
            </span>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <span className="text-xs text-stone-500 font-mono hidden sm:inline">
              {dateLabels.todayLabel}
            </span>
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#12161f] tracking-tight">
            Campus Life, <span className="font-serif italic font-normal text-stone-500">Live.</span>
          </h1>
        </div>

        {/* Primary View Switcher: "Feed" vs "Full Calendar" */}
        <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80 self-start sm:self-center shrink-0">
          <button
            onClick={() => setActiveTab("feed")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
              activeTab === "feed"
                ? "bg-[#12161f] text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            )}
          >
            <Sparkles className={cn("h-3.5 w-3.5", activeTab === "feed" ? "text-amber-400" : "text-stone-400")} />
            <span>Feed View</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
              activeTab === "calendar"
                ? "bg-[#12161f] text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            )}
          >
            <CalendarIcon className={cn("h-3.5 w-3.5", activeTab === "calendar" ? "text-amber-400" : "text-stone-400")} />
            <span>Full Calendar</span>
          </button>
        </div>
      </header>

      {/* Database Error Alert (Never silent fallback to mock in production) */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Campus Data Unavailable</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 transition shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar with embedded quick date selector */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedCommunityId={selectedCommunityId}
        onCommunityChange={setSelectedCommunityId}
        selectedVenueId={selectedVenueId}
        onVenueChange={setSelectedVenueId}
        selectedDateFilter={selectedDateFilter}
        onDateFilterChange={setSelectedDateFilter}
        communities={communities}
        venues={venues}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalEventsCount={totalFilteredCount}
        showViewToggle={activeTab === "calendar"}
      />

      {/* Content Rendering */}
      {loading && events.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
          <div className="w-8 h-8 mx-auto border-3 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-medium">
            Loading events for {campus?.name || "campus"}...
          </p>
        </div>
      ) : activeTab === "calendar" ? (
        /* Full Calendar System (Preserving Month, Week, and List Views) */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 font-display">
              <CalendarIcon className="h-4 w-4 text-stone-800" />
              Campus Calendar View
            </h2>
            <button
              onClick={() => setActiveTab("feed")}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              &larr; Back to Feed
            </button>
          </div>

          {viewMode === "list" && (
            <ListView events={filteredEvents} onSelectEvent={handleSelectEvent} />
          )}
          {viewMode === "week" && (
            <WeekView events={filteredEvents} onSelectEvent={handleSelectEvent} />
          )}
          {viewMode === "month" && (
            <MonthView events={filteredEvents} onSelectEvent={handleSelectEvent} />
          )}
        </section>
      ) : (
        /* Streamlined Event Feed Experience */
        <section className="space-y-6">
          {/* Global Empty State (Search / Filter Mismatch) */}
          {totalFilteredCount === 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-stone-800 font-display">No events found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {isSearchActive
                  ? `No events matching "${searchQuery}". Try searching for another topic, club, or venue.`
                  : selectedDateFilter !== "all"
                  ? `No events scheduled for ${selectedDateFilter.replace("-", " ")}. Try checking all dates.`
                  : "No events match the selected filters. Try choosing a different category or clearing your filters."}
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedCommunityId("All");
                    setSelectedVenueId("All");
                    setSelectedDateFilter("all");
                  }}
                  className="px-4 py-2 bg-[#12161f] text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* 1. TODAY ON CAMPUS */}
          {todayEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm sm:text-base font-black text-stone-900 tracking-tight uppercase font-display">
                    Today on Campus
                  </h2>
                  <span className="text-xs font-medium text-stone-500 hidden sm:inline">
                    • {dateLabels.todayLabel}
                  </span>
                </div>
                <span className="text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-0.5 rounded-full font-mono">
                  {todayEvents.length} {todayEvents.length === 1 ? "EVENT" : "EVENTS"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {todayEvents.map((evt) => (
                  <PublicEventCard
                    key={evt.id}
                    event={evt}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. TOMORROW */}
          {tomorrowEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight font-display">
                    Tomorrow
                  </h2>
                  <span className="text-xs font-medium text-stone-500 hidden sm:inline">
                    • {dateLabels.tomorrowLabel}
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-500 font-mono">
                  {tomorrowEvents.length} {tomorrowEvents.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {tomorrowEvents.map((evt) => (
                  <PublicEventCard
                    key={evt.id}
                    event={evt}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. THIS WEEK */}
          {thisWeekEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight font-display">
                    This Week
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Remaining schedule through Sunday
                  </p>
                </div>
                <span className="text-xs font-semibold text-stone-500 font-mono">
                  {thisWeekEvents.length} {thisWeekEvents.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {thisWeekEvents.map((evt) => (
                  <PublicEventCard
                    key={evt.id}
                    event={evt}
                    showDate={true}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. UPCOMING & OTHER EVENTS (Guarantees every remaining event is shown!) */}
          {otherEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight font-display">
                  {selectedDateFilter === "all" ? "Upcoming & Campus Schedule" : "Events"}
                </h2>
                <span className="text-xs font-semibold text-stone-500 font-mono">
                  {otherEvents.length} {otherEvents.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {otherEvents.map((evt) => (
                  <PublicEventCard
                    key={evt.id}
                    event={evt}
                    showDate={true}
                    onSelect={handleSelectEvent}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Quick Event Inspection Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => handleSelectEvent(null)}
      />
    </div>
  );
}
