import { apiClient } from "@/lib/api-client";
import type { CampusEvent } from "@/types/database";
import type { ProposeEventInput } from "@/lib/validations";

export interface GetEventsParams {
  status?: string;
  category?: string;
  community?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const eventsApi = {
  getPublished(params?: GetEventsParams): Promise<{ events: CampusEvent[] }> {
    return apiClient.get<{ events: CampusEvent[] }>("/api/events", {
      params: {
        status: "published",
        ...params,
      },
    });
  },

  getEvents(params?: GetEventsParams): Promise<{ events: CampusEvent[] }> {
    return apiClient.get<{ events: CampusEvent[] }>("/api/events", {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  getLeadEvents(): Promise<{ events: CampusEvent[] }> {
    return apiClient.get<{ events: CampusEvent[] }>("/api/lead/events");
  },

  propose(data: ProposeEventInput): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>("/api/lead/events", data);
  },

  update(id: string, data: ProposeEventInput): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.put<{ success: boolean; event: CampusEvent }>(`/api/lead/events/${id}`, data);
  },

  withdraw(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/lead/events/${id}`);
  },
};
