"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Event, Venue } from "@/types/database";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import { CategoryBadge } from "@/components/events/category-badge";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building,
} from "lucide-react";
import { parseISO, format, areIntervalsOverlapping } from "date-fns";

export default function ConflictRadarPage() {
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVenueFilter, setSelectedVenueFilter] = React.useState<string>("All");

  React.useEffect(() => {
    let isMounted = true;
    Promise.all([
      eventService.getAllVenues(),
      eventService.getEvents({ status: "All" }),
    ])
      .then(([venueData, eventData]) => {
        if (!isMounted) return;
        setVenues(venueData);
        setEvents(eventData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Find all venue collisions
  const venueConflictsList: {
    venue: Venue;
    event1: Event;
    event2: Event;
    overlapWindow: string;
  }[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];

      if (e1.status === "cancelled" || e2.status === "cancelled") continue;
      if (e1.status === "rejected" || e2.status === "rejected") continue;

      // Same physical venue
      if (e1.venue_id && e2.venue_id && e1.venue_id === e2.venue_id) {
        try {
          const s1 = parseISO(e1.start_time);
          const end1 = parseISO(e1.end_time);
          const s2 = parseISO(e2.start_time);
          const end2 = parseISO(e2.end_time);

          if (
            areIntervalsOverlapping(
              { start: s1, end: end1 },
              { start: s2, end: end2 },
              { inclusive: false }
            )
          ) {
            const venue = venues.find((v) => v.id === e1.venue_id);
            if (venue) {
              venueConflictsList.push({
                venue,
                event1: e1,
                event2: e2,
                overlapWindow: `${format(s1, "MMM d, h:mm a")} - ${format(end1, "h:mm a")}`,
              });
            }
          }
        } catch {
          // ignore date parse errors
        }
      }
    }
  }

  // Filter venues for the matrix view
  const displayVenues =
    selectedVenueFilter === "All"
      ? venues
      : venues.filter((v) => v.id === selectedVenueFilter);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-slate-700">Analyzing campus venue schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Real-Time Radar
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Scheduling & Venue Conflict Radar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Campus-wide view of venue bookings, simultaneous student events, and double-booking collisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedVenueFilter}
            onChange={(e) => setSelectedVenueFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="All">All Campus Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <Link
            href="/organizer/events/new"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition whitespace-nowrap"
          >
            + Post Event
          </Link>
        </div>
      </div>

      {/* Critical Collisions Alert Banner */}
      {venueConflictsList.length > 0 ? (
        <div className="rounded-2xl border border-red-300 bg-red-50/80 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-950">
                {venueConflictsList.length} Active Venue Double-Booking{venueConflictsList.length > 1 ? "s" : ""} Requiring Action
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                Two organizations have reserved the same physical hall for overlapping time slots. Organizers or campus admins should adjust timings or relocate one event.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {venueConflictsList.map((collision, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-red-200 p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                    {collision.venue.name} ({collision.venue.building})
                  </span>
                  <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded">
                    Overlapping Window
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Event 1 */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Event A
                    </span>
                    <h5 className="font-bold text-slate-900 leading-snug line-clamp-1">
                      {collision.event1.title}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      by {collision.event1.community?.name || "Campus Org"}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {format(parseISO(collision.event1.start_time), "h:mm a")} - {format(parseISO(collision.event1.end_time), "h:mm a")}
                    </p>
                    <Link
                      href={`/organizer/events/edit/${collision.event1.id}`}
                      className="text-[11px] text-blue-600 hover:underline font-semibold block pt-1"
                    >
                      Edit Timing →
                    </Link>
                  </div>

                  {/* Event 2 */}
                  <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 space-y-1">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                      Event B (Conflicting)
                    </span>
                    <h5 className="font-bold text-slate-900 leading-snug line-clamp-1">
                      {collision.event2.title}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      by {collision.event2.community?.name || "Campus Org"}
                    </p>
                    <p className="text-[11px] text-red-700 font-medium">
                      {format(parseISO(collision.event2.start_time), "h:mm a")} - {format(parseISO(collision.event2.end_time), "h:mm a")}
                    </p>
                    <Link
                      href={`/organizer/events/edit/${collision.event2.id}`}
                      className="text-[11px] text-red-700 hover:underline font-semibold block pt-1"
                    >
                      Edit Timing →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-emerald-900 text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">Zero Venue Collisions Detected</p>
            <p className="text-emerald-700">
              All reserved campus halls have clean, non-overlapping booking schedules.
            </p>
          </div>
        </div>
      )}

      {/* Venue-by-Venue Schedule Matrix */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Campus Venue Bookings Breakdown</span>
          <span className="text-xs font-normal text-slate-500">
            Showing {displayVenues.length} venue{displayVenues.length === 1 ? "" : "s"}
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {displayVenues.map((venue) => {
            const venueEvents = events.filter(
              (e) => e.venue_id === venue.id && e.status !== "cancelled" && e.status !== "rejected"
            );

            return (
              <div
                key={venue.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                {/* Venue Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {venue.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {venue.building} • Capacity: {venue.capacity || "N/A"} seats
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
                    {venueEvents.length} scheduled event{venueEvents.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Bookings Stream */}
                {venueEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No upcoming events booked in this venue. Wide open for new event requests.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {venueEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <CategoryBadge category={evt.category} size="sm" />
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {evt.status}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 truncate">
                          {evt.title}
                        </h4>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <p className="font-medium text-slate-700">
                            {formatEventDate(evt.start_time)}
                          </p>
                          <p>
                            {formatEventTimeRange(evt.start_time, evt.end_time)}
                          </p>
                          <p className="text-slate-400 truncate">
                            Host: {evt.community?.name || "Club"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
