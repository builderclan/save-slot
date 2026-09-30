"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Event, Community, Venue, ConflictReport } from "@/types/database";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Clock,
} from "lucide-react";
import { RejectionModal } from "@/components/admin/rejection-modal";

export default function AdminDashboardPage() {
  const [version, setVersion] = React.useState(0);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [conflictsMap, setConflictsMap] = React.useState<Record<string, ConflictReport>>({});
  const [conflictCount, setConflictCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rejectingEvent, setRejectingEvent] = React.useState<{ id: string; title: string } | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);

  const refreshData = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      eventService.getEvents({ status: "All" }),
      eventService.getCommunities({ all: true }),
      eventService.getAllVenues(),
    ])
      .then(async ([eventData, commData, venueData]) => {
        if (!isMounted) return;
        setEvents(eventData);
        setCommunities(commData);
        setVenues(venueData);

        const reportMap: Record<string, ConflictReport> = {};
        let conflicts = 0;
        await Promise.all(
          eventData.map(async (e) => {
            if (e.venue_id && e.status !== "cancelled" && e.status !== "rejected") {
              try {
                const rep = await eventService.checkConflicts({
                  eventId: e.id,
                  venueId: e.venue_id,
                  startTime: e.start_time,
                  endTime: e.end_time,
                });
                reportMap[e.id] = rep;
                if (rep.hasVenueConflict) conflicts++;
              } catch {
                // ignore
              }
            }
          })
        );

        if (isMounted) {
          setConflictsMap(reportMap);
          setConflictCount(conflicts);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load admin dashboard data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  const pendingEvents = events.filter((e) => e.status === "pending");
  const publishedEvents = events.filter((e) => e.status === "published");
  const pendingCommunities = communities.filter((c) => c.status === "pending");
  const approvedCommunities = communities.filter((c) => c.status === "approved");

  const handleApproveEvent = async (id: string) => {
    try {
      await eventService.updateEventStatus(id, "published");
      refreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve event");
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingEvent) return;
    setIsRejecting(true);
    try {
      await eventService.updateEventStatus(rejectingEvent.id, "rejected", { rejection_reason: reason });
      setRejectingEvent(null);
      refreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject event");
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-slate-700">Loading campus administration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center space-y-3">
        <p className="text-base font-bold text-red-800">Database Administration Error</p>
        <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Campus Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervise published schedules, resolve room scheduling conflicts, and manage student communities.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href="/admin/events"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-2xs"
          >
            Moderate Events ({pendingEvents.length})
          </Link>
          <Link
            href="/admin/communities"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              pendingCommunities.length > 0
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-2xs"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Club Requests ({pendingCommunities.length})
          </Link>
          <Link
            href="/admin/venues"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Manage Venues ({venues.length})
          </Link>
        </div>
      </div>

      {/* Pending Community Alert Banner */}
      {pendingCommunities.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-amber-800">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">
                {pendingCommunities.length} Community Onboarding Request{pendingCommunities.length > 1 ? "s" : ""}
              </span>{" "}
              awaiting administrative review and organizer lead assignment.
            </div>
          </div>
          <Link
            href="/admin/communities"
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition shrink-0"
          >
            Review Requests &rarr;
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Events</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {pendingEvents.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Club Requests</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {pendingCommunities.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pending onboarding</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Conflicts</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {conflictCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Double-booked venues</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Published Events</span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {publishedEvents.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Visible on calendar</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Organizations</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {approvedCommunities.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active student clubs</p>
        </div>
      </div>

      {/* Moderation Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pending Submissions Queue
            </h2>
            <p className="text-xs text-slate-500">
              Events submitted by student organizations requiring administrative sign-off.
            </p>
          </div>

          <Link
            href="/admin/events"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            View all ({events.length}) &rarr;
          </Link>
        </div>

        {pendingEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 mt-2">
              Queue is completely clear!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              New submissions from student organizations will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingEvents.map((evt) => {
              const conflictReport = conflictsMap[evt.id];

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        Needs Review
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        by {evt.community?.name || "Student Club"}
                      </span>
                      {conflictReport?.hasVenueConflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 animate-pulse flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Venue Double-Booking Conflict!
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {evt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatEventDate(evt.start_time)}</span>
                      <span>•</span>
                      <span>{formatEventTimeRange(evt.start_time, evt.end_time)}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {evt.location_name}
                      </span>
                    </div>

                    {conflictReport?.hasVenueConflict && conflictReport.venueConflicts.length > 0 && (
                      <p className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                        ⚠️ Conflict Warning: {conflictReport.venueConflicts[0].message}
                      </p>
                    )}
                  </div>

                  {/* Admin Approve / Reject Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setRejectingEvent({ id: evt.id, title: evt.title })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveEvent(evt.id)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Styled Rejection Modal */}
      <RejectionModal
        isOpen={Boolean(rejectingEvent)}
        eventTitle={rejectingEvent?.title || ""}
        onClose={() => setRejectingEvent(null)}
        onConfirm={handleConfirmReject}
        isSubmitting={isRejecting}
      />
    </div>
  );
}
