"use client";

import { useState, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  ChevronRight,
  X,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

type ScheduleSortField = "time" | "title" | "club" | "venue";
type SortDirection = "asc" | "desc";

interface PrincipalScheduleViewProps {
  filteredApprovedEvents: CampusEvent[];
  calendarSearch: string;
  onSearchChange: (query: string) => void;
  calendarCategoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  availableCategories: string[];
  onSelectEvent: (event: CampusEvent) => void;
}

function getClubInitials(name?: string | null): string {
  if (!name) return "CC";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PrincipalScheduleView({
  filteredApprovedEvents,
  calendarSearch,
  onSearchChange,
  calendarCategoryFilter,
  onCategoryFilterChange,
  availableCategories,
  onSelectEvent,
}: PrincipalScheduleViewProps) {
  // Sorting state
  const [sortField, setSortField] = useState<ScheduleSortField>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Auto-hide toolbar on scroll down, show on scroll up
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Handle scroll detection for smooth toolbar slide up / down
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const diff = currentScrollY - lastScrollY.current;

    // At the very top, always show toolbar
    if (currentScrollY <= 15) {
      setToolbarVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Scroll delta threshold to avoid jitter
    if (Math.abs(diff) > 8) {
      if (diff > 0) {
        // Scrolling down -> slide up / hide
        setToolbarVisible(false);
      } else {
        // Scrolling up -> slide down / show
        setToolbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  };

  // Toggle sort direction or change column
  const handleSort = (field: ScheduleSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Apply Sorting
  const sortedEvents = useMemo(() => {
    return [...filteredApprovedEvents].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "time": {
          const timeA = new Date(a.start_time).getTime();
          const timeB = new Date(b.start_time).getTime();
          comparison = timeA - timeB;
          break;
        }
        case "title": {
          comparison = a.title.localeCompare(b.title);
          break;
        }
        case "club": {
          const clubA = a.community?.name || "";
          const clubB = b.community?.name || "";
          comparison = clubA.localeCompare(clubB);
          break;
        }
        case "venue": {
          const venueA = a.venue?.name || "";
          const venueB = b.venue?.name || "";
          comparison = venueA.localeCompare(venueB);
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredApprovedEvents, sortField, sortDirection]);

  // Header Sort Icon helper
  const renderSortIndicator = (field: ScheduleSortField) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
    );
  };

  const hasActiveFilters = Boolean(calendarSearch) || calendarCategoryFilter !== "all";

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 relative">
      {/* Scrollable Container with onScroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Sticky Compact Header Toolbar: Slides up on scroll down, slides down on scroll up */}
        <div
          className={`sticky top-0 z-30 transition-transform duration-300 ease-out border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5 ${
            toolbarVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campus Schedule</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums border border-slate-200/60">
                  {filteredApprovedEvents.length}{" "}
                  {filteredApprovedEvents.length === 1 ? "event" : "events"}
                </span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    Filtered
                  </span>
                )}
              </div>
              <span className="hidden sm:inline-block text-slate-300">•</span>
              <p className="hidden sm:block text-xs text-slate-500">
                Approved & published campus events
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={calendarSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search events, clubs, venues..."
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors h-7.5"
              />
              {calendarSearch && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Category Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
            {availableCategories.map((cat) => {
              const isSelected = calendarCategoryFilter.toLowerCase() === cat.toLowerCase();
              const label = cat === "all" ? "All Categories" : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryFilterChange(cat)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area: Full-screen List on Mobile, Data Table on Desktop */}
        <div className="p-0 md:p-5">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-xl border border-dashed border-slate-200 bg-white m-4 md:m-0">
              <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No scheduled events found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {calendarSearch || calendarCategoryFilter !== "all"
                  ? "Try adjusting your search query or category filter."
                  : "No approved campus events yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* MOBILE FULL-SCREEN DATE-RAIL LIST (< md) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white border-y border-slate-200">
                {sortedEvents.map((ev) => {
                  const eventDate = parseISO(ev.start_time);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100/80 transition-colors flex items-center gap-3.5 group cursor-pointer"
                    >
                      {/* Left Date Block */}
                      <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/70 py-1.5 group-hover:bg-indigo-50/70 group-hover:border-indigo-200/80 transition-colors">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors leading-none">
                          {format(eventDate, "MMM")}
                        </span>
                        <span className="text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tabular-nums leading-tight my-0.5">
                          {format(eventDate, "d")}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 leading-none">
                          {format(eventDate, "EEE")}
                        </span>
                      </div>

                      {/* Center Event Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                            {ev.community?.name || "Campus Community"}
                          </span>
                          <CategoryBadge category={ev.category} size="sm" showDot />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                          {ev.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 text-slate-600 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{format(eventDate, "h:mm a")}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.venue?.name || "Venue"}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right Action Indicator */}
                      <div className="shrink-0 self-center pl-1 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (md+) */}
              <div className="hidden md:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-600 text-[11px] font-semibold tracking-wide border-b border-slate-200 select-none">
                      <tr>
                        <th
                          scope="col"
                          onClick={() => handleSort("title")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Event Title & Category</span>
                            {renderSortIndicator("title")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("club")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Host Club</span>
                            {renderSortIndicator("club")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("venue")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Venue</span>
                            {renderSortIndicator("venue")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("time")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Date & Time</span>
                            {renderSortIndicator("time")}
                          </div>
                        </th>
                        <th scope="col" className="py-2.5 px-4 text-right whitespace-nowrap">
                          Status
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-right w-10">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedEvents.map((ev) => (
                        <tr
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                        >
                          {/* 1. Title & Category */}
                          <td className="py-2.5 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-xs">
                              {ev.title}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <CategoryBadge category={ev.category} size="sm" showDot />
                            </div>
                          </td>

                          {/* 2. Host Club */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                                {getClubInitials(ev.community?.name)}
                              </div>
                              <span
                                className="font-medium text-slate-700 truncate max-w-[150px]"
                                title={ev.community?.name || "Campus Community"}
                              >
                                {ev.community?.name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* 3. Venue */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{ev.venue?.name || "Campus Venue"}</span>
                            </div>
                            {ev.venue?.building && (
                              <div className="text-[10px] text-slate-400 leading-tight pl-5">
                                {ev.venue.building}
                              </div>
                            )}
                          </td>

                          {/* 4. Date & Time */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{format(parseISO(ev.start_time), "MMM d, yyyy")}</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500 pl-5">
                              {format(parseISO(ev.start_time), "h:mm a")} –{" "}
                              {format(parseISO(ev.end_time), "h:mm a")}
                            </div>
                          </td>

                          {/* 5. Status */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-semibold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Live
                            </span>
                          </td>

                          {/* 6. Action Arrow */}
                          <td className="py-2.5 px-3 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all inline-block" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
