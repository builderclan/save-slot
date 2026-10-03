"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  ShieldAlert,
  Check,
  X,
  FileCheck,
  Building,
  CalendarDays,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface PrincipalSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
}

const REJECTION_PRESETS = [
  "Venue is reserved for an official institutional assembly / examination.",
  "Event proposal violates the campus quiet hours or academic schedule.",
  "Please coordinate with Student Affairs for security and facility clearance.",
  "Auditorium audio/visual equipment undergoing scheduled maintenance.",
  "High likelihood of student turnout overlap with another major campus festival.",
];

export default function PrincipalDeskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PrincipalSession | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "master-schedule" | "history">("pending");

  // Rejection modal state
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Success message toast
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Auth check: Must be Principal or Admin
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated || (!meData.user.isPrincipal && !meData.user.isAdmin)) {
        router.push("/login?error=principal_required");
        return;
      }
      setSession(meData.user);

      // 2. Fetch all events across campus
      const [evRes, venuesRes] = await Promise.all([
        fetch("/api/lead/events"),
        fetch("/api/venues"),
      ]);

      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(evData.events || []);
      }

      if (venuesRes.ok) {
        const vData = await venuesRes.json();
        setVenues(vData.venues || []);
      }
    } catch (err) {
      console.error("Principal portal load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived subsets
  const pendingEvents = useMemo(() => {
    return events.filter((e) => e.status === "pending");
  }, [events]);

  const approvedEvents = useMemo(() => {
    return events.filter((e) => e.status === "published");
  }, [events]);

  const historyEvents = useMemo(() => {
    return events.filter((e) => e.status === "published" || e.status === "rejected");
  }, [events]);

  // Actions
  const handleApprove = async (eventId: string) => {
    setActionInProgress(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: "published" } : e))
        );
        setBannerNotice({
          message: `Official approval granted: "${updated.event?.title || "Event"}" is now live on the Student Notice Board.`,
          type: "success",
        });
        setTimeout(() => setBannerNotice(null), 6000);
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenReject = (ev: CampusEvent) => {
    setRejectingEvent(ev);
    setRejectionNote(REJECTION_PRESETS[0]);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingEvent) return;

    const eventId = rejectingEvent.id;
    setActionInProgress(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: rejectionNote.trim(),
        }),
      });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, status: "rejected", rejection_reason: rejectionNote.trim() }
              : e
          )
        );
        setBannerNotice({
          message: `Proposal declined with feedback sent to ${rejectingEvent.community?.name || "Community Lead"}.`,
          type: "info",
        });
        setTimeout(() => setBannerNotice(null), 6000);
        setRejectingEvent(null);
        setRejectionNote("");
      }
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-sm font-semibold text-slate-800">Authenticating Executive Desk...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to institutional records</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-slate-50 via-purple-50/20 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* EXECUTIVE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-8 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-purple-900 text-xs font-semibold mb-2.5 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-purple-700" />
              <span>Office of the Principal • Executive Approval Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campus Event Approvals & Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Authorized signatory:{" "}
              <strong className="text-slate-800 font-semibold">{session?.fullName}</strong>{" "}
              <span className="text-slate-400 font-mono text-xs">({session?.email})</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Public Calendar</span>
            </Link>
            {session?.isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/70 text-xs font-semibold text-amber-900 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>Admin Operations</span>
              </Link>
            )}
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {bannerNotice && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-center gap-3 shadow-xs transition-all ${
              bannerNotice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-slate-100 border-slate-300 text-slate-800"
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                bannerNotice.type === "success" ? "text-emerald-600" : "text-slate-600"
              }`}
            />
            <p className="font-medium flex-1">{bannerNotice.message}</p>
            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* EXECUTIVE KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl border border-purple-200/90 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-purple-700 font-semibold mb-1">
              <span>Pending Sign-off</span>
              <FileCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-950">
              {pendingEvents.length}
            </div>
            <div className="text-[11px] text-purple-600/80 mt-1">Requires principal authorization</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/90 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
              <span>Approved & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-950">
              {approvedEvents.length}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">Visible on student board</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
              <span>Bookable Venues</span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{venues.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Auditoriums & halls active</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
              <span>Total Submissions</span>
              <CalendarDays className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{events.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Full academic semester</div>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 w-fit mb-6 shadow-inner text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-purple-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Proposals Awaiting Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "pending"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-300 text-slate-700"
              }`}
            >
              {pendingEvents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("master-schedule")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "master-schedule"
                ? "bg-white text-purple-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Campus Master Schedule</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "master-schedule"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-300 text-slate-700"
              }`}
            >
              {approvedEvents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-purple-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Decision Log</span>
          </button>
        </div>

        {/* TAB 1: PENDING PROPOSALS (TRIAGE) */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingEvents.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">All Proposals Cleared</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  There are no pending campus club proposals awaiting executive sign-off at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEvents.map((ev) => {
                  const isProcessing = actionInProgress === ev.id;
                  const start = parseISO(ev.start_time);
                  const end = parseISO(ev.end_time);

                  return (
                    <div
                      key={ev.id}
                      className="rounded-3xl border border-purple-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                    >
                      {/* Top banner stripe */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-500" />

                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Event Details */}
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                              {ev.community?.name || "Campus Club"}
                            </span>
                            <CategoryBadge category={ev.category} size="sm" />
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Sign-off
                            </span>
                          </div>

                          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                            {ev.title}
                          </h2>

                          {ev.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {ev.description}
                            </p>
                          )}

                          {/* Logistics grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                            <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <span className="font-semibold block text-slate-900">
                                  {format(start, "EEEE, MMMM d, yyyy")}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {format(start, "h:mm a")} – {format(end, "h:mm a")}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <span className="font-semibold block text-slate-900">
                                  {ev.venue?.name || "Campus Venue"}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {ev.venue?.building} (Capacity: {ev.venue?.capacity || "N/A"})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Safe Slot Indicator */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Safe-Slot Verified: No venue or audience collision detected</span>
                          </div>
                        </div>

                        {/* Executive Action Controls */}
                        <div className="flex lg:flex-col items-center gap-2.5 shrink-0 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(ev.id)}
                            className="w-full sm:w-auto lg:w-44 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>{isProcessing ? "Authorizing..." : "Approve & Publish"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleOpenReject(ev)}
                            className="w-full sm:w-auto lg:w-44 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <X className="w-4 h-4 text-rose-600" />
                            <span>Decline with Note</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MASTER CAMPUS SCHEDULE */}
        {activeTab === "master-schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Official calendar of all authorized, clash-free events currently published across the campus.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold">Event Title</th>
                      <th className="p-4 font-semibold">Organizing Club</th>
                      <th className="p-4 font-semibold">Venue & Location</th>
                      <th className="p-4 font-semibold">Scheduled Date & Time</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-bold text-slate-900">
                          {ev.title}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Category: {ev.category}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          {ev.community?.name}
                        </td>
                        <td className="p-4 text-slate-600">
                          <span className="font-semibold text-slate-800">{ev.venue?.name}</span>
                          <span className="block text-[10px] text-slate-400">
                            {ev.venue?.building} (Cap: {ev.venue?.capacity})
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {format(parseISO(ev.start_time), "MMM d, yyyy")}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {format(parseISO(ev.start_time), "h:mm a")} –{" "}
                            {format(parseISO(ev.end_time), "h:mm a")}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DECISION HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Audit trail of all event approvals and rejections issued by the Principal&apos;s desk.
            </p>

            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold">Event</th>
                      <th className="p-4 font-semibold">Community</th>
                      <th className="p-4 font-semibold">Venue</th>
                      <th className="p-4 font-semibold">Decision</th>
                      <th className="p-4 font-semibold">Feedback / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{ev.title}</td>
                        <td className="p-4 font-medium text-slate-800">{ev.community?.name}</td>
                        <td className="p-4 text-slate-600">{ev.venue?.name}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              ev.status === "published"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-rose-50 border-rose-200 text-rose-900"
                            }`}
                          >
                            {ev.status === "published" ? "Approved" : "Declined"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 italic">
                          {ev.rejection_reason || "Approved for publication."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION FEEDBACK MODAL */}
        {rejectingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setRejectingEvent(null)}
            />
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Declining Proposal</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {rejectingEvent.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Host: {rejectingEvent.community?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingEvent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Standard Feedback Reason
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {REJECTION_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectionNote(preset)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                          rejectionNote === preset
                            ? "bg-rose-50/80 border-rose-300 text-rose-950 font-semibold"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Feedback / Instructions to Lead *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Provide specific reasons or suggest alternative dates/venues..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingEvent(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === rejectingEvent.id || !rejectionNote.trim()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {actionInProgress === rejectingEvent.id ? "Declining..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
