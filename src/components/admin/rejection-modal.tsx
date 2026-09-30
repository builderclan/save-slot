"use client";

import * as React from "react";
import { X, AlertTriangle, Check } from "lucide-react";

interface RejectionModalProps {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

const COMMON_REASONS = [
  "Venue double-booked or unavailable during this time",
  "Missing essential event details, agenda, or description",
  "Duplicate event submission",
  "Requires official faculty or departmental advisor approval",
  "Policy or safety compliance violation",
];

export function RejectionModal({
  isOpen,
  eventTitle,
  onClose,
  onConfirm,
  isSubmitting = false,
}: RejectionModalProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = React.useState<string>("");

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedPreset;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Reject Event Submission
              </h3>
              <p className="text-xs text-slate-500">
                Provide feedback to the student organizing team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Event Under Review
            </span>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {eventTitle}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Select standard reason:
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((preset) => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset);
                      setCustomReason("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition cursor-pointer ${
                      isSelected
                        ? "bg-rose-50 border-rose-300 text-rose-950 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{preset}</span>
                    {isSelected && <Check className="h-4 w-4 text-rose-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Or write custom feedback / specific instructions:
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this event cannot be approved or what changes are required..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
