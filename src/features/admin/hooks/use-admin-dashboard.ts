"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AdminCommunityRow,
  AdminUserRow,
  CampusEvent,
  CollegeSettings,
  Department,
  Venue,
} from "@/types/database";
import type {
  AdminDeleteTarget,
  AdminTab,
  DepartmentFormData,
  EditCommunityData,
  EditUserData,
  EditVenueData,
  NewCommunityData,
  NewUserData,
  NewVenueData,
} from "../components";
import { adminApi } from "@/features/admin/api";
import { venuesApi } from "@/features/venues/api";
import { eventsApi } from "@/features/events/api";
import { useAuth } from "@/context/auth-context";

const VALID_TABS: AdminTab[] = [
  "departments",
  "communities",
  "users",
  "venues",
  "settings",
  "all-events",
  "archive",
];

function isValidAdminTab(tab: string | null): tab is AdminTab {
  return tab !== null && VALID_TABS.includes(tab as AdminTab);
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];
}

export interface AdminNotice {
  message: string;
  type: "success" | "error";
}

export function useAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, logout } = useAuth();

  const tabFromUrl = searchParams.get("tab");
  const activeTab: AdminTab = isValidAdminTab(tabFromUrl)
    ? tabFromUrl
    : "departments";

  const [allEvents, setAllEvents] = useState<CampusEvent[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [communities, setCommunities] = useState<AdminCommunityRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [settings, setSettings] = useState<CollegeSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [notice, setNotice] = useState<AdminNotice | null>(null);

  // Modals & selected entities
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [showAddCommunityModal, setShowAddCommunityModal] = useState(false);
  const [editingCommunity, setEditingCommunity] =
    useState<AdminCommunityRow | null>(null);

  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<AdminDeleteTarget | null>(
    null,
  );
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);

  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  const showNotice = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotice({ message, type });
    },
    [],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const refreshGenerationRef = useRef(0);
  const sectionEpochsRef = useRef({
    events: 0,
    users: 0,
    venues: 0,
    communities: 0,
    departments: 0,
    settings: 0,
  });

  const loadData = useCallback(
    async (silent = false): Promise<"ok" | "partial" | "superseded"> => {
      if (!user || !user.isAdmin) return "partial";
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const myGen = ++refreshGenerationRef.current;
      const startEpochs = { ...sectionEpochsRef.current };

      try {
        const [
          eventsResult,
          usersResult,
          venuesResult,
          commsResult,
          deptsResult,
          settingsResult,
        ] = await Promise.allSettled([
          eventsApi.getEvents({ status: "all", limit: 200 }),
          adminApi.getUsers(),
          venuesApi.getAdminVenues(),
          adminApi.getCommunities(),
          adminApi.getDepartments(),
          adminApi.getSettings(),
        ]);

        if (refreshGenerationRef.current !== myGen) {
          return "superseded";
        }

        setNowTimestamp(Date.now());
        const failedSections: string[] = [];
        const invalidatedRetry: Array<Promise<void>> = [];

        const applyOrRetry = <T,>(
          key: keyof typeof sectionEpochsRef.current,
          label: string,
          result: PromiseSettledResult<T>,
          apply: (val: T) => void,
          refetch: () => Promise<T>,
        ) => {
          if (result.status !== "fulfilled") {
            failedSections.push(label);
            return;
          }
          if (sectionEpochsRef.current[key] === startEpochs[key]) {
            apply(result.value);
          } else {
            const retryEpoch = sectionEpochsRef.current[key];
            invalidatedRetry.push(
              refetch()
                .then((fresh) => {
                  if (
                    refreshGenerationRef.current === myGen &&
                    sectionEpochsRef.current[key] === retryEpoch
                  ) {
                    apply(fresh);
                  }
                })
                .catch(() => {
                  failedSections.push(label);
                }),
            );
          }
        };

        applyOrRetry(
          "events",
          "events",
          eventsResult,
          (v) => setAllEvents(v.events || []),
          () => eventsApi.getEvents({ status: "all", limit: 200 }),
        );
        applyOrRetry(
          "users",
          "users",
          usersResult,
          (v) => setUsers(v.users || []),
          () => adminApi.getUsers(),
        );
        applyOrRetry(
          "venues",
          "venues",
          venuesResult,
          (v) => setVenues(v.venues || []),
          () => venuesApi.getAdminVenues(),
        );
        applyOrRetry(
          "communities",
          "communities",
          commsResult,
          (v) => setCommunities(v.communities || []),
          () => adminApi.getCommunities(),
        );
        applyOrRetry(
          "departments",
          "departments",
          deptsResult,
          (v) => setDepartments(v.departments || []),
          () => adminApi.getDepartments(),
        );
        applyOrRetry(
          "settings",
          "settings",
          settingsResult,
          (v) => setSettings(v.settings || null),
          () => adminApi.getSettings(),
        );

        if (invalidatedRetry.length > 0) {
          await Promise.all(invalidatedRetry);
          if (refreshGenerationRef.current !== myGen) {
            return "superseded";
          }
        }

        if (failedSections.length > 0) {
          showNotice(
            `Failed to load ${failedSections.join(", ")}. Click Refresh to retry.`,
            "error",
          );
          return "partial";
        }
        return "ok";
      } catch (err) {
        if (refreshGenerationRef.current === myGen) {
          const msg =
            err instanceof Error ? err.message : "Failed to load console data";
          showNotice(msg, "error");
          return "partial";
        }
        return "superseded";
      } finally {
        if (refreshGenerationRef.current === myGen) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [user, showNotice],
  );

  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      const fallback =
        user.isPrincipal || user.isVicePrincipal
          ? "/principal"
          : user.isHod || user.isTic || user.isStaff || user.isLead
            ? "/lead"
            : "/";
      router.replace(fallback);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      loadData();
    }
  }, [authLoading, user, loadData]);

  const handleTabChange = useCallback(
    (tab: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/admin?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Settings Handlers
  const handleSaveSettings = useCallback(
    async (data: {
      collegeName: string;
      shortCode: string;
      letterheadSubtitle: string;
      logoUrl: string;
      academicYearStartMonth: number;
      timezone: string;
    }) => {
      setIsSavingSettings(true);
      try {
        const res = await adminApi.updateSettings({
          collegeName: data.collegeName,
          shortCode: data.shortCode,
          letterheadSubtitle: data.letterheadSubtitle || null,
          logoUrl: data.logoUrl || "",
          academicYearStartMonth: data.academicYearStartMonth,
          timezone: data.timezone,
        });
        sectionEpochsRef.current.settings += 1;
        setSettings(res.settings);
        showNotice("College settings updated.");
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to update settings",
          "error",
        );
      } finally {
        setIsSavingSettings(false);
      }
    },
    [showNotice],
  );

  // Department Handlers
  const handleOpenCreateDepartment = useCallback(() => {
    setEditingDepartment(null);
    setShowDepartmentModal(true);
  }, []);

  const handleOpenEditDepartment = useCallback((dept: Department) => {
    setEditingDepartment(dept);
    setShowDepartmentModal(true);
  }, []);

  const handleSaveDepartment = useCallback(
    async (data: DepartmentFormData, existingId?: string) => {
      setIsSubmittingModal(true);
      try {
        if (existingId) {
          const res = await adminApi.updateDepartment(existingId, {
            name: data.name,
            code: data.code,
            hodUserId: data.hodUserId,
            actingHodUserId: data.actingHodUserId,
            isActingHodActive: data.isActingHodActive,
            isActive: data.isActive,
          });
          sectionEpochsRef.current.departments += 1;
          setDepartments((prev) =>
            prev.map((d) => (d.id === existingId ? res.department : d)),
          );
          showNotice(`Department ${res.department.code} updated.`);
        } else {
          const res = await adminApi.createDepartment({
            name: data.name,
            code: data.code,
            hodUserId: data.hodUserId,
            actingHodUserId: data.actingHodUserId,
            isActive: data.isActive,
          });
          sectionEpochsRef.current.departments += 1;
          setDepartments((prev) =>
            upsertById(prev, res.department).sort((a, b) =>
              a.code.localeCompare(b.code),
            ),
          );
          showNotice(`Department ${res.department.code} created.`);
        }
        setShowDepartmentModal(false);
        setEditingDepartment(null);
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [showNotice],
  );

  const handleToggleActingHod = useCallback(
    async (dept: Department) => {
      const nextActive = !dept.is_acting_hod_active;
      setActionInProgress(dept.id);
      try {
        const res = await adminApi.updateDepartment(dept.id, {
          isActingHodActive: nextActive,
        });
        sectionEpochsRef.current.departments += 1;
        setDepartments((prev) =>
          prev.map((d) => (d.id === dept.id ? res.department : d)),
        );
        showNotice(
          nextActive
            ? `Acting HOD activated for ${dept.code}.`
            : `Substantive HOD restored for ${dept.code}.`,
        );
      } catch (err) {
        showNotice(
          err instanceof Error
            ? err.message
            : "Failed to toggle Acting HOD mode",
          "error",
        );
      } finally {
        setActionInProgress(null);
      }
    },
    [showNotice],
  );

  // User Handlers
  const handleCreateUser = useCallback(
    async (data: NewUserData) => {
      setIsSubmittingModal(true);
      try {
        await adminApi.createUser({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          role: data.role,
          designation: data.designation || null,
          departmentId: data.departmentId || null,
          communityId: data.communityId || null,
          communityMemberRole: data.communityId
            ? data.communityMemberRole
            : undefined,
        });
        const refreshed = await loadData(true);
        setShowAddUserModal(false);
        if (refreshed !== "superseded") {
          showNotice(
            refreshed === "ok"
              ? `Provisioned account for ${data.fullName}.`
              : `Provisioned account for ${data.fullName}, but directory refresh failed. Click Refresh to sync.`,
            refreshed === "ok" ? "success" : "error",
          );
        }
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to create user",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [loadData, showNotice],
  );

  const handleUpdateUser = useCallback(
    async (id: string, data: EditUserData) => {
      setIsSubmittingModal(true);
      try {
        await adminApi.updateUser(id, {
          fullName: data.fullName,
          role: data.role,
          designation: data.designation || null,
          departmentId: data.departmentId || null,
          communityId: data.communityId || null,
          communityMemberRole: data.communityId
            ? data.communityMemberRole
            : undefined,
          isActive: data.isActive,
        });
        const refreshed = await loadData(true);
        setEditingUser(null);
        if (refreshed !== "superseded") {
          showNotice(
            refreshed === "ok"
              ? `Updated profile for ${data.fullName}.`
              : `Updated profile for ${data.fullName}, but directory refresh failed. Click Refresh to sync.`,
            refreshed === "ok" ? "success" : "error",
          );
        }
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to update user",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [loadData, showNotice],
  );

  // Community Handlers
  const handleCreateCommunity = useCallback(
    async (data: NewCommunityData) => {
      setIsSubmittingModal(true);
      try {
        await adminApi.createCommunity({
          name: data.name,
          code: data.code || undefined,
          slug: data.slug || undefined,
          scope: data.scope,
          category: data.category,
          description: data.description || null,
          logoUrl: data.logoUrl || null,
          website: data.website || null,
          instagram: data.instagram || null,
          leadUserId: data.leadUserId || null,
          ticUserIds: data.ticUserIds,
        });
        const refreshed = await loadData(true);
        setShowAddCommunityModal(false);
        if (refreshed !== "superseded") {
          showNotice(
            refreshed === "ok"
              ? `Registered community "${data.name}".`
              : `Registered community "${data.name}", but directory refresh failed. Click Refresh to sync.`,
            refreshed === "ok" ? "success" : "error",
          );
        }
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to create community",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [loadData, showNotice],
  );

  const handleUpdateCommunity = useCallback(
    async (id: string, data: EditCommunityData) => {
      setIsSubmittingModal(true);
      try {
        await adminApi.updateCommunity(id, {
          name: data.name,
          code: data.code,
          slug: data.slug,
          scope: data.scope,
          category: data.category,
          description: data.description || null,
          logoUrl: data.logoUrl || null,
          website: data.website || null,
          instagram: data.instagram || null,
          leadUserId: data.leadUserId || null,
          ticUserIds: data.ticUserIds,
        });
        const refreshed = await loadData(true);
        setEditingCommunity(null);
        if (refreshed !== "superseded") {
          showNotice(
            refreshed === "ok"
              ? `Updated community "${data.name}".`
              : `Updated community "${data.name}", but directory refresh failed. Click Refresh to sync.`,
            refreshed === "ok" ? "success" : "error",
          );
        }
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to update community",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [loadData, showNotice],
  );

  // Venue Handlers
  const handleCreateVenue = useCallback(
    async (data: NewVenueData) => {
      setIsSubmittingModal(true);
      try {
        const res = await venuesApi.createVenue({
          name: data.name,
          building: data.building || "Campus",
          capacity: parseInt(data.capacity, 10) || 100,
          address: data.address || undefined,
          notes: data.notes || undefined,
        });
        sectionEpochsRef.current.venues += 1;
        setVenues((prev) => upsertById(prev, res.venue));
        setShowAddVenueModal(false);
        showNotice(`Added facility "${res.venue.name}".`);
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to create facility",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [showNotice],
  );

  const handleUpdateVenue = useCallback(
    async (venueId: string, data: EditVenueData) => {
      setIsSubmittingModal(true);
      try {
        const res = await venuesApi.updateVenue(venueId, {
          name: data.name,
          building: data.building,
          capacity: data.capacity,
          address: data.address || null,
          notes: data.notes || null,
          is_active: data.is_active,
        });
        sectionEpochsRef.current.venues += 1;
        setVenues((prev) =>
          prev.map((v) => (v.id === venueId ? res.venue : v)),
        );
        setEditingVenue(null);
        showNotice(`Updated facility "${res.venue.name}".`);
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to update facility",
          "error",
        );
        throw err;
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [showNotice],
  );

  const handleToggleVenueActive = useCallback(
    async (venue: Venue) => {
      setActionInProgress(venue.id);
      try {
        const res = await venuesApi.updateVenue(venue.id, {
          is_active: !venue.is_active,
        });
        sectionEpochsRef.current.venues += 1;
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? res.venue : v)),
        );
        showNotice(
          res.venue.is_active
            ? `"${venue.name}" marked active.`
            : `"${venue.name}" placed in maintenance.`,
        );
      } catch (err) {
        showNotice(
          err instanceof Error ? err.message : "Failed to toggle venue status",
          "error",
        );
      } finally {
        setActionInProgress(null);
      }
    },
    [showNotice],
  );

  // Delete Requests & Execution
  const requestDeleteEvent = useCallback(
    (eventId: string) => {
      const target = allEvents.find((ev) => ev.id === eventId);
      setDeleteTarget({
        type: "event",
        id: eventId,
        title: target?.title || "Campus Event",
        subtitle:
          target?.community?.name || target?.department?.code || undefined,
      });
    },
    [allEvents],
  );

  const requestDeleteUser = useCallback((targetUser: AdminUserRow) => {
    setDeleteTarget({
      type: "user",
      id: targetUser.id,
      title: targetUser.full_name,
      subtitle: targetUser.email,
    });
  }, []);

  const requestDeleteVenue = useCallback((venue: Venue) => {
    setDeleteTarget({
      type: "venue",
      id: venue.id,
      title: venue.name,
      subtitle: venue.building,
    });
  }, []);

  const requestDeleteCommunity = useCallback((comm: AdminCommunityRow) => {
    setDeleteTarget({
      type: "community",
      id: comm.id,
      title: comm.name,
      subtitle: `${comm.code} • ${comm.scope}`,
    });
  }, []);

  const requestDeleteDepartment = useCallback((dept: Department) => {
    setDeleteTarget({
      type: "department",
      id: dept.id,
      title: `${dept.code} — ${dept.name}`,
      subtitle: dept.hod?.full_name ? `HOD: ${dept.hod.full_name}` : undefined,
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionInProgress(deleteTarget.id);
    try {
      if (deleteTarget.type === "event") {
        await adminApi.deleteEvent(deleteTarget.id);
        sectionEpochsRef.current.events += 1;
        setAllEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        showNotice("Event deleted permanently.");
      } else if (deleteTarget.type === "user") {
        await adminApi.deleteUser(deleteTarget.id);
        sectionEpochsRef.current.users += 1;
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        showNotice("User account removed.");
      } else if (deleteTarget.type === "venue") {
        await venuesApi.deleteVenue(deleteTarget.id);
        sectionEpochsRef.current.venues += 1;
        setVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id));
        showNotice("Facility removed.");
      } else if (deleteTarget.type === "community") {
        await adminApi.deleteCommunity(deleteTarget.id);
        sectionEpochsRef.current.communities += 1;
        setCommunities((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        showNotice("Community removed.");
      } else if (deleteTarget.type === "department") {
        await adminApi.deleteDepartment(deleteTarget.id);
        sectionEpochsRef.current.departments += 1;
        setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        showNotice("Department removed.");
      }
      setDeleteTarget(null);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setActionInProgress(null);
    }
  }, [deleteTarget, showNotice]);

  const publishedCount = useMemo(
    () =>
      allEvents.filter(
        (e) => e.status === "published" || e.status === "completed",
      ).length,
    [allEvents],
  );

  const archivedCount = useMemo(() => {
    if (!nowTimestamp) return 0;
    return allEvents.filter(
      (e) => e.end_time && new Date(e.end_time).getTime() < nowTimestamp,
    ).length;
  }, [allEvents, nowTimestamp]);

  const hydratedUsers = useMemo(() => {
    const deptById = new Map(departments.map((d) => [d.id, d]));
    return users.map((u) => {
      if (!u.department_id) {
        return { ...u, department_code: null, department_name: null };
      }
      const dept = deptById.get(u.department_id);
      if (!dept) return u;
      return {
        ...u,
        department_code: dept.code,
        department_name: dept.name,
      };
    });
  }, [users, departments]);

  const eligibleUsers = useMemo(
    () => hydratedUsers.filter((u) => u.is_active !== false),
    [hydratedUsers],
  );

  return {
    activeTab,
    handleTabChange,
    allEvents,
    users: hydratedUsers,
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
    logout,
  };
}
