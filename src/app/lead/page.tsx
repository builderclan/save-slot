"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Plus,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { useAuth } from "@/context/auth-context";
import { LeadStatsRow, StatusFilter } from "@/components/lead/lead-stats-row";
import { LeadFilterBar, SortOption } from "@/components/lead/lead-filter-bar";
import { LeadEventsList } from "@/components/lead/lead-events-list";
import { LeadWithdrawModal } from "@/components/lead/lead-withdraw-modal";
import { LeadRejectionNoticeModal } from "@/components/lead/lead-rejection-notice-modal";
import { ProposeEventModal } from "@/components/lead/propose-event-modal";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import LeadLoading from "./loading";

function LeadWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected community (if lead manages multiple clubs)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  // Filter & Search states with URL sync
  const initialStatusParam = searchParams.get("status");
  const isValidStatus = (s: string | null): s is StatusFilter =>
    s === "published" || s === "pending" || s === "rejected" || s === "all";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isValidStatus(initialStatusParam) ? initialStatusParam : "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-asc");

  // Dialog & Modal states
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [selectedRejectedEvent, setSelectedRejectedEvent] = useState<CampusEvent | null>(null);
  const [withdrawingEvent, setWithdrawingEvent] = useState<CampusEvent | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Status feedback toast
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotice = useCallback((message: string, type: "success" | "error" = "success") => {
    setActionNotice({ message, type });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  }, []);

  // Auth Protection: Verify lead clearance
  useEffect(() => {
    if (!authLoading && (!user || !user.isLead)) {
      router.push("/login?error=lead_required");
    }
  }, [user, authLoading, router]);

  // Set default selected community once user loads
  useEffect(() => {
    if (user?.leadCommunities && user.leadCommunities.length > 0) {
      setSelectedCommunityId((prev) => prev || user.leadCommunities[0].id);
    }
  }, [user?.leadCommunities]);

  // URL Tab / Status sync
  const handleStatusFilterChange = useCallback(
    (newStatus: StatusFilter) => {
      setStatusFilter(newStatus);
      const params = new URLSearchParams(searchParams.toString());
      if (newStatus === "all") {
        params.delete("status");
      } else {
        params.set("status", newStatus);
      }
      const qs = params.toString();
      router.replace(qs ? `/lead?${qs}` : "/lead", { scroll: false });
    },
    [router, searchParams]
  );

  // Data Fetchers
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/events");
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setEvents(data.events || []);
      } else {
        const data = await res.json().catch(() => ({}));
        showNotice(data.error || "Failed to load event proposals", "error");
      }
    } catch (err) {
      console.error("[Lead] Failed to load events:", err);
      showNotice("Network error while loading event proposals", "error");
    }
  }, [showNotice]);

  const loadVenues = useCallback(async () => {
    try {
      const res = await fetch("/api/venues");
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setVenues(data.venues || []);
      }
    } catch (err) {
      console.error("[Lead] Failed to load venues:", err);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    if (authLoading) return;
    if (!user?.isLead) return; // redirect effect handles navigation; keep spinner visible to prevent flash

    Promise.allSettled([loadEvents(), loadVenues()]).finally(() => {
      setLoading(false);
    });
  }, [authLoading, user?.isLead, loadEvents, loadVenues]);

  // Handle withdrawing (deleting) a pending or rejected proposal
  const handleConfirmWithdraw = async () => {
    if (!withdrawingEvent) return;
    try {
      setIsWithdrawing(true);
      const res = await fetch(`/api/lead/events/${withdrawingEvent.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to withdraw event proposal");
      }

      setEvents((prev) => prev.filter((e) => e.id !== withdrawingEvent.id));
      showNotice(`Successfully withdrew proposal "${withdrawingEvent.title}"`);
      setWithdrawingEvent(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed";
      showNotice(msg, "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Active assigned community
  const assignedCommunity = useMemo(() => {
    if (!user || !user.leadCommunities) return null;
    return (
      user.leadCommunities.find((c) => c.id === selectedCommunityId) ||
      user.leadCommunities[0] ||
      null
    );
  }, [user, selectedCommunityId]);

  // Filter events belonging to active community (if lead has multiple)
  const communityEvents = useMemo(() => {
    if (!assignedCommunity) return events;
    return events.filter((e) => e.community_id === assignedCommunity.id);
  }, [events, assignedCommunity]);

  // Derived filtered & sorted list
  const filteredEvents = useMemo(() => {
    let result = [...communityEvents];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Search query (title, venue, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location_name.toLowerCase().includes(q) ||
          (e.venue?.name && e.venue.name.toLowerCase().includes(q)) ||
          e.description.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      const startA = new Date(a.start_time).getTime();
      const startB = new Date(b.end_time).getTime();
      const createdA = new Date(a.created_at || a.start_time).getTime();
      const createdB = new Date(b.created_at || b.start_time).getTime();

      switch (sortBy) {
        case "date-asc":
          return startA - startB;
        case "date-desc":
          return startB - startA;
        case "created-desc":
          return createdB - createdA;
        case "title-asc":
          return a.title.localeCompare(b.title);
        default:
          return startA - startB;
      }
    });

    return result;
  }, [communityEvents, statusFilter, categoryFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    statusFilter !== "all" || categoryFilter !== "all" || searchQuery.trim() !== "";

  const resetFilters = useCallback(() => {
    handleStatusFilterChange("all");
    setCategoryFilter("all");
    setSearchQuery("");
    setSortBy("date-asc");
  }, [handleStatusFilterChange]);

  if (loading) {
    return <LeadLoading />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            actionNotice.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-900 text-white border-rose-800"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium leading-relaxed">{actionNotice.message}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Profile & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 mb-8 border-b border-slate-200">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Community Lead Workspace</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {assignedCommunity ? assignedCommunity.name : "Community Workspace"}
            </h1>

            {/* Multi-community switcher if lead is responsible for > 1 clubs */}
            {user && user.leadCommunities && user.leadCommunities.length > 1 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {user.leadCommunities.map((comm) => (
                  <button
                    key={comm.id}
                    type="button"
                    onClick={() => setSelectedCommunityId(comm.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedCommunityId === comm.id
                        ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {comm.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
            <span>
              Lead Organizer: <span className="font-semibold text-slate-800">{user?.fullName}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{user?.email}</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-[10px] font-medium text-indigo-700">
              Verified Club Lead
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <Link
            href="/"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Public Notice Board</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setIsProposeOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Propose New Event</span>
          </button>
        </div>
      </div>

      {/* Interactive Metric Filter Cards */}
      <LeadStatsRow
        communityEvents={communityEvents}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />

      {/* Campus Policy Reminder Alert */}
      <div className="p-4 sm:p-4.5 rounded-2xl border border-slate-200/90 bg-white mb-8 flex items-start gap-3.5 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed flex-1">
          <strong className="text-slate-900 font-semibold block sm:inline">
            Campus Safe-Slot Policy:{" "}
          </strong>
          Proposals require at least <strong>7 days advance notice</strong> for administrative review.
          Our Safe-Slot Assistant actively checks venue occupancy and timing collisions to ensure your
          club receives an optimal, clash-free slot.
        </div>
      </div>

      {/* Main Proposals Section */}
      <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        {/* Search, Filter & Toolbar Bar */}
        <LeadFilterBar
          totalCount={communityEvents.length}
          filteredCount={filteredEvents.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />

        {/* Proposals List */}
        <LeadEventsList
          events={filteredEvents}
          hasActiveFilters={hasActiveFilters}
          onPreview={setPreviewEvent}
          onEdit={(ev) => setEditingEvent(ev)}
          onWithdraw={(ev) => setWithdrawingEvent(ev)}
          onShowRejectionNotice={(ev) => setSelectedRejectedEvent(ev)}
          onProposeNew={() => {
            setEditingEvent(null);
            setIsProposeOpen(true);
          }}
          onResetFilters={resetFilters}
        />
      </div>

      {/* Propose / Edit Modal */}
      {(isProposeOpen || editingEvent) && (
        <ProposeEventModal
          venues={venues}
          communityId={assignedCommunity?.id}
          communityName={assignedCommunity?.name}
          initialEvent={editingEvent}
          mode={editingEvent ? "edit" : "create"}
          onClose={() => {
            setIsProposeOpen(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            setIsProposeOpen(false);
            const wasEditing = !!editingEvent;
            setEditingEvent(null);
            loadEvents();
            showNotice(
              wasEditing
                ? "Event proposal updated and resubmitted for review."
                : "New event proposal submitted for review."
            );
          }}
        />
      )}

      {/* Event Detail Preview Modal */}
      {previewEvent && (
        <EventDetailModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
        />
      )}

      {/* Full Rejection Note Dialog */}
      <LeadRejectionNoticeModal
        isOpen={Boolean(selectedRejectedEvent)}
        event={selectedRejectedEvent}
        onClose={() => setSelectedRejectedEvent(null)}
        onRevise={(ev) => {
          setSelectedRejectedEvent(null);
          setEditingEvent(ev);
        }}
      />

      {/* Withdrawal Confirmation Dialog */}
      <LeadWithdrawModal
        isOpen={Boolean(withdrawingEvent)}
        event={withdrawingEvent}
        onClose={() => setWithdrawingEvent(null)}
        onConfirm={handleConfirmWithdraw}
        isWithdrawing={isWithdrawing}
      />
    </div>
  );
}

export default function LeadWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading Lead Workspace...</p>
        </div>
      }
    >
      <LeadWorkspaceContent />
    </Suspense>
  );
}
