"use client";

import { Search, LayoutGrid, CalendarDays, Clock, X } from "lucide-react";

export type ViewMode = "cards" | "month" | "week";
export type DateHorizon = "all" | "today" | "weekend" | "week";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedHorizon: DateHorizon;
  onHorizonChange: (horizon: DateHorizon) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  categories: string[];
}

export function FilterBar({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedHorizon,
  onHorizonChange,
  viewMode,
  onViewModeChange,
  categories,
}: FilterBarProps) {
  return (
    <div className="space-y-4 mb-8">
      {/* Top Bar: Search + View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events by title, keyword, or club..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-zinc-800 bg-zinc-900/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange("cards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "cards"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Notice Board</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "month"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month Grid</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "week"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Week View</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Horizon Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                : "border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
            }`}
          >
            All Categories
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold shadow-sm"
                  : "border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date Horizon Filters */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] font-medium text-zinc-500 mr-1 hidden lg:inline">
            Horizon:
          </span>
          {(
            [
              { id: "all", label: "All Upcoming" },
              { id: "today", label: "Today" },
              { id: "weekend", label: "This Weekend" },
              { id: "week", label: "Next 7 Days" },
            ] as const
          ).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onHorizonChange(h.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedHorizon === h.id
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
