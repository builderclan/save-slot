"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Select, DatePicker, TimePicker } from "@/components/ui";
import { ConflictCheckResult, SafeSlotSuggestion, Venue } from "@/types/database";

interface StepScheduleProps {
  venues: Venue[];
  venueId: string;
  setVenueId: (id: string) => void;
  dateStr: string;
  setDateStr: (date: string) => void;
  startTimeStr: string;
  setStartTimeStr: (time: string) => void;
  endTimeStr: string;
  setEndTimeStr: (time: string) => void;
  isOvernight: boolean;
  checkingConflict: boolean;
  conflictResult: ConflictCheckResult | null;
  onApplySafeSlot: (slot: SafeSlotSuggestion) => void;
  onClearErrors: () => void;
}

export function StepSchedule({
  venues,
  venueId,
  setVenueId,
  dateStr,
  setDateStr,
  startTimeStr,
  setStartTimeStr,
  endTimeStr,
  setEndTimeStr,
  isOvernight,
  checkingConflict,
  conflictResult,
  onApplySafeSlot,
  onClearErrors,
}: StepScheduleProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Target Campus Venue */}
        <div>
          <Select
            label="Target Campus Venue"
            leftIcon={<MapPin className="w-3.5 h-3.5" />}
            value={venueId}
            onChange={(val) => setVenueId(val)}
            options={venues.map((v) => ({
              value: v.id,
              label: v.name,
              description: `${v.capacity} seats • ${v.building || "Campus"}`,
            }))}
          />
        </div>

        {/* Event Date */}
        <div>
          <DatePicker
            label="Event Date"
            badge={<span className="text-[11px] text-zinc-400 font-normal">≥ 7 days notice</span>}
            minDate={format(addDays(new Date(), 7), "yyyy-MM-dd")}
            value={dateStr}
            onChange={(val) => setDateStr(val)}
          />
        </div>

        {/* Start & End Times in 2 columns */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-2 sm:gap-4">
          <div>
            <TimePicker
              label="Start Time"
              value={startTimeStr}
              onChange={(val) => setStartTimeStr(val)}
            />
          </div>

          <div>
            <TimePicker
              label="End Time"
              badge={
                isOvernight ? (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/70 px-1 py-0.2 rounded-md">
                    +1d
                  </span>
                ) : undefined
              }
              value={endTimeStr}
              onChange={(val) => {
                setEndTimeStr(val);
                onClearErrors();
              }}
            />
          </div>
        </div>
      </div>

        {/* REAL-TIME SAFE SLOT ASSISTANT PANEL */}
        <div className="pt-3 border-t border-zinc-200/80">
          {checkingConflict ? (
            <div className="p-3.5 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-500 flex items-center gap-2 shadow-2xs">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-indigo-600 rounded-full animate-spin" />
              <span>Checking room availability against 7-day advance notice rule...</span>
            </div>
          ) : conflictResult ? (
            <div className="space-y-3">
              {/* Status Banner */}
              {!conflictResult.hasConflict &&
              !conflictResult.hasLeadTimeViolation &&
              !conflictResult.hasAudienceConflict ? (
                <div className="p-3.5 rounded-xl border border-emerald-200/90 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Safe Slot Verified:</strong> Venue is available, no audience clash, and meets the 7-day notice rule ({conflictResult.leadTimeDays} days ahead).
                  </span>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-2xs ${
                    conflictResult.hasConflict
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {conflictResult.hasConflict ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  ) : conflictResult.hasAudienceConflict ? (
                    <Users className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-xs sm:text-sm">
                      {conflictResult.hasConflict
                        ? "Venue Already Booked"
                        : conflictResult.hasAudienceConflict
                        ? "Audience Overlap with Another Event"
                        : "Short Advance Notice"}
                    </div>
                    <div className="text-xs leading-relaxed opacity-90">
                      {conflictResult.message}
                    </div>
                    {conflictResult.hasAudienceConflict && !conflictResult.hasConflict && (
                      <div className="text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-1 rounded-md inline-block mt-1">
                        Note: You may still submit, but choosing a recommended slot below avoids splitting student attendance.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safe Slot Suggestions */}
              {conflictResult.safeSlots && conflictResult.safeSlots.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Recommended Clash-Free Safe Slots (1-Click Apply):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {conflictResult.safeSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onApplySafeSlot(slot)}
                        className="text-left p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-indigo-600 hover:shadow-xs transition-all text-xs cursor-pointer group shadow-2xs"
                      >
                        <div className="font-bold text-zinc-900 flex items-center justify-between">
                          <span>{slot.label}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                          {slot.venue_name}
                        </div>
                        <div className="text-[11px] text-zinc-600 mt-1 leading-snug">
                          {slot.reason}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
  );
}
