"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  Plus,
  ShieldAlert,
  ExternalLink,
  Search,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { CampusEvent, Venue } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { ProposeEventModal } from "@/components/lead/propose-event-modal";
import { EventDetailModal } from "@/components/events/event-detail-modal";

interface LeadSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isLead: boolean;
  leadCommunities: Array<{ id: string; name: string; slug: string; category?: string }>;
}

type StatusFilter = "all" | "published" | "pending" | "rejected";
type SortOption = "date-asc" | "date-desc" | "created-desc" | "title-asc";

const CATEGORIES: Array<{ label: string; value: string }> = [
  { label: "All Categories", value: "all" },
  { label: "Tech", value: "Tech" },
  { label: "Career", value: "Career" },
  { label: "Arts", value: "Arts" },
  { label: "Social", value: "Social" },
  { label: "Sports", value: "Sports" },
  { label: "Academic", value: "Academic" },
  { label: "Workshop", value: "Workshop" },
];

export default function LeadWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<LeadSession | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected community (if lead manages multiple clubs)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setActionNotice({ message, type });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verify user session
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.authenticated || (!meData.user.isLead && !meData.user.isAdmin)) {
        router.push("/login");
        return;
      }
      setSession(meData.user);

      if (meData.user.leadCommunities && meData.user.leadCommunities.length > 0) {
        setSelectedCommunityId((prev) => prev || meData.user.leadCommunities[0].id);
      }

      // 2. Load lead's events
      const eventsRes = await fetch("/api/lead/events");
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);

      // 3. Load active venues
      const venuesRes = await fetch("/api/venues");
      const venuesData = await venuesRes.json();
      setVenues(venuesData.venues || []);
    } catch (err) {
      console.error("Lead workspace error:", err);
      showNotice("Failed to load workspace data. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle withdrawing (deleting) a pending or rejected proposal
  const handleConfirmWithdraw = async () => {
    if (!withdrawingEvent) return;
    try {
      setIsWithdrawing(true);
      const res = await fetch(`/api/lead/events/${withdrawingEvent.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
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
    if (!session || !session.leadCommunities) return null;
    return (
      session.leadCommunities.find((c) => c.id === selectedCommunityId) ||
      session.leadCommunities[0] ||
      null
    );
  }, [session, selectedCommunityId]);

  // Filter events belonging to active community (if lead has multiple)
  const communityEvents = useMemo(() => {
    if (!assignedCommunity) return events;
    return events.filter((e) => e.community_id === assignedCommunity.id);
  }, [events, assignedCommunity]);

  // Overall metric counts for active community
  const approvedCount = useMemo(
    () => communityEvents.filter((e) => e.status === "published").length,
    [communityEvents]
  );
  const pendingCount = useMemo(
    () => communityEvents.filter((e) => e.status === "pending").length,
    [communityEvents]
  );
  const rejectedCount = useMemo(
    () => communityEvents.filter((e) => e.status === "rejected").length,
    [communityEvents]
  );

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

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
    setSortBy("date-asc");
  };

  // Helper for human-readable relative date badge
  const getRelativeDateBadge = (startTime: string) => {
    const date = parseISO(startTime);
    const today = new Date();
    const daysUntil = differenceInCalendarDays(date, today);

    if (daysUntil < 0) {
      return {
        label: "Concluded",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
    }
    if (daysUntil === 0) {
      return {
        label: "Today",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
      };
    }
    if (daysUntil === 1) {
      return {
        label: "Tomorrow",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    return {
      label: `In ${daysUntil} days`,
      className: "bg-slate-50 text-slate-700 border-slate-200",
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading Lead Workspace...</p>
      </div>
    );
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
            {session && session.leadCommunities && session.leadCommunities.length > 1 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {session.leadCommunities.map((comm) => (
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
              Lead Organizer: <span className="font-semibold text-slate-800">{session?.fullName}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{session?.email}</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
        {/* Total Submissions Card */}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
            statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
              : "bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${
              statusFilter === "all" ? "text-slate-300" : "text-slate-400"
            }`}
          >
            Total Submissions
          </div>
          <div className="text-2xl font-bold tracking-tight">{communityEvents.length}</div>
          <div
            className={`text-[11px] mt-1 ${
              statusFilter === "all" ? "text-slate-300 font-medium" : "text-slate-400"
            }`}
          >
            {statusFilter === "all" ? "• Showing all" : "Click to view all"}
          </div>
        </button>

        {/* Approved & Live Card */}
        <button
          type="button"
          onClick={() => setStatusFilter("published")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
            statusFilter === "published"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
              : "bg-emerald-50/50 text-emerald-950 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs"
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              statusFilter === "published" ? "text-emerald-100" : "text-emerald-800"
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                statusFilter === "published" ? "text-emerald-200" : "text-emerald-600"
              }`}
            />
            <span>Approved & Live</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{approvedCount}</div>
          <div
            className={`text-[11px] mt-1 ${
              statusFilter === "published" ? "text-emerald-100 font-medium" : "text-emerald-700/80"
            }`}
          >
            {statusFilter === "published" ? "• Active filter" : "Live on campus"}
          </div>
        </button>

        {/* Pending Review Card */}
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
            statusFilter === "pending"
              ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20"
              : "bg-amber-50/50 text-amber-950 border-amber-200/80 hover:border-amber-300 hover:bg-amber-50 shadow-2xs"
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              statusFilter === "pending" ? "text-amber-100" : "text-amber-800"
            }`}
          >
            <Clock3
              className={`w-3.5 h-3.5 ${
                statusFilter === "pending" ? "text-amber-200" : "text-amber-600"
              }`}
            />
            <span>Pending Review</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{pendingCount}</div>
          <div
            className={`text-[11px] mt-1 ${
              statusFilter === "pending" ? "text-amber-100 font-medium" : "text-amber-700/80"
            }`}
          >
            {statusFilter === "pending" ? "• Active filter" : "In admin triage"}
          </div>
        </button>

        {/* Needs Revision Card */}
        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
            statusFilter === "rejected"
              ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20"
              : "bg-rose-50/50 text-rose-950 border-rose-200/80 hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
              statusFilter === "rejected" ? "text-rose-100" : "text-rose-800"
            }`}
          >
            <XCircle
              className={`w-3.5 h-3.5 ${
                statusFilter === "rejected" ? "text-rose-200" : "text-rose-600"
              }`}
            />
            <span>Needs Revision</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{rejectedCount}</div>
          <div
            className={`text-[11px] mt-1 ${
              statusFilter === "rejected" ? "text-rose-100 font-medium" : "text-rose-700/80"
            }`}
          >
            {statusFilter === "rejected" ? "• Active filter" : "Feedback provided"}
          </div>
        </button>
      </div>

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
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Event Proposals ({communityEvents.length})
              </h2>
              {hasActiveFilters && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  Showing {filteredEvents.length}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Control Bar: Search Input, Category Selector, and Sort Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event title, venue, or description..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-4 relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="sm:col-span-3 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
              >
                <option value="date-asc">Event Date: Earliest</option>
                <option value="date-desc">Event Date: Furthest</option>
                <option value="created-desc">Recently Submitted</option>
                <option value="title-asc">Title: Alphabetical</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* List Content */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {hasActiveFilters ? "No matching proposals found" : "No event proposals submitted yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
              {hasActiveFilters
                ? "Try adjusting your search terms or clearing status and category filters to find what you need."
                : "Your club has not submitted any event proposals yet. Submit your first proposal with automated Safe-Slot collision checks."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setIsProposeOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Submit Your First Event
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((ev) => {
              const startDate = parseISO(ev.start_time);
              const endDate = parseISO(ev.end_time);
              const relativeBadge = getRelativeDateBadge(ev.start_time);
              const venueName = ev.venue?.name || ev.location_name;

              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Status & Category Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={ev.category} size="sm" />

                      {/* Status Chip */}
                      {ev.status === "published" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved & Live</span>
                        </span>
                      )}

                      {ev.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium">
                          <Clock3 className="w-3 h-3 text-amber-600" />
                          <span>Pending Review</span>
                        </span>
                      )}

                      {ev.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-800 text-[10px] font-medium">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Needs Revision</span>
                        </span>
                      )}

                      {/* Relative Timing Pill */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${relativeBadge.className}`}
                      >
                        {relativeBadge.label}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="flex items-baseline gap-2">
                      <h3
                        onClick={() => setPreviewEvent(ev)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors leading-snug truncate"
                        title={ev.title}
                      >
                        {ev.title}
                      </h3>
                    </div>

                    {/* Timestamps & Venue Info */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{format(startDate, "EEE, MMM d, yyyy")}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{venueName}</span>
                        {ev.venue?.capacity && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({ev.venue.capacity} cap)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Inline Administrative Feedback Snippet for Rejected Events */}
                    {ev.status === "rejected" && ev.rejection_reason && (
                      <div className="mt-2 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <strong className="font-semibold block text-rose-950">
                            Administrator Feedback:
                          </strong>
                          <p className="text-rose-900/90 leading-relaxed line-clamp-2">
                            {ev.rejection_reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Suite */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0 self-end lg:self-center shrink-0 flex-wrap">
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewEvent(ev)}
                      title="Preview public event card"
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Preview</span>
                    </button>

                    {/* View Live for Published Events */}
                    {ev.status === "published" && (
                      <Link
                        href="/"
                        title="View on Campus Notice Board"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                      >
                        <span>View Live</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    )}

                    {/* Revise & Resubmit for Rejected Events */}
                    {ev.status === "rejected" && (
                      <button
                        type="button"
                        onClick={() => setEditingEvent(ev)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Revise & Resubmit</span>
                      </button>
                    )}

                    {/* Edit Proposal for Pending Events */}
                    {ev.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => setEditingEvent(ev)}
                        title="Edit proposal details before review"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* Withdraw / Delete Button for Pending or Rejected Events */}
                    {ev.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => setWithdrawingEvent(ev)}
                        title="Withdraw this event proposal"
                        className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer active:scale-[0.98]"
                        aria-label="Withdraw proposal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            loadData();
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
      {selectedRejectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedRejectedEvent(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 z-10">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Administrative Rejection Notice
              </h3>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Event: <strong className="text-slate-800">{selectedRejectedEvent.title}</strong>
            </p>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 leading-relaxed mb-6">
              {selectedRejectedEvent.rejection_reason ||
                "No specific feedback was provided by campus administrators. Please consult with the activities board."}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const ev = selectedRejectedEvent;
                  setSelectedRejectedEvent(null);
                  setEditingEvent(ev);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Revise & Resubmit
              </button>
              <button
                type="button"
                onClick={() => setSelectedRejectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Confirmation Dialog */}
      {withdrawingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setWithdrawingEvent(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Withdraw Event Proposal?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to withdraw{" "}
              <strong className="text-slate-900">&ldquo;{withdrawingEvent.title}&rdquo;</strong>? This will
              remove the proposal from the administrative triage queue. This action cannot be
              undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawingEvent(null)}
                disabled={isWithdrawing}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={isWithdrawing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isWithdrawing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Withdrawal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
