"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { CampusEvent } from "@/types/database";

export type StatusFilter = "all" | "published" | "pending" | "rejected";

export interface LeadStatsRowProps {
  communityEvents: CampusEvent[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export function LeadStatsRow({
  communityEvents,
  statusFilter,
  onStatusFilterChange,
}: LeadStatsRowProps) {
  const approvedCount = useMemo(
    () => communityEvents.filter((e) => e.status === "published").length,
    [communityEvents]
  );
  const pendingCount = useMemo(
    () => communityEvents.filter((e) => e.status === "pending").length,
    [communityEvents]
  );
  const rejectedCount = useMemo(
    () => communityEvents.filter((e) => e.status === "rejected").length,
    [communityEvents]
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
      {/* Total Submissions Card */}
      <button
        type="button"
        onClick={() => onStatusFilterChange("all")}
        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
          statusFilter === "all"
            ? "bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900/15"
            : "bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/60 shadow-2xs"
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${
            statusFilter === "all" ? "text-zinc-300" : "text-zinc-400"
          }`}
        >
          Total Submissions
        </div>
        <div className="text-2xl font-bold tracking-tight">{communityEvents.length}</div>
        <div
          className={`text-[11px] mt-1 ${
            statusFilter === "all" ? "text-zinc-300 font-medium" : "text-zinc-400"
          }`}
        >
          {statusFilter === "all" ? "• Showing all" : "Click to view all"}
        </div>
      </button>

      {/* Approved & Live Card */}
      <button
        type="button"
        onClick={() => onStatusFilterChange("published")}
        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
          statusFilter === "published"
            ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
            : "bg-emerald-50/50 text-emerald-950 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs"
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
            statusFilter === "published" ? "text-emerald-100" : "text-emerald-800"
          }`}
        >
          <CheckCircle2
            className={`w-3.5 h-3.5 ${
              statusFilter === "published" ? "text-emerald-200" : "text-emerald-600"
            }`}
          />
          <span>Approved & Live</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">{approvedCount}</div>
        <div
          className={`text-[11px] mt-1 ${
            statusFilter === "published" ? "text-emerald-100 font-medium" : "text-emerald-700/80"
          }`}
        >
          {statusFilter === "published" ? "• Active filter" : "Live on campus"}
        </div>
      </button>

      {/* Pending Review Card */}
      <button
        type="button"
        onClick={() => onStatusFilterChange("pending")}
        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
          statusFilter === "pending"
            ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20"
            : "bg-amber-50/50 text-amber-950 border-amber-200/80 hover:border-amber-300 hover:bg-amber-50 shadow-2xs"
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
            statusFilter === "pending" ? "text-amber-100" : "text-amber-800"
          }`}
        >
          <Clock3
            className={`w-3.5 h-3.5 ${
              statusFilter === "pending" ? "text-amber-200" : "text-amber-600"
            }`}
          />
          <span>Pending Review</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">{pendingCount}</div>
        <div
          className={`text-[11px] mt-1 ${
            statusFilter === "pending" ? "text-amber-100 font-medium" : "text-amber-700/80"
          }`}
        >
          {statusFilter === "pending" ? "• Active filter" : "In admin triage"}
        </div>
      </button>

      {/* Needs Revision Card */}
      <button
        type="button"
        onClick={() => onStatusFilterChange("rejected")}
        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
          statusFilter === "rejected"
            ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20"
            : "bg-rose-50/50 text-rose-950 border-rose-200/80 hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
            statusFilter === "rejected" ? "text-rose-100" : "text-rose-800"
          }`}
        >
          <XCircle
            className={`w-3.5 h-3.5 ${
              statusFilter === "rejected" ? "text-rose-200" : "text-rose-600"
            }`}
          />
          <span>Needs Revision</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">{rejectedCount}</div>
        <div
          className={`text-[11px] mt-1 ${
            statusFilter === "rejected" ? "text-rose-100 font-medium" : "text-rose-700/80"
          }`}
        >
          {statusFilter === "rejected" ? "• Active filter" : "Feedback provided"}
        </div>
      </button>
    </div>
  );
}
