import { apiClient } from "@/lib/api-client";
import type { CampusEvent, AdminCommunityRow, AdminUserRow } from "@/types/database";
import type {
  CreateUserInput,
  UpdateUserInput,
  CreateCommunityInput,
  UpdateCommunityFullInput,
  UpdateEventStatusInput,
} from "@/lib/validations";

export const adminApi = {
  // Event Triage & Actions
  updateEventStatus(
    eventId: string,
    payload: UpdateEventStatusInput
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>(
      `/api/admin/events/${eventId}/status`,
      payload
    );
  },

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

  updateCommunity(id: string, data: UpdateCommunityFullInput): Promise<{ community: AdminCommunityRow }> {
    return apiClient.patch<{ community: AdminCommunityRow }>(`/api/admin/communities/${id}`, data);
  },

  deleteCommunity(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/communities/${id}`);
  },
};
