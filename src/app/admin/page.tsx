"use client";

import { Suspense } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";
import { EventDetailModal } from "@/features/events";
import {
  AdminSidebar,
  AdminMetricsRow,
  AdminDepartmentsView,
  AdminCommunitiesView,
  AdminUsersView,
  AdminVenuesView,
  AdminSettingsView,
  AdminEventsView,
  AdminArchiveView,
  AdminDepartmentModal,
  AdminAddCommunityModal,
  AdminEditCommunityModal,
  AdminAddUserModal,
  AdminEditUserModal,
  AdminAddVenueModal,
  AdminEditVenueModal,
  AdminConfirmDeleteModal,
  useAdminDashboard,
} from "@/features/admin";

function AdminConsoleContent() {
  const {
    activeTab,
    handleTabChange,
    allEvents,
    users,
    venues,
    communities,
    departments,
    settings,
    isLoading,
    authLoading,
    isRefreshing,
    actionInProgress,
    isSubmittingModal,
    isSavingSettings,
    notice,
    setNotice,
    showAddUserModal,
    setShowAddUserModal,
    editingUser,
    setEditingUser,
    showAddVenueModal,
    setShowAddVenueModal,
    editingVenue,
    setEditingVenue,
    showAddCommunityModal,
    setShowAddCommunityModal,
    editingCommunity,
    setEditingCommunity,
    showDepartmentModal,
    setShowDepartmentModal,
    editingDepartment,
    setEditingDepartment,
    deleteTarget,
    setDeleteTarget,
    previewEvent,
    setPreviewEvent,
    publishedCount,
    archivedCount,
    eligibleUsers,
    loadData,
    handleSaveSettings,
    handleOpenCreateDepartment,
    handleOpenEditDepartment,
    handleSaveDepartment,
    handleToggleActingHod,
    handleCreateUser,
    handleUpdateUser,
    handleCreateCommunity,
    handleUpdateCommunity,
    handleCreateVenue,
    handleUpdateVenue,
    handleToggleVenueActive,
    requestDeleteEvent,
    requestDeleteUser,
    requestDeleteVenue,
    requestDeleteCommunity,
    requestDeleteDepartment,
    handleConfirmDelete,
    user,
  } = useAdminDashboard();

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 bg-zinc-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading IT & Ops Console...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col">
        {/* Console Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IT & Ops Administration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {settings?.short_code || "AISAT"} System Configuration
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage departments, acting HOD overrides, communities & TICs, users, venues, and letterhead settings. Event approvals belong strictly to HOD/TIC and Principal desks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Inline Notice Banner */}
        {notice && (
          <div
            className={`mb-5 px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 shadow-2xs ${
              notice.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Metric Switcher Cards */}
        <AdminMetricsRow
          activeTab={activeTab}
          onTabSelect={handleTabChange}
          departmentsCount={departments.length}
          communitiesCount={communities.length}
          usersCount={users.length}
          venuesCount={venues.length}
          publishedCount={publishedCount}
        />

        {/* Main Sidebar + Workspace Surface */}
        <div className="flex-1 rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[540px]">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            departmentsCount={departments.length}
            communitiesCount={communities.length}
            usersCount={users.length}
            venuesCount={venues.length}
            publishedCount={publishedCount}
            archivedCount={archivedCount}
            currentUserName={user?.fullName || "Campus Admin"}
            currentUserEmail={user?.email}
          />

          <div className="flex-1 flex flex-col min-w-0">
            {activeTab === "departments" && (
              <AdminDepartmentsView
                departments={departments}
                onAddDepartmentClick={handleOpenCreateDepartment}
                onEditDepartmentClick={handleOpenEditDepartment}
                onToggleActingHod={handleToggleActingHod}
                onDeleteDepartmentClick={requestDeleteDepartment}
                actionInProgress={actionInProgress}
              />
            )}

            {activeTab === "communities" && (
              <AdminCommunitiesView
                communities={communities}
                onAddCommunityClick={() => setShowAddCommunityModal(true)}
                onEditCommunityClick={setEditingCommunity}
                onDeleteCommunityClick={requestDeleteCommunity}
                actionInProgress={actionInProgress}
              />
            )}

            {activeTab === "users" && (
              <AdminUsersView
                users={users}
                currentUserId={user?.id}
                onAddUserClick={() => setShowAddUserModal(true)}
                onEditUserClick={setEditingUser}
                onDeleteUserClick={requestDeleteUser}
                actionInProgress={actionInProgress}
              />
            )}

            {activeTab === "venues" && (
              <AdminVenuesView
                venues={venues}
                onToggleVenueActive={handleToggleVenueActive}
                onAddVenueClick={() => setShowAddVenueModal(true)}
                onEditVenueClick={setEditingVenue}
                onDeleteVenueClick={requestDeleteVenue}
                actionInProgress={actionInProgress}
              />
            )}

            {activeTab === "settings" && (
              <AdminSettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                isSaving={isSavingSettings}
              />
            )}

            {activeTab === "all-events" && (
              <AdminEventsView
                allEvents={allEvents}
                onDeleteEvent={requestDeleteEvent}
                onPreviewEvent={setPreviewEvent}
                onNavigateToArchive={() => handleTabChange("archive")}
                actionInProgress={actionInProgress}
              />
            )}

            {activeTab === "archive" && (
              <AdminArchiveView
                events={allEvents}
                onDeleteEvent={requestDeleteEvent}
                onPreviewEvent={setPreviewEvent}
                actionInProgress={actionInProgress}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AdminDepartmentModal
        isOpen={showDepartmentModal}
        onClose={() => {
          setShowDepartmentModal(false);
          setEditingDepartment(null);
        }}
        onSubmit={handleSaveDepartment}
        department={editingDepartment}
        users={eligibleUsers}
        isSubmitting={isSubmittingModal}
      />

      <AdminAddCommunityModal
        isOpen={showAddCommunityModal}
        onClose={() => setShowAddCommunityModal(false)}
        onSubmit={handleCreateCommunity}
        eligibleUsers={eligibleUsers}
        isSubmitting={isSubmittingModal}
      />

      <AdminEditCommunityModal
        isOpen={Boolean(editingCommunity)}
        onClose={() => setEditingCommunity(null)}
        onSubmit={handleUpdateCommunity}
        community={editingCommunity}
        eligibleUsers={eligibleUsers}
        isSubmitting={isSubmittingModal}
      />

      <AdminAddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSubmit={handleCreateUser}
        communities={communities}
        departments={departments}
        isSubmitting={isSubmittingModal}
      />

      <AdminEditUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
        user={editingUser}
        communities={communities}
        departments={departments}
        isSubmitting={isSubmittingModal}
      />

      <AdminAddVenueModal
        isOpen={showAddVenueModal}
        onClose={() => setShowAddVenueModal(false)}
        onSubmit={handleCreateVenue}
        isSubmitting={isSubmittingModal}
      />

      <AdminEditVenueModal
        isOpen={Boolean(editingVenue)}
        onClose={() => setEditingVenue(null)}
        onSubmit={handleUpdateVenue}
        venue={editingVenue}
        isSubmitting={isSubmittingModal}
      />

      <AdminConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={Boolean(actionInProgress && deleteTarget?.id === actionInProgress)}
      />

      <EventDetailModal event={previewEvent} onClose={() => setPreviewEvent(null)} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminConsoleContent />
    </Suspense>
  );
}
