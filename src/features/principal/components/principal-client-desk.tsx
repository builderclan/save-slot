"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CampusEvent,
  Community,
  ConflictCheckResult,
  Department,
  TargetAudience,
  UserProfile,
  Venue,
} from "@/types/database";
import { EventDetailModal } from "@/features/events";
import {
  PrincipalNavSidebar,
  PrincipalDeskTab,
} from "./principal-nav-sidebar";
import { PrincipalInboxView } from "./principal-inbox-view";
import { PrincipalScheduleView } from "./principal-schedule-view";
import { PrincipalHistoryView } from "./principal-history-view";
import { PrincipalGovernanceView } from "./principal-governance-view";
import { PrincipalCollegeEventModal } from "./principal-college-event-modal";
import {
  PrincipalRejectionModal,
  DEFAULT_REJECTION_PRESETS,
} from "./principal-rejection-modal";
import { NotificationBanner, type NotificationType } from "@/components/ui/notification-banner";
import { formatDisplayName } from "@/lib/utils";
import PrincipalLoading from "@/app/principal/loading";
import { principalApi } from "../api";
import { conflictsApi } from "@/features/conflicts/api";
import { ApiException } from "@/lib/api-client";

const VALID_TABS: PrincipalDeskTab[] = ["inbox", "master-schedule", "history", "governance"];

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const mutationVersionRef = useRef(0);

  const loadExecutiveQueue = useCallback(async () => {
    const capturedVersion = mutationVersionRef.current;
    try {
      const data = await principalApi.getQueue();
      if (data?.events && mutationVersionRef.current === capturedVersion) {
        setEvents(data.events);
      }
      setDepartments(data.departments || []);
      setCommunities(data.communities || []);
      setVenues(data.venues || []);
      setStaffUsers(data.staffUsers || []);
    } catch {
      // Initial SSR fallback remains usable if queue refresh fails silently
    }
  }, []);

  useEffect(() => {
    loadExecutiveQueue();
  }, [loadExecutiveQueue]);

  // Selected event for split view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    const firstPending = initialEvents.find((e) => e.status === "pending_executive");
    return firstPending?.id || initialEvents[0]?.id || null;
  });

  // Active conflict state for the selected pending event
  const [activeConflictResult, setActiveConflictResult] = useState<ConflictCheckResult | null>(null);
  const [checkingActiveConflict, setCheckingActiveConflict] = useState(false);

  // Preview, College Event, Override & Rejection modals
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [showCollegeEventModal, setShowCollegeEventModal] = useState(false);
  const [leadOverrideTargetId, setLeadOverrideTargetId] = useState<string | null>(null);
  const [leadOverrideReason, setLeadOverrideReason] = useState("");
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Banner notification
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: NotificationType } | null>(null);

  const showToast = useCallback((message: string, type: NotificationType = "success") => {
    setBannerNotice({ message, type });
    setTimeout(() => setBannerNotice(null), 5500);
  }, []);

  // Search & Filter states for Calendar & History tabs
  const [calendarSearch, setCalendarSearch] = useState("");
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "published" | "rejected">("all");

  // Derived subsets
  const pendingEvents = useMemo(() => {
    return events.filter((e) => e.status === "pending_executive");
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

  // Approve action (with explicit 7-day policy override gate)
  const executeApprove = async (
    eventId: string,
    overrideLeadTime = false,
    overrideReasonText?: string
  ) => {
    setActionInProgress(eventId);
    try {
      const result = await principalApi.approveEvent(eventId, {
        overrideLeadTime,
        overrideReason: overrideReasonText,
      });

      mutationVersionRef.current += 1;
      const targetEvent = events.find((e) => e.id === eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                status: "published",
                reference_number: result.referenceNumber || e.reference_number,
                academic_year: result.academicYear || e.academic_year,
              }
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

      setLeadOverrideTargetId(null);
      setLeadOverrideReason("");
      showToast(
        `Approved "${targetEvent?.title || "Event"}"${result.referenceNumber ? ` (${result.referenceNumber})` : ""} — now published.`
      );
      void loadExecutiveQueue();
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof ApiException && err.data && typeof err.data === "object") {
        const errData = err.data as { code?: string; error?: string };
        if (errData.code === "LEAD_TIME_OVERRIDE_REQUIRED" && !overrideLeadTime) {
          setLeadOverrideTargetId(eventId);
          setLeadOverrideReason("");
          return;
        }
      }
      showToast(err instanceof Error ? err.message : "Failed to approve event.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApprove = async (eventId: string) => {
    await executeApprove(eventId, false);
  };

  // Reject action
  const handleOpenReject = (ev: CampusEvent) => {
    setRejectingEvent(ev);
    setRejectionNote(DEFAULT_REJECTION_PRESETS[0]);
    setRejectionError(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingEvent) return;

    const eventId = rejectingEvent.id;
    setActionInProgress(eventId);
    setRejectionError(null);
    try {
      await principalApi.rejectEvent(eventId, rejectionNote.trim());

      mutationVersionRef.current += 1;
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

      showToast(
        `Declined: Feedback note sent to ${
          rejectingEvent.community?.name || rejectingEvent.department?.name || "Organizer"
        }.`,
        "info"
      );
      setRejectingEvent(null);
      setRejectionNote("");
      setRejectionError(null);
      void loadExecutiveQueue();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline event. Please try again.";
      setRejectionError(msg);
      showToast(msg, "error");
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
        onCreateCollegeEvent={() => setShowCollegeEventModal(true)}
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

        {activeTab === "governance" && (
          <PrincipalGovernanceView
            departments={departments}
            communities={communities}
            onRefresh={loadExecutiveQueue}
            onNotify={(msg, type) => showToast(msg, type || "success")}
            onOpenCollegeEventModal={() => setShowCollegeEventModal(true)}
          />
        )}
      </div>

      {/* SCHEDULE COLLEGE EVENT MODAL */}
      {showCollegeEventModal && (
        <PrincipalCollegeEventModal
          venues={venues}
          staffUsers={staffUsers}
          onClose={() => setShowCollegeEventModal(false)}
          onSuccess={(title, bumped) => {
            setShowCollegeEventModal(false);
            mutationVersionRef.current += 1;
            void loadExecutiveQueue();
            showToast(
              bumped > 0
                ? `Published "${title}" and bumped ${bumped} colliding booking(s).`
                : `Published College event "${title}".`
            );
          }}
        />
      )}

      {/* 7-DAY ADVANCE NOTICE OVERRIDE MODAL */}
      {leadOverrideTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs"
            onClick={() => setLeadOverrideTargetId(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-2xl p-5 sm:p-6 z-10 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">
              Confirm 7-Day Notice Policy Override
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              You are overriding the 7-day advance notice policy. This executive override and your reason will be logged in the audit trail and printable report.
            </p>
            <input
              type="text"
              value={leadOverrideReason}
              onChange={(e) => setLeadOverrideReason(e.target.value)}
              placeholder="Optional executive override note..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeadOverrideTargetId(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress === leadOverrideTargetId}
                onClick={() =>
                  executeApprove(leadOverrideTargetId, true, leadOverrideReason.trim())
                }
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {actionInProgress === leadOverrideTargetId
                  ? "Publishing..."
                  : "Override & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        onClose={() => {
          setRejectingEvent(null);
          setRejectionError(null);
        }}
        isSubmitting={actionInProgress === rejectingEvent?.id}
        errorMessage={rejectionError}
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
