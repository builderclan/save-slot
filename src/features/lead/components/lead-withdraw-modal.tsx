"use client";

import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CampusEvent } from "@/types/database";

export interface LeadWithdrawModalProps {
  isOpen: boolean;
  event: CampusEvent | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isWithdrawing?: boolean;
}

export function LeadWithdrawModal({
  isOpen,
  event,
  onClose,
  onConfirm,
  isWithdrawing = false,
}: LeadWithdrawModalProps) {
  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen && !!event}
      onClose={onClose}
      title="Withdraw Event Proposal?"
      description={`Are you sure you want to withdraw "${event.title}"? This will remove the proposal from the administrative triage queue. This action cannot be undone.`}
      maxWidth="md"
    >
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isWithdrawing}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isWithdrawing}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
        >
          {isWithdrawing ? (
            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Withdrawal</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
