"use client";

import { Clock, CheckCircle2, Users, Building, Compass } from "lucide-react";

export type AdminTab = "triage" | "all-events" | "archive" | "users" | "venues" | "communities";

interface AdminMetricsRowProps {
  activeTab: AdminTab;
  onTabSelect: (tab: AdminTab) => void;
  pendingCount: number;
  publishedCount: number;
  usersCount: number;
  venuesCount: number;
  communitiesCount?: number;
}

export function AdminMetricsRow({
  activeTab,
  onTabSelect,
  pendingCount,
  publishedCount,
  usersCount,
  venuesCount,
  communitiesCount = 0,
}: AdminMetricsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("triage")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("triage");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "triage"
            ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Pending Triage</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{pendingCount}</div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("all-events")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("all-events");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "all-events"
            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Live on Board</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{publishedCount}</div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("users")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("users");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "users"
            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>Staff & Leads</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{usersCount}</div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("venues")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("venues");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "venues"
            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-indigo-600" />
          <span>Campus Venues</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{venuesCount}</div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("communities")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("communities");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "communities"
            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Clubs & Societies</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{communitiesCount}</div>
      </div>
    </div>
  );
}
