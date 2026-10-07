"use client";

import { Venue } from "@/types/database";

interface AdminEditVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  venue: Venue | null;
  name: string;
  onNameChange: (v: string) => void;
  building: string;
  onBuildingChange: (v: string) => void;
  capacity: string;
  onCapacityChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isActive: boolean;
  onIsActiveChange: (v: boolean) => void;
  error?: string | null;
  isSubmitting?: boolean;
}

export function AdminEditVenueModal({
  isOpen,
  onClose,
  onSubmit,
  venue,
  name,
  onNameChange,
  building,
  onBuildingChange,
  capacity,
  onCapacityChange,
  address,
  onAddressChange,
  notes,
  onNotesChange,
  isActive,
  onIsActiveChange,
  error,
  isSubmitting = false,
}: AdminEditVenueModalProps) {
  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Edit Campus Facility
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Update facility specifications, seating capacity, or operational status.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Building</label>
              <input
                type="text"
                value={building}
                onChange={(e) => onBuildingChange(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => onCapacityChange(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Floor</label>
            <input
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="e.g. Block B, 2nd Floor"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Equipment</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Projector, PA system, AC..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Status</label>
            <select
              value={isActive ? "active" : "maintenance"}
              onChange={(e) => onIsActiveChange(e.target.value === "active")}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
            >
              <option value="active">Active (Available for booking)</option>
              <option value="maintenance">Under Maintenance (Temporarily offline)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
