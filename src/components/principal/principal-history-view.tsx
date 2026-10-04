"use client";

import { format, parseISO } from "date-fns";
import { Clock, MapPin, Search, ChevronRight, X, CheckCircle2, XCircle } from "lucide-react";
import { CampusEvent } from "@/types/database";

interface PrincipalHistoryViewProps {
  filteredHistoryEvents: CampusEvent[];
  historyCounts: { all: number; published: number; rejected: number };
  historyStatusFilter: "all" | "published" | "rejected";
  onStatusFilterChange: (status: "all" | "published" | "rejected") => void;
  historySearch: string;
  onSearchChange: (query: string) => void;
  onSelectEvent: (event: CampusEvent) => void;
}

export function PrincipalHistoryView({
  filteredHistoryEvents,
  historyCounts,
  historyStatusFilter,
  onStatusFilterChange,
  historySearch,
  onSearchChange,
  onSelectEvent,
}: PrincipalHistoryViewProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/40">
      {/* Sticky Compact Header Toolbar */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Decision History</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums">
              {filteredHistoryEvents.length} {filteredHistoryEvents.length === 1 ? "record" : "records"}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Audit trail of all approved and declined campus proposals
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Status Filter Buttons with Live Counts */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onStatusFilterChange("all")}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                historyStatusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                  historyStatusFilter === "all"
                    ? "bg-slate-100 text-slate-800"
                    : "bg-slate-200/60 text-slate-500"
                }`}
              >
                {historyCounts.all}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange("published")}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                historyStatusFilter === "published"
                  ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Approved</span>
              <span
                className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                  historyStatusFilter === "published"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-200/60 text-slate-500"
                }`}
              >
                {historyCounts.published}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange("rejected")}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                historyStatusFilter === "rejected"
                  ? "bg-white text-rose-800 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Declined</span>
              <span
                className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                  historyStatusFilter === "rejected"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-200/60 text-slate-500"
                }`}
              >
                {historyCounts.rejected}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
            {historySearch && (
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
      </div>

      {/* Content Area: Full-screen List on Mobile, Data Table on Desktop */}
      <div className="flex-1 overflow-y-auto p-0 md:p-6 bg-white md:bg-transparent">
        {filteredHistoryEvents.length === 0 ? (
          <div className="text-center py-12 p-6 md:rounded-xl md:border md:border-dashed md:border-slate-200 bg-white">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No decision records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {historySearch ? "Try adjusting your search or status filter." : "No recorded decisions yet."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE FULL-SCREEN AUDIT LIST (< md) */}
            <div className="md:hidden divide-y divide-slate-100 bg-white border-b border-slate-200">
              {filteredHistoryEvents.map((ev) => {
                const isApproved = ev.status === "published";
                const decisionDate = ev.updated_at || ev.created_at || ev.start_time;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100/80 transition-colors flex items-start gap-3.5 group cursor-pointer"
                  >
                    {/* Left Verdict Tile */}
                    <div
                      className={`w-11 shrink-0 flex flex-col items-center justify-center rounded-lg py-2 border transition-colors mt-0.5 ${
                        isApproved
                          ? "bg-emerald-50/80 border-emerald-200/70 text-emerald-700 group-hover:bg-emerald-100/70 group-hover:border-emerald-300"
                          : "bg-rose-50/80 border-rose-200/70 text-rose-700 group-hover:bg-rose-100/70 group-hover:border-rose-300"
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 mb-0.5" />
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                        {isApproved ? "Appr." : "Decl."}
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
                          <span>{format(parseISO(ev.start_time), "MMM d, h:mm a")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{ev.venue?.name || "Venue"}</span>
                        </span>
                      </div>
                      {ev.status === "rejected" && ev.rejection_reason && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-50/80 border border-rose-100 text-[11px] text-rose-800 leading-relaxed">
                          <span className="font-semibold text-rose-900">Reason: </span>
                          <span className="italic">&ldquo;{ev.rejection_reason}&rdquo;</span>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Decision Timestamp & Chevron */}
                    <div className="shrink-0 flex flex-col items-end justify-between self-stretch pl-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        {format(parseISO(decisionDate), "MMM d")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-auto" />
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
                    <th className="py-3 px-4">Event & Category</th>
                    <th className="py-3 px-4">Host Club</th>
                    <th className="py-3 px-4">Scheduled For</th>
                    <th className="py-3 px-4">Verdict</th>
                    <th className="py-3 px-4">Decision Date & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryEvents.map((ev) => (
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
                        <span className="font-medium text-slate-800">
                          {format(parseISO(ev.start_time), "MMM d, yyyy")}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {ev.venue?.name || "Campus Venue"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            ev.status === "published"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800"
                          }`}
                        >
                          {ev.status === "published" ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Approved
                            </>
                          ) : (
                            <>
                              <XCircle className="w-2.5 h-2.5 text-rose-600" />
                              Declined
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                        <div className="text-[11px] font-medium text-slate-400 mb-0.5">
                          {format(parseISO(ev.updated_at || ev.created_at || ev.start_time), "MMM d, yyyy")}
                        </div>
                        <div className="italic text-slate-700 truncate">
                          {ev.rejection_reason || "Approved for notice board publication."}
                        </div>
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
