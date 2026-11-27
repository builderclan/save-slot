import { apiClient } from "@/lib/api-client";
import type {
  CampusEvent,
  Community,
  Department,
  UserProfile,
  Venue,
} from "@/types/database";
import type {
  CollegeEventCreateInput,
  CreateCommunityInput,
} from "@/lib/validations";

export interface PrincipalQueueResponse {
  events: CampusEvent[];
  departments: Department[];
  communities: Community[];
  venues: Venue[];
  staffUsers: UserProfile[];
}

export interface CollegeCollisionItem {
  id: string;
  title: string;
  status: string;
  origin_type: string;
  start_time: string;
  end_time: string;
}

export const principalApi = {
  getQueue(): Promise<PrincipalQueueResponse> {
    return apiClient.get<PrincipalQueueResponse>("/api/principal/queue");
  },

  approveEvent(
    eventId: string,
    payload: {
      overrideLeadTime?: boolean;
      overrideReason?: string;
      remarks?: string;
    } = {}
  ): Promise<{
    success: boolean;
    status: string;
    referenceNumber?: string | null;
    academicYear?: string | null;
  }> {
    return apiClient.post(`/api/principal/events/${eventId}/approve`, payload);
  },

  rejectEvent(
    eventId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; status: string }> {
    return apiClient.post(`/api/principal/events/${eventId}/reject`, {
      rejectionReason,
    });
  },

  createCollegeEvent(
    payload: CollegeEventCreateInput
  ): Promise<{
    success: boolean;
    event: CampusEvent;
    bumpedEventIds: string[];
  }> {
    return apiClient.post("/api/principal/college-events", payload);
  },

  createCommunity(
    payload: CreateCommunityInput
  ): Promise<{ success: boolean; community: Community }> {
    return apiClient.post("/api/principal/communities", payload);
  },

  toggleActingHod(
    departmentId: string,
    isActingHodActive: boolean
  ): Promise<{ success: boolean; department: Department }> {
    return apiClient.patch(`/api/principal/departments/${departmentId}/acting-hod`, {
      isActingHodActive,
    });
  },

  verifyReport(
    eventId: string,
    decision: "verify" | "request_revision",
    remarks?: string,
    reportVersion?: string | null
  ): Promise<{ success: boolean; status: string }> {
    return apiClient.patch(`/api/principal/events/${eventId}/report/verify`, {
      decision,
      remarks,
      reportVersion: reportVersion || undefined,
    });
  },
};
