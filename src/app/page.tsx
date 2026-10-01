"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Check,
  X,
} from "lucide-react";
import {
  parseISO,
  isToday,
  isWeekend,
  isWithinInterval,
  addDays,
} from "date-fns";
import { useCalendar } from "@/context/calendar-context";
import { CampusEvent, EventCategory, Venue } from "@/types/database";
import { CATEGORY_STYLES } from "@/components/events/category-badge";
import { MiniCalendar } from "@/components/notice-board/mini-calendar";
import { MonthView } from "@/components/notice-board/month-view";
import { WeekView } from "@/components/notice-board/week-view";
import { EventCard } from "@/components/notice-board/event-card";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { ProposeEventModal } from "@/components/lead/propose-event-modal";

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Arts",
  "Sports",
  "Career",
  "Academic",
  "Social",
  "Workshop",
];

export default function StudentNoticeBoardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calendar = useCalendar();
  const activeDate = calendar?.activeDate || new Date();
  const setActiveDate = calendar?.setActiveDate || (() => {});
  const viewMode = calendar?.viewMode || "month";
  const search = calendar?.search || "";
  const setSearch = calendar?.setSearch || (() => {});

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES);
  const [selectedHorizon, setSelectedHorizon] = useState<"all" | "today" | "week" | "weekend">("all");

  // Auth & Proposal modal
  const [userSession, setUserSession] = useState<{
    authenticated: boolean;
    user?: {
      fullName: string;
      isLead: boolean;
      isAdmin: boolean;
      leadCommunities?: Array<{ id: string; name: string }>;
    };
  } | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, venuesRes, authRes] = await Promise.all([
        fetch("/api/events?status=published"),
        fetch("/api/venues"),
        fetch("/api/auth/me"),
      ]);

      if (!eventsRes.ok) throw new Error("Failed to load events");
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);

      if (venuesRes.ok) {
        const venuesData = await venuesRes.json();
        setVenues(venuesData.venues || []);
      }

      if (authRes.ok) {
        const authData = await authRes.json();
        setUserSession(authData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle category in checklist
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = () => setSelectedCategories(CATEGORIES);
  const clearCategories = () => setSelectedCategories([]);

  // Handle Create Event button
  const handleCreateEventClick = () => {
    if (userSession?.authenticated && (userSession.user?.isLead || userSession.user?.isAdmin)) {
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
        if (!matchesTitle && !matchesDesc && !matchesClub && !matchesVenue) {
          return false;
        }
      }

      // 2. Category multi-select
      if (selectedCategories.length > 0 && !selectedCategories.includes(ev.category)) {
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
  }, [events, search, selectedCategories, selectedHorizon]);

  return (
    <div className="w-full flex-1 flex flex-col lg:flex-row bg-white min-h-[calc(100vh-3.5rem)]">
      {/* ============================================================== */}
      {/* LEFT SIDEBAR (User Profile, + Create Event, Mini-Cal, Filters) */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-72 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:self-start border-b lg:border-b-0 lg:border-r border-slate-200 p-5 sm:p-6 flex flex-col gap-6 bg-white shrink-0 z-20">

        {/* "+ Create Event" Primary Action Button (Only for Leads and Admins) */}
        {userSession?.authenticated && (userSession.user?.isLead || userSession.user?.isAdmin) && (
          <button
            type="button"
            onClick={handleCreateEventClick}
            className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>+ Create Event</span>
          </button>
        )}

          {/* Mini Calendar Picker matching Image 1 */}
          <div className="pt-1">
            <MiniCalendar
              currentDate={activeDate}
              onSelectDate={(newDate) => setActiveDate(newDate)}
            />
          </div>

          {/* Quick Search Input matching "Meet With..." in Image 1 */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search club or venue..."
              className="w-full pl-8.5 pr-7 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* "My calendars" / Categories Checklist matching Image 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                My calendars
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={clearCategories}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const isChecked = selectedCategories.includes(cat);
                const catStyle = CATEGORY_STYLES[cat] || {
                  bg: "bg-indigo-50",
                  text: "text-indigo-700",
                  border: "border-indigo-100",
                  dot: "bg-indigo-500",
                };

                return (
                  <label
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5 group"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        isChecked
                          ? `${catStyle.dot} text-white shadow-2xs`
                          : "border border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="flex-1 font-medium">{cat}</span>
                    <span className={`w-2 h-2 rounded-full ${catStyle.dot} opacity-70`} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date Horizon Quick Filter */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Time Horizon
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(
                [
                  { id: "all", label: "All Dates" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "Next 7 Days" },
                  { id: "weekend", label: "Weekend" },
                ] as const
              ).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHorizon(h.id)}
                  className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all cursor-pointer ${
                    selectedHorizon === h.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN CALENDAR SECTION (Month/Week/Board Views) */}
        {/* ============================================================== */}
        <section className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Calendar Content Area */}
          <div className="flex-1 flex flex-col overflow-auto bg-white">
            {loading ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Loading campus calendar...</p>
              </div>
            ) : error ? (
              <div className="p-8 m-6 text-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-800">
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : filteredEvents.length === 0 && viewMode === "cards" ? (
              <div className="text-center py-24 p-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  No events found matching your filters
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Try adjusting your search terms or selecting more categories in the sidebar.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategories(CATEGORIES);
                    setSelectedHorizon("all");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                {viewMode === "month" && (
                  <MonthView
                    events={filteredEvents}
                    onSelectEvent={(ev) => setSelectedEvent(ev)}
                    currentDate={activeDate}
                    onDateChange={(newDate) => setActiveDate(newDate)}
                  />
                )}

                {viewMode === "week" && (
                  <WeekView
                    events={filteredEvents}
                    onSelectEvent={(ev) => setSelectedEvent(ev)}
                    currentDate={activeDate}
                    onDateChange={(newDate) => setActiveDate(newDate)}
                  />
                )}

                {viewMode === "cards" && (
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelect={(ev) => setSelectedEvent(ev)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Proposal Modal for Community Leads */}
      {isProposeOpen && (
        <ProposeEventModal
          venues={venues}
          communityId={userSession?.user?.leadCommunities?.[0]?.id}
          communityName={userSession?.user?.leadCommunities?.[0]?.name}
          onClose={() => setIsProposeOpen(false)}
          onSuccess={() => {
            setIsProposeOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
