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
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleVerify = async (
    ev: CampusEvent,
    decision: "approved" | "needs_revision"
  ) => {
    try {
      setBusyId(ev.id);
      await principalApi.verifyReport(ev.id, decision);
      await onRefresh();
      onNotify(
        decision === "approved"
          ? `Closure report for "${ev.title}" verified and event marked completed.`
          : `Returned "${ev.title}" closure report for revision.`
      );
    } catch (err: unknown) {
      onNotify(
        err instanceof Error ? err.message : "Failed to verify report",
        "error"
      );
    } finally {
      setBusyId(null);
    }
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
            const isBusy = busyId === ev.id;
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
                    onClick={() => handleVerify(ev, "needs_revision")}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleVerify(ev, "approved")}
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
    </div>
  );
}
