"use client";

import { type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import type { CampusEvent } from "@/types/database";

export const DEFAULT_REJECTION_PRESETS = [
  "Venue capacity insufficient for expected turnout",
  "Schedule overlap with institutional event / exams",
  "Missing faculty advisor endorsement",
  "Proposal details incomplete — please clarify agenda",
  "Facility is scheduled for maintenance on requested date",
  "Please coordinate with Student Affairs for facility clearance",
];

export interface RejectionModalProps {
  rejectingEvent: CampusEvent | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  title?: string;
  description?: string;
  presets?: string[];
  submitLabel?: string;
  submittingLabel?: string;
}

export function RejectionModal({
  rejectingEvent,
  rejectionNote,
  onRejectionNoteChange,
  onSubmit,
  onClose,
  isSubmitting,
  title = "Reject Event Proposal",
  description,
  presets = DEFAULT_REJECTION_PRESETS,
  submitLabel = "Submit Rejection",
  submittingLabel = "Rejecting...",
}: RejectionModalProps) {
  if (!rejectingEvent) return null;

  const resolvedDescription =
    description ??
    `Provide actionable guidance for ${
      rejectingEvent.community?.name || "the community lead"
    } regarding "${rejectingEvent.title}".`;

  const handlePresetClick = (preset: string) => {
    if (!rejectionNote.trim()) {
      onRejectionNoteChange(preset);
    } else if (!rejectionNote.includes(preset)) {
      onRejectionNoteChange(`${rejectionNote}. ${preset}`);
    }
  };

  return (
    <Modal
      isOpen={Boolean(rejectingEvent)}
      onClose={onClose}
      title={title}
      description={resolvedDescription}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {presets.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quick Preset Guidance
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-[11px] text-slate-600 hover:text-amber-900 transition-colors cursor-pointer text-left active:scale-[0.98]"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Administrative Reason / Feedback Guidance *
          </label>
          <textarea
            required
            rows={3}
            value={rejectionNote}
            onChange={(e) => onRejectionNoteChange(e.target.value)}
            placeholder="e.g. The Main Auditorium is undergoing stage maintenance. Please re-submit your proposal for Seminar Hall A or select next Tuesday."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !rejectionNote.trim()}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
