"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon,
  ImageIcon,
  Check,
  Sparkles,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { Venue, ConflictCheckResult, SafeSlotSuggestion, EventCategory, CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

const PRESET_COVERS = [
  {
    name: "Tech Hackathon",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Design Workshop",
    url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
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
  initialEvent?: CampusEvent | null;
  mode?: "create" | "edit";
  onClose: () => void;
  onSuccess: () => void;
}

export function ProposeEventModal({
  venues,
  communityId,
  communityName,
  initialEvent,
  mode = "create",
  onClose,
  onSuccess,
}: ProposeEventModalProps) {
  const isEditMode = mode === "edit" || !!initialEvent;
  // Multi-stage step state (1: Details, 2: Schedule & Venue, 3: Poster & Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Initial values based on initialEvent if editing
  const initDate = initialEvent
    ? format(parseISO(initialEvent.start_time), "yyyy-MM-dd")
    : format(addDays(new Date(), 8), "yyyy-MM-dd");
  const initStartTime = initialEvent
    ? format(parseISO(initialEvent.start_time), "HH:mm")
    : "14:00";
  const initEndTime = initialEvent
    ? format(parseISO(initialEvent.end_time), "HH:mm")
    : "17:00";

  const [title, setTitle] = useState(initialEvent?.title || "");
  const [category, setCategory] = useState<EventCategory>(initialEvent?.category || "Tech");
  const [venueId, setVenueId] = useState(
    initialEvent?.venue?.id || initialEvent?.venue_id || venues[0]?.id || ""
  );
  const [dateStr, setDateStr] = useState(initDate);
  const [startTimeStr, setStartTimeStr] = useState(initStartTime);
  const [endTimeStr, setEndTimeStr] = useState(initEndTime);
  const [description, setDescription] = useState(initialEvent?.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialEvent?.cover_image_url || PRESET_COVERS[0].url
  );
  const [registrationUrl, setRegistrationUrl] = useState(
    initialEvent?.external_registration_url || ""
  );

  const [stepError, setStepError] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isOvernight = Boolean(startTimeStr && endTimeStr && endTimeStr < startTimeStr);

  // Compute full ISO strings with overnight support
  const getIsoTimestamps = useCallback(() => {
    try {
      const start = new Date(`${dateStr}T${startTimeStr}:00`);
      let end = new Date(`${dateStr}T${endTimeStr}:00`);
      // If end time is earlier than start time (e.g. 21:00 to 02:00),
      // it means the event runs overnight into the next morning
      if (endTimeStr < startTimeStr) {
        end = addDays(end, 1);
      }
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
            excludeEventId: initialEvent?.id,
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
  }, [venueId, dateStr, startTimeStr, endTimeStr, category, initialEvent?.id, getIsoTimestamps]);

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
    setStepError(null);
    setSubmitError(null);
  };

  const handleNextFromStep1 = () => {
    if (!title.trim()) {
      setStepError("Please provide an event title before proceeding.");
      return;
    }
    if (!description.trim()) {
      setStepError("Please provide a brief event description.");
      return;
    }
    setStepError(null);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!venueId || !dateStr || !startTimeStr || !endTimeStr) {
      setStepError("Please specify a venue, date, and valid times.");
      return;
    }
    if (startTimeStr === endTimeStr) {
      setStepError("End time cannot be identical to start time (minimum 30 minutes duration).");
      return;
    }
    if (conflictResult?.hasConflict) {
      setStepError("This venue has an active booking conflict during this time. Please select an alternate Safe Slot below.");
      return;
    }
    if (conflictResult?.hasLeadTimeViolation) {
      setStepError("Campus policy requires at least 7 days advance notice. Please select a recommended Safe Slot below.");
      return;
    }
    setStepError(null);
    setSubmitError(null);
    setCurrentStep(3);
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
      const url = initialEvent ? `/api/lead/events/${initialEvent.id}` : "/api/lead/events";
      const method = initialEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
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

  const selectedVenue = venues.find((v) => v.id === venueId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-2xl overflow-hidden z-10 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Safe-Slot Assistant</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isEditMode
                ? initialEvent?.status === "rejected"
                  ? "Revise & Resubmit Proposal"
                  : "Edit Proposal Details"
                : "Propose New Campus Event"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditMode ? "Editing submission for: " : "Submitting for: "}
              <span className="font-semibold text-slate-800">{communityName || "Your Community"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Administrative Feedback Banner for Rejected Proposals */}
        {initialEvent?.rejection_reason && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-semibold text-rose-900 block">
                Administrative Revision Feedback:
              </strong>
              <p className="leading-relaxed text-rose-900/90">{initialEvent.rejection_reason}</p>
              <p className="text-[11px] text-rose-700/80 mt-1">
                Updating your venue or schedule to resolve this conflict will resubmit your event directly to campus administrators.
              </p>
            </div>
          </div>
        )}

        {/* Step Progress Tracker */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: "Event Details", desc: "Title & category" },
              { step: 2, title: "Schedule & Venue", desc: "Conflict-free slot" },
              { step: 3, title: "Poster & RSVP", desc: "Media & review" },
            ].map((s, idx) => (
              <div key={s.step} className="flex items-center flex-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      currentStep === s.step
                        ? "bg-indigo-600 text-white shadow-xs"
                        : currentStep > s.step
                        ? "bg-emerald-500 text-white shadow-2xs"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStep > s.step ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={`text-xs font-semibold ${
                        currentStep >= s.step ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-[10px] text-slate-400">{s.desc}</div>
                  </div>
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 sm:mx-4 transition-all ${
                      currentStep > s.step ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Banners */}
        {stepError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{stepError}</span>
          </div>
        )}

        {submitError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Scrollable Stage Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ======================================================== */}
          {/* STAGE 1: EVENT DETAILS */}
          {/* ======================================================== */}
          {currentStep === 1 && (
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
                      if (stepError) setStepError(null);
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
                    if (stepError) setStepError(null);
                  }}
                  placeholder="Outline what attendees will learn or experience, prerequisites, schedule highlights, and key speakers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: SCHEDULE & VENUE (SAFE-SLOT INTELLIGENCE) */}
          {/* ======================================================== */}
          {currentStep === 2 && (
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
                        setStepError(null);
                        setSubmitError(null);
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
                      {!conflictResult.hasConflict && !conflictResult.hasLeadTimeViolation ? (
                        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Safe Slot Verified:</strong> No venue collisions and satisfies the 7-day advance notice rule ({conflictResult.leadTimeDays} days notice).
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
                                onClick={() => applySafeSlot(slot)}
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
          )}

          {/* ======================================================== */}
          {/* STAGE 3: POSTER & REGISTRATION & REVIEW */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Step 3: Poster & Registration Link</h3>
                <p className="text-xs text-slate-500">
                  Select a cover image and optional external RSVP link, then review your submission before submitting for administrator approval.
                </p>
              </div>

              {/* Preset Cover Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Choose Event Poster / Cover</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
                  {PRESET_COVERS.map((cov) => (
                    <button
                      key={cov.url}
                      type="button"
                      onClick={() => setCoverImageUrl(cov.url)}
                      className={`relative h-20 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        coverImageUrl === cov.url
                          ? "border-indigo-600 ring-2 ring-indigo-600/30 shadow-xs"
                          : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={cov.url}
                        alt={cov.name}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2 text-[10px] font-semibold text-white">
                        {cov.name}
                      </div>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Or paste custom image URL..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
                />
              </div>

              {/* External Registration Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>External RSVP / Registration Link (Optional)</span>
                </label>
                <input
                  type="url"
                  value={registrationUrl}
                  onChange={(e) => setRegistrationUrl(e.target.value)}
                  placeholder="https://forms.gle/... or https://luma.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
                />
              </div>

              {/* Proposal Summary Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Proposal Summary
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{description}</p>
                  </div>
                  <CategoryBadge category={category} size="sm" />
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{format(new Date(`${dateStr}T12:00:00`), "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {format(new Date(`2000-01-01T${startTimeStr}`), "h:mm a")} – {format(new Date(`2000-01-01T${endTimeStr}`), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedVenue?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Stage Navigation Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1));
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {currentStep === 1 ? (
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>
                <span className="hidden sm:inline">Next: Schedule & Venue</span>
                <span className="sm:hidden">Next: Schedule</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : currentStep === 2 ? (
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>
                <span className="hidden sm:inline">Next: Poster & RSVP</span>
                <span className="sm:hidden">Next: Review</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    <span className="hidden sm:inline">
                      {isEditMode
                        ? initialEvent?.status === "rejected"
                          ? "Resubmit for Admin Review"
                          : "Save Proposal Changes"
                        : "Submit for Admin Review"}
                    </span>
                    <span className="sm:hidden">{isEditMode ? "Resubmit" : "Submit Event"}</span>
                  </span>
                  <Check className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
