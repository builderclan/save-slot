"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  IndianRupee,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { CampusEvent, Community, Department } from "@/types/database";
import { CategoryBadge, EventDetailModal } from "@/features/events";
import { stage2Api } from "../api";

interface Stage2DeskProps {
  scope: "hod" | "fic";
}

export function Stage2Desk({ scope }: Stage2DeskProps) {
  const { user, refreshSession } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [scopedDepartments, setScopedDepartments] = useState<Department[]>([]);
  const [scopedCommunities, setScopedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [togglingDeptId, setTogglingDeptId] = useState<string | null>(null);
  const [rejectingEvent, setRejectingEvent] = useState<CampusEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showNotice = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4500);
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const res = await stage2Api.getQueue(scope);
      setEvents(res.events || []);
      setScopedDepartments(res.scopedDepartments || []);
      setScopedCommunities(res.scopedCommunities || []);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to load queue", "error");
    } finally {
      setLoading(false);
    }
  }, [scope, showNotice]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const ownedIds = useMemo(() => {
    if (scope === "hod") {
      return new Set(scopedDepartments.map((d) => d.id));
    }
    return new Set(scopedCommunities.map((c) => c.id));
  }, [scope, scopedDepartments, scopedCommunities]);

  const isPendingMySignoff = useCallback(
    (ev: CampusEvent) => {
      if (ev.status !== "pending_stage2") return false;
      const rows = ev.stage2_approvals || [];
      return rows.some(
        (row) =>
          row.approval_status === "pending" &&
          (scope === "hod"
            ? row.entity_type === "department" && row.department_id && ownedIds.has(row.department_id)
            : row.entity_type === "community" && row.community_id && ownedIds.has(row.community_id))
      );
    },
    [scope, ownedIds]
  );

  const pendingEvents = useMemo(
    () => events.filter(isPendingMySignoff),
    [events, isPendingMySignoff]
  );
  const historyEvents = useMemo(
    () => events.filter((ev) => !isPendingMySignoff(ev)),
    [events, isPendingMySignoff]
  );

  const visibleEvents = activeTab === "pending" ? pendingEvents : historyEvents;

  const handleApprove = async (ev: CampusEvent) => {
    try {
      setBusyEventId(ev.id);
      const res = await stage2Api.approveEvent(scope, ev.id);
      await loadQueue();
      showNotice(
        res.allStage2Approved
          ? `"${ev.title}" cleared Stage 2 and moved to Principal / VP.`
          : `"${ev.title}" Stage 2 sign-off recorded; waiting on co-host review.`
      );
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Approval failed", "error");
    } finally {
      setBusyEventId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingEvent) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 5) {
      setRejectError("Please provide at least 5 characters explaining the rejection.");
      return;
    }

    try {
      setBusyEventId(rejectingEvent.id);
      setRejectError(null);
      await stage2Api.rejectEvent(scope, rejectingEvent.id, trimmed);
      const title = rejectingEvent.title;
      setRejectingEvent(null);
      setRejectionReason("");
      await loadQueue();
      showNotice(`Returned "${title}" to the organizer for revision.`);
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setBusyEventId(null);
    }
  };

  const handleToggleActingHod = async (dept: Department) => {
    try {
      setTogglingDeptId(dept.id);
      const nextState = !dept.is_acting_hod_active;
      await stage2Api.toggleActingHod(dept.id, nextState);
      await Promise.all([loadQueue(), refreshSession(true)]);
      showNotice(
        nextState
          ? `Acting HOD cover enabled for ${dept.code}.`
          : `Acting HOD cover disabled; primary HOD duties active for ${dept.code}.`
      );
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to toggle Acting HOD", "error");
    } finally {
      setTogglingDeptId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {notice && (
          <div
            role="status"
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-medium ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <span>{notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} className="p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 mb-1.5">
              {scope === "hod" ? (
                <Building2 className="w-3 h-3" />
              ) : (
                <UserCheck className="w-3 h-3" />
              )}
              <span>
                {scope === "hod"
                  ? "Stage 2 · Department HOD Review"
                  : "Stage 2 · Faculty-in-Charge Review"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {scope === "hod" ? "Department Approval Desk" : "Community FIC Desk"}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {scope === "hod"
                ? "Review departmental and joint proposals before executive clearance."
                : "Review assigned internal & external community proposals before Principal / VP sign-off."}
            </p>
          </div>

          <button
            type="button"
            onClick={loadQueue}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Scoped Department Cards + Acting HOD Self-Toggle */}
        {scope === "hod" && scopedDepartments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scopedDepartments.map((dept) => {
              const isPrimaryHod = user?.id === dept.hod_user_id;
              return (
                <div
                  key={dept.id}
                  className="p-4 rounded-2xl border border-zinc-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[11px] font-bold">
                        {dept.code}
                      </span>
                      <span className="text-sm font-semibold text-zinc-900 truncate">
                        {dept.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {dept.is_acting_hod_active
                        ? `Acting HOD Active: ${dept.acting_hod?.full_name || "Assigned Cover"}`
                        : `Primary HOD Active${dept.acting_hod ? ` (Cover: ${dept.acting_hod.full_name})` : ""}`}
                    </p>
                  </div>

                  {isPrimaryHod && dept.acting_hod_user_id ? (
                    <button
                      type="button"
                      disabled={togglingDeptId === dept.id}
                      onClick={() => handleToggleActingHod(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                        dept.is_acting_hod_active
                          ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {togglingDeptId === dept.id
                        ? "Updating..."
                        : dept.is_acting_hod_active
                        ? "Resume Primary HOD"
                        : "Enable Leave Cover"}
                    </button>
                  ) : dept.is_acting_hod_active ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1 self-start">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Acting Cover Active
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Scoped Communities Strip (FIC) */}
        {scope === "fic" && scopedCommunities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Assigned Communities:</span>
            {scopedCommunities.map((comm) => (
              <span
                key={comm.id}
                className="px-2.5 py-1 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 inline-flex items-center gap-1.5"
              >
                <span className="font-mono font-bold text-indigo-600">{comm.code}</span>
                <span>{comm.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 capitalize">
                  {comm.scope}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Queue Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              activeTab === "pending"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            Awaiting Sign-Off ({pendingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              activeTab === "history"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            Reviewed History ({historyEvents.length})
          </button>
        </div>

        {/* Event List */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden divide-y divide-zinc-100">
          {visibleEvents.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-semibold text-zinc-800">
                {activeTab === "pending"
                  ? "No proposals awaiting your Stage 2 sign-off"
                  : "No reviewed proposals yet"}
              </p>
              <p className="text-xs text-zinc-500">
                {activeTab === "pending"
                  ? "All caught up for your assigned scope."
                  : "Events you approve or return will appear here."}
              </p>
            </div>
          ) : (
            visibleEvents.map((ev) => {
              const canAct = isPendingMySignoff(ev);
              const isBusy = busyEventId === ev.id;
              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={ev.category} size="sm" />
                      {ev.origin_type === "department" && ev.department && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold">
                          Dept · {ev.department.code}
                        </span>
                      )}
                      {ev.origin_type === "community" && ev.community && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                          {ev.community.code} ({ev.community.scope})
                        </span>
                      )}
                      {ev.reference_number && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold text-zinc-700">
                          {ev.reference_number}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 text-[10px] font-medium capitalize">
                        {ev.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h3
                      onClick={() => setPreviewEvent(ev)}
                      className="text-sm font-bold text-zinc-900 hover:text-indigo-600 cursor-pointer truncate"
                    >
                      {ev.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3.5 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {format(parseISO(ev.start_time), "EEE, MMM d, yyyy")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {format(parseISO(ev.start_time), "h:mm a")} –{" "}
                        {format(parseISO(ev.end_time), "h:mm a")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {ev.venue?.name || ev.location_name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-zinc-400" />
                        ₹{Number(ev.estimated_budget || 0).toLocaleString()} ({ev.funding_source || "No Cost"})
                      </span>
                      {ev.creator && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          By {ev.creator.full_name}
                        </span>
                      )}
                    </div>

                    {ev.stage2_approvals && ev.stage2_approvals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {ev.stage2_approvals.map((s2) => (
                          <span
                            key={s2.id}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${
                              s2.approval_status === "approved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : s2.approval_status === "rejected"
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-zinc-50 border-zinc-200 text-zinc-600"
                            }`}
                          >
                            {s2.entity_code || s2.entity_name || s2.entity_type}: {s2.approval_status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewEvent(ev)}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Preview</span>
                    </button>

                    {canAct && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectingEvent(ev);
                            setRejectionReason("");
                            setRejectError(null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(ev)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBusy ? "Saving..." : "Approve Stage 2"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {rejectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs"
            onClick={() => setRejectingEvent(null)}
          />
          <form
            onSubmit={handleRejectSubmit}
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl p-5 sm:p-6 z-10 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Return Proposal for Revision</h3>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{rejectingEvent.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingEvent(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rejectError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Rejection Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what the organizer should revise before resubmitting..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingEvent(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyEventId === rejectingEvent.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {busyEventId === rejectingEvent.id ? "Returning..." : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}

      <EventDetailModal event={previewEvent} onClose={() => setPreviewEvent(null)} />
    </div>
  );
}
