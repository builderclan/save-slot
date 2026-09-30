import * as React from "react";
import { ConflictReport } from "@/types/database";
import { AlertTriangle, Clock, MapPin } from "lucide-react";

interface ConflictAlertProps {
  report: ConflictReport;
  className?: string;
  showScheduleOverlaps?: boolean;
}

export function ConflictAlert({
  report,
  className = "",
  showScheduleOverlaps = true,
}: ConflictAlertProps) {
  if (!report.hasVenueConflict && (!report.hasScheduleOverlap || !showScheduleOverlaps)) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Venue Conflict (Severity: HIGH / Actionable Warning) */}
      {report.hasVenueConflict && (
        <div className="rounded-xl border border-red-300 bg-red-50/95 p-4 text-sm text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-red-950 text-sm">
                  Venue conflict
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-200 text-red-900">
                  Actionable Warning
                </span>
              </div>
              <ul className="space-y-2 mt-1">
                {report.venueConflicts.map((vc, idx) => (
                  <li key={idx} className="bg-white/80 rounded-lg p-2.5 border border-red-200 space-y-0.5">
                    <p className="font-semibold text-red-950 flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      {vc.message}
                    </p>
                    <p className="text-[11px] text-red-700 pl-5">
                      You may still save a draft or continue submitting; campus administrators can review or coordinate venue booking.
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. Campus Event Overlap (Severity: INFORMATIONAL / Scheduling Notice) */}
      {showScheduleOverlaps && report.hasScheduleOverlap && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-sm text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-amber-950 text-xs">
                  Campus event overlap
                </h4>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  Informational Notice
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium">
                {report.scheduleOverlaps.length === 1
                  ? "1 other event is happening during this time."
                  : `${report.scheduleOverlaps.length} other events are happening during this time.`}
              </p>
              <div className="mt-1 space-y-1">
                {report.scheduleOverlaps.slice(0, 3).map((so, idx) => (
                  <p key={idx} className="text-xs text-amber-900">
                    • {so.message}
                  </p>
                ))}
                {report.scheduleOverlaps.length > 3 && (
                  <p className="text-[11px] text-amber-700 italic">
                    +{report.scheduleOverlaps.length - 3} more overlapping events
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
