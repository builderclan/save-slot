"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Check,
  X,
  Clock,
  Calendar,
  MapPin,
  Eye,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { EventDetailModal } from "@/components/events/event-detail-modal";

interface PrincipalSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
}

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  Tech: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
  Arts: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
  Career: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
  Social: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80",
  Academic: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
  Workshop: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
};

const REJECTION_PRESETS = [
  "Venue is reserved for an official institutional assembly / examination.",
  "Event proposal violates campus quiet hours or academic schedule.",
  "Please coordinate with Student Affairs for security and facility clearance.",
  "Auditorium audio/visual equipment undergoing scheduled maintenance.",
  "High likelihood of student turnout overlap with another major campus event.",
];

export default function PrincipalDeskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PrincipalSession | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  // Navigation tab: 'inbox' | 'master-schedule' | 'history'
  const [activeTab, setActiveTab] = useState<"inbox" | "master-schedule" | "history">("inbox");

  // Selected event for split view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileDetailView, setMobileDetailView] = useState(false);

  // Preview modal state
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);

  // Rejection modal state
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Banner notification
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated || (!meData.user.isPrincipal && !meData.user.isAdmin)) {
        router.push("/login?error=principal_required");
        return;
      }
      setSession(meData.user);

      const [evRes, venuesRes] = await Promise.all([
        fetch("/api/lead/events"),
        fetch("/api/venues"),
      ]);

      if (evRes.ok) {
        const evData = await evRes.json();
        const evList: CampusEvent[] = evData.events || [];
        setEvents(evList);

        // Pre-select first pending event
        const firstPending = evList.find((e) => e.status === "pending");
        if (firstPending) {
          setSelectedEventId(firstPending.id);
        } else if (evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }
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

  // Current active event for detail inspection
  const activeEvent = useMemo(() => {
    if (!selectedEventId) return pendingEvents[0] || events[0] || null;
    return events.find((e) => e.id === selectedEventId) || pendingEvents[0] || null;
  }, [events, selectedEventId, pendingEvents]);

  // Keyboard navigation for queue items
  useEffect(() => {
    if (activeTab !== "inbox" || pendingEvents.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentIndex = pendingEvents.findIndex((ev) => ev.id === activeEvent?.id);
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, pendingEvents.length - 1);
        setSelectedEventId(pendingEvents[nextIndex].id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        setSelectedEventId(pendingEvents[prevIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, pendingEvents, activeEvent?.id]);

  // Approve action
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

        const remaining = pendingEvents.filter((e) => e.id !== eventId);
        if (remaining.length > 0) {
          setSelectedEventId(remaining[0].id);
        } else {
          setSelectedEventId(null);
          setMobileDetailView(false);
        }

        setBannerNotice({
          message: `Approved: "${updated.event?.title || "Event"}" is now published on the Student Notice Board.`,
          type: "success",
        });
        setTimeout(() => setBannerNotice(null), 5000);
      }
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject action
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

        const remaining = pendingEvents.filter((e) => e.id !== eventId);
        if (remaining.length > 0) {
          setSelectedEventId(remaining[0].id);
        } else {
          setSelectedEventId(null);
          setMobileDetailView(false);
        }

        setBannerNotice({
          message: `Declined: Feedback note sent to ${rejectingEvent.community?.name || "Organizer"}.`,
          type: "info",
        });
        setTimeout(() => setBannerNotice(null), 5000);
        setRejectingEvent(null);
        setRejectionNote("");
      }
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center bg-white">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading Principal Desk...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-white relative">
      {/* FLOATING TOAST NOTIFICATION */}
      {bannerNotice && (
        <div
          role="status"
          className={`fixed top-16 right-6 z-50 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
            bannerNotice.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-950"
              : "bg-slate-900/95 border-slate-800 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bannerNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PANE 1: FULL SCREEN LEFT NAVIGATION SIDEBAR / MOBILE SEGMENTED CONTROL */}
      <aside className={`w-full lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/90 bg-white lg:bg-slate-50/80 p-2 sm:p-3 lg:p-4 flex-col lg:justify-between ${mobileDetailView ? "hidden lg:flex" : "flex"}`}>
        <div className="space-y-2 lg:space-y-4">
          <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2">
            Desk Views
          </div>
          <nav className="grid grid-cols-3 lg:flex lg:flex-col gap-1 p-1 lg:p-0 bg-slate-100/80 lg:bg-transparent rounded-xl lg:rounded-none w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab("inbox");
                setMobileDetailView(false);
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
                activeTab === "inbox"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Inbox className={`w-3.5 h-3.5 shrink-0 ${activeTab === "inbox" ? "text-purple-600" : "text-slate-400"}`} />
                <span className="truncate lg:hidden">Inbox</span>
                <span className="hidden lg:inline">Review Inbox</span>
              </div>
              <span
                className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === "inbox"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {pendingEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("master-schedule");
                setMobileDetailView(false);
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
                activeTab === "master-schedule"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeTab === "master-schedule" ? "text-purple-600" : "text-slate-400"}`} />
                <span className="truncate lg:hidden">Calendar</span>
                <span className="hidden lg:inline">Master Calendar</span>
              </div>
              <span
                className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === "master-schedule"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {approvedEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setMobileDetailView(false);
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs font-medium transition-all flex items-center justify-center lg:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80 lg:border-slate-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50 lg:hover:bg-slate-100/70 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === "history" ? "text-purple-600" : "text-slate-400"}`} />
                <span className="truncate lg:hidden">History</span>
                <span className="hidden lg:inline">Decision History</span>
              </div>
              <span
                className={`px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === "history"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {historyEvents.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="hidden lg:block pt-4 border-t border-slate-200/80">
          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100/80 text-[11px] text-purple-950">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-purple-900">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Executive Desk</span>
            </div>
            <p className="text-[10px] text-purple-800 leading-relaxed">
              Deterministic Safe-Slot verification ensures zero double-booking or category clashes.
            </p>
          </div>
        </div>
      </aside>

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-white">
        {/* TAB 1: LINEAR-STYLE SPLIT QUEUE INBOX */}
        {activeTab === "inbox" && (
          pendingEvents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/40">
              <div className="max-w-md mx-auto text-center rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Review Inbox is Clear</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All submitted campus club proposals have been reviewed. There are currently zero pending events requiring executive sign-off.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
              {/* PANE 2: Submissions Queue */}
              <div
                className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/30 flex-col h-full overflow-hidden ${
                  mobileDetailView ? "hidden md:flex" : "flex"
                }`}
              >
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-700 shrink-0">
                  <span>Awaiting Review ({pendingEvents.length})</span>
                  <span className="text-[11px] text-slate-400 font-normal">By submission date</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                  {pendingEvents.map((ev) => {
                    const isSelected = ev.id === activeEvent?.id;
                    const startDate = parseISO(ev.start_time);

                    return (
                      <div
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setMobileDetailView(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSelectedEventId(ev.id);
                            setMobileDetailView(true);
                          }
                        }}
                        className={`p-4 text-left transition-colors cursor-pointer relative ${
                          isSelected
                            ? "bg-purple-50/70 border-l-3 border-purple-700"
                            : "hover:bg-slate-100/60 text-slate-700 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {ev.community?.name}
                          </span>
                          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            ✓ Safe Slot
                          </span>
                        </div>

                        <div className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                          {ev.title}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{format(startDate, "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span className="truncate">{ev.venue?.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:flex p-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center items-center justify-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↑</kbd>
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↓</kbd>
                    <span>Use keys to navigate queue</span>
                  </span>
                </div>
              </div>

              {/* PANE 3: Clean Airy Inspector */}
              {activeEvent ? (
                <div
                  className={`flex-1 flex-col bg-white h-full overflow-y-auto min-w-0 ${
                    mobileDetailView ? "flex" : "hidden md:flex"
                  }`}
                >
                  <div className="p-4 sm:p-5 lg:p-6 max-w-3xl space-y-3.5 sm:space-y-4">
                    {/* Mobile Sub-Navigation Bar (Hidden on desktop) */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 md:hidden">
                      <button
                        type="button"
                        onClick={() => setMobileDetailView(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Queue ({pendingEvents.length})</span>
                      </button>

                      <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                      </span>
                    </div>

                    {/* Proposal Document Header */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                            {activeEvent.community?.name}
                          </span>
                          <span className="text-slate-300">•</span>
                          <CategoryBadge category={activeEvent.category} size="sm" />
                        </div>

                        {/* On desktop, show lead notice badge aligned with organizer */}
                        <span className="hidden md:inline-flex text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                          {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {activeEvent.title}
                      </h2>
                      {activeEvent.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                          {activeEvent.description}
                        </p>
                      )}
                    </div>

                    {/* Schedule, Venue & Clearance */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Target Schedule */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100/80">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Target Schedule
                            </div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">
                              {format(parseISO(activeEvent.start_time), "EEE, MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {format(parseISO(activeEvent.start_time), "h:mm a")} – {format(parseISO(activeEvent.end_time), "h:mm a")}
                            </div>
                          </div>
                        </div>

                        {/* Venue & Capacity */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100/80">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Venue & Capacity
                            </div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">
                              {activeEvent.venue?.name || "Campus Venue"}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {activeEvent.venue?.building} • Capacity: {activeEvent.venue?.capacity || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Safe Slot Clearance */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium text-xs">Deterministic Safe Slot Verified • Zero conflicts detected</span>
                      </div>
                    </div>

                    {/* Compact Poster Preview */}
                    <div>
                      <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1.5">
                        Event Poster
                      </div>
                      <div
                        onClick={() => setPreviewEvent(activeEvent)}
                        className="relative aspect-[21/9] max-h-36 sm:max-h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer group"
                      >
                        <Image
                          src={
                            activeEvent.cover_image_url ||
                            CATEGORY_DEFAULT_IMAGES[activeEvent.category] ||
                            CATEGORY_DEFAULT_IMAGES.Tech
                          }
                          alt={activeEvent.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 800px"
                          className="object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                      </div>
                    </div>

                    {/* DECISION ACTION BAR: Seamlessly attached directly to the event review content */}
                    <div className="pt-4 border-t border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(activeEvent)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect Live Notice</span>
                      </button>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          disabled={actionInProgress === activeEvent.id}
                          onClick={() => handleOpenReject(activeEvent)}
                          className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-700 transition-colors cursor-pointer text-center"
                        >
                          Decline with Note
                        </button>

                        <button
                          type="button"
                          disabled={actionInProgress === activeEvent.id}
                          onClick={() => handleApprove(activeEvent.id)}
                          className="flex-1 sm:flex-initial px-5 py-2 sm:py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{actionInProgress === activeEvent.id ? "Publishing..." : "Approve & Publish"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )
        )}

          {/* TAB 2: MASTER CAMPUS SCHEDULE */}
          {activeTab === "master-schedule" && (
            <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>All currently approved and published events across campus ({approvedEvents.length})</span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[620px]">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Event Title</th>
                        <th className="p-4">Host Club</th>
                        <th className="p-4">Venue</th>
                        <th className="p-4">Scheduled Date & Time</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approvedEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 font-bold text-slate-900">
                            {ev.title}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Category: {ev.category}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-slate-800">{ev.community?.name}</td>
                          <td className="p-4 text-slate-600">
                            <span className="font-semibold text-slate-800">{ev.venue?.name}</span>
                            <span className="block text-[10px] text-slate-400">{ev.venue?.building}</span>
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Live
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
            <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Historical record of approved and declined proposals</span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[620px]">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Event</th>
                        <th className="p-4">Community</th>
                        <th className="p-4">Venue</th>
                        <th className="p-4">Decision</th>
                        <th className="p-4">Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{ev.title}</td>
                          <td className="p-4 font-medium text-slate-800">{ev.community?.name}</td>
                          <td className="p-4 text-slate-600">{ev.venue?.name}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                ev.status === "published"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-rose-50 border-rose-200 text-rose-800"
                              }`}
                            >
                              {ev.status === "published" ? "Approved" : "Declined"}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-600 italic">
                            {ev.rejection_reason || "Approved for notice board publication."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* STUDENT DETAIL PREVIEW MODAL */}
      {previewEvent && (
        <EventDetailModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
        />
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
            onClick={() => setRejectingEvent(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Decline Proposal
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {rejectingEvent.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted by {rejectingEvent.community?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Standard Feedback Reason
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {REJECTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionNote(preset)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        rejectionNote === preset
                          ? "bg-slate-100 border-slate-900 text-slate-950 font-semibold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Note to Community Lead *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Explain why or suggest an alternate slot..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === rejectingEvent.id || !rejectionNote.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {actionInProgress === rejectingEvent.id ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
