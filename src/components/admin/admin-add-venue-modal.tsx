"use client";

interface AdminAddVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
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
}

export function AdminAddVenueModal({
  isOpen,
  onClose,
  onSubmit,
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
}: AdminAddVenueModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Add Campus Facility / Venue
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Add a bookable space for deterministic conflict checking and community scheduling.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Media Lab 304"
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
                placeholder="e.g. Arts Wing"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => onCapacityChange(e.target.value)}
                placeholder="80"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Level</label>
            <input
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="e.g. 3rd Floor, West Wing"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Equipment</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g. Dual projectors, microphones, lab computers..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              Save Venue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
