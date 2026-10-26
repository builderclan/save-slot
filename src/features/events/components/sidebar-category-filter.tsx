"use client";

import React from "react";
import { Check } from "lucide-react";
import { EventCategory } from "@/types/database";
import { CATEGORY_STYLES } from "./category-badge";

export interface SidebarCategoryFilterProps {
  categories: readonly EventCategory[];
  selectedCategories: EventCategory[];
  onToggleCategory: (category: EventCategory) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSelectOnly: (category: EventCategory) => void;
  categoryCounts?: Record<string, number>;
  className?: string;
}

export function SidebarCategoryFilter({
  categories,
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onClear,
  onSelectOnly,
  categoryCounts = {},
  className = "",
}: SidebarCategoryFilterProps) {
  const allSelected = selectedCategories.length === categories.length;
  const noneSelected = selectedCategories.length === 0;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold text-zinc-900 tracking-tight">
          Calendars
        </span>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="text-zinc-500 hover:text-zinc-900 disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors cursor-pointer select-none"
          >
            All
          </button>
          <span className="text-zinc-300">·</span>
          <button
            type="button"
            onClick={onClear}
            disabled={noneSelected}
            className="text-zinc-500 hover:text-zinc-900 disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors cursor-pointer select-none"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-1" role="group" aria-label="Filter events by category">
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat);
          const style = CATEGORY_STYLES[cat] || {
            bg: "bg-zinc-100",
            text: "text-zinc-700",
            border: "border-zinc-200",
            dot: "bg-zinc-400",
          };
          const count = categoryCounts[cat] ?? 0;

          return (
            <div
              key={cat}
              className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-100/70 transition-all cursor-pointer select-none"
              onClick={() => onToggleCategory(cat)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onToggleCategory(cat);
                }
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Checkbox indicator */}
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? `${style.dot} border-transparent text-white shadow-2xs`
                      : "border-zinc-300 bg-white group-hover:border-zinc-400"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                {/* Dot + Label */}
                <span className="text-xs font-medium text-zinc-800 truncate">
                  {cat}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* One-click 'Only' isolation button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOnly(cat);
                  }}
                  title={`Show only ${cat}`}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 transition-all cursor-pointer"
                >
                  Only
                </button>

                {/* Live count badge */}
                <span className="font-mono text-[10px] tabular-nums text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-100 group-hover:bg-white group-hover:text-zinc-600 transition-colors">
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
