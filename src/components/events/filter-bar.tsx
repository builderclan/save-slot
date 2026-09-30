"use client";

import * as React from "react";
import { EventCategory, Community, Venue } from "@/types/database";
import { Search, SlidersHorizontal, X, Calendar as CalendarIcon, List, Columns, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: (EventCategory | "All")[] = [
  "All",
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

const categoryDotStyles: Record<string, string> = {
  All: "bg-slate-400",
  Tech: "bg-blue-600",
  Career: "bg-amber-600",
  Arts: "bg-purple-600",
  Social: "bg-rose-600",
  Sports: "bg-emerald-600",
  Academic: "bg-cyan-600",
  Workshop: "bg-indigo-600",
};

const categoryActiveStyles: Record<string, string> = {
  All: "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold",
  Tech: "bg-blue-50 text-blue-800 border-blue-300 font-semibold shadow-2xs",
  Career: "bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-2xs",
  Arts: "bg-purple-50 text-purple-900 border-purple-300 font-semibold shadow-2xs",
  Social: "bg-rose-50 text-rose-900 border-rose-300 font-semibold shadow-2xs",
  Sports: "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shadow-2xs",
  Academic: "bg-cyan-50 text-cyan-900 border-cyan-300 font-semibold shadow-2xs",
  Workshop: "bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold shadow-2xs",
};

export type ViewMode = "month" | "week" | "list";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: EventCategory | "All";
  onCategoryChange: (cat: EventCategory | "All") => void;
  selectedCommunityId: string | "All";
  onCommunityChange: (id: string | "All") => void;
  selectedVenueId: string | "All";
  onVenueChange: (id: string | "All") => void;
  selectedDateFilter?: "all" | "today" | "tomorrow" | "this-week";
  onDateFilterChange?: (df: "all" | "today" | "tomorrow" | "this-week") => void;
  communities: Community[];
  venues: Venue[];
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
  totalEventsCount: number;
  showViewToggle?: boolean;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedCommunityId,
  onCommunityChange,
  selectedVenueId,
  onVenueChange,
  selectedDateFilter = "all",
  onDateFilterChange,
  communities,
  venues,
  viewMode,
  onViewModeChange,
  totalEventsCount,
  showViewToggle = true,
}: FilterBarProps) {
  const [showDesktopFilters, setShowDesktopFilters] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  const activeFilterCount =
    (selectedCategory !== "All" ? 1 : 0) +
    (selectedCommunityId !== "All" ? 1 : 0) +
    (selectedVenueId !== "All" ? 1 : 0) +
    (selectedDateFilter !== "all" ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearAllFilters = () => {
    onSearchChange("");
    onCategoryChange("All");
    onCommunityChange("All");
    onVenueChange("All");
    if (onDateFilterChange) onDateFilterChange("all");
    setMobileDrawerOpen(false);
  };

  return (
    <div className="space-y-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/90 shadow-2xs max-w-full overflow-hidden">
      {/* Top Row: Search Input, Quick Date Filter Pills, Filters trigger, View Mode Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 sm:gap-2.5">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events, communities, venues, categories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12161f] focus:bg-white transition"
            aria-label="Search campus events"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Date Selector (All, Today, Tomorrow, This Week) */}
        {onDateFilterChange && (
          <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl border border-stone-200/80 text-xs shrink-0 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "all", label: "All Dates" },
                { id: "today", label: "Today" },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "this-week", label: "This Week" },
              ] as const
            ).map((df) => (
              <button
                key={df.id}
                type="button"
                onClick={() => onDateFilterChange(df.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs whitespace-nowrap",
                  selectedDateFilter === df.id
                    ? "bg-[#12161f] text-white shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                )}
              >
                {df.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {/* Filter Trigger Button - Desktop toggle / Mobile bottom sheet opener */}
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileDrawerOpen(true);
              } else {
                setShowDesktopFilters(!showDesktopFilters);
              }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer shrink-0",
              activeFilterCount > 0
                ? "bg-[#12161f] text-white border-[#12161f]"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
            )}
            aria-label="Open filter options"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-stone-900 font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Optional View Mode Switcher (List / Week / Month) */}
          {showViewToggle && (
            <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 shrink-0">
              <button
                onClick={() => onViewModeChange("list")}
                title="List / Agenda View"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                  viewMode === "list"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">List</span>
              </button>
              <button
                onClick={() => onViewModeChange("week")}
                title="Week View"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                  viewMode === "week"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                )}
              >
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Week</span>
              </button>
              <button
                onClick={() => onViewModeChange("month")}
                title="Month View"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                  viewMode === "month"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Month</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Category Filter Pills (Horizontal scrollable, compact) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar max-w-full min-w-0">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-full font-medium transition border cursor-pointer text-xs flex items-center gap-1.5",
                isSelected
                  ? categoryActiveStyles[cat] || "bg-slate-900 text-white border-slate-900 font-semibold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  categoryDotStyles[cat] || "bg-slate-400",
                  isSelected && cat === "All" && "bg-white"
                )}
              />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Row 3: Desktop Expanded Filters (Community, Venue, Date) */}
      {showDesktopFilters && (
        <div className="hidden md:grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 animate-in fade-in duration-100">
          {/* Community Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Community / Host
            </label>
            <select
              value={selectedCommunityId}
              onChange={(e) => onCommunityChange(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="All">All Communities</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Venue Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Venue
            </label>
            <select
              value={selectedVenueId}
              onChange={(e) => onVenueChange(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="All">All Venues & Virtual</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.building})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          {onDateFilterChange && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date Range
              </label>
              <select
                value={selectedDateFilter}
                onChange={(e) => onDateFilterChange(e.target.value as "all" | "today" | "tomorrow" | "this-week")}
                className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">All Upcoming Dates</option>
                <option value="today">Today Only</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This Week</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Filter Status Summary & Clear */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
        <span>
          Showing <strong className="text-slate-900 font-semibold">{totalEventsCount}</strong> event{totalEventsCount === 1 ? "" : "s"}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* MOBILE BOTTOM SHEET / DRAWER (Strictly on mobile screens < md) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Bottom Sheet Modal */}
          <div className="relative bg-white w-full rounded-t-2xl shadow-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Filter Events
              </h3>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Date Filter */}
            {onDateFilterChange && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "all", label: "All Upcoming" },
                    { id: "today", label: "Today" },
                    { id: "tomorrow", label: "Tomorrow" },
                    { id: "this-week", label: "This Week" },
                  ].map((df) => (
                    <button
                      key={df.id}
                      onClick={() => onDateFilterChange(df.id as "all" | "today" | "tomorrow" | "this-week")}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-medium border text-center transition",
                        selectedDateFilter === df.id
                          ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value as EventCategory | "All")}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Community */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Community
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => onCommunityChange(e.target.value)}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="All">All Communities</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => onVenueChange(e.target.value)}
                className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="All">All Venues & Virtual</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.building})
                  </option>
                ))}
              </select>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
              <button
                onClick={clearAllFilters}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Clear All
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
