import { apiClient } from "@/lib/api-client";
import type { Venue } from "@/types/database";
import type { CreateVenueInput, UpdateVenueFullInput } from "@/lib/validations";

export const venuesApi = {
  getVenues(): Promise<{ venues: Venue[] }> {
    return apiClient.get<{ venues: Venue[] }>("/api/venues");
  },

  getAdminVenues(): Promise<{ venues: Venue[] }> {
    return apiClient.get<{ venues: Venue[] }>("/api/admin/venues");
  },

  createVenue(data: CreateVenueInput): Promise<{ venue: Venue }> {
    return apiClient.post<{ venue: Venue }>("/api/admin/venues", data);
  },

  updateVenue(id: string, data: UpdateVenueFullInput): Promise<{ venue: Venue }> {
    return apiClient.patch<{ venue: Venue }>(`/api/admin/venues/${id}`, data);
  },

  deleteVenue(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/venues/${id}`);
  },
};
