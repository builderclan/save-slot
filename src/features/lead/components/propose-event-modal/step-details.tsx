"use client";

import { Check } from "lucide-react";
import { EventCategory } from "@/types/database";
import { TARGET_AUDIENCE_OPTIONS } from "@/lib/validations";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "./types";

interface StepDetailsProps {
  title: string;
  setTitle: (value: string) => void;
  category: EventCategory;
  setCategory: (value: EventCategory) => void;
  targetAudience: string[];
  toggleAudience: (cohort: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onFieldChange: () => void;
}

export function StepDetails({
  title,
  setTitle,
  category,
  setCategory,
  targetAudience,
  toggleAudience,
  description,
  setDescription,
  onFieldChange,
}: StepDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Event Title - Hero Input */}
      <div>
        <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
          Event Title <span className="text-zinc-400 font-normal">· Clear, recognizable name</span>
        </label>
        <input
          type="text"
          required
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onFieldChange();
          }}
          placeholder="e.g. Systems Programming Workshop & Hack"
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
        />
      </div>

      {/* Category & Audience Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
        {/* Category Dropdown */}
        <div className="sm:col-span-1">
          <Select
            label="Category"
            value={category}
            onChange={(val) => setCategory(val as EventCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </div>

        {/* Target Audience Cohort Multi-Select */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-900">
              Target Audience
            </label>
            <span className="text-[11px] text-zinc-400 font-medium">
              {targetAudience.includes("All Students")
                ? "Campus-Wide"
                : `${targetAudience.length} cohort${targetAudience.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_AUDIENCE_OPTIONS.map((aud) => {
              const isSelected = targetAudience.includes(aud);
              return (
                <button
                  key={aud}
                  type="button"
                  onClick={() => toggleAudience(aud)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-2xs"
                      : "bg-white text-zinc-600 border border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-indigo-600 stroke-[2.5]" />}
                  <span>{aud}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-900">
            Event Description
          </label>
          <span className="text-[11px] text-zinc-400">
            Visible on student notice board
          </span>
        </div>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onFieldChange();
          }}
          placeholder="Outline what attendees will learn or experience, prerequisites, schedule highlights, and key speakers..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all resize-none"
        />
      </div>
    </div>
  );
}
