"use client";

import {
  Building2,
  Calendar,
  Archive,
  Users,
  Building,
  ShieldCheck,
  Compass,
  Settings,
} from "lucide-react";
import type { AdminTab } from "./admin-metrics-row";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  departmentsCount: number;
  communitiesCount: number;
  usersCount: number;
  venuesCount: number;
  publishedCount: number;
  archivedCount?: number;
  currentUserName?: string;
  currentUserEmail?: string;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  departmentsCount,
  communitiesCount,
  usersCount,
  venuesCount,
  publishedCount,
  archivedCount = 0,
  currentUserName = "Campus Admin",
}: AdminSidebarProps) {
  const navItems = [
    {
      id: "departments" as AdminTab,
      label: "Departments",
      shortLabel: "Depts",
      icon: Building2,
      count: departmentsCount,
    },
    {
      id: "communities" as AdminTab,
      label: "Communities",
      shortLabel: "Clubs",
      icon: Compass,
      count: communitiesCount,
    },
    {
      id: "users" as AdminTab,
      label: "User Accounts",
      shortLabel: "Users",
      icon: Users,
      count: usersCount,
    },
    {
      id: "venues" as AdminTab,
      label: "Campus Facilities",
      shortLabel: "Venues",
      icon: Building,
      count: venuesCount,
    },
    {
      id: "settings" as AdminTab,
      label: "College Settings",
      shortLabel: "Settings",
      icon: Settings,
      count: null as number | null,
    },
    {
      id: "all-events" as AdminTab,
      label: "Master Calendar",
      shortLabel: "Calendar",
      icon: Calendar,
      count: publishedCount,
    },
    {
      id: "archive" as AdminTab,
      label: "Event Archive",
      shortLabel: "Archive",
      icon: Archive,
      count: archivedCount,
    },
  ];

  return (
    <aside className="w-full lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200/80 bg-white lg:bg-zinc-50/60 p-1.5 sm:p-3 lg:p-4 flex flex-col justify-between">
      <div className="space-y-1.5 lg:space-y-4">
        <div className="hidden lg:flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 px-2">
          <span>IT & Ops Setup</span>
          {currentUserName && (
            <span
              className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/70 truncate max-w-[120px]"
              title={currentUserName}
            >
              {currentUserName}
            </span>
          )}
        </div>

        <nav className="flex overflow-x-auto lg:flex-col gap-1 p-0.5 lg:p-1 lg:bg-transparent rounded-xl lg:rounded-none w-full scrollbar-none no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`shrink-0 lg:shrink px-2.5 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap active:scale-[0.99] ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold border border-zinc-200/90"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/70 lg:hover:bg-zinc-100/80 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-indigo-600" : "text-zinc-400"
                    }`}
                  />
                  <span className="truncate lg:hidden">{item.shortLabel}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </div>

                {item.count !== null && (
                  <span
                    className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 border tabular-nums ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200/70 font-semibold"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200/60"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="hidden lg:block pt-4 border-t border-zinc-200/80">
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200/80 text-[11px] text-zinc-600 shadow-2xs">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-zinc-900">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>IT & Operations Only</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Manages departments, communities, venues, and accounts. Event approvals belong strictly to HODs, TICs, and Principal / VP.
          </p>
        </div>
      </div>
    </aside>
  );
}
