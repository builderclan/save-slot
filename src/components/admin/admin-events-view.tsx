"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Trash2, ExternalLink } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface AdminEventsViewProps {
  allEvents: CampusEvent[];
  onDeleteEvent: (id: string) => void;
  actionInProgress: string | null;
}

export function AdminEventsView({
  allEvents,
  onDeleteEvent,
  actionInProgress,
}: AdminEventsViewProps) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          All Scheduled Events ({allEvents.length})
        </h3>
        <span className="text-xs text-slate-400">Live Institutional Master Index</span>
      </div>

      <div className="divide-y divide-slate-100 overflow-x-auto">
        {allEvents.map((ev) => {
          const startDate = parseISO(ev.start_time);

          return (
            <div
              key={ev.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={ev.category} size="sm" />
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      ev.status === "published"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : ev.status === "pending"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-900 truncate">{ev.title}</h4>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{format(startDate, "MMM d, yyyy · h:mm a")}</span>
                  <span>{ev.venue?.name || ev.location_name}</span>
                  <span className="text-slate-700 font-medium">{ev.community?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ev.status === "published" && (
                  <Link
                    href="/"
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                    title="View on Notice Board"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                <button
                  type="button"
                  disabled={actionInProgress === ev.id}
                  onClick={() => onDeleteEvent(ev.id)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
