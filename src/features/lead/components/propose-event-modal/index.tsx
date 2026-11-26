"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { workspaceApi } from "@/features/events/api";
import {
  CoHostEntityInput,
  EventMentorInput,
  PRESET_COVERS,
  ProposeEventModalProps,
} from "./types";
import { StepDetails } from "./step-details";
import { StepSchedule } from "./step-schedule";
import { StepPoster } from "./step-poster";

export { type ProposeEventModalProps } from "./types";

export function ProposeEventModal({
  venues,
  communityId,
  communityName,
  departmentId,
  departments = [],
  communities = [],
  leadCommunities = [],
  overdueCount = 0,
  initialEvent,
  mode = "create",
  onClose,
  onSuccess,
}: ProposeEventModalProps) {
  const isEditMode = mode === "edit" || !!initialEvent;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const canChooseCommunity = leadCommunities.length > 0 || Boolean(communityId);
  const canChooseDepartment = Boolean(departmentId) || departments.length > 0;

  const initialOrigin: "community" | "department" =
    initialEvent?.origin_type === "department"
      ? "department"
      : initialEvent?.origin_type === "community"
      ? "community"
      : !canChooseCommunity && canChooseDepartment
      ? "department"
      : "community";

  const [originType, setOriginType] = useState<"community" | "department">(initialOrigin);
  const [hostCommunityId, setHostCommunityId] = useState<string>(
    initialEvent?.community_id || communityId || leadCommunities[0]?.id || ""
  );
  const [hostDepartmentId, setHostDepartmentId] = useState<string>(
    initialEvent?.department_id || departmentId || departments[0]?.id || ""
  );
  const [coHosts, setCoHosts] = useState<CoHostEntityInput[]>(() =>
    (initialEvent?.stage2_approvals || [])
      .filter((s) => !s.is_primary)
      .map((s) => ({
        entityType: s.entity_type,
        id: s.entity_type === "community" ? s.community_id || "" : s.department_id || "",
      }))
      .filter((ch) => Boolean(ch.id))
  );

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
  const [estimatedBudget, setEstimatedBudget] = useState(
    initialEvent?.estimated_budget !== undefined ? String(initialEvent.estimated_budget) : "0"
  );
  const [fundingSource, setFundingSource] = useState(
    initialEvent?.funding_source || "No Cost"
  );
  const [mentors, setMentors] = useState<EventMentorInput[]>(() =>
    (initialEvent?.mentors || [])
      .filter((m) => m.phase === "planned")
      .map((m) => ({
        name: m.name,
        roleTitle: m.role_title,
        organization: m.organization,
        mentorType: m.mentor_type,
      }))
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialEvent?.cover_image_url || PRESET_COVERS[0].url
  );
  const [registrationUrl, setRegistrationUrl] = useState(
    initialEvent?.external_registration_url || ""
  );

  const [stepError, setStepError] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "submit" | null>(null);
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

  const handleToggleCoHost = (entity: CoHostEntityInput) => {
    setCoHosts((prev) => {
      const exists = prev.some(
        (ch) => ch.entityType === entity.entityType && ch.id === entity.id
      );
      if (exists) {
        return prev.filter(
          (ch) => !(ch.entityType === entity.entityType && ch.id === entity.id)
        );
      }
      return [...prev, entity];
    });
  };

  const isOvernight = Boolean(startTimeStr && endTimeStr && endTimeStr < startTimeStr);

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
    if (originType === "community" && !hostCommunityId) {
      setStepError("Please select the primary hosting club/community.");
      return;
    }
    if (originType === "department" && !hostDepartmentId) {
      setStepError("Please select the primary hosting department.");
      return;
    }
    if (title.trim().length < 3) {
      setStepError("Please provide an event title (minimum 3 characters).");
      return;
    }
    if (targetAudience.length === 0) {
      setStepError("Please select at least one target audience cohort.");
      return;
    }
    if (description.trim().length < 10) {
      setStepError("Please provide an event description (minimum 10 characters).");
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

  const submitProposal = async (action: "draft" | "submit") => {
    setSubmitting(action);
    setSubmitError(null);

    const { startIso, endIso } = getIsoTimestamps();
    if (!startIso || !endIso) {
      setSubmitError("Invalid date or time selected.");
      setSubmitting(null);
      return;
    }

    const hasIncompleteMentor = mentors.some((m) => {
      const hasAnyField = Boolean(
        m.name.trim() || m.roleTitle.trim() || m.organization.trim()
      );
      const hasAllFields = Boolean(
        m.name.trim() && m.roleTitle.trim() && m.organization.trim()
      );
      return hasAnyField && !hasAllFields;
    });
    if (hasIncompleteMentor) {
      setSubmitError(
        "Complete Name, Designation, and Organization for each mentor row, or remove incomplete rows."
      );
      setSubmitting(null);
      return;
    }

    const cleanedMentors = mentors
      .filter((m) => m.name.trim() && m.roleTitle.trim() && m.organization.trim())
      .map((m) => ({
        ...m,
        name: m.name.trim(),
        roleTitle: m.roleTitle.trim(),
        organization: m.organization.trim(),
      }));

    const filteredCoHosts = coHosts.filter(
      (ch) =>
        !(originType === "community" && ch.entityType === "community" && ch.id === hostCommunityId) &&
        !(originType === "department" && ch.entityType === "department" && ch.id === hostDepartmentId)
    );

    try {
      const payload = {
        originType,
        communityId: originType === "community" ? hostCommunityId : null,
        departmentId: originType === "department" ? hostDepartmentId : null,
        coHosts: filteredCoHosts,
        title: title.trim(),
        category,
        targetAudience: targetAudience as TargetAudience[],
        venueId,
        startTime: startIso,
        endTime: endIso,
        description: description.trim(),
        coverImageUrl: coverImageUrl || null,
        externalRegistrationUrl: registrationUrl || null,
        estimatedBudget: Number(estimatedBudget) || 0,
        fundingSource: fundingSource || "No Cost",
        mentors: cleanedMentors,
        action,
      };

      if (initialEvent) {
        await workspaceApi.update(initialEvent.id, payload);
      } else {
        await workspaceApi.propose(payload);
      }

      onSuccess(action);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(null);
    }
  };

  const selectedVenue = venues.find((v) => v.id === venueId);

  const originLabel = useMemo(() => {
    if (originType === "department") {
      const dept = departments.find((d) => d.id === hostDepartmentId);
      return dept ? `Dept · ${dept.code}` : "Department Event";
    }
    const comm =
      communities.find((c) => c.id === hostCommunityId) ||
      leadCommunities.find((c) => c.id === hostCommunityId);
    return comm ? `${comm.name} (${comm.scope || "internal"})` : communityName || "Community Event";
  }, [originType, departments, hostDepartmentId, leadCommunities, communities, hostCommunityId, communityName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200/90 bg-white text-zinc-900 shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 flex items-center justify-between gap-2.5 bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight truncate">
                  {isEditMode
                    ? initialEvent?.status === "needs_reschedule"
                      ? "Reschedule & Resubmit"
                      : initialEvent?.status === "rejected"
                      ? "Revise Proposal"
                      : "Edit Proposal"
                    : "Propose Event"}
                </h2>
                <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60 truncate shrink-0">
                  {originLabel}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate">
                Safe-Slot Active · Step {currentStep} of 3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-zinc-100 shrink-0 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: currentStep === 1 ? "33.3%" : currentStep === 2 ? "66.6%" : "100%" }}
          />
        </div>

        {/* Feedback Banner */}
        {initialEvent?.rejection_reason && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/90 text-xs text-rose-950 flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-semibold text-rose-900 block">
                {initialEvent.status === "needs_reschedule"
                  ? "College Reschedule Notice:"
                  : "Revision Feedback:"}
              </strong>
              <p className="leading-relaxed text-rose-900/90">{initialEvent.rejection_reason}</p>
            </div>
          </div>
        )}

        {overdueCount > 0 && currentStep === 3 && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              You have {overdueCount} overdue closure report{overdueCount === 1 ? "" : "s"}. You may save as draft, but Stage 2 submission is blocked until closure reports are filed.
            </span>
          </div>
        )}

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

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {currentStep === 1 && (
            <StepDetails
              originType={originType}
              setOriginType={setOriginType}
              canChooseCommunity={canChooseCommunity}
              canChooseDepartment={canChooseDepartment}
              hostCommunityId={hostCommunityId}
              setHostCommunityId={setHostCommunityId}
              hostDepartmentId={hostDepartmentId}
              setHostDepartmentId={setHostDepartmentId}
              leadCommunities={leadCommunities}
              departments={departments}
              allCommunities={communities}
              coHosts={coHosts}
              onToggleCoHost={handleToggleCoHost}
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
              originLabel={originLabel}
              coHostCount={coHosts.length}
              estimatedBudget={estimatedBudget}
              setEstimatedBudget={setEstimatedBudget}
              fundingSource={fundingSource}
              setFundingSource={setFundingSource}
              mentors={mentors}
              setMentors={setMentors}
              coverImageUrl={coverImageUrl}
              setCoverImageUrl={setCoverImageUrl}
              registrationUrl={registrationUrl}
              setRegistrationUrl={setRegistrationUrl}
            />
          )}
        </div>

        {/* Navigation Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-2.5 shrink-0">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
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
              className="px-3.5 sm:px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {currentStep === 3 && (
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => submitProposal("draft")}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {submitting === "draft" ? "Saving..." : "Save Draft"}
              </button>
            )}

            <button
              type="button"
              onClick={
                currentStep === 1
                  ? handleNextFromStep1
                  : currentStep === 2
                  ? handleNextFromStep2
                  : () => submitProposal("submit")
              }
              disabled={submitting !== null || (currentStep === 3 && overdueCount > 0)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center gap-1.5 sm:gap-2 shadow-2xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              {submitting === "submit" ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {currentStep === 1
                      ? "Continue to Schedule"
                      : currentStep === 2
                      ? "Continue to Budget & Poster"
                      : isEditMode
                      ? "Resubmit for Stage 2"
                      : "Submit for Stage 2"}
                  </span>
                  <span className="sm:hidden">
                    {currentStep === 1
                      ? "Next: Schedule"
                      : currentStep === 2
                      ? "Next: Poster"
                      : isEditMode
                      ? "Resubmit"
                      : "Submit"}
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
    </div>
  );
}
