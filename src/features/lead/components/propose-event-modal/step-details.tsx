"use client";

import { Check, Users } from "lucide-react";
import { EventCategory } from "@/types/database";
import { TARGET_AUDIENCE_OPTIONS } from "@/lib/validations";
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
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">Step 1: Event Information</h3>
        <p className="text-xs text-slate-500">
          Give your event a clear title and description so students know what to expect.
        </p>
      </div>

      {/* Title & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
            Event Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onFieldChange();
            }}
            placeholder="e.g. Systems Programming Workshop & Hack"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Audience Cohort Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Audience Cohort *</span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">
            {targetAudience.includes("All Students")
              ? "Campus-Wide (Open to All)"
              : `${targetAudience.length} cohort${targetAudience.length === 1 ? "" : "s"} selected`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          {TARGET_AUDIENCE_OPTIONS.map((aud) => {
            const isSelected = targetAudience.includes(aud);
            return (
              <button
                key={aud}
                type="button"
                onClick={() => toggleAudience(aud)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold"
                    : "bg-white text-slate-600 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                <span>{aud}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          The Safe-Slot engine verifies concurrent campus events to protect student turnout for your selected cohorts.
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
          Event Description *
        </label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onFieldChange();
          }}
          placeholder="Outline what attendees will learn or experience, prerequisites, schedule highlights, and key speakers..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
        />
      </div>
    </div>
  );
}
