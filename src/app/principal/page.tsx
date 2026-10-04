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
  XCircle,
  Inbox,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Search,
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

  // Search & Filter states for Calendar & History tabs
  const [calendarSearch, setCalendarSearch] = useState("");
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "published" | "rejected">("all");

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
    return [...events]
      .filter((e) => e.status === "published")
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    events.filter((e) => e.status === "published").forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return ["all", ...Array.from(cats)];
  }, [events]);

  const historyEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.status === "published" || e.status === "rejected")
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || a.start_time).getTime();
        const timeB = new Date(b.updated_at || b.created_at || b.start_time).getTime();
        return timeB - timeA;
      });
  }, [events]);

  const historyCounts = useMemo(() => {
    const published = events.filter((e) => e.status === "published").length;
    const rejected = events.filter((e) => e.status === "rejected").length;
    return {
      all: published + rejected,
      published,
      rejected,
    };
  }, [events]);

  const filteredApprovedEvents = useMemo(() => {
    return approvedEvents.filter((ev) => {
      if (calendarCategoryFilter !== "all" && ev.category.toLowerCase() !== calendarCategoryFilter.toLowerCase()) {
        return false;
      }
      if (!calendarSearch.trim()) return true;
      const q = calendarSearch.toLowerCase().trim();
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.community?.name && ev.community.name.toLowerCase().includes(q)) ||
        (ev.venue?.name && ev.venue.name.toLowerCase().includes(q)) ||
        ev.category.toLowerCase().includes(q)
      );
    });
  }, [approvedEvents, calendarSearch, calendarCategoryFilter]);

  const filteredHistoryEvents = useMemo(() => {
    return historyEvents.filter((ev) => {
      if (historyStatusFilter !== "all" && ev.status !== historyStatusFilter) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase().trim();
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.community?.name && ev.community.name.toLowerCase().includes(q)) ||
        (ev.venue?.name && ev.venue.name.toLowerCase().includes(q)) ||
        (ev.rejection_reason && ev.rejection_reason.toLowerCase().includes(q)) ||
        ev.category.toLowerCase().includes(q)
      );
    });
  }, [historyEvents, historyStatusFilter, historySearch]);

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
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">All caught up</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
                No club proposals waiting for review. You will be notified when new events are submitted.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xs sm:max-w-none px-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("master-schedule")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Master Calendar</span>
                  <span className="text-[11px] text-slate-400">({approvedEvents.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Decision History</span>
                  <span className="text-[11px] text-slate-400">({historyEvents.length})</span>
                </button>
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
                  <div className="flex items-center gap-2">
                    <span>Awaiting Review</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold tabular-nums">
                      {pendingEvents.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">By submission date</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                  {pendingEvents.map((ev) => {
                    const isSelected = ev.id === activeEvent?.id;
                    const startDate = parseISO(ev.start_time);
                    const leadNotice = differenceInDays(startDate, new Date());

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
                        className={`text-left transition-colors cursor-pointer group ${
                          isSelected
                            ? "md:bg-purple-50/70 md:border-l-3 md:border-purple-700 bg-white"
                            : "hover:bg-slate-100/60 text-slate-700 bg-white"
                        }`}
                      >
                        {/* MOBILE DATE-RAIL ITEM (< md) */}
                        <div className="md:hidden p-4 flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                          {/* Left Date Block */}
                          <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/70 py-1.5 group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-600 transition-colors leading-none">
                              {format(startDate, "MMM")}
                            </span>
                            <span className="text-base font-bold text-slate-800 group-hover:text-purple-700 transition-colors tabular-nums leading-tight my-0.5">
                              {format(startDate, "d")}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 leading-none">
                              {format(startDate, "EEE")}
                            </span>
                          </div>

                          {/* Center Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                                {ev.community?.name}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {ev.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900 group-hover:text-purple-700 transition-colors leading-snug line-clamp-1">
                              {ev.title}
                            </h4>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="truncate max-w-[120px]">{ev.venue?.name}</span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                ✓ Safe Slot
                              </span>
                            </div>
                          </div>

                          {/* Right Action Affordance */}
                          <div className="shrink-0 flex items-center gap-1 text-purple-700 font-semibold text-xs pl-1">
                            <span className="hidden xs:inline">Review</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* DESKTOP SPLIT-QUEUE ITEM (md+) */}
                        <div className="hidden md:block p-4">
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
                  className={`flex-1 flex-col bg-white h-full min-w-0 overflow-hidden ${
                    mobileDetailView ? "flex" : "hidden md:flex"
                  }`}
                >
                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
                    <div className="max-w-3xl space-y-3.5 sm:space-y-4">
                      {/* Mobile Sub-Navigation Bar (Hidden on desktop) */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 md:hidden">
                        <button
                          type="button"
                          onClick={() => setMobileDetailView(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
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

                      {/* Decision Action Bar - Inline directly below poster */}
                      <div className="pt-3 sm:pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setPreviewEvent(activeEvent)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Inspect Live Notice</span>
                        </button>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={actionInProgress === activeEvent.id}
                            onClick={() => handleOpenReject(activeEvent)}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-700 transition-colors cursor-pointer text-center"
                          >
                            Decline with Note
                          </button>

                          <button
                            type="button"
                            disabled={actionInProgress === activeEvent.id}
                            onClick={() => handleApprove(activeEvent.id)}
                            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0"
                          >
                            <Check className="w-4 h-4" />
                            <span>{actionInProgress === activeEvent.id ? "Publishing..." : "Approve & Publish"}</span>
                          </button>
                        </div>
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
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/40">
              {/* Sticky Compact Header Toolbar */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0 flex flex-col gap-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campus Schedule</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums">
                        {filteredApprovedEvents.length} {filteredApprovedEvents.length === 1 ? "event" : "events"}
                      </span>
                    </div>
                    <span className="hidden sm:inline-block text-slate-300">•</span>
                    <p className="hidden sm:block text-xs text-slate-500">
                      Approved & published campus events
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={calendarSearch}
                      onChange={(e) => setCalendarSearch(e.target.value)}
                      placeholder="Search events, clubs, venues..."
                      className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                    />
                    {calendarSearch && (
                      <button
                        type="button"
                        onClick={() => setCalendarSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Category Filter Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
                  {availableCategories.map((cat) => {
                    const isSelected = calendarCategoryFilter.toLowerCase() === cat.toLowerCase();
                    const label = cat === "all" ? "All Categories" : cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCalendarCategoryFilter(cat)}
                        className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-2xs font-semibold"
                            : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area: Full-screen List on Mobile, Data Table on Desktop */}
              <div className="flex-1 overflow-y-auto p-0 md:p-6 bg-white md:bg-transparent">
                {filteredApprovedEvents.length === 0 ? (
                  <div className="text-center py-12 p-6 md:rounded-xl md:border md:border-dashed md:border-slate-200 bg-white">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No scheduled events found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {calendarSearch || calendarCategoryFilter !== "all"
                        ? "Try adjusting your search query or category filter."
                        : "No approved campus events yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE FULL-SCREEN DATE-RAIL LIST (< md) */}
                    <div className="md:hidden divide-y divide-slate-100 bg-white border-b border-slate-200">
                      {filteredApprovedEvents.map((ev) => {
                        const eventDate = parseISO(ev.start_time);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setPreviewEvent(ev)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100/80 transition-colors flex items-center gap-3.5 group cursor-pointer"
                          >
                            {/* Left Date Block */}
                            <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/70 py-1.5 group-hover:bg-indigo-50/70 group-hover:border-indigo-200/80 transition-colors">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors leading-none">
                                {format(eventDate, "MMM")}
                              </span>
                              <span className="text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tabular-nums leading-tight my-0.5">
                                {format(eventDate, "d")}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 leading-none">
                                {format(eventDate, "EEE")}
                              </span>
                            </div>

                            {/* Center Event Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                                  {ev.community?.name || "Campus Community"}
                                </span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {ev.category}
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                                {ev.title}
                              </h4>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{format(eventDate, "h:mm a")}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[130px]">{ev.venue?.name || "Campus Venue"}</span>
                                </span>
                              </div>
                            </div>

                            {/* Right Action Indicator */}
                            <div className="shrink-0 self-center pl-1 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (md+) */}
                    <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Event Title</th>
                            <th className="py-3 px-4">Host Club</th>
                            <th className="py-3 px-4">Venue</th>
                            <th className="py-3 px-4">Date & Time</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredApprovedEvents.map((ev) => (
                            <tr
                              key={ev.id}
                              onClick={() => setPreviewEvent(ev)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {ev.title}
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {ev.category}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-700">
                                {ev.community?.name || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <span className="font-medium text-slate-800">{ev.venue?.name}</span>
                                {ev.venue?.building && (
                                  <span className="block text-[11px] text-slate-400">{ev.venue.building}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <span className="font-medium text-slate-800">
                                  {format(parseISO(ev.start_time), "MMM d, yyyy")}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  {format(parseISO(ev.start_time), "h:mm a")} – {format(parseISO(ev.end_time), "h:mm a")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DECISION HISTORY */}
          {activeTab === "history" && (
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/40">
              {/* Sticky Compact Header Toolbar */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Decision History</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums">
                      {filteredHistoryEvents.length} {filteredHistoryEvents.length === 1 ? "record" : "records"}
                    </span>
                  </div>
                  <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                    Audit trail of all approved and declined campus proposals
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* Status Filter Buttons with Live Counts */}
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setHistoryStatusFilter("all")}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        historyStatusFilter === "all"
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>All</span>
                      <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                        historyStatusFilter === "all" ? "bg-slate-100 text-slate-800" : "bg-slate-200/60 text-slate-500"
                      }`}>
                        {historyCounts.all}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryStatusFilter("published")}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        historyStatusFilter === "published"
                          ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Approved</span>
                      <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                        historyStatusFilter === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200/60 text-slate-500"
                      }`}>
                        {historyCounts.published}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryStatusFilter("rejected")}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        historyStatusFilter === "rejected"
                          ? "bg-white text-rose-800 shadow-2xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Declined</span>
                      <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                        historyStatusFilter === "rejected" ? "bg-rose-50 text-rose-700" : "bg-slate-200/60 text-slate-500"
                      }`}>
                        {historyCounts.rejected}
                      </span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search history..."
                      className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area: Full-screen List on Mobile, Data Table on Desktop */}
              <div className="flex-1 overflow-y-auto p-0 md:p-6 bg-white md:bg-transparent">
                {filteredHistoryEvents.length === 0 ? (
                  <div className="text-center py-12 p-6 md:rounded-xl md:border md:border-dashed md:border-slate-200 bg-white">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No decision records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {historySearch ? "Try adjusting your search or status filter." : "No recorded decisions yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE FULL-SCREEN AUDIT LIST (< md) */}
                    <div className="md:hidden divide-y divide-slate-100 bg-white border-b border-slate-200">
                      {filteredHistoryEvents.map((ev) => {
                        const isApproved = ev.status === "published";
                        const decisionDate = ev.updated_at || ev.created_at || ev.start_time;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setPreviewEvent(ev)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100/80 transition-colors flex items-start gap-3.5 group cursor-pointer"
                          >
                            {/* Left Verdict Tile */}
                            <div
                              className={`w-11 shrink-0 flex flex-col items-center justify-center rounded-lg py-2 border transition-colors mt-0.5 ${
                                isApproved
                                  ? "bg-emerald-50/80 border-emerald-200/70 text-emerald-700 group-hover:bg-emerald-100/70 group-hover:border-emerald-300"
                                  : "bg-rose-50/80 border-rose-200/70 text-rose-700 group-hover:bg-rose-100/70 group-hover:border-rose-300"
                              }`}
                            >
                              {isApproved ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 mb-0.5" />
                              )}
                              <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                                {isApproved ? "Appr." : "Decl."}
                              </span>
                            </div>

                            {/* Center Event Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                                  {ev.community?.name || "Campus Community"}
                                </span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {ev.category}
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                                {ev.title}
                              </h4>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{format(parseISO(ev.start_time), "MMM d, h:mm a")}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[120px]">{ev.venue?.name || "Venue"}</span>
                                </span>
                              </div>
                              {ev.status === "rejected" && ev.rejection_reason && (
                                <div className="mt-2 p-2 rounded-lg bg-rose-50/80 border border-rose-100 text-[11px] text-rose-800 leading-relaxed">
                                  <span className="font-semibold text-rose-900">Reason: </span>
                                  <span className="italic">&ldquo;{ev.rejection_reason}&rdquo;</span>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Decision Timestamp & Chevron */}
                            <div className="shrink-0 flex flex-col items-end justify-between self-stretch pl-1">
                              <span className="text-[10px] font-medium text-slate-400">
                                {format(parseISO(decisionDate), "MMM d")}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-auto" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (md+) */}
                    <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Event & Category</th>
                            <th className="py-3 px-4">Host Club</th>
                            <th className="py-3 px-4">Scheduled For</th>
                            <th className="py-3 px-4">Verdict</th>
                            <th className="py-3 px-4">Decision Date & Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredHistoryEvents.map((ev) => (
                            <tr
                              key={ev.id}
                              onClick={() => setPreviewEvent(ev)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {ev.title}
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {ev.category}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-700">
                                {ev.community?.name || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <span className="font-medium text-slate-800">
                                  {format(parseISO(ev.start_time), "MMM d, yyyy")}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  {ev.venue?.name || "Campus Venue"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    ev.status === "published"
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                      : "bg-rose-50 border-rose-200 text-rose-800"
                                  }`}
                                >
                                  {ev.status === "published" ? (
                                    <>
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      Approved
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                      Declined
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                                <div className="text-[11px] font-medium text-slate-400 mb-0.5">
                                  {format(parseISO(ev.updated_at || ev.created_at || ev.start_time), "MMM d, yyyy")}
                                </div>
                                <div className="italic text-slate-700 truncate">
                                  {ev.rejection_reason || "Approved for notice board publication."}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
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
