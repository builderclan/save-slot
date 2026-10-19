"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Venue } from "@/types/database";

interface AdminVenuesViewProps {
  venues: Venue[];
  onToggleVenueActive: (venue: Venue) => void;
  onAddVenueClick: () => void;
  onEditVenueClick: (venue: Venue) => void;
  onDeleteVenueClick: (venue: Venue) => void;
  actionInProgress?: string | null;
}

export function AdminVenuesView({
  venues,
  onToggleVenueActive,
  onAddVenueClick,
  onEditVenueClick,
  onDeleteVenueClick,
  actionInProgress,
}: AdminVenuesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "maintenance">("all");

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      if (statusFilter === "active" && !v.is_active) return false;
      if (statusFilter === "maintenance" && v.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesBuilding = (v.building || "").toLowerCase().includes(q);
        const matchesAddress = (v.address || "").toLowerCase().includes(q);
        const matchesNotes = (v.notes || "").toLowerCase().includes(q);
        return matchesName || matchesBuilding || matchesAddress || matchesNotes;
      }

      return true;
    });
  }, [venues, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campus Facilities</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums border border-slate-200/60">
                {filteredVenues.length} {filteredVenues.length === 1 ? "venue" : "venues"}
              </span>
              <span className="hidden sm:inline-block text-slate-300">•</span>
              <p className="hidden sm:block text-xs text-slate-500">
                Halls, auditoriums & seminar spaces
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facilities, buildings..."
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors h-7.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onAddVenueClick}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-7.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Facility</span>
              </button>
            </div>
          </div>

          {/* Status Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: `All Facilities (${venues.length})` },
              { id: "active", label: `Active (${venues.filter((v) => v.is_active).length})` },
              { id: "maintenance", label: `Under Maintenance (${venues.filter((v) => !v.is_active).length})` },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as "all" | "active" | "maintenance")}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-0 md:p-5">
          {filteredVenues.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-xl border border-dashed border-slate-200 bg-white m-4 md:m-0">
              <Building className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No campus facilities found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or operational filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Mobile View (< md) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white border-y border-slate-200">
                {filteredVenues.map((v) => (
                  <div key={v.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{v.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{v.building || "Campus Facility"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleVenueActive(v)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors active:scale-95 flex items-center gap-1 ${
                          v.is_active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        {v.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Maintenance</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Capacity: {v.capacity} seats</span>
                      </span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[180px]">
                        {v.address || "Main Campus"}
                      </span>
                    </div>

                    {v.notes && (
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg">
                        {v.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={() => onEditVenueClick(v)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress === v.id}
                        onClick={() => onDeleteVenueClick(v)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-medium text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (md+) */}
              <div className="hidden md:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-600 text-[11px] font-semibold tracking-wide border-b border-slate-200 select-none">
                      <tr>
                        <th className="py-2.5 px-4">Facility & Building</th>
                        <th className="py-2.5 px-4">Seating Capacity</th>
                        <th className="py-2.5 px-4">Operational Status</th>
                        <th className="py-2.5 px-4">Location / Notes</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVenues.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-sm">{v.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              <span>{v.building || "Campus Facility"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{v.capacity} attendees</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onToggleVenueActive(v)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors active:scale-95 inline-flex items-center gap-1.5 ${
                                v.is_active
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60"
                                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/60"
                              }`}
                            >
                              {v.is_active ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span>Maintenance</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-slate-700 truncate">{v.address || "Main Campus Grounds"}</div>
                            {v.notes && (
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">{v.notes}</div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditVenueClick(v)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
                                title="Edit Facility"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={actionInProgress === v.id}
                                onClick={() => onDeleteVenueClick(v)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                                title="Delete Facility"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
