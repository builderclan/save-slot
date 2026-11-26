import { apiClient } from "@/lib/api-client";
import type { CampusEvent, Community, Department } from "@/types/database";
import type {
  ProposeEventInput,
  UpdateEventStatusInput,
  WorkspaceEventInput,
} from "@/lib/validations";

export interface OverdueReportNotice {
  id: string;
  title: string;
  reference_number: string | null;
  start_time: string;
  end_time: string;
}

export interface GetEventsParams {
  status?: string;
  category?: string;
  community?: string;
  origin_type?: string;
  department_id?: string;
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
      params: params as Record<
        string,
        string | number | boolean | undefined | null
      >,
    });
  },

  getLeadEvents(): Promise<{ events: CampusEvent[] }> {
    return apiClient.get<{ events: CampusEvent[] }>("/api/lead/events");
  },

  propose(
    data: ProposeEventInput,
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>(
      "/api/lead/events",
      data,
    );
  },

  update(
    id: string,
    data: ProposeEventInput,
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.put<{ success: boolean; event: CampusEvent }>(
      `/api/lead/events/${id}`,
      data,
    );
  },

  withdraw(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/lead/events/${id}`);
  },

  updateEventStatus(
    eventId: string,
    data: UpdateEventStatusInput,
  ): Promise<{ success: boolean; event?: CampusEvent }> {
    return apiClient.patch<{ success: boolean; event?: CampusEvent }>(
      `/api/admin/events/${eventId}/status`,
      data,
    );
  },
};

export const workspaceApi = {
  getEvents(): Promise<{ events: CampusEvent[]; overdueReports: OverdueReportNotice[] }> {
    return apiClient.get<{ events: CampusEvent[]; overdueReports: OverdueReportNotice[] }>(
      "/api/workspace/events",
    );
  },

  propose(
    data: WorkspaceEventInput,
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>(
      "/api/workspace/events",
      data,
    );
  },

  update(
    id: string,
    data: WorkspaceEventInput,
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.put<{ success: boolean; event: CampusEvent }>(
      `/api/workspace/events/${id}`,
      data,
    );
  },

  submit(id: string): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>(
      `/api/workspace/events/${id}/submit`,
    );
  },

  cancel(
    id: string,
    cancellationReason: string,
  ): Promise<{ success: boolean; event: CampusEvent }> {
    return apiClient.post<{ success: boolean; event: CampusEvent }>(
      `/api/workspace/events/${id}/cancel`,
      { cancellationReason },
    );
  },

  withdraw(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/workspace/events/${id}`);
  },

  getDepartments(): Promise<{ departments: Department[] }> {
    return apiClient.get<{ departments: Department[] }>("/api/departments");
  },

  getCommunities(): Promise<{ communities: Community[] }> {
    return apiClient.get<{ communities: Community[] }>("/api/communities");
  },
};
