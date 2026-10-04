"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Clock, Calendar, Users, Building, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import {
  AdminMetricsRow,
  AdminTab,
} from "@/components/admin/admin-metrics-row";
import { AdminTriageView } from "@/components/admin/admin-triage-view";
import { AdminEventsView } from "@/components/admin/admin-events-view";
import {
  AdminUsersView,
  AdminUserRow,
} from "@/components/admin/admin-users-view";
import { AdminVenuesView } from "@/components/admin/admin-venues-view";
import { AdminAddUserModal } from "@/components/admin/admin-add-user-modal";
import { AdminAddVenueModal } from "@/components/admin/admin-add-venue-modal";
import { AdminRejectionModal } from "@/components/admin/admin-rejection-modal";

export default function AdminConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  // Modals state
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  // New User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "principal" | "vice_principal" | "organizer">("organizer");
  const [newUserCommId, setNewUserCommId] = useState("");
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // New Venue Modal State
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueBuilding, setNewVenueBuilding] = useState("");
  const [newVenueCapacity, setNewVenueCapacity] = useState("100");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueNotes, setNewVenueNotes] = useState("");

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
          message: "Event rejected and returned with feedback.",
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

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;

    setActionInProgress(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } finally {
      setActionInProgress(null);
    }
  };

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
    } catch (err: unknown) {
      setUserModalError(err instanceof Error ? err.message : "Error creating user");
    }
  };

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
        loadAllData();
      }
    } catch (err) {
      console.error("Create venue error:", err);
    }
  };

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

  const pendingEvents = allEvents.filter((e) => e.status === "pending");
  const publishedEvents = allEvents.filter((e) => e.status === "published");

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading Admin Operations Console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Notice Banner */}
      {adminNotice && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs ${
            adminNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Campus Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Central Triage & Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Albertian Institute of Science & Technology (AISAT) · Institutional calendar oversight, safety audit, and staff provisioning
          </p>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Add User</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddVenueOpen(true)}
            className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Facility</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <AdminMetricsRow
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        pendingCount={pendingEvents.length}
        publishedCount={publishedEvents.length}
        usersCount={users.length}
        venuesCount={venues.length}
      />

      {/* Tabs Switcher */}
      <div className="flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 mb-6 overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab("triage")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "triage"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Pending Submissions ({pendingEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all-events")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "all-events"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Master Calendar ({allEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "users"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("venues")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "venues"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span>Campus Venues ({venues.length})</span>
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === "triage" && (
        <AdminTriageView
          pendingEvents={pendingEvents}
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
          actionInProgress={actionInProgress}
        />
      )}

      {activeTab === "users" && (
        <AdminUsersView
          users={users}
          onAddUserClick={() => setIsAddUserOpen(true)}
        />
      )}

      {activeTab === "venues" && (
        <AdminVenuesView
          venues={venues}
          onToggleVenueActive={handleToggleVenueActive}
          onAddVenueClick={() => setIsAddVenueOpen(true)}
        />
      )}

      {/* REJECT MODAL WITH NOTE */}
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
    </div>
  );
}
