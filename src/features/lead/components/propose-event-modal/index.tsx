"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
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
      <div className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200/90 bg-white text-zinc-900 shadow-2xl overflow-hidden z-10 my-6 flex flex-col max-h-[92vh]">
        {/* Editorial Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                  {isEditMode
                    ? initialEvent?.status === "rejected"
                      ? "Revise & Resubmit Proposal"
                      : "Edit Proposal Details"
                    : "Propose Campus Event"}
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60 truncate">
                  {communityName || "Campus Club"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Safe-Slot conflict engine active • Step {currentStep} of 3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thin Segmented Progress Hairline */}
        <div className="h-1 w-full bg-zinc-100 shrink-0 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: currentStep === 1 ? "33.3%" : currentStep === 2 ? "66.6%" : "100%" }}
          />
        </div>

        {/* Administrative Feedback Banner for Rejected Proposals */}
        {initialEvent?.rejection_reason && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/90 text-xs text-rose-950 flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-semibold text-rose-900 block">
                Administrative Revision Feedback:
              </strong>
              <p className="leading-relaxed text-rose-900/90">{initialEvent.rejection_reason}</p>
            </div>
          </div>
        )}

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
        <div className="flex-1 overflow-y-auto p-6 sm:p-7">
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
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3 shrink-0">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs"
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
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={currentStep === 1 ? handleNextFromStep1 : currentStep === 2 ? handleNextFromStep2 : handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {currentStep === 1
                    ? "Continue to Schedule"
                    : currentStep === 2
                    ? "Continue to Poster & RSVP"
                    : isEditMode
                    ? "Resubmit Event Proposal"
                    : "Submit Event Proposal"}
                </span>
                {currentStep === 3 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
