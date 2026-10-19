"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CampusEvent, Venue } from "@/types/database";
import type { StatusFilter } from "@/components/lead/lead-stats-row";
import type { SortOption } from "@/components/lead/lead-filter-bar";
import { eventsApi } from "@/features/events/api";
import { venuesApi } from "@/features/venues/api";
import { useAuth } from "@/context/auth-context";

const isValidStatus = (s: string | null): s is StatusFilter =>
  s === "published" || s === "pending" || s === "rejected" || s === "all";

export interface ActionNotice {
  type: "success" | "error";
  message: string;
}

export function useLeadWorkspace() {
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
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);

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
      const data = await eventsApi.getLeadEvents();
      setEvents(data.events || []);
    } catch (err: unknown) {
      console.error("[Lead] Failed to load events:", err);
      const msg = err instanceof Error ? err.message : "Failed to load event proposals";
      showNotice(msg, "error");
    }
  }, [showNotice]);

  const loadVenues = useCallback(async () => {
    try {
      const data = await venuesApi.getVenues();
      setVenues(data.venues || []);
    } catch (err) {
      console.error("[Lead] Failed to load venues:", err);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    if (authLoading) return;
    if (!user?.isLead) return;

    Promise.allSettled([loadEvents(), loadVenues()]).finally(() => {
      setLoading(false);
    });
  }, [authLoading, user?.isLead, loadEvents, loadVenues]);

  // Handle withdrawing (deleting) a pending or rejected proposal
  const handleConfirmWithdraw = async () => {
    if (!withdrawingEvent) return;
    try {
      setIsWithdrawing(true);
      await eventsApi.withdraw(withdrawingEvent.id);
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

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

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

  return {
    user,
    events,
    venues,
    loading,
    selectedCommunityId,
    setSelectedCommunityId,
    statusFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    isProposeOpen,
    setIsProposeOpen,
    editingEvent,
    setEditingEvent,
    previewEvent,
    setPreviewEvent,
    selectedRejectedEvent,
    setSelectedRejectedEvent,
    withdrawingEvent,
    setWithdrawingEvent,
    isWithdrawing,
    actionNotice,
    setActionNotice,
    showNotice,
    handleStatusFilterChange,
    handleConfirmWithdraw,
    loadEvents,
    assignedCommunity,
    communityEvents,
    filteredEvents,
    hasActiveFilters,
    resetFilters,
  };
}
