"use client";

import { Suspense } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
  AdminSidebar,
  AdminTriageView,
  AdminEventsView,
  AdminArchiveView,
  AdminUsersView,
  AdminVenuesView,
  AdminCommunitiesView,
  AdminAddUserModal,
  AdminEditUserModal,
  AdminAddVenueModal,
  AdminEditVenueModal,
  AdminAddCommunityModal,
  AdminEditCommunityModal,
  useAdminDashboard,
} from "@/features/admin";
import { RejectionModal, EventDetailModal } from "@/features/events";
import AdminLoading from "./loading";

function AdminLoadingFallback() {
  return <AdminLoading />;
}

function AdminConsoleContent() {
  const {
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
    nowTimestamp,
  } = useAdminDashboard();

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
            className="text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
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
