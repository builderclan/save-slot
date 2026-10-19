"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { format, addDays } from "date-fns";
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
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">Step 2: Schedule & Safe-Slot Venue</h3>
        <p className="text-xs text-slate-500">
          Select your preferred venue and time window. The Safe-Slot engine validates campus rules and checks for conflicts in real-time.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Campus Venue *</span>
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.capacity} seats) — {v.building || "Campus"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date * (Must be ≥ 7 days ahead)</span>
            </label>
            <input
              type="date"
              required
              min={format(addDays(new Date(), 7), "yyyy-MM-dd")}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Time *</span>
            </label>
            <input
              type="time"
              required
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time *</span>
              </span>
              {isOvernight && (
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/70 px-1.5 py-0.5 rounded-md">
                  Overnight (+1 day)
                </span>
              )}
            </label>
            <input
              type="time"
              required
              value={endTimeStr}
              onChange={(e) => {
                setEndTimeStr(e.target.value);
                onClearErrors();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
            />
          </div>
        </div>

        {/* REAL-TIME SAFE SLOT ASSISTANT PANEL */}
        <div className="pt-3 border-t border-slate-200">
          {checkingConflict ? (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span>Checking room availability against 7-day advance notice rule...</span>
            </div>
          ) : conflictResult ? (
            <div className="space-y-3">
              {/* Status Banner */}
              {!conflictResult.hasConflict &&
              !conflictResult.hasLeadTimeViolation &&
              !conflictResult.hasAudienceConflict ? (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Safe Slot Verified:</strong> Venue is available, no audience clash, and meets the 7-day notice rule ({conflictResult.leadTimeDays} days ahead).
                  </span>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-xs ${
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
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Recommended Clash-Free Safe Slots (1-Click Apply):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {conflictResult.safeSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onApplySafeSlot(slot)}
                        className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-600 hover:shadow-xs transition-all text-xs cursor-pointer group shadow-2xs"
                      >
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>{slot.label}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {slot.venue_name}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 leading-snug">
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
    </div>
  );
}
