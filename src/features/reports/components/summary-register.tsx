"use client";

import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Download,
  Filter,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useSummaryRegister } from "../hooks/use-summary-register";
import type { SummaryRegisterRow } from "@/server/reports";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending_report_verification", label: "Pending Report Verification" },
  { value: "published", label: "Published (Live)" },
  { value: "cancelled", label: "Cancelled" },
];

const ORIGIN_OPTIONS = [
  { value: "", label: "All Origins" },
  { value: "community", label: "Community / Club" },
  { value: "department", label: "Department" },
  { value: "college", label: "College" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-teal-50 text-teal-800 border-teal-200",
    pending_report_verification: "bg-indigo-50 text-indigo-800 border-indigo-200",
    published: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cancelled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize ${
        map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function TotalsRow({ rows }: { rows: SummaryRegisterRow[] }) {
  const totalParticipants = rows.reduce((s, r) => s + r.total_participants, 0);
  const totalBudget = rows.reduce((s, r) => s + r.estimated_budget, 0);
  const totalFund = rows.reduce((s, r) => s + r.actual_fund_used, 0);
  return (
    <tr className="bg-zinc-50 border-t-2 border-zinc-300 font-semibold text-[11px] text-zinc-800">
      <td className="px-3 py-2" colSpan={6}>
        Totals — {rows.length} event{rows.length !== 1 ? "s" : ""}
      </td>
      <td className="px-3 py-2 text-right">{totalParticipants.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2 text-right">₹{totalBudget.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2 text-right">₹{totalFund.toLocaleString("en-IN")}</td>
      <td />
    </tr>
  );
}

export function SummaryRegister() {
  const {
    filters,
    updateFilter,
    resetFilters,
    data,
    loading,
    error,
    initialized,
    loadRegister,
    downloadCsv,
  } = useSummaryRegister();

  useEffect(() => {
    loadRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.rows ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700">Filters</span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {data?.availableAcademicYears && data.availableAcademicYears.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                Academic Year
              </label>
              <select
                value={filters.academicYear ?? ""}
                onChange={(e) => updateFilter("academicYear", e.target.value || undefined)}
                className="w-full text-xs rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="">All Years</option>
                {data.availableAcademicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              Origin
            </label>
            <select
              value={filters.originType ?? ""}
              onChange={(e) =>
                updateFilter(
                  "originType",
                  (e.target.value as "community" | "department" | "college") || undefined
                )
              }
              className="w-full text-xs rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={filters.status ?? ""}
              onChange={(e) => updateFilter("status", e.target.value || undefined)}
              className="w-full text-xs rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
              <input
                type="text"
                value={filters.search ?? ""}
                onChange={(e) => updateFilter("search", e.target.value || undefined)}
                placeholder="Event title or ref..."
                className="w-full pl-6 pr-2 text-xs rounded-xl border border-zinc-200 bg-white py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              From
            </label>
            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(e) => updateFilter("startDate", e.target.value || undefined)}
              className="w-full text-xs rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              To
            </label>
            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(e) => updateFilter("endDate", e.target.value || undefined)}
              className="w-full text-xs rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button
            type="button"
            onClick={() => loadRegister(filters)}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Apply Filters"}
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filters)}
            className="px-4 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {initialized && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Ref #</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">AY</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Title</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Host</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Category</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Date</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-600">Participants</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-600">Est. Budget</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-600">Actual Fund</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-zinc-400 text-xs">
                      {loading ? "Loading…" : "No events match the current filters."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-3 py-2 font-mono text-zinc-700">
                        {row.reference_number ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{row.academic_year ?? "—"}</td>
                      <td className="px-3 py-2 text-zinc-800 font-medium max-w-[180px] truncate" title={row.title}>
                        {row.title}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        <span>{row.host_name}</span>
                        {row.host_code && (
                          <span className="ml-1 font-mono text-[10px] text-zinc-400">({row.host_code})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 capitalize">{row.category.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">
                        {format(parseISO(row.start_time), "dd MMM yyyy")}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700">
                        {row.total_participants.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600">
                        {row.estimated_budget > 0
                          ? `₹${row.estimated_budget.toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600">
                        {row.actual_fund_used > 0
                          ? `₹${row.actual_fund_used.toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && <TotalsRow rows={rows} />}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
