"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Shield,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Users,
  Building,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  community_name?: string;
  community_slug?: string;
}

export default function AdminConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"triage" | "all-events" | "users" | "venues">("triage");

  const [allEvents, setAllEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);

  // Modals state
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("lead123");
  const [newUserRole, setNewUserRole] = useState<"admin" | "organizer">("organizer");
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
        router.push("/login");
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

      // 5. Extract communities from users/events for dropdown
      const uniqueComms = Array.from(
        new Map(
          (evData.events || [])
            .filter((e: CampusEvent) => e.community)
            .map((e: CampusEvent) => [e.community?.id, e.community])
        ).values()
      ) as Array<{ id: string; name: string }>;
      setCommunities(uniqueComms);
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
      }
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
      }
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-400">Loading Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Campus Administration</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Central Triage & Operations Console
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Apex Institute of Technology · Full scheduling oversight & role management
          </p>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add User</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddVenueOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-amber-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Venue</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div
          onClick={() => setActiveTab("triage")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === "triage"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Triage</span>
          </div>
          <div className="text-2xl font-bold text-white">{pendingEvents.length}</div>
        </div>

        <div
          onClick={() => setActiveTab("all-events")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === "all-events"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
              : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Live on Board</span>
          </div>
          <div className="text-2xl font-bold text-white">{publishedEvents.length}</div>
        </div>

        <div
          onClick={() => setActiveTab("users")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === "users"
              ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
              : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Active Staff & Leads</span>
          </div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
        </div>

        <div
          onClick={() => setActiveTab("venues")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === "venues"
              ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500"
              : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>Campus Venues</span>
          </div>
          <div className="text-2xl font-bold text-white">{venues.length}</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("triage")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "triage"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Submissions ({pendingEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all-events")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "all-events"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Master Calendar ({allEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "users"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("venues")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "venues"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Campus Venues ({venues.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING TRIAGE QUEUE */}
      {activeTab === "triage" && (
        <div className="space-y-4">
          {pendingEvents.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-200 mb-1">Triage Queue is Clean!</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                All club event submissions have been reviewed and processed.
              </p>
            </div>
          ) : (
            pendingEvents.map((ev) => {
              const startDate = parseISO(ev.start_time);
              const endDate = parseISO(ev.end_time);

              return (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl border border-amber-500/30 bg-zinc-900/60 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={ev.category} size="sm" />
                      <span className="text-xs font-semibold text-amber-400">
                        {ev.community?.name || "Campus Club"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-zinc-300 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
                      </span>

                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span>
                          {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        <span>{ev.venue?.name || ev.location_name}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={actionInProgress === ev.id}
                      onClick={() => handleApprove(ev.id)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Publish</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionInProgress === ev.id}
                      onClick={() => {
                        setRejectingEvent(ev);
                        setRejectionNote("");
                      }}
                      className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject with Note</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: MASTER CALENDAR (ALL EVENTS) */}
      {activeTab === "all-events" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">All Scheduled Events ({allEvents.length})</h3>
            <span className="text-xs text-zinc-500">Live Campus Master List</span>
          </div>

          <div className="divide-y divide-zinc-800/60 overflow-x-auto">
            {allEvents.map((ev) => {
              const startDate = parseISO(ev.start_time);

              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={ev.category} size="sm" />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          ev.status === "published"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : ev.status === "pending"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{ev.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span>{format(startDate, "MMM d, yyyy · h:mm a")}</span>
                      <span>{ev.venue?.name || ev.location_name}</span>
                      <span>{ev.community?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.status === "published" && (
                      <Link
                        href="/"
                        className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="View on Notice Board"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Only administrators can provision new accounts. Public self-registration is permanently disabled.
            </p>
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create User Account</span>
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="p-4">Name & Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Assigned Community</th>
                  <th className="p-4">Member Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{u.full_name}</div>
                      <div className="text-zinc-500 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          u.role === "admin"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                        }`}
                      >
                        {u.role === "admin" ? "Campus Admin" : "Community Lead"}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-zinc-200">
                      {u.community_name || (u.role === "admin" ? "All (Campus-Wide)" : "Unassigned")}
                    </td>
                    <td className="p-4 text-zinc-500">
                      {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "Pre-seeded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VENUE MANAGEMENT */}
      {activeTab === "venues" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Manage physical campus facilities used for collision detection and booking.
            </p>
            <button
              type="button"
              onClick={() => setIsAddVenueOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Facility</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-400">
                      {v.building || "Campus Building"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleVenueActive(v)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                        v.is_active
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {v.is_active ? "Active" : "Under Maintenance"}
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-white mb-1">{v.name}</h4>
                  <div className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
                    <span>Capacity: <strong className="text-zinc-200">{v.capacity}</strong> attendees</span>
                  </div>

                  {v.notes && (
                    <p className="text-[11px] text-zinc-500 italic mb-2">
                      {v.notes}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/80">
                  {v.address || "Main Campus Grounds"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REJECT MODAL WITH NOTE */}
      {rejectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectingEvent(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 p-6 z-10 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Reject Event Proposal
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Provide feedback for <strong className="text-zinc-200">{rejectingEvent.community?.name}</strong> so they can adjust their date or venue.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Administrative Reason / Alternate Venue Suggestion *
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. The Main Auditorium is undergoing stage maintenance. Please re-submit your proposal for Seminar Hall A or select next Tuesday."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === rejectingEvent.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddUserOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 p-6 z-10 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Provision New User Account
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Create credentials for an Administrator or Community Lead.
            </p>

            {userModalError && (
              <div className="p-3 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
                {userModalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Campus Email *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. elena@campus.edu"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "admin" | "organizer")}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="organizer">Community Lead</option>
                  <option value="admin">Campus Administrator</option>
                </select>
              </div>

              {newUserRole === "organizer" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Community</label>
                  <select
                    value={newUserCommId}
                    onChange={(e) => setNewUserCommId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Club...</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VENUE MODAL */}
      {isAddVenueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddVenueOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 p-6 z-10 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Add Campus Facility / Venue
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Add a bookable space for event coordination.
            </p>

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="e.g. Media Lab 304"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Building</label>
                  <input
                    type="text"
                    value={newVenueBuilding}
                    onChange={(e) => setNewVenueBuilding(e.target.value)}
                    placeholder="e.g. Arts Wing"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newVenueCapacity}
                    onChange={(e) => setNewVenueCapacity(e.target.value)}
                    placeholder="80"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Address / Level</label>
                <input
                  type="text"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  placeholder="e.g. 3rd Floor, West Wing"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Notes / Equipment</label>
                <textarea
                  rows={2}
                  value={newVenueNotes}
                  onChange={(e) => setNewVenueNotes(e.target.value)}
                  placeholder="e.g. Dual projectors, microphones, lab computers..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVenueOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
