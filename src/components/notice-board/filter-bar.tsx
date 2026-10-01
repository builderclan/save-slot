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
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, keywords, or clubs..."
            className="w-full pl-10 pr-9 py-2.5 rounded-full border border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full border border-stone-200 bg-stone-100/90 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange("cards")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Notice Board</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "month"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month Grid</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "week"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap shadow-xs ${
              selectedCategory === "all"
                ? "bg-stone-900 text-white font-semibold"
                : "border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:border-stone-300"
            }`}
          >
            All Events
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                selectedCategory === cat
                  ? "bg-stone-900 text-white font-semibold"
                  : "border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:border-stone-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date Horizon Filters */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] font-medium text-stone-400 mr-1 hidden lg:inline uppercase font-mono tracking-wider">
            When:
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
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedHorizon === h.id
                  ? "bg-stone-200/90 text-stone-900 font-semibold"
                  : "text-stone-500 hover:text-stone-800"
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
