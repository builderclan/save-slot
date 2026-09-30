"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Event, EventStatus, ConflictReport } from "@/types/database";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import { CategoryBadge } from "@/components/events/category-badge";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

export default function AdminEventsModerationPage() {
  const [version, setVersion] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<EventStatus | "All">("pending");

  const refresh = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const [events, setEvents] = React.useState<Event[]>([]);
  const [conflicts, setConflicts] = React.useState<Record<string, ConflictReport>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    eventService
      .getEvents({ status: "All" })
      .then(async (data) => {
        if (!isMounted) return;
        setEvents(data);
        const reportMap: Record<string, ConflictReport> = {};
        for (const evt of data) {
          if (evt.status === "pending" || evt.status === "published") {
            try {
              reportMap[evt.id] = await eventService.checkConflicts({
                eventId: evt.id,
                venueId: evt.venue_id,
                startTime: evt.start_time,
                endTime: evt.end_time,
              });
            } catch {
              // ignore conflict fetch failure
            }
          }
        }
        if (isMounted) setConflicts(reportMap);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load events");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  const filteredEvents = events.filter((e) => {
    if (statusFilter === "All") return true;
    return e.status === statusFilter;
  });

  const handleApprove = async (id: string) => {
    try {
      await eventService.updateEventStatus(id, "published");
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve event");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection:") || "Rejected by campus administration";
    try {
      await eventService.updateEventStatus(id, "rejected", { rejection_reason: reason });
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject event");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Campus Events Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter, inspect, and approve or reject campus events submitted by organizations.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          {(["pending", "published", "draft", "rejected", "cancelled", "All"] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 animate-pulse">
            <p className="text-sm font-semibold text-slate-700">Loading events...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 text-center rounded-2xl border border-red-200">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">
              No events found with status &quot;{statusFilter}&quot;.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const conflictReport = conflicts[evt.id];

            return (
              <div
                key={evt.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={evt.category} size="sm" />
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        evt.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : evt.status === "pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : evt.status === "rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {evt.status}
                    </span>

                    {conflictReport?.hasVenueConflict && evt.status !== "cancelled" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        Venue Double-Booked
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {evt.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <span>{formatEventDate(evt.start_time)}</span>
                    <span>•</span>
                    <span>{formatEventTimeRange(evt.start_time, evt.end_time)}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      {evt.location_name}
                    </span>
                    <span>•</span>
                    <span>Host: {evt.community?.name || "Campus Community"}</span>
                  </div>

                  {conflictReport?.hasVenueConflict && conflictReport.venueConflicts.length > 0 && (
                    <p className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                      ⚠️ Conflict: {conflictReport.venueConflicts[0].message}
                    </p>
                  )}

                  {evt.status === "rejected" && evt.rejection_reason && (
                    <p className="text-xs text-rose-700 italic">
                      Rejection feedback: &quot;{evt.rejection_reason}&quot;
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {evt.external_registration_url ? (
                    <a
                      href={evt.external_registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                      title="Open registration URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title="Open event (No external registration needed)">
                      Open Event
                    </span>
                  )}

                  {evt.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleReject(evt.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(evt.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                    </>
                  )}

                  {evt.status === "published" && (
                    <button
                      onClick={() => handleReject(evt.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Unpublish / Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
