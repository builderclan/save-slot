"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CampusEvent, Venue, AdminCommunityRow, AdminUserRow } from "@/types/database";
import type {
  AdminTab,
  NewUserData,
  EditUserData,
  NewVenueData,
  EditVenueData,
  NewCommunityData,
  EditCommunityData,
  AdminDeleteTarget,
} from "../components";
import { adminApi } from "@/features/admin/api";
import { venuesApi } from "@/features/venues/api";
import { eventsApi } from "@/features/events/api";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

const VALID_TABS: AdminTab[] = ["triage", "all-events", "archive", "users", "venues", "communities"];

function isValidAdminTab(tab: string | null): tab is AdminTab {
  return tab !== null && VALID_TABS.includes(tab as AdminTab);
}

export interface AdminNotice {
  message: string;
  type: "success" | "error";
}

export function useAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Tab synchronization via URL searchParams
  const tabParam = searchParams.get("tab");
  const activeTab: AdminTab = isValidAdminTab(tabParam) ? tabParam : "triage";

  const handleTabChange = useCallback(
    (tab: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "triage") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    },
    [router, searchParams]
  );

  // Auth Protection: Verify administrative clearance
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/login?error=admin_required");
    }
  }, [user, authLoading, router]);

  // Tab-scoped data state
  const [initialLoading, setInitialLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [adminCommunities, setAdminCommunities] = useState<AdminCommunityRow[]>([]);

  // Modals & Action Status
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [isAddCommunityOpen, setIsAddCommunityOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<AdminCommunityRow | null>(null);

  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminDeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<AdminNotice | null>(null);

  const [nowTimestamp, setNowTimestamp] = useState<number>(0);

  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  const showNotice = useCallback((message: string, type: "success" | "error" = "success", durationMs = 4000) => {
    setAdminNotice({ message, type });
    setTimeout(() => setAdminNotice(null), durationMs);
  }, []);

  // Discrete domain loaders
  const loadEvents = useCallback(async () => {
    try {
      const data = await eventsApi.getLeadEvents();
      setAllEvents(data.events || []);
    } catch (err) {
      console.error("[Admin] Failed to load events:", err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error("[Admin] Failed to load users:", err);
    }
  }, []);

  const loadVenues = useCallback(async () => {
    try {
      const data = await venuesApi.getAdminVenues();
      setVenues(data.venues || []);
    } catch (err) {
      console.error("[Admin] Failed to load venues:", err);
    }
  }, []);

  const loadCommunities = useCallback(async () => {
    try {
      const data = await adminApi.getCommunities();
      setAdminCommunities(data.communities || []);
    } catch (err) {
      console.error("[Admin] Failed to load communities:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      setInitialLoading(false);
      return;
    }

    Promise.allSettled([
      loadEvents(),
      loadUsers(),
      loadVenues(),
      loadCommunities(),
    ]).finally(() => {
      setInitialLoading(false);
    });
  }, [authLoading, user?.isAdmin, loadEvents, loadUsers, loadVenues, loadCommunities]);

  // Derived data
  const communities = useMemo(
    () => adminCommunities.map((c) => ({ id: c.id, name: c.name })),
    [adminCommunities]
  );

  const eligibleUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; fullName: string; email: string; role: string }> = [];
    for (const u of users) {
      if (u.role !== "organizer") continue;
      if (!seen.has(u.id)) {
        seen.add(u.id);
        result.push({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
        });
      }
    }
    return result;
  }, [users]);

  const pendingEvents = useMemo(() => allEvents.filter((e) => e.status === "pending"), [allEvents]);
  const publishedEvents = useMemo(() => allEvents.filter((e) => e.status === "published"), [allEvents]);
  const archivedEvents = useMemo(
    () => (nowTimestamp ? allEvents.filter((e) => new Date(e.end_time).getTime() < nowTimestamp) : []),
    [allEvents, nowTimestamp]
  );
  const activePublishedEvents = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          e.status === "published" &&
          (!e.end_time || (nowTimestamp ? new Date(e.end_time).getTime() >= nowTimestamp : true))
      ),
    [allEvents, nowTimestamp]
  );

  // Event Approval
  const handleApprove = async (eventId: string) => {
    setActionInProgress(eventId);
    try {
      await adminApi.updateEventStatus(eventId, { status: "published" });
      setAllEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: "published" } : e))
      );
      showNotice("Event approved and published to the Student Notice Board.", "success", 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve event.";
      showNotice(message, "error", 7000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Event Rejection
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingEvent) return;

    setActionInProgress(rejectingEvent.id);
    try {
      await adminApi.updateEventStatus(rejectingEvent.id, {
        status: "rejected",
        rejectionReason: rejectionNote,
      });
      setAllEvents((prev) =>
        prev.map((ev) =>
          ev.id === rejectingEvent.id
            ? { ...ev, status: "rejected", rejection_reason: rejectionNote }
            : ev
        )
      );
      setRejectingEvent(null);
      setRejectionNote("");
      showNotice("Event rejected and returned with administrative feedback.", "success", 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject event.";
      showNotice(message, "error", 7000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Event Deletion
  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      const ev = allEvents.find((e) => e.id === eventId);
      setDeleteTarget({
        type: "event",
        id: eventId,
        title: ev?.title || "Untitled Event",
        subtitle: ev?.venue?.name || ev?.location_name || undefined,
      });
    },
    [allEvents]
  );

  // User Handlers
  const handleCreateUser = async (data: NewUserData) => {
    setActionInProgress("create-user");
    try {
      await adminApi.createUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        communityId: data.role === "organizer" ? data.communityId : null,
      });
      setIsAddUserOpen(false);
      await loadUsers();
      showNotice("User account provisioned successfully.", "success", 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditUser = async (userId: string, data: EditUserData) => {
    setActionInProgress(userId);
    try {
      await adminApi.updateUser(userId, {
        fullName: data.fullName,
        role: data.role,
        communityId: data.role === "organizer" ? data.communityId : null,
      });
      setEditingUser(null);
      await loadUsers();
      showNotice("User account permissions updated successfully.", "success", 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = useCallback((userToDelete: AdminUserRow) => {
    setDeleteTarget({
      type: "user",
      id: userToDelete.id,
      title: userToDelete.full_name || userToDelete.email,
      subtitle: userToDelete.email,
    });
  }, []);

  // Venue Handlers
  const handleCreateVenue = async (data: NewVenueData) => {
    setActionInProgress("create-venue");
    try {
      await venuesApi.createVenue({
        ...data,
        capacity: parseInt(data.capacity, 10) || 100,
      });
      setIsAddVenueOpen(false);
      await loadVenues();
      showNotice("Campus facility registered successfully.", "success", 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create venue.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditVenue = async (venueId: string, data: EditVenueData) => {
    setActionInProgress(venueId);
    try {
      await venuesApi.updateVenue(venueId, data);
      setEditingVenue(null);
      await loadVenues();
      showNotice("Facility details updated successfully.", "success", 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update facility.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteVenue = useCallback((venueToDelete: Venue) => {
    setDeleteTarget({
      type: "venue",
      id: venueToDelete.id,
      title: venueToDelete.name,
      subtitle: venueToDelete.building
        ? `${venueToDelete.building} • Capacity ${venueToDelete.capacity}`
        : `Capacity ${venueToDelete.capacity}`,
    });
  }, []);

  const handleToggleVenueActive = async (venueToToggle: Venue) => {
    try {
      await apiClient.patch("/api/admin/venues", {
        id: venueToToggle.id,
        is_active: !venueToToggle.is_active,
      });
      setVenues((prev) =>
        prev.map((v) => (v.id === venueToToggle.id ? { ...v, is_active: !v.is_active } : v))
      );
    } catch (err) {
      console.error("Toggle venue error:", err);
    }
  };

  // Community Handlers
  const handleCreateCommunity = async (data: NewCommunityData) => {
    setActionInProgress("create-community");
    try {
      const res = await adminApi.createCommunity(data);
      setIsAddCommunityOpen(false);
      await loadCommunities();
      showNotice(`Community "${res.community?.name || data.name}" registered successfully.`, "success", 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create community.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditCommunity = async (communityId: string, data: EditCommunityData) => {
    setActionInProgress(communityId);
    try {
      await adminApi.updateCommunity(communityId, data);
      setEditingCommunity(null);
      await loadCommunities();
      showNotice(`Community "${data.name}" updated successfully.`, "success", 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update community.";
      showNotice(message, "error", 5000);
      throw err;
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteCommunity = useCallback(
    (commToDelete: AdminCommunityRow) => {
      if (commToDelete.event_count > 0) {
        showNotice(
          `Cannot delete "${commToDelete.name}": ${commToDelete.event_count} active or pending event(s) exist.`,
          "error",
          5000
        );
        return;
      }
      setDeleteTarget({
        type: "community",
        id: commToDelete.id,
        title: commToDelete.name,
        subtitle: commToDelete.lead_name ? `Lead: ${commToDelete.lead_name}` : undefined,
      });
    },
    [showNotice]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setActionInProgress(deleteTarget.id);

    try {
      if (deleteTarget.type === "event") {
        await adminApi.deleteEvent(deleteTarget.id);
        setAllEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        showNotice(`Event "${deleteTarget.title}" permanently deleted.`, "success", 4000);
      } else if (deleteTarget.type === "user") {
        await adminApi.deleteUser(deleteTarget.id);
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        showNotice(`User "${deleteTarget.title}" removed from system.`, "success", 4000);
      } else if (deleteTarget.type === "venue") {
        await venuesApi.deleteVenue(deleteTarget.id);
        setVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id));
        showNotice(`Facility "${deleteTarget.title}" deleted.`, "success", 4000);
      } else if (deleteTarget.type === "community") {
        await adminApi.deleteCommunity(deleteTarget.id);
        showNotice(`Community "${deleteTarget.title}" deleted.`, "success", 4000);
        await loadCommunities();
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to delete ${deleteTarget.type}.`;
      showNotice(message, "error", 6000);
    } finally {
      setIsDeleting(false);
      setActionInProgress(null);
    }
  };

  return {
    user,
    authLoading,
    activeTab,
    handleTabChange,
    initialLoading,
    allEvents,
    users,
    venues,
    adminCommunities,
    communities,
    eligibleUsers,
    pendingEvents,
    publishedEvents,
    archivedEvents,
    activePublishedEvents,
    actionInProgress,
    adminNotice,
    setAdminNotice,
    previewEvent,
    setPreviewEvent,
    rejectingEvent,
    setRejectingEvent,
    rejectionNote,
    setRejectionNote,
    isAddUserOpen,
    setIsAddUserOpen,
    editingUser,
    setEditingUser,
    isAddVenueOpen,
    setIsAddVenueOpen,
    editingVenue,
    setEditingVenue,
    isAddCommunityOpen,
    setIsAddCommunityOpen,
    editingCommunity,
    setEditingCommunity,
    handleApprove,
    handleReject,
    handleDeleteEvent,
    handleCreateUser,
    handleSaveEditUser,
    handleDeleteUser,
    handleCreateVenue,
    handleSaveEditVenue,
    handleDeleteVenue,
    handleToggleVenueActive,
    handleCreateCommunity,
    handleSaveEditCommunity,
    handleDeleteCommunity,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    handleConfirmDelete,
    nowTimestamp,
  };
}
