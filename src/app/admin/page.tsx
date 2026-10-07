"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { AdminTab } from "@/components/admin/admin-metrics-row";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTriageView } from "@/components/admin/admin-triage-view";
import { AdminEventsView } from "@/components/admin/admin-events-view";
import { AdminArchiveView } from "@/components/admin/admin-archive-view";
import {
  AdminUsersView,
  AdminUserRow,
} from "@/components/admin/admin-users-view";
import { AdminVenuesView } from "@/components/admin/admin-venues-view";
import { AdminAddUserModal } from "@/components/admin/admin-add-user-modal";
import { AdminEditUserModal } from "@/components/admin/admin-edit-user-modal";
import { AdminAddVenueModal } from "@/components/admin/admin-add-venue-modal";
import { AdminEditVenueModal } from "@/components/admin/admin-edit-venue-modal";
import { AdminRejectionModal } from "@/components/admin/admin-rejection-modal";
import { EventDetailModal } from "@/components/events/event-detail-modal";

export default function AdminConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUserName, setCurrentUserName] = useState<string>("Campus Dean of Affairs");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("admin@campus.edu");
  const [activeTab, setActiveTab] = useState<AdminTab>("triage");

  const [allEvents, setAllEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);

  // Action status
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Event Preview Drawer Modal
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);

  // Rejection Modal State
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "principal" | "vice_principal" | "organizer">("organizer");
  const [newUserCommId, setNewUserCommId] = useState("");
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // Edit User Modal State
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<"admin" | "principal" | "vice_principal" | "organizer">("organizer");
  const [editUserCommId, setEditUserCommId] = useState("");
  const [editUserError, setEditUserError] = useState<string | null>(null);

  // Add Venue Modal State
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueBuilding, setNewVenueBuilding] = useState("");
  const [newVenueCapacity, setNewVenueCapacity] = useState("100");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueNotes, setNewVenueNotes] = useState("");

  // Edit Venue Modal State
  const [isEditVenueOpen, setIsEditVenueOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editVenueName, setEditVenueName] = useState("");
  const [editVenueBuilding, setEditVenueBuilding] = useState("");
  const [editVenueCapacity, setEditVenueCapacity] = useState("100");
  const [editVenueAddress, setEditVenueAddress] = useState("");
  const [editVenueNotes, setEditVenueNotes] = useState("");
  const [editVenueIsActive, setEditVenueIsActive] = useState(true);
  const [editVenueError, setEditVenueError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Auth check
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user.isAdmin) {
        router.push("/login?error=admin_required");
        return;
      }
      setCurrentUserId(meData.user.id);
      if (meData.user.fullName) setCurrentUserName(meData.user.fullName);
      if (meData.user.email) setCurrentUserEmail(meData.user.email);

      // 2. Fetch all events (including pending and rejected)
      const evRes = await fetch("/api/lead/events");
      const evData = await evRes.json();
      setAllEvents(evData.events || []);

      // 3. Fetch users
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // 4. Fetch venues
      const venuesRes = await fetch("/api/admin/venues");
      const venuesData = await venuesRes.json();
      setVenues(venuesData.venues || []);

      // 5. Fetch all recognized communities directly from API
      const commsRes = await fetch("/api/communities");
      const commsData = await commsRes.json();
      setCommunities(commsData.communities || []);

    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });
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

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          communityId: newUserRole === "organizer" ? newUserCommId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setIsAddUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      loadAllData();
      setAdminNotice({ message: "User account provisioned successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } catch (err: unknown) {
      setUserModalError(err instanceof Error ? err.message : "Error creating user");
    }
  };

  // Open Edit User
  const handleOpenEditUser = (user: AdminUserRow) => {
    setEditingUser(user);
    setEditUserName(user.full_name);
    setEditUserRole(user.role as "admin" | "principal" | "vice_principal" | "organizer");
    setEditUserCommId(user.community_id || "");
    setEditUserError(null);
    setIsEditUserOpen(true);
  };

  // Submit Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError(null);
    setActionInProgress(editingUser.id);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editUserName,
          role: editUserRole,
          communityId: editUserRole === "organizer" ? editUserCommId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setIsEditUserOpen(false);
      setEditingUser(null);
      loadAllData();
      setAdminNotice({ message: "User account permissions updated successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } catch (err: unknown) {
      setEditUserError(err instanceof Error ? err.message : "Error updating user");
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AdminUserRow) => {
    if (!confirm(`Are you sure you want to permanently delete user account: ${user.full_name} (${user.email})?`)) {
      return;
    }

    setActionInProgress(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminNotice({ message: data.error || "Failed to delete user", type: "error" });
        setTimeout(() => setAdminNotice(null), 6000);
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setAdminNotice({ message: `User ${user.email} removed from system.`, type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting user", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Create Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVenueName,
          building: newVenueBuilding,
          capacity: newVenueCapacity,
          address: newVenueAddress,
          notes: newVenueNotes,
        }),
      });

      if (res.ok) {
        setIsAddVenueOpen(false);
        setNewVenueName("");
        setNewVenueBuilding("");
        setNewVenueCapacity("100");
        setNewVenueAddress("");
        setNewVenueNotes("");
        loadAllData();
        setAdminNotice({ message: "Campus facility registered successfully.", type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
      } else {
        const data = await res.json();
        setAdminNotice({ message: data.error || "Failed to create venue", type: "error" });
      }
    } catch (err) {
      console.error("Create venue error:", err);
    }
  };

  // Open Edit Venue
  const handleOpenEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setEditVenueName(venue.name);
    setEditVenueBuilding(venue.building || "");
    setEditVenueCapacity(String(venue.capacity || 100));
    setEditVenueAddress(venue.address || "");
    setEditVenueNotes(venue.notes || "");
    setEditVenueIsActive(venue.is_active);
    setEditVenueError(null);
    setIsEditVenueOpen(true);
  };

  // Submit Edit Venue
  const handleSaveEditVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;
    setEditVenueError(null);
    setActionInProgress(editingVenue.id);

    try {
      const res = await fetch(`/api/admin/venues/${editingVenue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editVenueName,
          building: editVenueBuilding,
          capacity: parseInt(editVenueCapacity, 10),
          address: editVenueAddress,
          notes: editVenueNotes,
          is_active: editVenueIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update facility");

      setIsEditVenueOpen(false);
      setEditingVenue(null);
      loadAllData();
      setAdminNotice({ message: "Facility details updated successfully.", type: "success" });
      setTimeout(() => setAdminNotice(null), 4000);
    } catch (err: unknown) {
      setEditVenueError(err instanceof Error ? err.message : "Error updating facility");
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete Venue
  const handleDeleteVenue = async (venue: Venue) => {
    if (!confirm(`Are you sure you want to delete facility: "${venue.name}"?`)) return;

    setActionInProgress(venue.id);
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminNotice({ message: data.error || "Failed to delete facility", type: "error" });
        setTimeout(() => setAdminNotice(null), 7000);
      } else {
        setVenues((prev) => prev.filter((v) => v.id !== venue.id));
        setAdminNotice({ message: `Facility "${venue.name}" deleted.`, type: "success" });
        setTimeout(() => setAdminNotice(null), 4000);
      }
    } catch {
      setAdminNotice({ message: "Network error while deleting facility", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle Venue Active
  const handleToggleVenueActive = async (venue: Venue) => {
    try {
      const res = await fetch("/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: venue.id, is_active: !venue.is_active }),
      });
      if (res.ok) {
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? { ...v, is_active: !v.is_active } : v))
        );
      }
    } catch (err) {
      console.error("Toggle venue error:", err);
    }
  };

  const [nowTimestamp, setNowTimestamp] = useState<number>(0);

  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  const pendingEvents = allEvents.filter((e) => e.status === "pending");
  const publishedEvents = allEvents.filter((e) => e.status === "published");
  const archivedEvents = allEvents.filter((e) =>
    nowTimestamp ? new Date(e.end_time).getTime() < nowTimestamp : false
  );
  const activePublishedEvents = allEvents.filter(
    (e) =>
      e.status === "published" &&
      (!e.end_time || (nowTimestamp ? new Date(e.end_time).getTime() >= nowTimestamp : true))
  );

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center bg-white">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading Operations Console...</p>
      </div>
    );
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
        onTabChange={setActiveTab}
        pendingCount={pendingEvents.length}
        publishedCount={activePublishedEvents.length}
        archivedCount={archivedEvents.length}
        usersCount={users.length}
        venuesCount={venues.length}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
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
            onNavigateToArchive={() => setActiveTab("archive")}
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
            currentUserId={currentUserId}
            onAddUserClick={() => setIsAddUserOpen(true)}
            onEditUserClick={handleOpenEditUser}
            onDeleteUserClick={handleDeleteUser}
            actionInProgress={actionInProgress}
          />
        )}

        {activeTab === "venues" && (
          <AdminVenuesView
            venues={venues}
            onToggleVenueActive={handleToggleVenueActive}
            onAddVenueClick={() => setIsAddVenueOpen(true)}
            onEditVenueClick={handleOpenEditVenue}
            onDeleteVenueClick={handleDeleteVenue}
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
      <AdminRejectionModal
        rejectingEvent={rejectingEvent}
        rejectionNote={rejectionNote}
        onRejectionNoteChange={setRejectionNote}
        onSubmit={handleReject}
        onClose={() => setRejectingEvent(null)}
        isSubmitting={actionInProgress === rejectingEvent?.id}
      />

      {/* ADD USER MODAL */}
      <AdminAddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSubmit={handleCreateUser}
        name={newUserName}
        onNameChange={setNewUserName}
        email={newUserEmail}
        onEmailChange={setNewUserEmail}
        password={newUserPassword}
        onPasswordChange={setNewUserPassword}
        role={newUserRole}
        onRoleChange={setNewUserRole}
        communityId={newUserCommId}
        onCommunityIdChange={setNewUserCommId}
        communities={communities}
        error={userModalError}
      />

      {/* EDIT USER MODAL */}
      <AdminEditUserModal
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        onSubmit={handleSaveEditUser}
        user={editingUser}
        name={editUserName}
        onNameChange={setEditUserName}
        role={editUserRole}
        onRoleChange={setEditUserRole}
        communityId={editUserCommId}
        onCommunityIdChange={setEditUserCommId}
        communities={communities}
        error={editUserError}
        isSubmitting={actionInProgress === editingUser?.id}
      />

      {/* ADD VENUE MODAL */}
      <AdminAddVenueModal
        isOpen={isAddVenueOpen}
        onClose={() => setIsAddVenueOpen(false)}
        onSubmit={handleCreateVenue}
        name={newVenueName}
        onNameChange={setNewVenueName}
        building={newVenueBuilding}
        onBuildingChange={setNewVenueBuilding}
        capacity={newVenueCapacity}
        onCapacityChange={setNewVenueCapacity}
        address={newVenueAddress}
        onAddressChange={setNewVenueAddress}
        notes={newVenueNotes}
        onNotesChange={setNewVenueNotes}
      />

      {/* EDIT VENUE MODAL */}
      <AdminEditVenueModal
        isOpen={isEditVenueOpen}
        onClose={() => setIsEditVenueOpen(false)}
        onSubmit={handleSaveEditVenue}
        venue={editingVenue}
        name={editVenueName}
        onNameChange={setEditVenueName}
        building={editVenueBuilding}
        onBuildingChange={setEditVenueBuilding}
        capacity={editVenueCapacity}
        onCapacityChange={setEditVenueCapacity}
        address={editVenueAddress}
        onAddressChange={setEditVenueAddress}
        notes={editVenueNotes}
        onNotesChange={setEditVenueNotes}
        isActive={editVenueIsActive}
        onIsActiveChange={setEditVenueIsActive}
        error={editVenueError}
        isSubmitting={actionInProgress === editingVenue?.id}
      />
    </div>
  );
}
