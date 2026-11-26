import { apiClient } from "@/lib/api-client";
import type {
  AdminCommunityRow,
  AdminUserRow,
  CollegeSettings,
  Department,
} from "@/types/database";
import type {
  CreateCommunityInput,
  CreateDepartmentInput,
  CreateUserInput,
  UpdateCollegeSettingsInput,
  UpdateCommunityFullInput,
  UpdateDepartmentInput,
  UpdateUserInput,
} from "@/lib/validations";

export const adminApi = {
  // College Settings
  getSettings(): Promise<{ settings: CollegeSettings | null }> {
    return apiClient.get<{ settings: CollegeSettings | null }>("/api/admin/settings");
  },

  updateSettings(
    data: UpdateCollegeSettingsInput
  ): Promise<{ success: boolean; settings: CollegeSettings }> {
    return apiClient.patch<{ success: boolean; settings: CollegeSettings }>(
      "/api/admin/settings",
      data
    );
  },

  // Departments
  getDepartments(): Promise<{ departments: Department[] }> {
    return apiClient.get<{ departments: Department[] }>("/api/admin/departments");
  },

  createDepartment(
    data: CreateDepartmentInput
  ): Promise<{ success: boolean; department: Department }> {
    return apiClient.post<{ success: boolean; department: Department }>(
      "/api/admin/departments",
      data
    );
  },

  updateDepartment(
    id: string,
    data: UpdateDepartmentInput
  ): Promise<{ success: boolean; department: Department }> {
    return apiClient.patch<{ success: boolean; department: Department }>(
      `/api/admin/departments/${id}`,
      data
    );
  },

  deleteDepartment(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/departments/${id}`);
  },

  // Event cleanup (IT/Ops deletion only — zero approval powers)
  deleteEvent(eventId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/events/${eventId}`);
  },

  // User Management
  getUsers(): Promise<{ users: AdminUserRow[] }> {
    return apiClient.get<{ users: AdminUserRow[] }>("/api/admin/users");
  },

  createUser(data: CreateUserInput): Promise<{ user: AdminUserRow }> {
    return apiClient.post<{ user: AdminUserRow }>("/api/admin/users", data);
  },

  updateUser(id: string, data: UpdateUserInput): Promise<{ user: AdminUserRow }> {
    return apiClient.patch<{ user: AdminUserRow }>(`/api/admin/users/${id}`, data);
  },

  deleteUser(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/users/${id}`);
  },

  // Community Management
  getCommunities(): Promise<{ communities: AdminCommunityRow[] }> {
    return apiClient.get<{ communities: AdminCommunityRow[] }>("/api/admin/communities");
  },

  createCommunity(data: CreateCommunityInput): Promise<{ community: AdminCommunityRow }> {
    return apiClient.post<{ community: AdminCommunityRow }>("/api/admin/communities", data);
  },

  updateCommunity(
    id: string,
    data: UpdateCommunityFullInput
  ): Promise<{ community: AdminCommunityRow }> {
    return apiClient.patch<{ community: AdminCommunityRow }>(
      `/api/admin/communities/${id}`,
      data
    );
  },

  deleteCommunity(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/communities/${id}`);
  },
};
