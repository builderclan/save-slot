"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export interface AdminDeleteTarget {
  type: "event" | "user" | "venue" | "community";
  id: string;
  title: string;
  subtitle?: string;
  metadata?: string;
}

export interface AdminConfirmDeleteModalProps {
  isOpen: boolean;
  target: AdminDeleteTarget | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export function AdminConfirmDeleteModal({
  isOpen,
  target,
  onClose,
  onConfirm,
  isDeleting: externalIsDeleting = false,
}: AdminConfirmDeleteModalProps) {
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);
  const isDeleting = externalIsDeleting || internalIsDeleting;

  if (!target) return null;

  const handleGuardedClose = () => {
    if (isDeleting) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (isDeleting) return;
    setInternalIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setInternalIsDeleting(false);
    }
  };

  const typeConfig: Record<
    AdminDeleteTarget["type"],
    { label: string; confirmLabel: string; prompt: string }
  > = {
    event: {
      label: "Event",
      confirmLabel: "Delete Event",
      prompt: "This campus event and its room allocations will be permanently removed from the calendar. This action cannot be undone.",
    },
    user: {
      label: "User",
      confirmLabel: "Delete User",
      prompt: "This user account will be permanently removed. They will immediately lose system access. This action cannot be undone.",
    },
    venue: {
      label: "Facility",
      confirmLabel: "Delete Facility",
      prompt: "This campus facility will be permanently removed from the registry. This action cannot be undone.",
    },
    community: {
      label: "Club",
      confirmLabel: "Delete Club",
      prompt: "This student club and its historical records will be permanently removed from the directory. This action cannot be undone.",
    },
  };

  const config = typeConfig[target.type];

  return (
    <Modal
      isOpen={isOpen && Boolean(target)}
      onClose={handleGuardedClose}
      disabled={isDeleting}
      title={`Delete "${target.title}"?`}
      description={config.prompt}
      maxWidth="sm"
      icon={
        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Trash2 className="w-5 h-5 stroke-[2]" />
        </div>
      }
    >
      <div className="space-y-4 pt-0.5">
        {/* Context metadata chip if subtitle is provided */}
        {target.subtitle && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-700 shrink-0">
              {config.label}
            </span>
            <span className="truncate font-medium text-zinc-800">{target.subtitle}</span>
          </div>
        )}

        {/* Balanced Full-Width Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleGuardedClose}
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-xs font-semibold text-zinc-700 transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{config.confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
