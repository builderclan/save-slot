"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { CampusEvent, ConflictCheckResult } from "@/types/database";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import {
  PrincipalNavSidebar,
  PrincipalDeskTab,
} from "@/components/principal/principal-nav-sidebar";
import { PrincipalInboxView } from "@/components/principal/principal-inbox-view";
import { PrincipalScheduleView } from "@/components/principal/principal-schedule-view";
import { PrincipalHistoryView } from "@/components/principal/principal-history-view";
import {
  PrincipalRejectionModal,
  DEFAULT_REJECTION_PRESETS,
} from "@/components/principal/principal-rejection-modal";

interface PrincipalSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
  isVicePrincipal?: boolean;
}

export default function PrincipalDeskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PrincipalSession | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);

  // Navigation tab: 'inbox' | 'master-schedule' | 'history'
  const [activeTab, setActiveTab] = useState<PrincipalDeskTab>("inbox");

  // Selected event for split view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileDetailView, setMobileDetailView] = useState(false);

  // Active conflict state for the selected pending event
  const [activeConflictResult, setActiveConflictResult] = useState<ConflictCheckResult | null>(null);
  const [checkingActiveConflict, setCheckingActiveConflict] = useState(false);

  // Preview modal state
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);

  // Rejection modal state
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Banner notification
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

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

      const evRes = await fetch("/api/lead/events");
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

  // Dynamically verify venue conflict for the active inspected event
  useEffect(() => {
    let isMounted = true;
    async function verifyConflict() {
      if (!activeEvent || !activeEvent.venue_id) {
        setActiveConflictResult(null);
        return;
      }
      setCheckingActiveConflict(true);
      try {
        const res = await fetch("/api/conflicts/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId: activeEvent.venue_id,
            startTime: activeEvent.start_time,
            endTime: activeEvent.end_time,
            excludeEventId: activeEvent.id,
          }),
        });
        if (res.ok && isMounted) {
          const data: ConflictCheckResult = await res.json();
          setActiveConflictResult(data);
        }
      } catch (err) {
        console.error("Conflict check error:", err);
      } finally {
        if (isMounted) setCheckingActiveConflict(false);
      }
    }
    verifyConflict();
    return () => {
      isMounted = false;
    };
  }, [activeEvent]);

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
      } else {
        const errData = await res.json();
        setBannerNotice({
          message: errData.error || "Failed to approve event: Venue collision or validation error occurred.",
          type: "error",
        });
        setTimeout(() => setBannerNotice(null), 7000);
      }
    } catch {
      setBannerNotice({
        message: "An unexpected error occurred while communicating with the server.",
        type: "error",
      });
      setTimeout(() => setBannerNotice(null), 7000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject action
  const handleOpenReject = (ev: CampusEvent) => {
    setRejectingEvent(ev);
    setRejectionNote(DEFAULT_REJECTION_PRESETS[0]);
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
        <p className="text-xs text-slate-400 font-medium">Loading Executive Desk...</p>
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
              : bannerNotice.type === "error"
              ? "bg-rose-50/95 border-rose-200 text-rose-950"
              : "bg-slate-900/95 border-slate-800 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : bannerNotice.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            )}
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

      {/* PANE 1: FULL SCREEN LEFT NAVIGATION SIDEBAR */}
      <PrincipalNavSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setMobileDetailView(false);
        }}
        pendingCount={pendingEvents.length}
        approvedCount={approvedEvents.length}
        historyCount={historyEvents.length}
        userName={session?.fullName}
        mobileDetailView={mobileDetailView}
      />

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-white">
        {activeTab === "inbox" && (
          <PrincipalInboxView
            pendingEvents={pendingEvents}
            activeEvent={activeEvent}
            onSelectEvent={(id) => setSelectedEventId(id)}
            mobileDetailView={mobileDetailView}
            onSetMobileDetailView={setMobileDetailView}
            checkingActiveConflict={checkingActiveConflict}
            activeConflictResult={activeConflictResult}
            onInspectLiveNotice={(ev) => setPreviewEvent(ev)}
            onOpenReject={handleOpenReject}
            onApprove={handleApprove}
            actionInProgress={actionInProgress}
            onNavigateSchedule={() => {
              setActiveTab("master-schedule");
              setMobileDetailView(false);
            }}
            onNavigateHistory={() => {
              setActiveTab("history");
              setMobileDetailView(false);
            }}
            approvedCount={approvedEvents.length}
            historyCount={historyEvents.length}
          />
        )}

        {activeTab === "master-schedule" && (
          <PrincipalScheduleView
            filteredApprovedEvents={filteredApprovedEvents}
            calendarSearch={calendarSearch}
            onSearchChange={setCalendarSearch}
            calendarCategoryFilter={calendarCategoryFilter}
            onCategoryFilterChange={setCalendarCategoryFilter}
            availableCategories={availableCategories}
            onSelectEvent={(ev) => setPreviewEvent(ev)}
          />
        )}

        {activeTab === "history" && (
          <PrincipalHistoryView
            filteredHistoryEvents={filteredHistoryEvents}
            historyCounts={historyCounts}
            historyStatusFilter={historyStatusFilter}
            onStatusFilterChange={setHistoryStatusFilter}
            historySearch={historySearch}
            onSearchChange={setHistorySearch}
            onSelectEvent={(ev) => setPreviewEvent(ev)}
          />
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
      <PrincipalRejectionModal
        rejectingEvent={rejectingEvent}
        rejectionNote={rejectionNote}
        onRejectionNoteChange={setRejectionNote}
        onConfirm={handleConfirmReject}
        onClose={() => setRejectingEvent(null)}
        isSubmitting={actionInProgress === rejectingEvent?.id}
      />
    </div>
  );
}
