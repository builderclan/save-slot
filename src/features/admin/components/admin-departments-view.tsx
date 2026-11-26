"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, X, Building2, ShieldAlert, UserCheck } from "lucide-react";
import type { Department } from "@/types/database";

interface AdminDepartmentsViewProps {
  departments: Department[];
  onAddDepartmentClick: () => void;
  onEditDepartmentClick: (department: Department) => void;
  onToggleActingHod: (department: Department) => Promise<void>;
  onDeleteDepartmentClick: (department: Department) => void;
  actionInProgress?: string | null;
}

export function AdminDepartmentsView({
  departments,
  onAddDepartmentClick,
  onEditDepartmentClick,
  onToggleActingHod,
  onDeleteDepartmentClick,
  actionInProgress,
}: AdminDepartmentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.hod?.full_name || "").toLowerCase().includes(q) ||
        (d.acting_hod?.full_name || "").toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Academic Departments</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium tabular-nums border border-zinc-200/60">
              {filteredDepartments.length} {filteredDepartments.length === 1 ? "dept" : "depts"}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, dept, HOD..."
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors h-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onAddDepartmentClick}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-8 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dept</span>
            </button>
          </div>
        </div>

        <div className="p-0 md:p-5">
          {filteredDepartments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white m-4 md:m-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3 text-teal-600">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-800 mb-1">No departments found</h4>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                Register academic departments (CSE, ECE, EEE, AI, ME, CE) and assign HODs.
              </p>
              <button
                type="button"
                onClick={onAddDepartmentClick}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Department</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:gap-4 bg-white md:bg-transparent border-y md:border-y-0 border-zinc-200">
              {filteredDepartments.map((dept) => {
                const isBusy = actionInProgress === dept.id;
                return (
                  <div
                    key={dept.id}
                    className="p-4 sm:p-5 md:rounded-2xl md:border border-zinc-200/90 bg-white hover:border-zinc-300 md:hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
                              {dept.code}
                            </span>
                            {!dept.is_active && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                                Inactive
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-zinc-900 mt-1.5 line-clamp-1">
                            {dept.name}
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                              Primary HOD
                            </div>
                            <div className="font-semibold text-zinc-800 truncate">
                              {dept.hod?.full_name || "Unassigned"}
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                              Acting HOD (Leave Cover)
                            </div>
                            <div className="font-semibold text-zinc-800 truncate">
                              {dept.acting_hod?.full_name || "Not configured"}
                            </div>
                          </div>
                          {dept.acting_hod_user_id && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onToggleActingHod(dept)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50 ${
                                dept.is_acting_hod_active
                                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                              }`}
                            >
                              {dept.is_acting_hod_active ? "Acting Active" : "Activate"}
                            </button>
                          )}
                        </div>
                      </div>

                      {dept.is_acting_hod_active && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/80 px-2.5 py-1.5 rounded-lg">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Acting HOD authority currently active.</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditDepartmentClick(dept)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDepartmentClick(dept)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-400 text-xs transition-all cursor-pointer disabled:opacity-40"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
