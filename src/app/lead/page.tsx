"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Sparkles,
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-400">Loading Lead Workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Lead Console</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {assignedCommunity ? assignedCommunity.name : "Community Workspace"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Logged in as <span className="font-semibold text-zinc-200">{session?.fullName}</span> ({session?.email})
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsProposeOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Propose New Event</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Total Submissions
          </div>
          <div className="text-2xl font-bold text-white">{events.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved & Live</span>
          </div>
          <div className="text-2xl font-bold text-emerald-300">{approvedCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </div>
          <div className="text-2xl font-bold text-amber-300">{pendingCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected / Needs Revision</span>
          </div>
          <div className="text-2xl font-bold text-rose-300">{rejectedCount}</div>
        </div>
      </div>

      {/* Campus Policy Reminder Alert */}
      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 mb-8 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-indigo-300">Campus Notice Policy:</strong> All event proposals must be submitted at least <strong>7 days in advance</strong>. Our Safe-Slot Assistant actively checks venue occupancy and timing collisions to ensure your club receives an optimal, clash-free time slot.
        </div>
      </div>

      {/* Events Table / List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Event Proposals ({events.length})</span>
          </h2>
          <span className="text-xs text-zinc-400">Sorted by Date</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 p-6">
            <p className="text-xs text-zinc-500 mb-3">No event proposals submitted yet.</p>
            <button
              type="button"
              onClick={() => setIsProposeOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Submit Your First Event
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 overflow-x-auto">
            {events.map((ev) => {
              const startDate = parseISO(ev.start_time);
              const endDate = parseISO(ev.end_time);

              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={ev.category} size="sm" />

                      {/* Status Chip */}
                      {ev.status === "published" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved & Published</span>
                        </span>
                      )}

                      {ev.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-medium">
                          <Clock3 className="w-3 h-3" />
                          <span>Pending Admin Review</span>
                        </span>
                      )}

                      {ev.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => setSelectedRejectedEvent(ev)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-medium hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Rejected (Click to View Note)</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white truncate">{ev.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{format(startDate, "EEE, MMM d, yyyy")}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>
                          {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ev.status === "published" && (
                      <Link
                        href="/"
                        className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        <span>View on Notice Board</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}

                    {ev.status === "rejected" && (
                      <button
                        type="button"
                        onClick={() => setSelectedRejectedEvent(ev)}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-300 transition-colors"
                      >
                        View Rejection Note
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Propose Event Modal */}
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

      {/* Rejection Feedback Note Drawer/Modal */}
      {selectedRejectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedRejectedEvent(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 p-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Rejection Feedback</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRejectedEvent(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {selectedRejectedEvent.title}
            </h3>

            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200 leading-relaxed mb-6 whitespace-pre-line">
              {selectedRejectedEvent.rejection_reason ||
                "No specific reason was provided by the campus administration."}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRejectedEvent(null);
                  setIsProposeOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all text-center cursor-pointer"
              >
                Propose New Slot for This Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
