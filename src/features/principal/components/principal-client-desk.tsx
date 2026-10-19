"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampusEvent, ConflictCheckResult, TargetAudience } from "@/types/database";
import { EventDetailModal } from "@/features/events";
import {
  PrincipalNavSidebar,
  PrincipalDeskTab,
} from "./principal-nav-sidebar";
import { PrincipalInboxView } from "./principal-inbox-view";
import { PrincipalScheduleView } from "./principal-schedule-view";
import { PrincipalHistoryView } from "./principal-history-view";
import {
  PrincipalRejectionModal,
  DEFAULT_REJECTION_PRESETS,
} from "./principal-rejection-modal";
import { NotificationBanner, type NotificationType } from "@/components/ui/notification-banner";
import { formatDisplayName } from "@/lib/utils";
import PrincipalLoading from "@/app/principal/loading";
import { eventsApi } from "@/features/events/api";
import { conflictsApi } from "@/features/conflicts/api";
import { adminApi } from "@/features/admin/api";

const VALID_TABS: PrincipalDeskTab[] = ["inbox", "master-schedule", "history"];

function isValidPrincipalTab(tab: string | null): tab is PrincipalDeskTab {
  return tab !== null && VALID_TABS.includes(tab as PrincipalDeskTab);
}

export interface PrincipalUserSession {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
  isAdmin?: boolean;
  isPrincipal?: boolean;
  isVicePrincipal?: boolean;
}

export interface PrincipalClientDeskProps {
  initialEvents: CampusEvent[];
  user?: PrincipalUserSession | null;
}

function PrincipalClientDeskInner({ initialEvents, user }: PrincipalClientDeskProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mobile split view state
  const [mobileDetailView, setMobileDetailView] = useState(false);

  // Tab synchronization via URL query parameters
  const tabParam = searchParams.get("tab");
  const activeTab: PrincipalDeskTab = isValidPrincipalTab(tabParam) ? tabParam : "inbox";

  const handleTabChange = useCallback(
    (tab: PrincipalDeskTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "inbox") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `/principal?${qs}` : "/principal", { scroll: false });
      setMobileDetailView(false);
    },
    [router, searchParams]
  );

  const [events, setEvents] = useState<CampusEvent[]>(initialEvents);

  // Client hydration fallback: If server query was empty (e.g. transient failure), fetch client-side
  useEffect(() => {
    if (initialEvents.length === 0) {
      eventsApi
        .getLeadEvents()
        .then((data) => {
          if (data?.events) {
            setEvents(data.events);
          }
        })
        .catch(() => {});
    }
  }, [initialEvents.length]);

  // Selected event for split view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    const firstPending = initialEvents.find((e) => e.status === "pending");
    return firstPending?.id || initialEvents[0]?.id || null;
  });

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
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: NotificationType } | null>(null);

  // Search & Filter states for Calendar & History tabs
  const [calendarSearch, setCalendarSearch] = useState("");
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "published" | "rejected">("all");

  // Derived subsets
  const pendingEvents = useMemo(() => {
    return events.filter((e) => e.status === "pending");
  }, [events]);

  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  const approvedEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.status === "published")
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events]);

  const activeApprovedEvents = useMemo(() => {
    return approvedEvents.filter((e) => {
      if (!e.end_time || !nowTimestamp) return true;
      return new Date(e.end_time).getTime() >= nowTimestamp;
    });
  }, [approvedEvents, nowTimestamp]);

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
        (ev.reviewer?.full_name && formatDisplayName(ev.reviewer.full_name).toLowerCase().includes(q)) ||
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
        const data = await conflictsApi.check({
          venueId: activeEvent.venue_id,
          startTime: activeEvent.start_time,
          endTime: activeEvent.end_time,
          targetAudience: (activeEvent.target_audience || ["All Students"]) as TargetAudience[],
          excludeEventId: activeEvent.id,
        });
        if (isMounted) {
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

  // Approve action
  const handleApprove = async (eventId: string) => {
    setActionInProgress(eventId);
    try {
      const updated = await adminApi.updateEventStatus(eventId, { status: "published" });
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
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve event.";
      setBannerNotice({
        message: msg,
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
      await adminApi.updateEventStatus(eventId, {
        status: "rejected",
        rejectionReason: rejectionNote.trim(),
      });

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
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline event. Please try again.";
      setBannerNotice({
        message: msg,
        type: "error",
      });
      setTimeout(() => setBannerNotice(null), 7000);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-white relative">
      {/* FLOATING TOAST NOTIFICATION */}
      {bannerNotice && (
        <NotificationBanner
          variant="toast"
          type={bannerNotice.type}
          message={bannerNotice.message}
          onClose={() => setBannerNotice(null)}
        />
      )}

      {/* PANE 1: FULL SCREEN LEFT NAVIGATION SIDEBAR */}
      <PrincipalNavSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingCount={pendingEvents.length}
        approvedCount={activeApprovedEvents.length}
        historyCount={historyEvents.length}
        userName={user?.fullName || user?.email}
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
            onNavigateSchedule={() => handleTabChange("master-schedule")}
            onNavigateHistory={() => handleTabChange("history")}
            approvedCount={activeApprovedEvents.length}
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
            allHistoryEvents={historyEvents}
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

export function PrincipalClientDesk(props: PrincipalClientDeskProps) {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <PrincipalClientDeskInner {...props} />
    </Suspense>
  );
}
