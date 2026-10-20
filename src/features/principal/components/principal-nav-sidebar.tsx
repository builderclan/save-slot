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
      className={`w-full lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/90 bg-white lg:bg-slate-50/80 p-2 sm:p-3 lg:p-4 flex-col lg:justify-between ${
        mobileDetailView ? "hidden lg:flex" : "flex"
      }`}
    >
      <div className="space-y-2 lg:space-y-4">
        <div className="hidden lg:flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2">
          <span>Desk Views</span>
          {userName && (
            <span
              className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate max-w-[120px]"
              title={userName}
            >
              {userName}
            </span>
          )}
        </div>
        <nav className="grid grid-cols-3 lg:flex lg:flex-col gap-1 p-1 lg:bg-transparent rounded-xl lg:rounded-none w-full">
          <button
            type="button"
            onClick={() => onTabChange("inbox")}
            className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === "inbox"
                ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Inbox
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === "inbox" ? "text-purple-600" : "text-slate-400"
                }`}
              />
              <span className="truncate lg:hidden">Inbox</span>
              <span className="hidden lg:inline">Review Inbox</span>
            </div>
            <span
              className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeTab === "inbox"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("master-schedule")}
            className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === "master-schedule"
                ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Calendar
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === "master-schedule" ? "text-purple-600" : "text-slate-400"
                }`}
              />
              <span className="truncate lg:hidden">Calendar</span>
              <span className="hidden lg:inline">Master Calendar</span>
            </div>
            <span
              className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeTab === "master-schedule"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("history")}
            className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === "history" ? "text-purple-600" : "text-slate-400"
                }`}
              />
              <span className="truncate lg:hidden">History</span>
              <span className="hidden lg:inline">Decision History</span>
            </div>
            <span
              className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeTab === "history"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {historyCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="hidden lg:block pt-4 border-t border-slate-200/80">
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100/80 text-[11px] text-purple-950">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-purple-900">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Executive Desk</span>
          </div>
          <p className="text-[10px] text-purple-800 leading-relaxed">
            Deterministic Safe-Slot verification ensures zero double-booking or category clashes.
          </p>
        </div>
      </div>
    </aside>
  );
}
