"use client";

import Link from "next/link";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Users,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/features/events";

export interface LeadEventsListProps {
  events: CampusEvent[];
  hasActiveFilters: boolean;
  onPreview: (event: CampusEvent) => void;
  onEdit: (event: CampusEvent) => void;
  onWithdraw: (event: CampusEvent) => void;
  onShowRejectionNotice?: (event: CampusEvent) => void;
  onProposeNew: () => void;
  onResetFilters: () => void;
}

export function getRelativeDateBadge(startTime: string) {
  const date = parseISO(startTime);
  const today = new Date();
  const daysUntil = differenceInCalendarDays(date, today);

  if (daysUntil < 0) {
    return {
      label: "Concluded",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  if (daysUntil === 0) {
    return {
      label: "Today",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
    };
  }
  if (daysUntil === 1) {
    return {
      label: "Tomorrow",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  return {
    label: `In ${daysUntil} days`,
    className: "bg-slate-50 text-slate-700 border-slate-200",
  };
}

export function LeadEventsList({
  events,
  hasActiveFilters,
  onPreview,
  onEdit,
  onWithdraw,
  onShowRejectionNotice,
  onProposeNew,
  onResetFilters,
}: LeadEventsListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          {hasActiveFilters ? "No matching proposals found" : "No event proposals submitted yet"}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
          {hasActiveFilters
            ? "Try adjusting your search terms or clearing status and category filters to find what you need."
            : "Your club has not submitted any event proposals yet. Submit your first proposal with automated Safe-Slot collision checks."}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            Reset All Filters
          </button>
        ) : (
          <button
            type="button"
            onClick={onProposeNew}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Submit Your First Event
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {events.map((ev) => {
        const startDate = parseISO(ev.start_time);
        const endDate = parseISO(ev.end_time);
        const relativeBadge = getRelativeDateBadge(ev.start_time);
        const venueName = ev.venue?.name || ev.location_name;

        return (
          <div
            key={ev.id}
            className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
          >
            <div className="space-y-2 flex-1 min-w-0">
              {/* Status & Category Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={ev.category} size="sm" />

                {/* Status Chip */}
                {ev.status === "published" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Approved & Live</span>
                  </span>
                )}

                {ev.status === "pending" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium">
                    <Clock3 className="w-3 h-3 text-amber-600" />
                    <span>Pending Review</span>
                  </span>
                )}

                {ev.status === "rejected" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-800 text-[10px] font-medium">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Needs Revision</span>
                  </span>
                )}

                {/* Relative Timing Pill */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${relativeBadge.className}`}
                >
                  {relativeBadge.label}
                </span>
              </div>

              {/* Title */}
              <div className="flex items-baseline gap-2">
                <h3
                  onClick={() => onPreview(ev)}
                  className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors leading-snug truncate"
                  title={ev.title}
                >
                  {ev.title}
                </h3>
              </div>

              {/* Timestamps & Venue Info */}
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{format(startDate, "EEE, MMM d, yyyy")}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                  </span>
                </span>

                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{venueName}</span>
                  {ev.venue?.capacity && (
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({ev.venue.capacity} cap)
                    </span>
                  )}
                </span>

                {ev.target_audience && ev.target_audience.length > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{ev.target_audience.join(", ")}</span>
                  </span>
                )}
              </div>

              {/* Inline Administrative Feedback Snippet for Rejected Events */}
              {ev.status === "rejected" && ev.rejection_reason && (
                <div
                  onClick={() => onShowRejectionNotice?.(ev)}
                  className="mt-2 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 cursor-pointer hover:bg-rose-100/70 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <strong className="font-semibold block text-rose-950">
                      Administrator Feedback (click to view full notice):
                    </strong>
                    <p className="text-rose-900/90 leading-relaxed line-clamp-2">
                      {ev.rejection_reason}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Suite */}
            <div className="flex items-center gap-2 pt-2 lg:pt-0 self-end lg:self-center shrink-0 flex-wrap">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => onPreview(ev)}
                title="Preview public event card"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Preview</span>
              </button>

              {/* View Live for Published Events */}
              {ev.status === "published" && (
                <Link
                  href="/"
                  title="View on Campus Notice Board"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                >
                  <span>View Live</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}

              {/* Revise & Resubmit for Rejected Events */}
              {ev.status === "rejected" && (
                <button
                  type="button"
                  onClick={() => onEdit(ev)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Revise & Resubmit</span>
                </button>
              )}

              {/* Edit Proposal for Pending Events */}
              {ev.status === "pending" && (
                <button
                  type="button"
                  onClick={() => onEdit(ev)}
                  title="Edit proposal details before review"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit</span>
                </button>
              )}

              {/* Withdraw / Delete Button for Pending or Rejected Events */}
              {ev.status !== "published" && (
                <button
                  type="button"
                  onClick={() => onWithdraw(ev)}
                  title="Withdraw this event proposal"
                  className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer active:scale-[0.98]"
                  aria-label="Withdraw proposal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
