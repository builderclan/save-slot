"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import type { Venue } from "@/types/database";

export interface EditVenueData {
  name: string;
  building: string;
  capacity: number;
  address: string;
  notes: string;
  is_active: boolean;
}

export interface AdminEditVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (venueId: string, data: EditVenueData) => Promise<void>;
  venue: Venue | null;
  isSubmitting?: boolean;
}

export function AdminEditVenueModal({
  isOpen,
  onClose,
  onSubmit,
  venue,
  isSubmitting = false,
}: AdminEditVenueModalProps) {
  const [name, setName] = useState(venue?.name || "");
  const [building, setBuilding] = useState(venue?.building || "");
  const [capacity, setCapacity] = useState(String(venue?.capacity || 100));
  const [address, setAddress] = useState(venue?.address || "");
  const [notes, setNotes] = useState(venue?.notes || "");
  const [isActive, setIsActive] = useState(venue ? venue.is_active : true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (venue && isOpen) {
      setName(venue.name);
      setBuilding(venue.building || "");
      setCapacity(String(venue.capacity || 100));
      setAddress(venue.address || "");
      setNotes(venue.notes || "");
      setIsActive(venue.is_active);
      setError(null);
    }
  }, [venue, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    const parsedCapacity = parseInt(capacity, 10);
    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    try {
      await onSubmit(venue.id, {
        name: name.trim(),
        building: building.trim(),
        capacity: parsedCapacity,
        address: address.trim(),
        notes: notes.trim(),
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating facility");
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!venue}
      onClose={onClose}
      title="Edit Campus Facility"
      description={venue ? `Update specifications and availability for "${venue.name}".` : ""}
    >
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Venue Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Building</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Capacity</label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Address / Level</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Notes / Equipment</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="editVenueIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="editVenueIsActive" className="text-xs font-medium text-zinc-700 cursor-pointer">
            Facility is active and available for event scheduling
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
