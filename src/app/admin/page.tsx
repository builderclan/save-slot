"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { CampusEvent, Venue, AdminCommunityRow } from "@/types/database";
import type { AdminTab } from "@/components/admin/admin-metrics-row";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTriageView } from "@/components/admin/admin-triage-view";
import { AdminEventsView } from "@/components/admin/admin-events-view";
import { AdminArchiveView } from "@/components/admin/admin-archive-view";
import { AdminUsersView, type AdminUserRow } from "@/components/admin/admin-users-view";
import { AdminVenuesView } from "@/components/admin/admin-venues-view";
import { AdminCommunitiesView } from "@/components/admin/admin-communities-view";
import { AdminAddUserModal, type NewUserData } from "@/components/admin/admin-add-user-modal";
import { AdminEditUserModal, type EditUserData } from "@/components/admin/admin-edit-user-modal";
import { AdminAddVenueModal, type NewVenueData } from "@/components/admin/admin-add-venue-modal";
import { AdminEditVenueModal, type EditVenueData } from "@/components/admin/admin-edit-venue-modal";
import { AdminAddCommunityModal, type NewCommunityData } from "@/components/admin/admin-add-community-modal";
import { AdminEditCommunityModal, type EditCommunityData } from "@/components/admin/admin-edit-community-modal";
import { RejectionModal } from "@/components/events/rejection-modal";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { useAuth } from "@/context/auth-context";
import AdminLoading from "./loading";

const VALID_TABS: AdminTab[] = ["triage", "all-events", "archive", "users", "venues", "communities"];

function isValidAdminTab(tab: string | null): tab is AdminTab {
  return tab !== null && VALID_TABS.includes(tab as AdminTab);
}

function AdminLoadingFallback() {
  return <AdminLoading />;
}

function AdminConsoleContent() {
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

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [nowTimestamp, setNowTimestamp] = useState<number>(0);

  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  // Discrete domain loaders
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/events");
      if (res.ok) {
        const data = await res.json();
        setAllEvents(data.events || []);
      }
    } catch (err) {
      console.error("[Admin] Failed to load events:", err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("[Admin] Failed to load users:", err);
    }
  }, []);

  const loadVenues = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/venues");
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues || []);
      }
    } catch (err) {
      console.error("[Admin] Failed to load venues:", err);
    }
  }, []);

  const loadCommunities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/communities");
      if (res.ok) {
        const data = await res.json();
        setAdminCommunities(data.communities || []);
      }
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
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        setAllEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: "published" } : e))
        );
        setAdminNotice({
          message: "Event approved and published to the Student Notice Board.",
          type: "success",
        });
        setTimeout(() => setAdminNotice(null), 5000);
      } else {
        const errorData = await res.json();
        setAdminNotice({
          message: errorData.error || "Failed to approve event: Venue collision or validation error occurred.",
          type: "error",
        });
        setTimeout(() => setAdminNotice(null), 7000);
      }
    } catch {
      setAdminNotice({
        message: "An unexpected network error occurred while approving the event.",
        type: "error",
      });
      setTimeout(() => setAdminNotice(null), 7000);
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
      const res = await fetch(`/api/admin/events/${rejectingEvent.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: rejectionNote,
        }),
      });

      if (res.ok) {
        setAllEvents((prev) =>
          prev.map((ev) =>
            ev.id === rejectingEvent.id
              ? { ...ev, status: "rejected", rejection_reason: rejectionNote }
              : ev
          )
        );
        setRejectingEvent(null);
        setRejectionNote("");
        setAdminNotice({
          message: "Event rejected and returned with administrative feedback.",
          type: "success",
        });
        setTimeout(() => setAdminNotice(null), 5000);
      } else {
        const errorData = await res.json();
        setAdminNotice({
          message: errorData.error || "Failed to reject event.",
          type: "error",
        });
        setTimeout(() => setAdminNotice(null), 7000);
      }
    } catch {
      setAdminNotice({
        message: "An unexpected network error occurred while rejecting the event.",
        type: "error",
      });
      setTimeout(() => setAdminNotice(null), 7000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Event Deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) return;

    setActionInProgress(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
        setAdminNotice({
          message: "Event record permanently deleted from campus registry.",
          type: "success",
        });
        setTimeout(() => setAdminNotice(null), 4000);
      } else {
        const err = await res.json();
        setAdminNotice({ message: err.error || "Failed to delete event", type: "error" });
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting event", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // User Handlers
  const handleCreateUser = async (data: NewUserData) => {
    setActionInProgress("create-user");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          role: data.role,
          communityId: data.role === "organizer" ? data.communityId : null,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || "Failed to create user");

      setIsAddUserOpen(false);
      await loadUsers();
      setAdminNotice({ message: "User account provisioned successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditUser = async (userId: string, data: EditUserData) => {
    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          role: data.role,
          communityId: data.role === "organizer" ? data.communityId : null,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || "Failed to update user");

      setEditingUser(null);
      await loadUsers();
      setAdminNotice({ message: "User account permissions updated successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = async (userToDelete: AdminUserRow) => {
    if (!confirm(`Are you sure you want to permanently delete user account: ${userToDelete.full_name} (${userToDelete.email})?`)) {
      return;
    }

    setActionInProgress(userToDelete.id);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminNotice({ message: data.error || "Failed to delete user", type: "error" });
        setTimeout(() => setAdminNotice(null), 6000);
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setAdminNotice({ message: `User ${userToDelete.email} removed from system.`, type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting user", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Venue Handlers
  const handleCreateVenue = async (data: NewVenueData) => {
    setActionInProgress("create-venue");
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create venue");
      }

      setIsAddVenueOpen(false);
      await loadVenues();
      setAdminNotice({ message: "Campus facility registered successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditVenue = async (venueId: string, data: EditVenueData) => {
    setActionInProgress(venueId);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || "Failed to update facility");

      setEditingVenue(null);
      await loadVenues();
      setAdminNotice({ message: "Facility details updated successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteVenue = async (venueToDelete: Venue) => {
    if (!confirm(`Are you sure you want to delete facility: "${venueToDelete.name}"?`)) return;

    setActionInProgress(venueToDelete.id);
    try {
      const res = await fetch(`/api/admin/venues/${venueToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminNotice({ message: data.error || "Failed to delete facility", type: "error" });
        setTimeout(() => setAdminNotice(null), 7000);
      } else {
        setVenues((prev) => prev.filter((v) => v.id !== venueToDelete.id));
        setAdminNotice({ message: `Facility "${venueToDelete.name}" deleted.`, type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting facility", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleVenueActive = async (venueToToggle: Venue) => {
    try {
      const res = await fetch("/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: venueToToggle.id, is_active: !venueToToggle.is_active }),
      });
      if (res.ok) {
        setVenues((prev) =>
          prev.map((v) => (v.id === venueToToggle.id ? { ...v, is_active: !v.is_active } : v))
        );
      }
    } catch (err) {
      console.error("Toggle venue error:", err);
    }
  };

  // Community Handlers
  const handleCreateCommunity = async (data: NewCommunityData) => {
    setActionInProgress("create-community");
    try {
      const res = await fetch("/api/admin/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || "Failed to create community");

      setIsAddCommunityOpen(false);
      await loadCommunities();
      setAdminNotice({
        message: `Community "${resData.community?.name || data.name}" registered successfully.`,
        type: "success",
      });
      setTimeout(() => setAdminNotice(null), 5000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEditCommunity = async (communityId: string, data: EditCommunityData) => {
    setActionInProgress(communityId);
    try {
      const res = await fetch(`/api/admin/communities/${communityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || "Failed to update community");

      setEditingCommunity(null);
      await loadCommunities();
      setAdminNotice({
        message: `Community "${data.name}" updated successfully.`,
        type: "success",
      });
      setTimeout(() => setAdminNotice(null), 5000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteCommunity = async (commToDelete: AdminCommunityRow) => {
    if (commToDelete.event_count > 0) {
      setAdminNotice({
        message: `Cannot delete "${commToDelete.name}": ${commToDelete.event_count} active or pending event(s) exist.`,
        type: "error",
      });
      setTimeout(() => setAdminNotice(null), 5000);
      return;
    }
    if (!confirm(`Are you sure you want to delete community: "${commToDelete.name}"?`)) return;

    setActionInProgress(commToDelete.id);
    try {
      const res = await fetch(`/api/admin/communities/${commToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setAdminNotice({ message: data.error || "Failed to delete community", type: "error" });
        setTimeout(() => setAdminNotice(null), 7000);
      } else {
        setAdminNotice({ message: `Community "${commToDelete.name}" deleted.`, type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
        await loadCommunities();
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting community", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  if (initialLoading || authLoading) {
    return <AdminLoadingFallback />;
  }

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-white relative">
      {/* FLOATING TOAST NOTIFICATION */}
      {adminNotice && (
        <div
          role="status"
          className={`fixed top-18 right-6 z-50 p-3.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
            adminNotice.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-950"
              : "bg-rose-50/95 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {adminNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{adminNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingCount={pendingEvents.length}
        publishedCount={activePublishedEvents.length}
        archivedCount={archivedEvents.length}
        usersCount={users.length}
        venuesCount={venues.length}
        communitiesCount={adminCommunities.length}
        currentUserName={user?.fullName || "Campus Administrator"}
        currentUserEmail={user?.email || "admin@campus.edu"}
      />

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-white">
        {activeTab === "triage" && (
          <AdminTriageView
            pendingEvents={pendingEvents}
            publishedEvents={publishedEvents}
            communities={communities}
            onApprove={handleApprove}
            onOpenReject={(ev) => {
              setRejectingEvent(ev);
              setRejectionNote("");
            }}
            actionInProgress={actionInProgress}
          />
        )}

        {activeTab === "all-events" && (
          <AdminEventsView
            allEvents={allEvents}
            onDeleteEvent={handleDeleteEvent}
            onPreviewEvent={(ev) => setPreviewEvent(ev)}
            onNavigateToArchive={() => handleTabChange("archive")}
            actionInProgress={actionInProgress}
            nowTimestamp={nowTimestamp}
          />
        )}

        {activeTab === "archive" && (
          <AdminArchiveView
            events={allEvents}
            onDeleteEvent={handleDeleteEvent}
            onPreviewEvent={(ev) => setPreviewEvent(ev)}
            actionInProgress={actionInProgress}
          />
        )}

        {activeTab === "users" && (
          <AdminUsersView
            users={users}
            currentUserId={user?.id}
            onAddUserClick={() => setIsAddUserOpen(true)}
            onEditUserClick={(u) => setEditingUser(u)}
            onDeleteUserClick={handleDeleteUser}
            actionInProgress={actionInProgress}
          />
        )}

        {activeTab === "venues" && (
          <AdminVenuesView
            venues={venues}
            onToggleVenueActive={handleToggleVenueActive}
            onAddVenueClick={() => setIsAddVenueOpen(true)}
            onEditVenueClick={(v) => setEditingVenue(v)}
            onDeleteVenueClick={handleDeleteVenue}
            actionInProgress={actionInProgress}
          />
        )}

        {activeTab === "communities" && (
          <AdminCommunitiesView
            communities={adminCommunities}
            onAddCommunityClick={() => setIsAddCommunityOpen(true)}
            onEditCommunityClick={(c) => setEditingCommunity(c)}
            onDeleteCommunityClick={handleDeleteCommunity}
            actionInProgress={actionInProgress}
          />
        )}
      </div>

      {/* PREVIEW MODAL */}
      <EventDetailModal
        event={previewEvent}
        onClose={() => setPreviewEvent(null)}
      />

      {/* REJECT MODAL WITH NOTE & PRESETS */}
      <RejectionModal
        rejectingEvent={rejectingEvent}
        rejectionNote={rejectionNote}
        onRejectionNoteChange={setRejectionNote}
        onSubmit={handleReject}
        onClose={() => setRejectingEvent(null)}
        isSubmitting={actionInProgress === rejectingEvent?.id}
        title="Reject Event Proposal"
        submitLabel="Submit Rejection"
        submittingLabel="Rejecting..."
      />

      {/* ADD USER MODAL */}
      <AdminAddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSubmit={handleCreateUser}
        communities={communities}
        isSubmitting={actionInProgress === "create-user"}
      />

      {/* EDIT USER MODAL */}
      <AdminEditUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSubmit={handleSaveEditUser}
        user={editingUser}
        communities={communities}
        isSubmitting={actionInProgress === editingUser?.id}
      />

      {/* ADD VENUE MODAL */}
      <AdminAddVenueModal
        isOpen={isAddVenueOpen}
        onClose={() => setIsAddVenueOpen(false)}
        onSubmit={handleCreateVenue}
        isSubmitting={actionInProgress === "create-venue"}
      />

      {/* EDIT VENUE MODAL */}
      <AdminEditVenueModal
        isOpen={Boolean(editingVenue)}
        onClose={() => setEditingVenue(null)}
        onSubmit={handleSaveEditVenue}
        venue={editingVenue}
        isSubmitting={actionInProgress === editingVenue?.id}
      />

      {/* ADD COMMUNITY MODAL */}
      <AdminAddCommunityModal
        isOpen={isAddCommunityOpen}
        onClose={() => setIsAddCommunityOpen(false)}
        onSubmit={handleCreateCommunity}
        eligibleUsers={eligibleUsers}
        isSubmitting={actionInProgress === "create-community"}
      />

      {/* EDIT COMMUNITY MODAL */}
      <AdminEditCommunityModal
        isOpen={Boolean(editingCommunity)}
        onClose={() => setEditingCommunity(null)}
        onSubmit={handleSaveEditCommunity}
        community={editingCommunity}
        eligibleUsers={eligibleUsers}
        isSubmitting={actionInProgress === editingCommunity?.id}
      />
    </div>
  );
}

export default function AdminConsolePage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminConsoleContent />
    </Suspense>
  );
}
