"use client";

import { format, parseISO } from "date-fns";
import { Check, X, Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface AdminTriageViewProps {
  pendingEvents: CampusEvent[];
  onApprove: (id: string) => void;
  onOpenReject: (event: CampusEvent) => void;
  actionInProgress: string | null;
}

export function AdminTriageView({
  pendingEvents,
  onApprove,
  onOpenReject,
  actionInProgress,
}: AdminTriageViewProps) {
  if (pendingEvents.length === 0) {
    return (
      <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 bg-white p-8">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-slate-900 mb-1">Triage Queue is Clean!</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          All community event submissions have been evaluated and scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingEvents.map((ev) => {
        const startDate = parseISO(ev.start_time);
        const endDate = parseISO(ev.end_time);

        return (
          <div
            key={ev.id}
            className="p-5 rounded-2xl border border-amber-200/90 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={ev.category} size="sm" />
                <span className="text-xs font-semibold text-amber-800">
                  {ev.community?.name || "Campus Community"}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{ev.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {ev.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
                </span>

                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                  </span>
                </span>

                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{ev.venue?.name || ev.location_name}</span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={actionInProgress === ev.id}
                onClick={() => onApprove(ev.id)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>{actionInProgress === ev.id ? "Approving..." : "Approve & Publish"}</span>
              </button>

              <button
                type="button"
                disabled={actionInProgress === ev.id}
                onClick={() => onOpenReject(ev)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-600 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <X className="w-4 h-4" />
                <span>Reject with Note</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
