"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CampusEvent,
  Community,
  Department,
  Venue,
} from "@/types/database";
import type { StatusFilter, SortOption } from "../components";
import { workspaceApi, type OverdueReportNotice } from "@/features/events/api";
import { venuesApi } from "@/features/venues/api";
import { useAuth } from "@/context/auth-context";

const isValidStatus = (s: string | null): s is StatusFilter =>
  s === "published" || s === "pending" || s === "rejected" || s === "all";

const isValidSort = (s: string | null): s is SortOption =>
  s === "date-desc" ||
  s === "date-asc" ||
  s === "created-desc" ||
  s === "title-asc";

export interface ActionNotice {
  type: "success" | "error";
  message: string;
}

export function useLeadWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [overdueReports, setOverdueReports] = useState<OverdueReportNotice[]>(
    [],
  );
  const [venues, setVenues] = useState<Venue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );

  const initialStatusParam = searchParams.get("status");
  const initialSortParam = searchParams.get("sort");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isValidStatus(initialStatusParam) ? initialStatusParam : "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(
    isValidSort(initialSortParam) ? initialSortParam : "date-desc",
  );

  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [selectedRejectedEvent, setSelectedRejectedEvent] =
    useState<CampusEvent | null>(null);
  const [withdrawingEvent, setWithdrawingEvent] = useState<CampusEvent | null>(
    null,
  );
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState<CampusEvent | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);

  const canAccessWorkspace = Boolean(
    user &&
    (user.isLead ||
      user.isStaff ||
      user.isFic ||
      user.isHod ||
      user.isActingHod ||
      user.isPrincipal ||
      user.isVicePrincipal),
  );

  const showNotice = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setActionNotice({ message, type });
      setTimeout(() => {
        setActionNotice(null);
      }, 4500);
    },
    [],
  );

  useEffect(() => {
    if (!authLoading && (!user || !canAccessWorkspace)) {
      router.push("/login?error=lead_required");
    }
  }, [user, authLoading, canAccessWorkspace, router]);

  useEffect(() => {
    if (user?.leadCommunities && user.leadCommunities.length > 0) {
      setSelectedCommunityId((prev) => prev || user.leadCommunities[0].id);
    }
  }, [user?.leadCommunities]);

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
    [router, searchParams, setStatusFilter],
  );

  const loadEvents = useCallback(async (): Promise<boolean> => {
    try {
      const data = await workspaceApi.getEvents();
      setEvents(data.events || []);
      setOverdueReports(data.overdueReports || []);
      return true;
    } catch (err: unknown) {
      console.error("[Workspace] Failed to load events:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to load event proposals";
      showNotice(msg, "error");
      return false;
    }
  }, [showNotice]);

  const loadReferenceData = useCallback(async () => {
    const [venuesResult, deptsResult, commsResult] = await Promise.allSettled([
      venuesApi.getVenues(),
      workspaceApi.getDepartments(),
      workspaceApi.getCommunities(),
    ]);

    const failedSlices: string[] = [];

    if (venuesResult.status === "fulfilled") {
      setVenues(venuesResult.value.venues || []);
    } else {
      console.error("[Workspace] Failed to load venues:", venuesResult.reason);
      failedSlices.push("venues");
    }

    if (deptsResult.status === "fulfilled") {
      setDepartments(deptsResult.value.departments || []);
    } else {
      console.error(
        "[Workspace] Failed to load departments:",
        deptsResult.reason,
      );
      failedSlices.push("departments");
    }

    if (commsResult.status === "fulfilled") {
      setAllCommunities(commsResult.value.communities || []);
    } else {
      console.error(
        "[Workspace] Failed to load communities:",
        commsResult.reason,
      );
      failedSlices.push("communities");
    }

    if (failedSlices.length > 0) {
      showNotice(
        `Could not load ${failedSlices.join(", ")}. Some options may be unavailable.`,
        "error",
      );
    }
  }, [showNotice]);

  useEffect(() => {
    if (authLoading || !canAccessWorkspace) return;
    Promise.allSettled([loadEvents(), loadReferenceData()]).finally(() => {
      setLoading(false);
    });
  }, [authLoading, canAccessWorkspace, loadEvents, loadReferenceData]);

  const handleConfirmWithdraw = async () => {
    if (!withdrawingEvent) return;
    try {
      setIsWithdrawing(true);
      await workspaceApi.withdraw(withdrawingEvent.id);
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

  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingEvent) return;
    try {
      setIsCancelling(true);
      const res = await workspaceApi.cancel(cancellingEvent.id, reason);
      setEvents((prev) =>
        prev.map((e) => (e.id === cancellingEvent.id ? res.event : e)),
      );
      showNotice(
        `Cancelled "${cancellingEvent.title}" and released venue slot.`,
      );
      setCancellingEvent(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      showNotice(msg, "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitDraft = async (event: CampusEvent) => {
    try {
      await workspaceApi.submit(event.id);
      const refreshed = await loadEvents();
      if (refreshed) {
        showNotice(`Submitted "${event.title}" for Stage 2 review.`);
      } else {
        showNotice(
          `Submitted "${event.title}" for Stage 2 review, but workspace refresh failed.`,
          "error",
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      showNotice(msg, "error");
    }
  };

  const assignedCommunity = useMemo(() => {
    if (!user || !user.leadCommunities || user.leadCommunities.length === 0)
      return null;
    return (
      user.leadCommunities.find((c) => c.id === selectedCommunityId) ||
      user.leadCommunities[0] ||
      null
    );
  }, [user, selectedCommunityId]);

  const assignedDepartment = useMemo(() => {
    if (!user?.departmentId) return null;
    return departments.find((d) => d.id === user.departmentId) || null;
  }, [user, departments]);

  const communityEvents = useMemo(() => {
    if (!user) return events;
    if (
      user.leadCommunities &&
      user.leadCommunities.length > 1 &&
      assignedCommunity
    ) {
      return events.filter(
        (e) =>
          e.community_id === assignedCommunity.id ||
          (e.origin_type === "department" &&
            e.department_id === user.departmentId) ||
          e.created_by === user.id,
      );
    }
    return events;
  }, [events, user, assignedCommunity]);

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
          (e.reference_number &&
            e.reference_number.toLowerCase().includes(q)) ||
          e.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      const startA = new Date(a.start_time).getTime();
      const startB = new Date(b.start_time).getTime();
      const createdA = new Date(a.created_at || a.start_time).getTime();
      const createdB = new Date(b.created_at || b.start_time).getTime();

      switch (sortBy) {
        case "date-desc":
          return startB - startA || createdB - createdA;
        case "date-asc":
          return startA - startB || createdA - createdB;
        case "created-desc":
          return createdB - createdA || startB - startA;
        case "title-asc":
          return a.title.localeCompare(b.title);
        default:
          return startB - startA || createdB - createdA;
      }
    });

    return result;
  }, [communityEvents, statusFilter, categoryFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = useCallback(() => {
    handleStatusFilterChange("all");
    setCategoryFilter("all");
    setSearchQuery("");
    setSortBy("date-desc");
  }, [handleStatusFilterChange, setCategoryFilter, setSearchQuery, setSortBy]);

  return {
    user,
    events,
    overdueReports,
    venues,
    departments,
    allCommunities,
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
    cancellingEvent,
    setCancellingEvent,
    isCancelling,
    actionNotice,
    setActionNotice,
    showNotice,
    handleStatusFilterChange,
    handleConfirmWithdraw,
    handleConfirmCancel,
    handleSubmitDraft,
    loadEvents,
    assignedCommunity,
    assignedDepartment,
    communityEvents,
    filteredEvents,
    hasActiveFilters,
    resetFilters,
  };
}
