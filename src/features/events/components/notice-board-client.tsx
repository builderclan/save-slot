"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  X,
  Filter,
  SlidersHorizontal,
  PanelLeftClose,
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";
import { CampusEvent, Venue, EventCategory } from "@/types/database";
import { Button, Input } from "@/components/ui";
import { MiniCalendar } from "./mini-calendar";
import { SidebarCategoryFilter } from "./sidebar-category-filter";
import { SidebarHorizonFilter, type TimeHorizon } from "./sidebar-horizon-filter";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { EventCard } from "./event-card";
import { EventDetailModal } from "./event-detail-modal";
import { ProposeEventModal } from "@/features/lead";
import {
  useNoticeBoard,
  NOTICE_BOARD_CATEGORIES as CATEGORIES,
  type UserSessionState,
} from "../hooks/use-notice-board";
import { useCalendar } from "@/context/calendar-context";

export { type UserSessionState };

function EventDeepLinkHandler({
  events,
  onSelectEvent,
}: {
  events: CampusEvent[];
  onSelectEvent: (ev: CampusEvent) => void;
}) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  useEffect(() => {
    if (eventId && events.length > 0) {
      const match = events.find((e) => e.id === eventId);
      if (match) {
        onSelectEvent(match);
      }
    }
  }, [eventId, events, onSelectEvent]);

  return null;
}

interface NoticeBoardClientProps {
  initialEvents: CampusEvent[];
  initialVenues: Venue[];
  initialUserSession?: UserSessionState | null;
}

export function NoticeBoardClient({
  initialEvents,
  initialVenues,
  initialUserSession = null,
}: NoticeBoardClientProps) {
  const {
    events,
    venues,
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
  } = useNoticeBoard({
    initialEvents,
    initialVenues,
    initialUserSession,
  });

  const calendar = useCalendar();
  const [localSidebarOpen, setLocalSidebarOpen] = useState(true);
  const isSidebarOpen = calendar?.isSidebarOpen ?? localSidebarOpen;
  const toggleSidebar = calendar?.toggleSidebar ?? (() => setLocalSidebarOpen((p) => !p));

  const mobileFiltersTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileFiltersModalRef = useRef<HTMLDivElement | null>(null);

  // Keyboard accessibility and focus trap for mobile filter bottom sheet
  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      if (mobileFiltersModalRef.current) {
        const firstFocusable = mobileFiltersModalRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileFiltersOpen(false);
        return;
      }

      if (e.key === "Tab" && mobileFiltersModalRef.current) {
        const focusables = Array.from(
          mobileFiltersModalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      } else if (mobileFiltersTriggerRef.current) {
        mobileFiltersTriggerRef.current.focus();
      }
    };
  }, [mobileFiltersOpen, setMobileFiltersOpen]);

  // Memoize live category counts across all loaded events
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat] = 0;
    }
    for (const ev of events) {
      if (counts[ev.category] !== undefined) {
        counts[ev.category]++;
      }
    }
    return counts;
  }, [events]);

  const handleSelectOnlyCategory = (cat: EventCategory) => {
    setSelectedCategories([cat]);
  };

  const hasCategoryFilter = selectedCategories.length !== CATEGORIES.length;
  const activeFilterCount =
    (hasCategoryFilter ? 1 : 0) +
    (selectedHorizon !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  return (
    <div className="calendar-shell w-full flex-1 flex flex-col lg:flex-row bg-white min-h-0 relative">
      {/* Mobile Secondary Bar (Visible only on < lg) */}
      <div className="lg:hidden border-b border-zinc-200/80 bg-white shrink-0">
        {/* On mobile (< md), show the dedicated View Switcher */}
        <div className="md:hidden px-4 pt-2.5 pb-2 border-b border-zinc-100 bg-zinc-50/50">
          <div
            role="tablist"
            aria-label="Mobile calendar view switcher"
            className="grid grid-cols-3 p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80 gap-1 text-xs shadow-2xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "month"}
              onClick={() => setViewMode("month")}
              className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                viewMode === "month"
                  ? "bg-white text-zinc-900 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "week"}
              onClick={() => setViewMode("week")}
              className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                viewMode === "week"
                  ? "bg-white text-zinc-900 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
              className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                viewMode === "cards"
                  ? "bg-white text-zinc-900 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Row */}
        <div className="px-3.5 py-2 flex items-center justify-between gap-2 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search club or venue..."
              className="w-full pl-8.5 pr-7 py-1.5 rounded-xl bg-zinc-50/70 border border-zinc-200/90 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-400 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isPrivileged && (
            <button
              type="button"
              onClick={handleCreateEventClick}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xs:inline">Create</span>
            </button>
          )}

          <button
            ref={mobileFiltersTriggerRef}
            type="button"
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-filter-sheet"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95 ${
              activeFilterCount > 0
                ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-semibold"
                : "border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-zinc-600" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LEFT SIDEBAR (Utility Command Rail) */}
      {/* ============================================================== */}
      <aside
        className={`hidden lg:flex flex-col border-r border-zinc-200/80 bg-zinc-50/40 transition-all duration-200 shrink-0 select-none overflow-y-auto ${
          isSidebarOpen ? "w-72 p-4 gap-4" : "w-0 p-0 border-r-0 overflow-hidden"
        }`}
      >
        {/* Sidebar Header & Collapse Toggle */}
        <div className="flex items-center justify-between pb-0.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Events Explorer
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="w-6 h-6 rounded-md hover:bg-zinc-200/60 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Action Button */}
        {isPrivileged && (
          <button
            type="button"
            onClick={handleCreateEventClick}
            className="w-full py-2 px-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Create Event</span>
          </button>
        )}

        {/* Search Input */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search club or venue..."
          leftIcon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
          rightElement={
            search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
          className="bg-white text-xs py-1.5"
        />

        {/* Mini Calendar */}
        <div className="p-3 bg-white border border-zinc-200/80 rounded-xl shadow-2xs">
          <MiniCalendar
            currentDate={activeDate}
            onSelectDate={(newDate) => setActiveDate(newDate)}
          />
        </div>

        {/* Category Filter with Live Counts & 'Only' isolation */}
        <div className="p-3 bg-white border border-zinc-200/80 rounded-xl shadow-2xs">
          <SidebarCategoryFilter
            categories={CATEGORIES}
            selectedCategories={selectedCategories as EventCategory[]}
            onToggleCategory={toggleCategory as (cat: EventCategory) => void}
            onSelectAll={selectAllCategories}
            onClear={clearCategories}
            onSelectOnly={handleSelectOnlyCategory}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Time Horizon Filter */}
        <SidebarHorizonFilter
          selectedHorizon={selectedHorizon}
          onChangeHorizon={setSelectedHorizon}
        />

        {/* Desktop Sidebar Bottom Status Card */}
        <div className="mt-auto pt-3 border-t border-zinc-200/80 flex flex-col gap-1 pb-1">
          <div className="flex items-center justify-between text-[11px]">
            <a
              href="https://builderclan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
              title="Visit BuilderClan (builderclan.org)"
            >
              <span>SaveSlot by BuilderClan</span>
            </a>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">
            Automated conflict-prevention enabled for all campus venues.
          </p>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE FILTER BOTTOM SHEET (< lg) */}
      {/* ============================================================== */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-150"
          onClick={() => setMobileFiltersOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Filter events"
        >
          <div
            ref={mobileFiltersModalRef}
            id="mobile-filter-sheet"
            className="bg-white rounded-t-2xl border-t border-zinc-200/90 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-zinc-700" />
                <h3 className="font-semibold text-sm text-zinc-900">Filter Events</h3>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-zinc-900 text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 space-y-5 overflow-y-auto min-h-0 flex-1">
              {/* Time Horizon */}
              <SidebarHorizonFilter
                selectedHorizon={selectedHorizon}
                onChangeHorizon={setSelectedHorizon}
              />

              {/* Categories */}
              <SidebarCategoryFilter
                categories={CATEGORIES}
                selectedCategories={selectedCategories as EventCategory[]}
                onToggleCategory={toggleCategory as (cat: EventCategory) => void}
                onSelectAll={selectAllCategories}
                onClear={clearCategories}
                onSelectOnly={handleSelectOnlyCategory}
                categoryCounts={categoryCounts}
              />

              {/* Mini Calendar Picker */}
              <div className="pt-2 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2 px-0.5">
                  Jump to Date
                </span>
                <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-xl">
                  <MiniCalendar
                    currentDate={activeDate}
                    onSelectDate={(newDate) => {
                      setActiveDate(newDate);
                      setMobileFiltersOpen(false);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sticky Footer Action Bar */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center gap-2.5 shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1"
              >
                Show {filteredEvents.length} Events
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN CALENDAR SECTION (Month/Week/Board Views) */}
      {/* ============================================================== */}
      <section
        style={{ height: "100%", maxHeight: "100%" }}
        className="flex-1 flex flex-col min-w-0 min-h-0 bg-white overflow-hidden"
      >
        <div
          style={{ height: "100%", maxHeight: "100%" }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white"
        >
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading campus calendar...</p>
            </div>
          ) : error ? (
            <div className="p-8 m-6 text-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-800">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : viewMode === "cards" && filteredEvents.length === 0 ? (
            <div className="text-center py-24 p-8 my-auto">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                {hasActiveFilters
                  ? "No events found matching your filters"
                  : "No campus events scheduled"}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                {hasActiveFilters
                  ? "Try adjusting your search terms or selecting more categories in the sidebar."
                  : "Check back later or switch to Month view to explore the calendar."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  Reset All Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {filteredEvents.length === 0 && hasActiveFilters && (
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-xs text-zinc-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>No events match your current filters in this view.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-zinc-900 hover:underline transition-colors cursor-pointer shrink-0"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
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
                <div
                  style={{ height: "100%", maxHeight: "100%" }}
                  className="flex-1 min-h-0 overflow-y-auto p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelect={(ev) => setSelectedEvent(ev)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Deep Link URL Handler */}
      <Suspense fallback={null}>
        <EventDeepLinkHandler
          events={events}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
        />
      </Suspense>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={handleCloseDetailModal}
      />

      {/* Proposal Modal for Community Leads */}
      {isProposeOpen && (
        <ProposeEventModal
          venues={venues}
          communityId={activeUser?.leadCommunities?.[0]?.id}
          communityName={activeUser?.leadCommunities?.[0]?.name}
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
