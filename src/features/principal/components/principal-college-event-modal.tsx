"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { CATEGORIES, PRESET_COVERS } from "@/features/lead/components/propose-event-modal/types";
import { EventCategory, UserProfile, Venue } from "@/types/database";
import { CollegeCollisionItem, principalApi } from "../api";
import { ApiException } from "@/lib/api-client";

interface PrincipalCollegeEventModalProps {
  venues: Venue[];
  staffUsers: UserProfile[];
  onClose: () => void;
  onSuccess: (eventTitle: string, bumpedCount: number) => void;
}

export function PrincipalCollegeEventModal({
  venues,
  staffUsers,
  onClose,
  onSuccess,
}: PrincipalCollegeEventModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Academic");
  const [venueId, setVenueId] = useState(venues[0]?.id || "");
  const [dateStr, setDateStr] = useState(format(addDays(new Date(), 10), "yyyy-MM-dd"));
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("13:00");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("0");
  const [description, setDescription] = useState("");

  const [needsLeadOverride, setNeedsLeadOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [pendingCollisions, setPendingCollisions] = useState<CollegeCollisionItem[]>([]);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent,
    confirmLeadOverride = needsLeadOverride,
    confirmedBumpIds: string[] = pendingCollisions.map((c) => c.id)
  ) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const start = new Date(`${dateStr}T${startTimeStr}:00`);
    let end = new Date(`${dateStr}T${endTimeStr}:00`);
    if (endTimeStr <= startTimeStr) {
      end = addDays(end, 1);
    }

    try {
      const res = await principalApi.createCollegeEvent({
        title: title.trim(),
        category,
        targetAudience: ["All Students"],
        venueId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        description: description.trim(),
        coverImageUrl: PRESET_COVERS[2].url,
        externalRegistrationUrl: null,
        estimatedBudget: Number(estimatedBudget) || 0,
        fundingSource: "College Fund",
        coordinatorId: coordinatorId || null,
        mentors: [],
        overrideLeadTime: confirmLeadOverride,
        overrideReason: overrideReason.trim() || null,
        forceRescheduleEventIds: confirmedBumpIds,
        rescheduleReason: rescheduleReason.trim() || null,
      });

      onSuccess(res.event.title, res.bumpedEventIds?.length || 0);
    } catch (err: unknown) {
      if (err instanceof ApiException && err.data && typeof err.data === "object") {
        const data = err.data as {
          code?: string;
          collisions?: CollegeCollisionItem[];
          error?: string;
        };
        if (data.code === "LEAD_TIME_OVERRIDE_REQUIRED") {
          setNeedsLeadOverride(true);
          setError(data.error || "Requires 7-day notice policy override confirmation.");
          setSubmitting(false);
          return;
        }
        if (data.code === "COLLEGE_COLLISION_CONFIRM_REQUIRED" && Array.isArray(data.collisions)) {
          setPendingCollisions(data.collisions);
          setError(data.error || "Slot overlaps existing Department/Community bookings.");
          setSubmitting(false);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Failed to publish College event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs" onClick={onClose} />

      <form
        onSubmit={(e) => handleSubmit(e)}
        className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Schedule Institutional College Event</h2>
              <p className="text-[11px] text-zinc-500">
                Auto-publishes immediately with atomic College reference code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-900 mb-1">Event Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AISAT Annual Convocation 2026"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as EventCategory)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Campus Venue"
              value={venueId}
              onChange={setVenueId}
              options={venues.map((v) => ({ value: v.id, label: `${v.name} (${v.building})` }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-900 mb-1">Date</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-900 mb-1">Start</label>
              <input
                type="time"
                required
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-900 mb-1">End</label>
              <input
                type="time"
                required
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Closure Report Coordinator (Optional)"
              value={coordinatorId}
              onChange={setCoordinatorId}
              options={[
                { value: "", label: "Principal / VP Self-Managed" },
                ...staffUsers.map((u) => ({ value: u.id, label: `${u.full_name} (${u.role})` })),
              ]}
            />
            <div>
              <label className="block font-semibold text-zinc-900 mb-1">
                Estimated Budget (INR)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-900 mb-1">Description</label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Institutional event agenda, guests, and schedule details..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900"
            />
          </div>

          {needsLeadOverride && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="font-bold text-amber-950">
                Confirm 7-Day Advance Notice Override
              </div>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for urgent scheduling override..."
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white"
              />
            </div>
          )}

          {pendingCollisions.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="font-bold text-rose-950">
                Colliding Bookings to Bump ({pendingCollisions.length})
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-900">
                {pendingCollisions.map((col) => (
                  <li key={col.id}>
                    {col.title} ({col.origin_type}, {col.status})
                  </li>
                ))}
              </ul>
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Notice sent to bumped organizers (optional)..."
                className="w-full px-3 py-1.5 rounded-lg border border-rose-300 bg-white"
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            {submitting
              ? "Publishing..."
              : pendingCollisions.length > 0 || needsLeadOverride
              ? "Confirm Override & Publish"
              : "Publish College Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
