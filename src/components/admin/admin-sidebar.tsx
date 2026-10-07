"use client";

import {
  Inbox,
  Calendar,
  Users,
  Building,
  ShieldCheck,
} from "lucide-react";
import { AdminTab } from "./admin-metrics-row";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingCount: number;
  publishedCount: number;
  usersCount: number;
  venuesCount: number;
  currentUserName?: string;
  currentUserEmail?: string;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  pendingCount,
  publishedCount,
  usersCount,
  venuesCount,
  currentUserName = "Campus Dean of Affairs",
}: AdminSidebarProps) {
  const navItems = [
    {
      id: "triage" as AdminTab,
      label: "Review Inbox",
      shortLabel: "Inbox",
      icon: Inbox,
      count: pendingCount,
      highlight: pendingCount > 0,
    },
    {
      id: "all-events" as AdminTab,
      label: "Master Calendar",
      shortLabel: "Calendar",
      icon: Calendar,
      count: publishedCount,
      highlight: false,
    },
    {
      id: "users" as AdminTab,
      label: "User Accounts",
      shortLabel: "Users",
      icon: Users,
      count: usersCount,
      highlight: false,
    },
    {
      id: "venues" as AdminTab,
      label: "Campus Facilities",
      shortLabel: "Venues",
      icon: Building,
      count: venuesCount,
      highlight: false,
    },
  ];

  return (
    <aside
      className="w-full lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/90 bg-white lg:bg-slate-50/80 p-2 sm:p-3 lg:p-4 flex flex-col justify-between"
    >
      <div className="space-y-2 lg:space-y-4">
        <div className="hidden lg:flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2">
          <span>Desk Views</span>
          {currentUserName && (
            <span
              className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 truncate max-w-[120px]"
              title={currentUserName}
            >
              {currentUserName}
            </span>
          )}
        </div>

        <nav className="grid grid-cols-4 lg:flex lg:flex-col gap-1 p-1 lg:bg-transparent rounded-xl lg:rounded-none w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate lg:hidden">{item.shortLabel}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </div>

                <span
                  className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    item.highlight
                      ? "bg-amber-100 text-amber-800"
                      : isActive
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Info */}
      <div className="hidden lg:block pt-4 border-t border-slate-200/80">
        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 text-[11px] text-indigo-950">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-indigo-900">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Operations Console</span>
          </div>
          <p className="text-[10px] text-indigo-800 leading-relaxed">
            Deterministic Safe-Slot verification ensures zero double-booking or category clashes.
          </p>
        </div>
      </div>
    </aside>
  );
}
