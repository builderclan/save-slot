"use client";

import { RejectionModal } from "@/features/events";
import type { CampusEvent } from "@/types/database";

export const DEFAULT_REJECTION_PRESETS = [
  "Venue is reserved for an official institutional assembly / examination.",
  "Event proposal violates campus quiet hours or academic schedule.",
  "Please coordinate with Student Affairs for security and facility clearance.",
  "Auditorium audio/visual equipment undergoing scheduled maintenance.",
  "High likelihood of student turnout overlap with another major campus event.",
];

export interface PrincipalRejectionModalProps {
  rejectingEvent: CampusEvent | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onConfirm: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  presets?: string[];
}

export function PrincipalRejectionModal({
  onConfirm,
  presets = DEFAULT_REJECTION_PRESETS,
  ...props
}: PrincipalRejectionModalProps) {
  return (
    <RejectionModal
      {...props}
      onSubmit={onConfirm}
      presets={presets}
      title="Decline Event Proposal"
      submitLabel="Confirm Decline"
      submittingLabel="Declining..."
    />
  );
}
