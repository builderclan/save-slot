"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Venue, ConflictCheckResult, SafeSlotSuggestion, EventCategory } from "@/types/database";

const PRESET_COVERS = [
  {
    name: "Tech Hackathon",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Design Workshop",
    url: "https://images.unsplash.com/photo-1581291518655-9523c932deda?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Startup Pitch",
    url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Campus Concert",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
  },
];

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Arts",
  "Career",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

interface ProposeEventModalProps {
  venues: Venue[];
  communityId?: string;
  communityName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProposeEventModal({
  venues,
  communityId,
  communityName,
  onClose,
  onSuccess,
}: ProposeEventModalProps) {
  // Default date to 8 days in the future to satisfy 7-day rule
  const defaultDate = format(addDays(new Date(), 8), "yyyy-MM-dd");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Tech");
  const [venueId, setVenueId] = useState(venues[0]?.id || "");
  const [dateStr, setDateStr] = useState(defaultDate);
  const [startTimeStr, setStartTimeStr] = useState("14:00");
  const [endTimeStr, setEndTimeStr] = useState("17:00");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_COVERS[0].url);
  const [registrationUrl, setRegistrationUrl] = useState("");

  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Compute full ISO strings
  const getIsoTimestamps = useCallback(() => {
    try {
      const start = new Date(`${dateStr}T${startTimeStr}:00`);
      const end = new Date(`${dateStr}T${endTimeStr}:00`);
      return { startIso: start.toISOString(), endIso: end.toISOString() };
    } catch {
      return { startIso: null, endIso: null };
    }
  }, [dateStr, startTimeStr, endTimeStr]);

  // Live conflict & safe-slot check
  useEffect(() => {
    if (!venueId || !dateStr || !startTimeStr || !endTimeStr) return;

    const { startIso, endIso } = getIsoTimestamps();
    if (!startIso || !endIso) return;

    let isCurrent = true;
    setCheckingConflict(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/conflicts/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId,
            startTime: startIso,
            endTime: endIso,
            category,
          }),
        });

        if (res.ok && isCurrent) {
          const data: ConflictCheckResult = await res.json();
          setConflictResult(data);
        }
      } catch (err) {
        console.error("Conflict check error:", err);
      } finally {
        if (isCurrent) setCheckingConflict(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [venueId, dateStr, startTimeStr, endTimeStr, category, getIsoTimestamps]);

  // Apply a recommended Safe Slot
  const applySafeSlot = (slot: SafeSlotSuggestion) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);

    setDateStr(format(start, "yyyy-MM-dd"));
    setStartTimeStr(format(start, "HH:mm"));
    setEndTimeStr(format(end, "HH:mm"));
    if (slot.venue_id) {
      setVenueId(slot.venue_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const { startIso, endIso } = getIsoTimestamps();
    if (!startIso || !endIso) {
      setSubmitError("Invalid date or time selected.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/lead/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          venueId,
          startTime: startIso,
          endTime: endIso,
          description,
          coverImageUrl,
          externalRegistrationUrl: registrationUrl || null,
          communityId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit event proposal");
      }

      onSuccess();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Safe-Slot Assistant</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Propose New Campus Event
            </h2>
            <p className="text-xs text-zinc-400">
              Submitting for: <span className="font-semibold text-zinc-200">{communityName || "Your Community"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="m-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Systems Programming Workshop & Hack"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logistics: Venue, Date, Start Time, End Time */}
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Schedule & Venue Selection
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Target Campus Venue *</span>
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.capacity} seats) — {v.building || "Campus"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Date * (Must be ≥ 7 days ahead)</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Start Time *</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>End Time *</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* REAL-TIME SAFE SLOT ASSISTANT PANEL */}
            <div className="pt-3 border-t border-zinc-800/80">
              {checkingConflict ? (
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Scanning venue schedule & campus calendar density...</span>
                </div>
              ) : conflictResult ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  {!conflictResult.hasConflict && !conflictResult.hasLeadTimeViolation ? (
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Safe Slot Verified:</strong> No venue collisions and satisfies the 7-day advance notice rule ({conflictResult.leadTimeDays} days notice).
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        conflictResult.hasConflict
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">{conflictResult.message}</div>
                        {conflictResult.hasConflict && conflictResult.conflictingEvent && (
                          <div className="text-[11px] opacity-80 mt-1">
                            Clashing with: {conflictResult.conflictingEvent.title} (
                            {conflictResult.conflictingEvent.community?.name})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Safe Slot Suggestions */}
                  {conflictResult.safeSlots && conflictResult.safeSlots.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Recommended Clash-Free Safe Slots (1-Click Apply):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {conflictResult.safeSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applySafeSlot(slot)}
                            className="text-left p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all text-xs cursor-pointer group"
                          >
                            <div className="font-semibold text-indigo-300 flex items-center justify-between">
                              <span>{slot.label}</span>
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                              {slot.venue_name}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Event Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what attendees can expect, prereqs, equipment needed, and key agenda items..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Preset Cover Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
              <span>Event Poster / Cover Image</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {PRESET_COVERS.map((cov) => (
                <button
                  key={cov.url}
                  type="button"
                  onClick={() => setCoverImageUrl(cov.url)}
                  className={`relative h-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    coverImageUrl === cov.url
                      ? "border-indigo-500 ring-2 ring-indigo-500/40"
                      : "border-zinc-800 hover:border-zinc-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={cov.url}
                    alt={cov.name}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 text-[10px] font-semibold text-white">
                    {cov.name}
                  </div>
                </button>
              ))}
            </div>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="Or paste custom image URL (Unsplash, Imgur, etc.)..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* External Registration Link */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
              <span>External RSVP / Registration Link (Optional)</span>
            </label>
            <input
              type="url"
              value={registrationUrl}
              onChange={(e) => setRegistrationUrl(e.target.value)}
              placeholder="https://forms.gle/... or https://luma.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit for Admin Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
