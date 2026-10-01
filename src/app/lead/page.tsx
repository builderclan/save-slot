"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  Plus,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { ProposeEventModal } from "@/components/lead/propose-event-modal";

interface LeadSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isLead: boolean;
  leadCommunities: Array<{ id: string; name: string; slug: string }>;
}

export default function LeadWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<LeadSession | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [selectedRejectedEvent, setSelectedRejectedEvent] = useState<CampusEvent | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verify user session
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated || (!meData.user.isLead && !meData.user.isAdmin)) {
        router.push("/login");
        return;
      }
      setSession(meData.user);

      // 2. Load lead's events
      const eventsRes = await fetch("/api/lead/events");
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);

      // 3. Load active venues
      const venuesRes = await fetch("/api/venues");
      const venuesData = await venuesRes.json();
      setVenues(venuesData.venues || []);
    } catch (err) {
      console.error("Lead workspace error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignedCommunity = session?.leadCommunities[0];

  const approvedCount = events.filter((e) => e.status === "published").length;
  const pendingCount = events.filter((e) => e.status === "pending").length;
  const rejectedCount = events.filter((e) => e.status === "rejected").length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading Lead Workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Community Lead Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {assignedCommunity ? assignedCommunity.name : "Community Workspace"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{session?.fullName}</span> ({session?.email})
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsProposeOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Propose New Event</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Submissions
          </div>
          <div className="text-2xl font-bold text-slate-900">{events.length}</div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved & Live</span>
          </div>
          <div className="text-2xl font-bold text-emerald-950">{approvedCount}</div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Review</span>
          </div>
          <div className="text-2xl font-bold text-amber-950">{pendingCount}</div>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/50 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Needs Revision</span>
          </div>
          <div className="text-2xl font-bold text-rose-950">{rejectedCount}</div>
        </div>
      </div>

      {/* Campus Policy Reminder Alert */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white mb-8 flex items-start gap-3 shadow-xs">
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Campus Notice Policy:</strong> All event proposals must be submitted at least <strong>7 days in advance</strong>. Our Safe-Slot Assistant actively checks venue occupancy and timing collisions to ensure your club receives an optimal, clash-free time slot.
        </div>
      </div>

      {/* Events Table / List */}
      <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Event Proposals ({events.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Chronological Index</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 p-6">
            <p className="text-xs text-slate-400 mb-3">No event proposals submitted yet.</p>
            <button
              type="button"
              onClick={() => setIsProposeOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs"
            >
              Submit Your First Event
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {events.map((ev) => {
              const startDate = parseISO(ev.start_time);
              const endDate = parseISO(ev.end_time);

              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={ev.category} size="sm" />

                      {/* Status Chip */}
                      {ev.status === "published" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved & Published</span>
                        </span>
                      )}

                      {ev.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium">
                          <Clock3 className="w-3 h-3 text-amber-600" />
                          <span>Pending Review</span>
                        </span>
                      )}

                      {ev.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => setSelectedRejectedEvent(ev)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-800 text-[10px] font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Rejected (Click to View Note)</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {ev.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(startDate, "EEE, MMM d, yyyy")}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.status === "published" && (
                      <Link
                        href="/"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <span>View Live</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Propose Modal */}
      {isProposeOpen && (
        <ProposeEventModal
          venues={venues}
          communityId={assignedCommunity?.id}
          communityName={assignedCommunity?.name}
          onClose={() => setIsProposeOpen(false)}
          onSuccess={() => {
            setIsProposeOpen(false);
            loadData();
          }}
        />
      )}

      {/* Rejection Note Dialog */}
      {selectedRejectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedRejectedEvent(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 z-10">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Administrative Rejection Notice
              </h3>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Event: <strong className="text-slate-800">{selectedRejectedEvent.title}</strong>
            </p>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 leading-relaxed mb-6">
              {selectedRejectedEvent.rejection_reason ||
                "No specific feedback was provided by campus administrators. Please consult with the activities board."}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRejectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
