"use client";

import { ShieldAlert, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CampusEvent } from "@/types/database";

export interface LeadRejectionNoticeModalProps {
  isOpen: boolean;
  event: CampusEvent | null;
  onClose: () => void;
  onRevise: (event: CampusEvent) => void;
}

export function LeadRejectionNoticeModal({
  isOpen,
  event,
  onClose,
  onRevise,
}: LeadRejectionNoticeModalProps) {
  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen && !!event}
      onClose={onClose}
      title="Administrative Rejection Notice"
      description={`Proposal feedback for "${event.title}".`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/90 text-xs text-rose-950 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <strong className="font-semibold block text-rose-950 mb-1">Feedback from Reviewer:</strong>
            <p className="text-rose-900 leading-relaxed">
              {event.rejection_reason ||
                "No specific feedback was provided by campus administrators. Please consult with the activities board."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onRevise(event);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Revise & Resubmit</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
