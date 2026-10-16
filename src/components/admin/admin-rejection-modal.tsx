"use client";

import { RejectionModal } from "@/components/events/rejection-modal";
import type { CampusEvent } from "@/types/database";

export interface AdminRejectionModalProps {
  rejectingEvent: CampusEvent | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function AdminRejectionModal(props: AdminRejectionModalProps) {
  return (
    <RejectionModal
      {...props}
      title="Reject Event Proposal"
      submitLabel="Submit Rejection"
      submittingLabel="Rejecting..."
    />
  );
}
