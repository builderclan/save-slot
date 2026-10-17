"use client";

import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, isSameMonth, isSameYear } from "date-fns";
import { useCalendar } from "@/context/calendar-context";
import type { AuthUser } from "@/context/auth-context";

function getDateHeading(
  date: Date,
  viewMode: "month" | "week" | "cards",
  isShort: boolean
): string {
  if (viewMode === "week") {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    if (isSameMonth(start, end)) {
      return `${format(start, "MMM d")} – ${format(end, isShort ? "d" : "d, yyyy")}`;
    }
    if (isSameYear(start, end)) {
      return `${format(start, "MMM d")} – ${format(end, isShort ? "MMM d" : "MMM d, yyyy")}`;
    }
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }
  return format(date, isShort ? "MMM yyyy" : "MMMM yyyy");
}

/**
 * Calendar Date Controls (Active month heading, Prev/Next navigation, Today button)
 * Rendered on the left side of the Navbar when on the calendar home page.
 */
export function CalendarDateControls() {
  const calendar = useCalendar();
  if (!calendar) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 pl-1.5 sm:pl-3 min-w-0">
      <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight select-none truncate">
        <span className="md:hidden">
          {getDateHeading(calendar.activeDate, calendar.viewMode, true)}
        </span>
        <span className="hidden md:inline">
          {getDateHeading(calendar.activeDate, calendar.viewMode, false)}
        </span>
      </h2>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={calendar.handlePrev}
          className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label={calendar.viewMode === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={calendar.handleNext}
          className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label={calendar.viewMode === "week" ? "Next week" : "Next month"}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={calendar.handleToday}
        className="px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs shrink-0"
      >
        Today
      </button>
    </div>
  );
}

/**
 * Calendar View Switcher (Month / Week / Board) + Workspace Shortcuts
 * Rendered in the center of the Navbar when on the calendar home page.
 */
export function CalendarViewSwitcher({ user }: { user: AuthUser | null }) {
  const calendar = useCalendar();
  if (!calendar) return null;

  return (
    <div
      role="tablist"
      aria-label="Calendar view and navigation"
      className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 text-xs shadow-2xs"
    >
      {/* Calendar View Switcher (Month | Week | Board) */}
      <button
        type="button"
        role="tab"
        aria-selected={calendar.viewMode === "month"}
        onClick={() => calendar.setViewMode("month")}
        title="Month View"
        className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
          calendar.viewMode === "month"
            ? "bg-white text-slate-900 font-semibold shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>Month</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={calendar.viewMode === "week"}
        onClick={() => calendar.setViewMode("week")}
        title="Week View"
        className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
          calendar.viewMode === "week"
            ? "bg-white text-slate-900 font-semibold shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        <span>Week</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={calendar.viewMode === "cards"}
        onClick={() => calendar.setViewMode("cards")}
        title="Board View"
        className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
          calendar.viewMode === "cards"
            ? "bg-white text-slate-900 font-semibold shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Board</span>
      </button>

      {/* Hairline Divider & Workspace Shortcuts */}
      {(user?.isPrincipal || user?.isLead || user?.isAdmin) && (
        <>
          <div className="w-px h-4 bg-slate-300/80 mx-1 shrink-0" aria-hidden="true" />

          {user?.isPrincipal && (
            <Link
              href="/principal"
              className="px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 text-purple-900 hover:bg-white/80 hover:text-purple-950 active:scale-[0.98]"
              title={user?.role === "vice_principal" ? "Vice Principal Desk" : "Principal Desk"}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              <span>{user?.role === "vice_principal" ? "Vice Principal Desk" : "Principal Desk"}</span>
            </Link>
          )}

          {user?.isLead && (
            <Link
              href="/lead"
              className="px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 text-slate-700 hover:bg-white/80 hover:text-slate-900 active:scale-[0.98]"
              title="Lead Workspace"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>Lead Workspace</span>
            </Link>
          )}

          {user?.isAdmin && (
            <Link
              href="/admin"
              className="px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 text-amber-900 hover:bg-white/80 hover:text-amber-950 active:scale-[0.98]"
              title="Admin Console"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Console</span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
