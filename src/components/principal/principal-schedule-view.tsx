"use client";

import { format, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Search, ChevronRight, X, Check } from "lucide-react";
import { CampusEvent } from "@/types/database";

interface PrincipalScheduleViewProps {
  filteredApprovedEvents: CampusEvent[];
  calendarSearch: string;
  onSearchChange: (query: string) => void;
  calendarCategoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  availableCategories: string[];
  onSelectEvent: (event: CampusEvent) => void;
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
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/40">
      {/* Sticky Compact Header Toolbar */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0 flex flex-col gap-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campus Schedule</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums">
                {filteredApprovedEvents.length} {filteredApprovedEvents.length === 1 ? "event" : "events"}
              </span>
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
              className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
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
      <div className="flex-1 overflow-y-auto p-0 md:p-6 bg-white md:bg-transparent">
        {filteredApprovedEvents.length === 0 ? (
          <div className="text-center py-12 p-6 md:rounded-xl md:border md:border-dashed md:border-slate-200 bg-white">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No scheduled events found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {calendarSearch || calendarCategoryFilter !== "all"
                ? "Try adjusting your search query or category filter."
                : "No approved campus events yet."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE FULL-SCREEN DATE-RAIL LIST (< md) */}
            <div className="md:hidden divide-y divide-slate-100 bg-white border-b border-slate-200">
              {filteredApprovedEvents.map((ev) => {
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                          {ev.community?.name || "Campus Community"}
                        </span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {ev.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                        {ev.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{format(eventDate, "h:mm a")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{ev.venue?.name || "Campus Venue"}</span>
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
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Host Club</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApprovedEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {ev.title}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {ev.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {ev.community?.name || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">{ev.venue?.name}</span>
                        {ev.venue?.building && (
                          <span className="block text-[11px] text-slate-400">{ev.venue.building}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {format(parseISO(ev.start_time), "MMM d, yyyy")}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {format(parseISO(ev.start_time), "h:mm a")} – {format(parseISO(ev.end_time), "h:mm a")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Live
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
