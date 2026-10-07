"use client";

import { CampusEvent } from "@/types/database";

interface AdminRejectionModalProps {
  rejectingEvent: CampusEvent | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function AdminRejectionModal({
  rejectingEvent,
  rejectionNote,
  onRejectionNoteChange,
  onSubmit,
  onClose,
  isSubmitting,
}: AdminRejectionModalProps) {
  if (!rejectingEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Reject Event Proposal
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Provide actionable guidance for{" "}
          <strong className="text-slate-800 font-semibold">
            {rejectingEvent.community?.name}
          </strong>{" "}
          so they can adjust their date or venue.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quick Preset Guidance
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                "Venue capacity insufficient for expected turnout",
                "Schedule overlap with institutional event / exams",
                "Missing faculty advisor endorsement",
                "Proposal details incomplete — please clarify agenda",
                "Facility is scheduled for maintenance on requested date",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!rejectionNote.trim()) {
                      onRejectionNoteChange(preset);
                    } else if (!rejectionNote.includes(preset)) {
                      onRejectionNoteChange(`${rejectionNote}. ${preset}`);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-[11px] text-slate-600 hover:text-amber-900 transition-colors cursor-pointer text-left active:scale-[0.98]"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Administrative Reason / Venue Guidance *
            </label>
            <textarea
              required
              rows={3}
              value={rejectionNote}
              onChange={(e) => onRejectionNoteChange(e.target.value)}
              placeholder="e.g. The Main Auditorium is undergoing stage maintenance. Please re-submit your proposal for Seminar Hall A or select next Tuesday."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Rejecting..." : "Submit Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
