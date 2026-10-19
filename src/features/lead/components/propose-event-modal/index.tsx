"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import {
  ConflictCheckResult,
  SafeSlotSuggestion,
  EventCategory,
  TargetAudience,
} from "@/types/database";
import { conflictsApi } from "@/features/conflicts/api";
import { eventsApi } from "@/features/events/api";
import { PRESET_COVERS, ProposeEventModalProps } from "./types";
import { StepDetails } from "./step-details";
import { StepSchedule } from "./step-schedule";
import { StepPoster } from "./step-poster";

export { type ProposeEventModalProps } from "./types";

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
  const [targetAudience, setTargetAudience] = useState<string[]>(
    initialEvent?.target_audience && initialEvent.target_audience.length > 0
      ? initialEvent.target_audience
      : ["All Students"]
  );
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

  const toggleAudience = (aud: string) => {
    if (aud === "All Students") {
      setTargetAudience(["All Students"]);
    } else {
      let next = targetAudience.filter((a) => a !== "All Students");
      if (next.includes(aud)) {
        next = next.filter((a) => a !== aud);
      } else {
        next.push(aud);
      }
      if (next.length === 0) {
        next = ["All Students"];
      }
      setTargetAudience(next);
    }
    if (stepError) setStepError(null);
  };

  const isOvernight = Boolean(startTimeStr && endTimeStr && endTimeStr < startTimeStr);

  // Compute full ISO strings with overnight support
  const getIsoTimestamps = useCallback(() => {
    try {
      const start = new Date(`${dateStr}T${startTimeStr}:00`);
      let end = new Date(`${dateStr}T${endTimeStr}:00`);
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
        const data = await conflictsApi.check({
          venueId,
          startTime: startIso,
          endTime: endIso,
          category,
          targetAudience: targetAudience as TargetAudience[],
          excludeEventId: initialEvent?.id,
        });

        if (isCurrent) {
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
  }, [venueId, dateStr, startTimeStr, endTimeStr, category, targetAudience, initialEvent?.id, getIsoTimestamps]);

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
    if (targetAudience.length === 0) {
      setStepError("Please select at least one target audience cohort.");
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
      const payload = {
        title,
        category,
        targetAudience: targetAudience as TargetAudience[],
        venueId,
        startTime: startIso,
        endTime: endIso,
        description,
        coverImageUrl,
        externalRegistrationUrl: registrationUrl || null,
        communityId,
      };

      if (initialEvent) {
        await eventsApi.update(initialEvent.id, payload);
      } else {
        await eventsApi.propose(payload);
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
          {currentStep === 1 && (
            <StepDetails
              title={title}
              setTitle={setTitle}
              category={category}
              setCategory={setCategory}
              targetAudience={targetAudience}
              toggleAudience={toggleAudience}
              description={description}
              setDescription={setDescription}
              onFieldChange={() => {
                if (stepError) setStepError(null);
              }}
            />
          )}

          {currentStep === 2 && (
            <StepSchedule
              venues={venues}
              venueId={venueId}
              setVenueId={setVenueId}
              dateStr={dateStr}
              setDateStr={setDateStr}
              startTimeStr={startTimeStr}
              setStartTimeStr={setStartTimeStr}
              endTimeStr={endTimeStr}
              setEndTimeStr={setEndTimeStr}
              isOvernight={isOvernight}
              checkingConflict={checkingConflict}
              conflictResult={conflictResult}
              onApplySafeSlot={applySafeSlot}
              onClearErrors={() => {
                setStepError(null);
                setSubmitError(null);
              }}
            />
          )}

          {currentStep === 3 && (
            <StepPoster
              title={title}
              description={description}
              category={category}
              dateStr={dateStr}
              startTimeStr={startTimeStr}
              endTimeStr={endTimeStr}
              selectedVenue={selectedVenue}
              targetAudience={targetAudience}
              coverImageUrl={coverImageUrl}
              setCoverImageUrl={setCoverImageUrl}
              registrationUrl={registrationUrl}
              setRegistrationUrl={setRegistrationUrl}
            />
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
