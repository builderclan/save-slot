"use client";

import { Calendar, RotateCcw, Search, X } from "lucide-react";
import { Select } from "@/components/ui/select";

export type SortOption = "date-desc" | "date-asc" | "created-desc" | "title-asc";

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Date: Latest First", value: "date-desc" },
  { label: "Date: Earliest First", value: "date-asc" },
  { label: "Recently Submitted", value: "created-desc" },
  { label: "Title: A to Z", value: "title-asc" },
];

export const LEAD_CATEGORIES: Array<{ label: string; value: string }> = [
  { label: "All Categories", value: "all" },
  { label: "Tech", value: "Tech" },
  { label: "Career", value: "Career" },
  { label: "Arts", value: "Arts" },
  { label: "Social", value: "Social" },
  { label: "Sports", value: "Sports" },
  { label: "Academic", value: "Academic" },
  { label: "Workshop", value: "Workshop" },
];

export interface LeadFilterBarProps {
  totalCount: number;
  filteredCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function LeadFilterBar({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onResetFilters,
}: LeadFilterBarProps) {
  return (
    <div className="p-4 sm:p-5 border-b border-zinc-200/80 bg-white space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
            Event Proposals ({totalCount})
          </h2>
          {hasActiveFilters && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium border border-zinc-200/70">
              Showing {filteredCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Control Bar: Search Input, Category Selector, and Sort Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
        {/* Search Input */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by event title, venue, or description..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200/90 bg-zinc-50/60 hover:bg-white focus:bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-4">
          <Select
            size="sm"
            value={categoryFilter}
            onChange={(val) => onCategoryChange(val)}
            options={LEAD_CATEGORIES}
            aria-label="Filter events by category"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="sm:col-span-3">
          <Select
            size="sm"
            value={sortBy}
            onChange={(val) => onSortChange(val as SortOption)}
            options={SORT_OPTIONS}
            aria-label="Sort events"
          />
        </div>
      </div>
    </div>
  );
}
