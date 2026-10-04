"use client";

import { X } from "lucide-react";
import { CampusEvent } from "@/types/database";

export const DEFAULT_REJECTION_PRESETS = [
  "Venue is reserved for an official institutional assembly / examination.",
  "Event proposal violates campus quiet hours or academic schedule.",
  "Please coordinate with Student Affairs for security and facility clearance.",
  "Auditorium audio/visual equipment undergoing scheduled maintenance.",
  "High likelihood of student turnout overlap with another major campus event.",
];

interface PrincipalRejectionModalProps {
  rejectingEvent: CampusEvent | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onConfirm: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  presets?: string[];
}

export function PrincipalRejectionModal({
  rejectingEvent,
  rejectionNote,
  onRejectionNoteChange,
  onConfirm,
  onClose,
  isSubmitting,
  presets = DEFAULT_REJECTION_PRESETS,
}: PrincipalRejectionModalProps) {
  if (!rejectingEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Decline Proposal
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {rejectingEvent.title}
            </h3>
            <p className="text-xs text-slate-500">
              Submitted by {rejectingEvent.community?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Standard Feedback Reason
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onRejectionNoteChange(preset)}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    rejectionNote === preset
                      ? "bg-slate-100 border-slate-900 text-slate-950 font-semibold"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Note to Community Lead *
            </label>
            <textarea
              required
              rows={3}
              value={rejectionNote}
              onChange={(e) => onRejectionNoteChange(e.target.value)}
              placeholder="Explain why or suggest an alternate slot..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rejectionNote.trim()}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              {isSubmitting ? "Declining..." : "Confirm Decline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
