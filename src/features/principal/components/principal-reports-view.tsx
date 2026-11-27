"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  FileCheck2,
  MapPin,
  Printer,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/features/events";
import { principalApi } from "../api";

interface PrincipalReportsViewProps {
  reportEvents: CampusEvent[];
  onRefresh: () => Promise<void> | void;
  onNotify: (msg: string, type?: "success" | "error") => void;
  onSelectEvent: (ev: CampusEvent) => void;
}

export function PrincipalReportsView({
  reportEvents,
  onRefresh,
  onNotify,
  onSelectEvent,
}: PrincipalReportsViewProps) {
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [revisingEvent, setRevisingEvent] = useState<CampusEvent | null>(null);
  const [revisionRemarks, setRevisionRemarks] = useState("");
  const [revisionError, setRevisionError] = useState<string | null>(null);

  const setEventBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleVerify = async (
    ev: CampusEvent,
    decision: "verify" | "request_revision",
    remarks?: string
  ) => {
    const targetId = ev.id;
    const reportVersion = ev.report?.updated_at ?? ev.report?.submitted_at ?? null;
    try {
      setEventBusy(targetId, true);
      await principalApi.verifyReport(targetId, decision, remarks, reportVersion);
      await onRefresh();
      onNotify(
        decision === "verify"
          ? `Closure report for "${ev.title}" verified and event marked completed.`
          : `Returned "${ev.title}" closure report for revision.`
      );
      if (decision === "request_revision") {
        setRevisingEvent((current) => {
          if (current?.id !== targetId) return current;
          setRevisionRemarks("");
          setRevisionError(null);
          return null;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify report";
      if (decision === "request_revision") {
        setRevisionError(msg);
      } else {
        onNotify(msg, "error");
      }
    } finally {
      setEventBusy(targetId, false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingEvent) return;
    const trimmed = revisionRemarks.trim();
    if (trimmed.length < 5) {
      setRevisionError("Please provide clear revision remarks (minimum 5 characters).");
      return;
    }
    setRevisionError(null);
    await handleVerify(revisingEvent, "request_revision", trimmed);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 overflow-y-auto">
      <div className="pb-4 border-b border-zinc-200/80">
        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
          Post-Event Closure Reports
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Verify final NAAC/NBA closure reports and mark events completed.
        </p>
      </div>

      {reportEvents.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-12 text-center space-y-2">
          <FileCheck2 className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-sm font-semibold text-zinc-800">
            No closure reports pending executive verification
          </p>
          <p className="text-xs text-zinc-500">
            Reports verified by HOD/FIC or submitted directly will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200/90 bg-white divide-y divide-zinc-100 overflow-hidden">
          {reportEvents.map((ev) => {
            const isBusy = busyIds.has(ev.id);
            const totalParticipants = ev.report
              ? (ev.report.student_count ?? 0) +
                (ev.report.faculty_count ?? 0) +
                (ev.report.external_count ?? 0)
              : 0;
            return (
              <div
                key={ev.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={ev.category} size="sm" />
                    {ev.reference_number && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold text-zinc-700">
                        {ev.reference_number}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-medium">
                      Pending Report Verification
                    </span>
                  </div>
                  <h3
                    onClick={() => onSelectEvent(ev)}
                    className="text-sm font-bold text-zinc-900 hover:text-indigo-600 cursor-pointer truncate"
                  >
                    {ev.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {format(parseISO(ev.start_time), "EEE, MMM d, yyyy")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {ev.venue?.name || ev.location_name}
                    </span>
                    {ev.report && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        {totalParticipants} participants · ₹
                        {Number(ev.report.actual_fund_used ?? 0).toLocaleString("en-IN")} used
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    href={`/reports/events/${ev.id}`}
                    className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dossier</span>
                  </Link>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setRevisingEvent(ev);
                      setRevisionRemarks("");
                      setRevisionError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleVerify(ev, "verify")}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>{isBusy ? "Saving..." : "Verify & Complete"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Revision Remarks Modal */}
      {revisingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs"
            onClick={() => setRevisingEvent(null)}
          />
          <form
            onSubmit={handleRevisionSubmit}
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl p-5 sm:p-6 z-10 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Request Closure Report Revision
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                  {revisingEvent.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevisingEvent(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              required
              value={revisionRemarks}
              onChange={(e) => setRevisionRemarks(e.target.value)}
              placeholder="Specify what needs correction (e.g., attendance count, fund receipt, or NAAC outcomes)..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            {revisionError && (
              <p className="text-xs text-rose-600 font-medium">{revisionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevisingEvent(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyIds.has(revisingEvent.id)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {busyIds.has(revisingEvent.id) ? "Sending..." : "Send Revision Request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
