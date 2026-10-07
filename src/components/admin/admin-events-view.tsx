"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Trash2,
  ExternalLink,
  Search,
  Calendar,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  Archive,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { CampusEvent, EventCategory } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface AdminEventsViewProps {
  allEvents: CampusEvent[];
  onDeleteEvent: (id: string) => void;
  onPreviewEvent?: (event: CampusEvent) => void;
  onNavigateToArchive?: () => void;
  actionInProgress: string | null;
  initialStatusFilter?: "all" | "published" | "pending" | "rejected";
  nowTimestamp?: number;
}

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

type EventSortField = "time" | "title" | "club" | "venue";
type SortDirection = "asc" | "desc";

export function AdminEventsView({
  allEvents,
  onDeleteEvent,
  onPreviewEvent,
  onNavigateToArchive,
  actionInProgress,
  initialStatusFilter = "all",
  nowTimestamp: externalNow,
}: AdminEventsViewProps) {
  const [internalNow, setInternalNow] = useState<number>(0);

  useEffect(() => {
    setInternalNow(Date.now());
  }, []);

  const nowTimestamp = externalNow || internalNow;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending" | "rejected">(
    initialStatusFilter
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<EventSortField>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);

  // Count concluded/past events
  const completedCount = useMemo(() => {
    if (!nowTimestamp) return 0;
    return allEvents.filter((ev) => {
      if (!ev.end_time) return false;
      return new Date(ev.end_time).getTime() < nowTimestamp;
    }).length;
  }, [allEvents, nowTimestamp]);

  // Status counts for badge tabs (respects hideCompleted)
  const counts = useMemo(() => {
    const pool =
      hideCompleted && nowTimestamp
        ? allEvents.filter((ev) => !ev.end_time || new Date(ev.end_time).getTime() >= nowTimestamp)
        : allEvents;
    return {
      all: pool.length,
      published: pool.filter((e) => e.status === "published").length,
      pending: pool.filter((e) => e.status === "pending").length,
      rejected: pool.filter((e) => e.status === "rejected").length,
    };
  }, [allEvents, hideCompleted, nowTimestamp]);

  // Toggle sort direction or change column
  const handleSort = (field: EventSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: EventSortField) => {
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

  // Filtered and sorted event pipeline
  const filteredEvents = useMemo(() => {
    let result = allEvents.filter((ev) => {
      // Hide completed events if enabled
      if (hideCompleted && nowTimestamp && ev.end_time) {
        if (new Date(ev.end_time).getTime() < nowTimestamp) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== "all" && ev.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = (ev.description || "").toLowerCase().includes(q);
        const matchesVenue = (ev.venue?.name || ev.location_name || "").toLowerCase().includes(q);
        const matchesComm = (ev.community?.name || "").toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesVenue || matchesComm;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
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
          const venueA = a.venue?.name || a.location_name || "";
          const venueB = b.venue?.name || b.location_name || "";
          comparison = venueA.localeCompare(venueB);
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    allEvents,
    statusFilter,
    categoryFilter,
    searchQuery,
    sortField,
    sortDirection,
    hideCompleted,
    nowTimestamp,
  ]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Master Calendar</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums border border-slate-200/60">
                {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
              </span>
              <span className="hidden sm:inline-block text-slate-300">•</span>
              <p className="hidden sm:block text-xs text-slate-500">
                Comprehensive campus ledger
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, clubs, venues..."
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors h-7.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => {
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Status Tabs & Completed Toggle Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-2 gap-2 pb-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "published"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Published</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === "published" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {counts.published}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Pending Review</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  {counts.pending}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("rejected")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "rejected"
                    ? "bg-rose-600 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Declined</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === "rejected" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"
                }`}>
                  {counts.rejected}
                </span>
              </button>
            </div>

            {/* Completed Events Filter Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setHideCompleted((prev) => !prev)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border active:scale-[0.98] ${
                  hideCompleted
                    ? "bg-slate-100 text-slate-700 border-slate-200/90 hover:bg-slate-200/80"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/80 font-semibold"
                }`}
                title={
                  hideCompleted
                    ? "Completed events are hidden. Click to show."
                    : "Completed events are visible. Click to hide."
                }
              >
                {hideCompleted ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide Completed</span>
                    {completedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700 tabular-nums">
                        {completedCount}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Showing Completed</span>
                    {completedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-200/70 text-indigo-800 tabular-nums">
                        {completedCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Mobile Date-Rail List or Desktop Table */}
        <div className="p-0 md:p-5">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-xl border border-dashed border-slate-200 bg-white m-4 md:m-0">
              <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No active events found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hideCompleted && completedCount > 0 ? (
                  <>
                    {completedCount} concluded {completedCount === 1 ? "event is" : "events are"} hidden from the master calendar.
                  </>
                ) : (
                  "Try adjusting your search query, status, or category filter."
                )}
              </p>
              {hideCompleted && completedCount > 0 && (
                <div className="mt-3.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHideCompleted(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Show completed events ({completedCount})
                  </button>
                  {onNavigateToArchive && (
                    <button
                      type="button"
                      onClick={onNavigateToArchive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Open Event Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* MOBILE FULL-SCREEN DATE-RAIL LIST (< md) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white border-y border-slate-200">
                {filteredEvents.map((ev) => {
                  const eventDate = parseISO(ev.start_time);
                  return (
                    <div
                      key={ev.id}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3.5 group"
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
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                              ev.status === "published"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : ev.status === "pending"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-rose-50 border-rose-200 text-rose-800"
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                        <h4
                          onClick={() => onPreviewEvent?.(ev)}
                          className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1 cursor-pointer"
                        >
                          {ev.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 text-slate-600 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{format(eventDate, "h:mm a")}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1">
                        {onPreviewEvent && (
                          <button
                            type="button"
                            onClick={() => onPreviewEvent(ev)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionInProgress === ev.id}
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
                        <th scope="col" className="py-2.5 px-4 text-center whitespace-nowrap">
                          Status
                        </th>
                        <th scope="col" className="py-2.5 px-4 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvents.map((ev) => {
                        const eventDate = parseISO(ev.start_time);
                        return (
                          <tr
                            key={ev.id}
                            className="hover:bg-slate-50/90 transition-colors group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <CategoryBadge category={ev.category} size="sm" showDot />
                                <span
                                  onClick={() => onPreviewEvent?.(ev)}
                                  className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                                >
                                  {ev.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                              {ev.community?.name || "Campus Community"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ev.venue?.name || ev.location_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">
                                  {format(eventDate, "MMM d, yyyy")}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {format(eventDate, "h:mm a")}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  ev.status === "published"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : ev.status === "pending"
                                    ? "bg-amber-50 border-amber-200 text-amber-800"
                                    : "bg-rose-50 border-rose-200 text-rose-800"
                                }`}
                              >
                                {ev.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {onPreviewEvent && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewEvent(ev)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer active:scale-95"
                                    title="Preview Event"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {ev.status === "published" && (
                                  <Link
                                    href="/"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                                    title="View on Notice Board"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  disabled={actionInProgress === ev.id}
                                  onClick={() => onDeleteEvent(ev.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="Delete Event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
