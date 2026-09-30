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
  CalendarDays,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Clock,
  Compass,
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
  const displayedGroups = React.useMemo(() => {
    if (selectedDateFilter === "today") {
      return { ...eventGroups, tomorrow: [], thisWeek: [], upcoming: [] };
    }
    if (selectedDateFilter === "tomorrow") {
      return { ...eventGroups, today: [], thisWeek: [], upcoming: [] };
    }
    if (selectedDateFilter === "this-week") {
      return { ...eventGroups, upcoming: [] };
    }
    return eventGroups;
  }, [eventGroups, selectedDateFilter]);

  const totalFilteredCount = filteredEvents.length;
  const isSearchActive = searchQuery.trim().length > 0;
  const isAnyFilterActive =
    selectedCategory !== "All" ||
    selectedCommunityId !== "All" ||
    selectedVenueId !== "All" ||
    selectedDateFilter !== "all" ||
    isSearchActive;

  return (
    <div className="space-y-6">
      {/* Student Welcome Header & Campus Banner */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200">
            <Compass className="h-3.5 w-3.5 text-blue-400" />
            <span>{campus ? campus.name : "Campus Calendar"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            What&apos;s happening on campus?
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
            Discover student hackathons, workshops, speaker panels, and club meetups.
            Open to all students — no account required to browse.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              Timezone: {campus?.timezone || "Detecting..."}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-purple-400" />
              {events.length} campus events scheduled
            </span>
            <Link
              href="/communities"
              className="text-blue-300 hover:text-white font-medium underline underline-offset-4"
            >
              Browse {communities.length} student communities &rarr;
            </Link>
          </div>
        </div>
      </section>

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

      {/* Primary Experience Mode Switcher: "What's Happening" vs "Full Calendar" */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer",
              activeTab === "feed"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            What&apos;s Happening
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer",
              activeTab === "calendar"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            Full Calendar
          </button>
        </div>

        {activeTab === "feed" && (
          <button
            onClick={() => setActiveTab("calendar")}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            View calendar grid &rarr;
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
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
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-8 h-8 mx-auto border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            Loading events for {campus?.name || "campus"}...
          </p>
        </div>
      ) : activeTab === "calendar" ? (
        /* Full Calendar System (Preserving Month, Week, and List Views) */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              Campus Calendar View
            </h2>
            <button
              onClick={() => setActiveTab("feed")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              &larr; Back to Today&apos;s Feed
            </button>
          </div>

          {viewMode === "list" && (
            <ListView events={filteredEvents} onSelectEvent={setSelectedEvent} />
          )}
          {viewMode === "week" && (
            <WeekView events={filteredEvents} onSelectEvent={setSelectedEvent} />
          )}
          {viewMode === "month" && (
            <MonthView events={filteredEvents} onSelectEvent={setSelectedEvent} />
          )}
        </section>
      ) : (
        /* Dominant "What's Happening?" Feed Experience */
        <section className="space-y-8">
          {/* Global Empty State (Search / Filter Mismatch) */}
          {totalFilteredCount === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No events found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isSearchActive
                  ? `No events matching "${searchQuery}". Try searching for another topic, club, or venue.`
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
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* 1. DOMINANT SECTION: TODAY ON CAMPUS */}
          {(selectedDateFilter === "all" || selectedDateFilter === "today") && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                    Today on Campus
                  </h2>
                  <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                    • {dateLabels.todayLabel}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {displayedGroups.today.length} {displayedGroups.today.length === 1 ? "event" : "events"}
                </span>
              </div>

              {displayedGroups.today.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {displayedGroups.today.map((evt) => (
                    <PublicEventCard
                      key={evt.id}
                      event={evt}
                      onSelect={setSelectedEvent}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state for Today on Campus */
                <div className="p-6 bg-white rounded-xl border border-slate-200/80 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    No events scheduled today.
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Check tomorrow or browse the full calendar to see what student organizations have planned.
                  </p>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition mt-1"
                  >
                    Browse full calendar &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. CHRONOLOGICAL SECTION: TOMORROW */}
          {(selectedDateFilter === "all" || selectedDateFilter === "tomorrow") && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Tomorrow
                  </h2>
                  <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                    • {dateLabels.tomorrowLabel}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {displayedGroups.tomorrow.length} {displayedGroups.tomorrow.length === 1 ? "event" : "events"}
                </span>
              </div>

              {displayedGroups.tomorrow.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {displayedGroups.tomorrow.map((evt) => (
                    <PublicEventCard
                      key={evt.id}
                      event={evt}
                      onSelect={setSelectedEvent}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
                  Nothing scheduled for tomorrow yet.
                </div>
              )}
            </div>
          )}

          {/* 3. CHRONOLOGICAL SECTION: THIS WEEK */}
          {(selectedDateFilter === "all" || selectedDateFilter === "this-week") && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    This Week
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Remaining events through Sunday
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {displayedGroups.thisWeek.length} {displayedGroups.thisWeek.length === 1 ? "event" : "events"}
                </span>
              </div>

              {displayedGroups.thisWeek.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {displayedGroups.thisWeek.map((evt) => (
                    <PublicEventCard
                      key={evt.id}
                      event={evt}
                      showDate={true}
                      onSelect={setSelectedEvent}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
                  No other events scheduled for this week.
                </div>
              )}
            </div>
          )}

          {/* 4. UPCOMING / LATER SECTION */}
          {selectedDateFilter === "all" && displayedGroups.upcoming.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Upcoming Later
                </h2>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View in full calendar &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {displayedGroups.upcoming.slice(0, 5).map((evt) => (
                  <PublicEventCard
                    key={evt.id}
                    event={evt}
                    showDate={true}
                    onSelect={setSelectedEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Call to Action: Full Calendar Banner */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Looking for dates further ahead?
              </h3>
              <p className="text-xs text-slate-500">
                Switch to the Month or Week calendar view to plan ahead or search past event schedules.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("calendar")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shrink-0 shadow-2xs"
            >
              Open Full Calendar
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Quick Event Inspection Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
