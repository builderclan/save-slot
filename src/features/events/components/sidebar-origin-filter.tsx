"use client";

import type { Department } from "@/types/database";

export type NoticeBoardOriginFilter =
  | "all"
  | "college"
  | "department"
  | "community_internal"
  | "community_external";

const ORIGIN_OPTIONS: Array<{ value: NoticeBoardOriginFilter; label: string }> = [
  { value: "all", label: "All Origins" },
  { value: "college", label: "College" },
  { value: "department", label: "Department" },
  { value: "community_internal", label: "Community · Internal" },
  { value: "community_external", label: "Community · External" },
];

interface SidebarOriginFilterProps {
  selectedOrigin: NoticeBoardOriginFilter;
  onChangeOrigin: (origin: NoticeBoardOriginFilter) => void;
  selectedDepartmentId: string;
  onChangeDepartmentId: (departmentId: string) => void;
  departments: Department[];
  idPrefix?: string;
}

export function SidebarOriginFilter({
  selectedOrigin,
  onChangeOrigin,
  selectedDepartmentId,
  onChangeDepartmentId,
  departments,
  idPrefix = "sidebar",
}: SidebarOriginFilterProps) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2 px-0.5">
          Host Origin
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ORIGIN_OPTIONS.map((opt) => {
            const active = selectedOrigin === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeOrigin(opt.value)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-zinc-900 text-white border-zinc-900 font-semibold shadow-2xs"
                    : "bg-white text-zinc-600 border-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {departments.length > 0 && (
        <div>
          <label
            htmlFor={`${idPrefix}-department-filter`}
            className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5 px-0.5"
          >
            Department
          </label>
          <select
            id={`${idPrefix}-department-filter`}
            value={selectedDepartmentId}
            onChange={(e) => onChangeDepartmentId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} — {dept.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
