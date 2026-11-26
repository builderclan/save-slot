import { apiClient } from "@/lib/api-client";
import type { CampusEvent, Community, Department } from "@/types/database";

export interface Stage2QueueResponse {
  events: CampusEvent[];
  scopedDepartments: Department[];
  scopedCommunities: Community[];
}

export const stage2Api = {
  getQueue(scope: "hod" | "fic"): Promise<Stage2QueueResponse> {
    return apiClient.get<Stage2QueueResponse>(
      scope === "hod" ? "/api/hod/queue" : "/api/fic/queue"
    );
  },

  approveEvent(
    scope: "hod" | "fic",
    eventId: string,
    remarks?: string
  ): Promise<{ success: boolean; status: string; allStage2Approved: boolean }> {
    const endpoint =
      scope === "hod"
        ? `/api/hod/events/${eventId}/approve`
        : `/api/fic/events/${eventId}/approve`;
    return apiClient.post(endpoint, { remarks: remarks || undefined });
  },

  rejectEvent(
    scope: "hod" | "fic",
    eventId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; status: string }> {
    const endpoint =
      scope === "hod"
        ? `/api/hod/events/${eventId}/reject`
        : `/api/fic/events/${eventId}/reject`;
    return apiClient.post(endpoint, { rejectionReason });
  },

  toggleActingHod(
    departmentId: string,
    isActingHodActive: boolean
  ): Promise<{ success: boolean; department: Department }> {
    return apiClient.patch("/api/hod/acting-hod", {
      departmentId,
      isActingHodActive,
    });
  },
};
