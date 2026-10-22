"use client";

import { Inbox, Calendar, Clock, ShieldCheck } from "lucide-react";

export type PrincipalDeskTab = "inbox" | "master-schedule" | "history";

interface PrincipalNavSidebarProps {
  activeTab: PrincipalDeskTab;
  onTabChange: (tab: PrincipalDeskTab) => void;
  pendingCount: number;
  approvedCount: number;
  historyCount: number;
  userName?: string;
  mobileDetailView: boolean;
}

export function PrincipalNavSidebar({
  activeTab,
  onTabChange,
  pendingCount,
  approvedCount,
  historyCount,
  userName,
  mobileDetailView,
}: PrincipalNavSidebarProps) {
  return (
    <aside
      className={`w-full lg:w-60 xl:w-64 shrink-0 border-b border-zinc-100 lg:border-b-0 lg:border-r lg:border-zinc-200/90 bg-zinc-50/50 lg:bg-zinc-50/70 px-4 pt-2.5 pb-2 lg:p-4 flex-col lg:justify-between ${
        mobileDetailView ? "hidden lg:flex" : "flex"
      }`}
    >
      <div className="lg:space-y-4">
        <div className="hidden lg:flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">
          <span>Desk Views</span>
          {userName && (
            <span
              className="text-[10px] font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/80 truncate max-w-[125px]"
              title={userName}
            >
              {userName}
            </span>
          )}
        </div>
        <nav
          role="tablist"
          aria-label="Principal desk view switcher"
          className="grid grid-cols-3 lg:flex lg:flex-col gap-1 p-1 lg:p-0 rounded-xl lg:rounded-none bg-zinc-100/90 lg:bg-transparent border border-zinc-200/80 lg:border-none shadow-2xs lg:shadow-none text-xs w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "inbox"}
            onClick={() => onTabChange("inbox")}
            className={`py-1.5 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-xl text-xs transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer active:scale-95 ${
              activeTab === "inbox"
                ? "bg-white text-zinc-900 font-semibold shadow-xs lg:shadow-2xs lg:border lg:border-zinc-200/90"
                : "text-zinc-600 hover:text-zinc-900 font-medium lg:hover:bg-zinc-100/70 lg:border lg:border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5 lg:gap-2">
              <Inbox className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate lg:hidden">Inbox</span>
              <span className="hidden lg:inline">Review Inbox</span>
            </div>
            <span
              className={`px-1.5 lg:px-2 py-0.2 lg:py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums ${
                activeTab === "inbox"
                  ? pendingCount > 0
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100/80"
                    : "bg-zinc-100 text-zinc-800"
                  : "bg-zinc-200/70 text-zinc-600"
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "master-schedule"}
            onClick={() => onTabChange("master-schedule")}
            className={`py-1.5 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-xl text-xs transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer active:scale-95 ${
              activeTab === "master-schedule"
                ? "bg-white text-zinc-900 font-semibold shadow-xs lg:shadow-2xs lg:border lg:border-zinc-200/90"
                : "text-zinc-600 hover:text-zinc-900 font-medium lg:hover:bg-zinc-100/70 lg:border lg:border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5 lg:gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate lg:hidden">Calendar</span>
              <span className="hidden lg:inline">Master Calendar</span>
            </div>
            <span
              className={`px-1.5 lg:px-2 py-0.2 lg:py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums ${
                activeTab === "master-schedule"
                  ? "bg-zinc-100 text-zinc-900 lg:border lg:border-zinc-200/70"
                  : "bg-zinc-200/70 text-zinc-600"
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => onTabChange("history")}
            className={`py-1.5 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-xl text-xs transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer active:scale-95 ${
              activeTab === "history"
                ? "bg-white text-zinc-900 font-semibold shadow-xs lg:shadow-2xs lg:border lg:border-zinc-200/90"
                : "text-zinc-600 hover:text-zinc-900 font-medium lg:hover:bg-zinc-100/70 lg:border lg:border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5 lg:gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate lg:hidden">History</span>
              <span className="hidden lg:inline">Decision History</span>
            </div>
            <span
              className={`px-1.5 lg:px-2 py-0.2 lg:py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums ${
                activeTab === "history"
                  ? "bg-zinc-100 text-zinc-900 lg:border lg:border-zinc-200/70"
                  : "bg-zinc-200/70 text-zinc-600"
              }`}
            >
              {historyCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="hidden lg:block pt-4 border-t border-zinc-200/80">
        <div className="p-3.5 rounded-2xl bg-zinc-100/70 border border-zinc-200/80 text-xs text-zinc-700">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-zinc-900">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Executive Governance</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Deterministic Safe-Slot verification ensures zero venue clashes or audience overlap.
          </p>
        </div>
      </div>
    </aside>
  );
}
