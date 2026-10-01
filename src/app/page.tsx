"use client";

import { useEffect, useState, useMemo } from "react";
import { Sparkles, ShieldCheck, Building, Search } from "lucide-react";
import { parseISO, isToday, isWeekend, isWithinInterval, addDays } from "date-fns";
import { CampusEvent, EventCategory } from "@/types/database";
import { FilterBar, ViewMode, DateHorizon } from "@/components/notice-board/filter-bar";
import { EventCard } from "@/components/notice-board/event-card";
import { MonthView } from "@/components/notice-board/month-view";
import { WeekView } from "@/components/notice-board/week-view";
import { EventDetailModal } from "@/components/events/event-detail-modal";

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Arts",
  "Career",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

export default function StudentNoticeBoardPage() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedHorizon, setSelectedHorizon] = useState<DateHorizon>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Selected event for modal details
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch("/api/events?status=published");
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error fetching events");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Filtered Events computation
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Search Query
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description.toLowerCase().includes(q);
        const matchesClub = ev.community?.name.toLowerCase().includes(q) || false;
        const matchesVenue = ev.venue?.name.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesDesc && !matchesClub && !matchesVenue) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== "all" && ev.category !== selectedCategory) {
        return false;
      }

      // 3. Date Horizon
      if (selectedHorizon !== "all") {
        const evDate = parseISO(ev.start_time);
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
  }, [events, search, selectedCategory, selectedHorizon]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Header */}
      <section className="relative mb-10 pb-8 border-b border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Student Notice Board</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Campus Events & Notice Hub
            </h1>

            <p className="mt-3 text-base text-zinc-400 leading-relaxed">
              Explore upcoming club workshops, tech hackathons, and guest lectures across Apex Institute. Every listing is coordinated with a verified <span className="text-zinc-200 font-medium">Safe Slot</span> to eliminate scheduling clashes.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">100% Conflict-Free</div>
                <div className="text-[11px] text-zinc-400">7-Day Notice Policy</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">4 Active Venues</div>
                <div className="text-[11px] text-zinc-400">Real-Time Capacity</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Controls & Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedHorizon={selectedHorizon}
        onHorizonChange={setSelectedHorizon}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        categories={CATEGORIES}
      />

      {/* Content Section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-zinc-300 mb-1">
            No events found matching your criteria
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
            Try adjusting your search terms, changing the category filter, or resetting the date horizon.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSelectedHorizon("all");
            }}
            className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div>
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={(ev) => setSelectedEvent(ev)}
                />
              ))}
            </div>
          )}

          {viewMode === "month" && (
            <MonthView
              events={filteredEvents}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          )}

          {viewMode === "week" && (
            <WeekView
              events={filteredEvents}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
