import { CampusEvent, Community, Venue, EventCategory, EventStatus } from "@/types/database";

export interface DrizzleEventRow {
  id: string;
  campusId: string;
  communityId: string;
  venueId?: string | null;
  title: string;
  slug: string;
  description: string;
  category: string;
  tags?: string[] | null;
  startTime: Date | string;
  endTime: Date | string;
  timezone?: string | null;
  locationName: string;
  isVirtual?: boolean | null;
  virtualLink?: string | null;
  externalRegistrationUrl?: string | null;
  coverImageUrl?: string | null;
  status: string;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  createdBy?: string | null;
  reviewedBy?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  community?: {
    id: string;
    campusId?: string;
    name: string;
    slug: string;
    category: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    website?: string | null;
    instagram?: string | null;
    status?: string | null;
    createdAt?: Date | string | null;
  } | null;
  venue?: {
    id: string;
    campusId?: string;
    name: string;
    building: string;
    capacity?: number | null;
    address?: string | null;
    notes?: string | null;
    isActive?: boolean | null;
    createdAt?: Date | string | null;
  } | null;
}

/**
 * Adapter utility that maps Drizzle ORM query results (camelCase) to
 * CampusEvent and database domain types (snake_case) expected by the frontend.
 */
export function formatCampusEvent(row: DrizzleEventRow): CampusEvent {
  let community: Community | undefined = undefined;
  if (row.community && row.community.id) {
    community = {
      id: row.community.id,
      campus_id: row.community.campusId || "",
      name: row.community.name,
      slug: row.community.slug,
      category: row.community.category as EventCategory,
      logo_url: row.community.logoUrl || undefined,
      banner_url: row.community.bannerUrl || undefined,
      website: row.community.website || undefined,
      instagram: row.community.instagram || undefined,
      status: (row.community.status as "pending" | "approved" | "rejected") || undefined,
      created_at: row.community.createdAt instanceof Date ? row.community.createdAt.toISOString() : (row.community.createdAt || undefined),
    };
  }

  let venue: Venue | undefined = undefined;
  if (row.venue && row.venue.id) {
    venue = {
      id: row.venue.id,
      campus_id: row.venue.campusId || "",
      name: row.venue.name,
      building: row.venue.building,
      capacity: row.venue.capacity ?? null,
      address: row.venue.address || undefined,
      notes: row.venue.notes || undefined,
      is_active: row.venue.isActive ?? true,
      created_at: row.venue.createdAt instanceof Date ? row.venue.createdAt.toISOString() : (row.venue.createdAt || undefined),
    };
  }

  return {
    id: row.id,
    campus_id: row.campusId,
    community_id: row.communityId,
    venue_id: row.venueId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category as EventCategory,
    tags: row.tags || [],
    start_time: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
    end_time: row.endTime instanceof Date ? row.endTime.toISOString() : String(row.endTime),
    timezone: row.timezone || undefined,
    location_name: row.locationName,
    is_virtual: row.isVirtual ?? false,
    virtual_link: row.virtualLink || undefined,
    external_registration_url: row.externalRegistrationUrl || undefined,
    cover_image_url: row.coverImageUrl || undefined,
    status: row.status as EventStatus,
    rejection_reason: row.rejectionReason || undefined,
    cancellation_reason: row.cancellationReason || undefined,
    created_by: row.createdBy || undefined,
    reviewed_by: row.reviewedBy || undefined,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt ? String(row.createdAt) : undefined),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt ? String(row.updatedAt) : undefined),
    community,
    venue,
  };
}
