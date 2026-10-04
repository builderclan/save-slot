"use client";

import { Plus } from "lucide-react";
import { Venue } from "@/types/database";

interface AdminVenuesViewProps {
  venues: Venue[];
  onToggleVenueActive: (venue: Venue) => void;
  onAddVenueClick: () => void;
}

export function AdminVenuesView({
  venues,
  onToggleVenueActive,
  onAddVenueClick,
}: AdminVenuesViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Physical campus facilities used for collision detection and scheduling.
        </p>
        <button
          type="button"
          onClick={onAddVenueClick}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Facility</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {venues.map((v) => (
          <div
            key={v.id}
            className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">
                  {v.building || "Campus Building"}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleVenueActive(v)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors ${
                    v.is_active
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}
                >
                  {v.is_active ? "Active" : "Under Maintenance"}
                </button>
              </div>

              <h4 className="text-base font-bold text-slate-900 mb-1">{v.name}</h4>
              <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                <span>
                  Capacity: <strong className="text-slate-800 font-semibold">{v.capacity}</strong> attendees
                </span>
              </div>

              {v.notes && (
                <p className="text-[11px] text-slate-400 italic mb-2">
                  {v.notes}
                </p>
              )}
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              {v.address || "Main Campus Grounds"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
