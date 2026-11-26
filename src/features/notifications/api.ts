import { apiClient } from "@/lib/api-client";
import type { NotificationItem } from "@/types/database";

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const notificationsApi = {
  list(): Promise<NotificationsResponse> {
    return apiClient.get<NotificationsResponse>("/api/notifications");
  },

  markRead(id: string): Promise<{ success: boolean; notification: NotificationItem }> {
    return apiClient.patch(`/api/notifications/${id}/read`);
  },

  markAllRead(): Promise<{ success: boolean }> {
    return apiClient.post("/api/notifications/read-all");
  },
};
