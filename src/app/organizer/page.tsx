"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Event, Community, EventStatus, ConflictReport } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import Link from "next/link";
import {
  PlusCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Edit2,
  XCircle,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function OrganizerDashboardPage() {
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<EventStatus | "All">("All");
  const [events, setEvents] = React.useState<Event[]>([]);
  const [conflictsMap, setConflictsMap] = React.useState<Record<string, ConflictReport>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);
  const [cancelModalEvent, setCancelModalEvent] = React.useState<Event | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState("");

  const refreshData = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // 1. Load approved communities for this user/campus
  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    eventService
      .getCommunities()
      .then((data) => {
        if (isMounted) {
          setCommunities(data);
          if (data.length > 0 && !selectedCommunityId) {
            setSelectedCommunityId(data[0].id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load organizations");
      })
      .finally(() => {
        if (isMounted && communities.length === 0) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCommunityId]);

  // 2. Load events for selected community
  React.useEffect(() => {
    if (!selectedCommunityId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    eventService
      .getEvents({
        status: "All",
        communityId: selectedCommunityId || undefined,
      })
      .then(async (data) => {
        if (!isMounted) return;
        setEvents(data);

        // Check conflicts for each active event in parallel
        const cmap: Record<string, ConflictReport> = {};
        await Promise.all(
          data.map(async (e) => {
            if (e.venue_id && e.status !== "cancelled" && e.status !== "rejected") {
              try {
                const rep = await eventService.checkConflicts({
                  eventId: e.id,
                  venueId: e.venue_id,
                  startTime: e.start_time,
                  endTime: e.end_time,
                });
                cmap[e.id] = rep;
              } catch {
                // Ignore individual conflict check failure
              }
            }
          })
        );
        if (isMounted) {
          setConflictsMap(cmap);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load events from database");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCommunityId, version]);

  const activeCommunity = communities.find((c) => c.id === selectedCommunityId) || communities[0];

  const filteredEvents = events.filter((e) => {
    if (statusFilter === "All") return true;
    return e.status === statusFilter;
  });

  const conflictCount = Object.values(conflictsMap).filter((c) => c.hasVenueConflict).length;

  const handleCancelEvent = async (eventId: string) => {
    if (!cancellationReason.trim()) {
      alert("Please provide a reason for cancelling this event.");
      return;
    }
    try {
      await eventService.updateEventStatus(eventId, "cancelled", {
        cancellation_reason: cancellationReason,
      });
      setCancelModalEvent(null);
      setCancellationReason("");
      refreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel event");
    }
  };

  // State when no approved communities exist
  if (!loading && communities.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-xs">
          <Users className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            No Approved Organizations Found
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            You must be an approved leader or officer of a registered campus organization to publish events to the Campus Calendar.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 text-left space-y-1 max-w-md mx-auto">
          <p className="font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            Already submitted an application?
          </p>
          <p className="text-amber-700">
            Your community onboarding request is currently being reviewed by Campus Administration. Once approved, organizer privileges are activated automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/join"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition inline-flex items-center justify-center gap-2 shadow-xs"
          >
            Register Your Club or Organization
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Browse Campus Calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Identity Header & Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Organization Logo */}
          {activeCommunity?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeCommunity.logo_url}
              alt={activeCommunity.name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
              {activeCommunity?.name?.[0] || "C"}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active Organization
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                {activeCommunity?.category}
              </span>
              {conflictCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  {conflictCount} Conflict{conflictCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {activeCommunity?.name || "Campus Community Hub"}
            </h1>

            <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
              {activeCommunity?.description || "Manage schedule, publish events, and coordinate venue bookings."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Community Switcher (if user leads multiple) */}
          {communities.length > 1 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href={`/organizer/events/new${activeCommunity ? `?communityId=${activeCommunity.id}` : ""}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-98 transition shadow-2xs"
          >
            <PlusCircle className="h-4 w-4" />
            Create Event
          </Link>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Database Notice</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={refreshData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 transition shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Total Events</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{events.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Published
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {events.filter((e) => e.status === "published").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> In Review / Pending
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {events.filter((e) => e.status === "pending").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Venue Conflicts
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">{conflictCount}</p>
        </div>
      </div>

      {/* Events Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Status Filter Tabs */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(["All", "published", "pending", "draft", "cancelled"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Link
            href="/organizer/conflicts"
            className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Open Full Conflict Radar →
          </Link>
        </div>

        {/* Table of Events */}
        {loading && events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No events match the selected status filter for {activeCommunity?.name}.
            </p>
            <div className="mt-4">
              <Link
                href={`/organizer/events/new${activeCommunity ? `?communityId=${activeCommunity.id}` : ""}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Publish New Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((event) => {
              const conflictReport = conflictsMap[event.id] || {
                hasVenueConflict: false,
                hasScheduleOverlap: false,
                venueConflicts: [],
                scheduleOverlaps: [],
              };

              return (
                <div
                  key={event.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={event.category} size="sm" />

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          event.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : event.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : event.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {event.status}
                      </span>

                      {/* Conflict Warning Indicator */}
                      {conflictReport.hasVenueConflict && event.status !== "cancelled" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          Venue Double-Booked
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatEventDate(event.start_time)}</span>
                      <span>•</span>
                      <span>{formatEventTimeRange(event.start_time, event.end_time)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">
                        {event.location_name}
                      </span>
                    </div>

                    {/* Show conflict details inline if detected */}
                    {conflictReport.hasVenueConflict && event.status !== "cancelled" && conflictReport.venueConflicts[0] && (
                      <p className="text-xs text-red-700 font-medium pt-1">
                        ⚠️ Conflict: {conflictReport.venueConflicts[0].message}
                      </p>
                    )}

                    {event.status === "cancelled" && event.cancellation_reason && (
                      <p className="text-xs text-rose-700 italic pt-1">
                        Reason for cancellation: &quot;{event.cancellation_reason}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/events/${event.slug}`}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition"
                      title="Preview public page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>

                    <Link
                      href={`/organizer/events/edit/${event.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Link>

                    {event.status !== "cancelled" && (
                      <button
                        onClick={() => setCancelModalEvent(event)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        title="Cancel event"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Event Modal Dialog */}
      {cancelModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Cancel Event: {cancelModalEvent.title}
            </h3>
            <p className="text-xs text-slate-500">
              Please enter the reason for cancelling this event. Students viewing the event will see this reason.
            </p>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g., Speaker rescheduling, inclement weather, merged with another workshop..."
              rows={3}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalEvent(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Go Back
              </button>
              <button
                onClick={() => handleCancelEvent(cancelModalEvent.id)}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
