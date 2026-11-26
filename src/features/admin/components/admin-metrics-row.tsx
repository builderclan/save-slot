"use client";

import { Building2, Users, Building, Compass, Settings } from "lucide-react";

export type AdminTab =
  | "departments"
  | "communities"
  | "users"
  | "venues"
  | "settings"
  | "all-events"
  | "archive";

interface AdminMetricsRowProps {
  activeTab: AdminTab;
  onTabSelect: (tab: AdminTab) => void;
  departmentsCount: number;
  communitiesCount: number;
  usersCount: number;
  venuesCount: number;
  publishedCount: number;
}

export function AdminMetricsRow({
  activeTab,
  onTabSelect,
  departmentsCount,
  communitiesCount,
  usersCount,
  venuesCount,
}: AdminMetricsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onTabSelect("departments")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("departments");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "departments"
            ? "border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Departments</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{departmentsCount}</div>
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
          <span>Communities</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 tabular-nums">{communitiesCount}</div>
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
        onClick={() => onTabSelect("settings")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onTabSelect("settings");
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
          activeTab === "settings"
            ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs"
        }`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-amber-600" />
          <span>College Setup</span>
        </div>
        <div className="text-sm font-semibold text-zinc-900 mt-1.5">Letterhead & Year</div>
      </div>
    </div>
  );
}
