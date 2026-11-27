"use client";

import { Suspense, useState } from "react";
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
import type { CampusEvent } from "@/types/database";
import {
  useLeadWorkspace,
  LeadStatsRow,
  LeadFilterBar,
  LeadEventsList,
  LeadWithdrawModal,
  LeadCancelEventModal,
  LeadRejectionNoticeModal,
  ProposeEventModal,
  ClosureReportModal,
} from "@/features/lead";
import { EventDetailModal } from "@/features/events";
import LeadLoading from "./loading";

function LeadWorkspaceContent() {
  const {
    user,
    overdueReports,
    venues,
    departments,
    allCommunities,
    loading,
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
  } = useLeadWorkspace();

  const [closingReportEvent, setClosingReportEvent] = useState<CampusEvent | null>(null);

  if (loading) {
    return <LeadLoading />;
  }

  return (
    <div className="flex-1 w-full flex flex-col bg-zinc-50/50">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Toast Notification */}
      {actionNotice && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{actionNotice.message}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-zinc-400 hover:text-zinc-600 p-1 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-zinc-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lead Dispatcher & Triage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Organizer&apos;s Workspace
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Propose, monitor, and refine events on behalf of{" "}
            <span className="font-semibold text-zinc-700">
              {assignedCommunity?.name || assignedDepartment?.name || "your assigned club or department"}
            </span>
            .
          </p>

          {/* Multiple Community Selector */}
          {user?.leadCommunities && user.leadCommunities.length > 1 && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-zinc-500 font-medium">Switch club:</span>
              <div className="flex flex-wrap gap-1.5">
                {user.leadCommunities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCommunityId(c.id)}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      assignedCommunity?.id === c.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200/90 hover:bg-zinc-50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="btn-base btn-secondary text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span>Student View</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setIsProposeOpen(true);
            }}
            className="btn-base btn-primary text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Campus Event</span>
          </button>
        </div>
      </div>

      {/* Overdue Closure Gate Banner */}
      {overdueReports.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-950">
              New submissions are paused: {overdueReports.length} overdue post-event closure report{overdueReports.length === 1 ? "" : "s"} required
            </p>
            <p className="text-amber-800">
              Pending closure reports: {overdueReports.map((o) => o.reference_number ? `${o.title} (${o.reference_number})` : o.title).join(", ")}. You can still save new drafts while completing pending closures.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mt-8">
        <LeadStatsRow
          communityEvents={communityEvents}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
        />
      </div>

      {/* Filter Toolbar & Events Listing Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden">
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
        <LeadEventsList
          events={filteredEvents}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          onProposeNew={() => {
            setEditingEvent(null);
            setIsProposeOpen(true);
          }}
          onEdit={(e: CampusEvent) => {
            setEditingEvent(e);
            setIsProposeOpen(true);
          }}
          onPreview={(e: CampusEvent) => setPreviewEvent(e)}
          onShowRejectionNotice={(e: CampusEvent) => setSelectedRejectedEvent(e)}
          onSubmitDraft={handleSubmitDraft}
          onCancelPublished={(e: CampusEvent) => setCancellingEvent(e)}
          onFileReport={(e: CampusEvent) => setClosingReportEvent(e)}
          onWithdraw={(e: CampusEvent) => setWithdrawingEvent(e)}
        />
      </div>

      {/* Propose / Edit Event Wizard Modal */}
      {isProposeOpen && (
        <ProposeEventModal
          venues={venues}
          communityId={assignedCommunity?.id}
          communityName={assignedCommunity?.name || assignedDepartment?.name}
          departmentId={user?.departmentId}
          departments={departments}
          communities={allCommunities}
          leadCommunities={
            allCommunities.length > 0
              ? allCommunities.filter((c) => user?.leadCommunities.some((lc) => lc.id === c.id))
              : user?.leadCommunities || []
          }
          overdueCount={overdueReports.length}
          initialEvent={editingEvent}
          mode={editingEvent ? "edit" : "create"}
          onClose={() => {
            setIsProposeOpen(false);
            setEditingEvent(null);
          }}
          onSuccess={(action) => {
            setIsProposeOpen(false);
            const isEditing = Boolean(editingEvent);
            setEditingEvent(null);
            loadEvents();
            showNotice(
              action === "draft"
                ? "Proposal saved as draft."
                : isEditing
                ? "Event proposal updated and submitted for Stage 2 review!"
                : "Event proposal submitted successfully for Stage 2 review!"
            );
          }}
        />
      )}

      {/* Public Event Detail Preview Modal */}
      <EventDetailModal
        event={previewEvent}
        onClose={() => setPreviewEvent(null)}
      />

      {/* Feedback & Rejection Reason Modal */}
      {selectedRejectedEvent && (
        <LeadRejectionNoticeModal
          isOpen={Boolean(selectedRejectedEvent)}
          event={selectedRejectedEvent}
          onClose={() => setSelectedRejectedEvent(null)}
          onRevise={(e: CampusEvent) => {
            setSelectedRejectedEvent(null);
            setEditingEvent(e);
            setIsProposeOpen(true);
          }}
        />
      )}

      {/* Withdrawal Confirmation Modal */}
      {withdrawingEvent && (
        <LeadWithdrawModal
          isOpen={Boolean(withdrawingEvent)}
          event={withdrawingEvent}
          isWithdrawing={isWithdrawing}
          onClose={() => setWithdrawingEvent(null)}
          onConfirm={handleConfirmWithdraw}
        />
      )}

      {/* Cancel Published Event Modal */}
      {cancellingEvent && (
        <LeadCancelEventModal
          isOpen={Boolean(cancellingEvent)}
          event={cancellingEvent}
          isSubmitting={isCancelling}
          onClose={() => setCancellingEvent(null)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Post-Event Closure Report Modal */}
      {closingReportEvent && (
        <ClosureReportModal
          event={closingReportEvent}
          onClose={() => setClosingReportEvent(null)}
          onSuccess={(status) => {
            setClosingReportEvent(null);
            loadEvents();
            showNotice(
              status === "completed"
                ? "Report filed & event marked completed!"
                : "Closure report submitted for verification."
            );
          }}
        />
      )}
      </div>
    </div>
  );
}

export default function LeadWorkspacePage() {
  return (
    <Suspense fallback={<LeadLoading />}>
      <LeadWorkspaceContent />
    </Suspense>
  );
}
