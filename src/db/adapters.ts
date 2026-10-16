import {
  CampusEvent,
  Community,
  AdminCommunityRow,
  Venue,
  EventCategory,
  EventStatus,
  UserRole,
  UserProfile,
  AdminUserRow,
} from "@/types/database";

export interface DrizzleEventRow {
  id: string;
  campusId: string;
  communityId: string;
  venueId?: string | null;
  title: string;
  slug: string;
  description: string;
  category: string;
  targetAudience?: string[] | null;
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
    category?: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    website?: string | null;
    instagram?: string | null;
    status?: string | null;
    leadName?: string | null;
    leadEmail?: string | null;
    createdAt?: Date | string | null;
  } | null;
  venue?: {
    id: string;
    campusId?: string;
    name: string;
    building?: string;
    capacity?: number | null;
    address?: string | null;
    notes?: string | null;
    isActive?: boolean | null;
    createdAt?: Date | string | null;
  } | null;
  creator?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  reviewer?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export interface DrizzleVenueRow {
  id: string;
  campusId?: string | null;
  name: string;
  building?: string | null;
  capacity?: number | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
}

/**
 * Adapter utility that maps Drizzle ORM venue records (camelCase) to
 * Venue domain types (snake_case) expected by the frontend.
 */
export function formatVenue(row: DrizzleVenueRow): Venue {
  const rowAny = row as unknown as Record<string, unknown>;
  return {
    id: row.id,
    campus_id: row.campusId || (rowAny.campus_id as string) || "",
    name: row.name,
    building: row.building || (rowAny.building as string) || "",
    capacity: row.capacity ?? (rowAny.capacity as number) ?? null,
    address: row.address ?? (rowAny.address as string) ?? null,
    notes: row.notes ?? (rowAny.notes as string) ?? null,
    is_active: row.isActive ?? (rowAny.is_active as boolean) ?? true,
    created_at:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt
        ? String(row.createdAt)
        : (rowAny.created_at as string | undefined),
  };
}

/**
 * Adapter utility that maps Drizzle ORM query results (camelCase) to
 * CampusEvent and database domain types (snake_case) expected by the frontend.
 */
export function formatCampusEvent(row: DrizzleEventRow): CampusEvent {
  const rowAny = row as unknown as Record<string, unknown>;
  let community: Community | undefined = undefined;
  if (row.community && row.community.id) {
    const commAny = row.community as unknown as Record<string, unknown>;
    const members = commAny.members as
      | Array<{ role?: string; user?: { fullName?: string; email?: string } }>
      | undefined;
    const leadMember = Array.isArray(members)
      ? members.find((m) => m.role === "lead")
      : undefined;

    community = {
      id: row.community.id,
      campus_id: row.community.campusId || (commAny.campus_id as string) || "",
      name: row.community.name,
      slug: row.community.slug,
      category: (row.community.category as EventCategory) || (commAny.category as EventCategory) || "Social",
      logo_url: row.community.logoUrl || (commAny.logo_url as string) || undefined,
      banner_url: row.community.bannerUrl || (commAny.banner_url as string) || undefined,
      website: row.community.website || undefined,
      instagram: row.community.instagram || undefined,
      status: (row.community.status as "pending" | "approved" | "rejected") || undefined,
      lead_name:
        row.community.leadName ||
        (commAny.lead_name as string) ||
        leadMember?.user?.fullName ||
        undefined,
      lead_email:
        row.community.leadEmail ||
        (commAny.lead_email as string) ||
        leadMember?.user?.email ||
        undefined,
      created_at: row.community.createdAt instanceof Date ? row.community.createdAt.toISOString() : (row.community.createdAt || (commAny.created_at as string) || undefined),
    };
  }

  let venue: Venue | undefined = undefined;
  if (row.venue && row.venue.id) {
    venue = formatVenue(row.venue as DrizzleVenueRow);
  }

  let creator: CampusEvent["creator"] = undefined;
  if (row.creator && row.creator.id) {
    const validRoles: UserRole[] = ["admin", "principal", "vice_principal", "organizer", "student"];
    const parsedRole = row.creator.role && validRoles.includes(row.creator.role as UserRole)
      ? (row.creator.role as UserRole)
      : "organizer";

    creator = {
      id: row.creator.id,
      full_name: row.creator.fullName || "",
      email: row.creator.email || undefined,
      role: parsedRole,
    };
  }

  let reviewer: CampusEvent["reviewer"] = undefined;
  if (row.reviewer && row.reviewer.id) {
    const validRoles: UserRole[] = ["admin", "principal", "vice_principal", "organizer", "student"];
    const parsedRole = row.reviewer.role && validRoles.includes(row.reviewer.role as UserRole)
      ? (row.reviewer.role as UserRole)
      : "student";

    reviewer = {
      id: row.reviewer.id,
      full_name: row.reviewer.fullName || "",
      email: row.reviewer.email || undefined,
      role: parsedRole,
    };
  }

  const rawStart = row.startTime ?? (rowAny.start_time as Date | string | undefined);
  const rawEnd = row.endTime ?? (rowAny.end_time as Date | string | undefined);
  const rawCreatedAt = row.createdAt ?? (rowAny.created_at as Date | string | undefined);
  const rawUpdatedAt = row.updatedAt ?? (rowAny.updated_at as Date | string | undefined);

  return {
    id: row.id,
    campus_id: row.campusId || (rowAny.campus_id as string) || "",
    community_id: row.communityId || (rowAny.community_id as string) || "",
    venue_id: row.venueId !== undefined ? row.venueId : (rowAny.venue_id as string | null),
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: (row.category as EventCategory) || (rowAny.category as EventCategory),
    target_audience: row.targetAudience || (rowAny.target_audience as string[]) || ["All Students"],
    tags: row.tags || (rowAny.tags as string[]) || [],
    start_time:
      rawStart instanceof Date
        ? rawStart.toISOString()
        : String(rawStart ?? ""),
    end_time:
      rawEnd instanceof Date
        ? rawEnd.toISOString()
        : String(rawEnd ?? ""),
    timezone: row.timezone || (rowAny.timezone as string) || undefined,
    location_name: row.locationName || (rowAny.location_name as string) || "",
    is_virtual: row.isVirtual ?? (rowAny.is_virtual as boolean) ?? false,
    virtual_link: row.virtualLink || (rowAny.virtual_link as string) || undefined,
    external_registration_url: row.externalRegistrationUrl || (rowAny.external_registration_url as string) || undefined,
    cover_image_url: row.coverImageUrl || (rowAny.cover_image_url as string) || undefined,
    status: (row.status as EventStatus) || (rowAny.status as EventStatus),
    rejection_reason: row.rejectionReason || (rowAny.rejection_reason as string) || undefined,
    cancellation_reason: row.cancellationReason || (rowAny.cancellation_reason as string) || undefined,
    created_by: row.createdBy || (rowAny.created_by as string) || undefined,
    reviewed_by: row.reviewedBy || (rowAny.reviewed_by as string) || undefined,
    created_at:
      rawCreatedAt instanceof Date
        ? rawCreatedAt.toISOString()
        : rawCreatedAt
        ? String(rawCreatedAt)
        : undefined,
    updated_at:
      rawUpdatedAt instanceof Date
        ? rawUpdatedAt.toISOString()
        : rawUpdatedAt
        ? String(rawUpdatedAt)
        : undefined,
    community,
    venue,
    creator,
    reviewer,
  };
}

export interface DrizzleCommunityRow {
  id: string;
  campusId: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  instagram?: string | null;
  status?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: Date | string | null;
  reviewedBy?: string | null;
  createdAt?: Date | string | null;
}

export interface DrizzleAdminCommunityRow extends DrizzleCommunityRow {
  leadId?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  memberCount: number | string;
  eventCount: number | string;
}

/**
 * Adapter utility that maps Drizzle ORM community records (camelCase) to
 * Community domain types (snake_case) expected by the frontend.
 */
export function formatCommunity(row: DrizzleCommunityRow): Community {
  return {
    id: row.id,
    campus_id: row.campusId,
    name: row.name,
    slug: row.slug,
    category: row.category as EventCategory,
    description: row.description ?? undefined,
    logo_url: row.logoUrl ?? undefined,
    banner_url: row.bannerUrl ?? undefined,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    status: (row.status as "pending" | "approved" | "rejected") ?? undefined,
    applicant_name: row.applicantName ?? undefined,
    applicant_email: row.applicantEmail ?? undefined,
    rejection_reason: row.rejectionReason ?? undefined,
    reviewed_at:
      row.reviewedAt instanceof Date
        ? row.reviewedAt.toISOString()
        : row.reviewedAt ?? undefined,
    reviewed_by: row.reviewedBy ?? undefined,
    created_at:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt
        ? String(row.createdAt)
        : undefined,
  };
}

/**
 * Adapter utility that maps Drizzle ORM admin community records with aggregated metrics
 * to AdminCommunityRow domain types (snake_case) expected by the frontend.
 */
export function formatAdminCommunity(row: DrizzleAdminCommunityRow): AdminCommunityRow {
  return {
    ...formatCommunity(row),
    lead_id: row.leadId ?? null,
    lead_name: row.leadName ?? null,
    lead_email: row.leadEmail ?? null,
    member_count: Number(row.memberCount || 0),
    event_count: Number(row.eventCount || 0),
  };
}

export interface DrizzleUserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  campusId?: string | null;
  createdAt?: Date | string | null;
}

export interface DrizzleAdminUserRow extends DrizzleUserRow {
  communityId?: string | null;
  communityName?: string | null;
}

/**
 * Adapter utility that maps Drizzle ORM user records (camelCase) to
 * UserProfile domain types (snake_case) expected by the frontend.
 */
export function formatUser(row: DrizzleUserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    role: row.role as UserRole,
    avatar_url: row.avatarUrl ?? undefined,
    campus_id: row.campusId ?? undefined,
    created_at:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt
        ? String(row.createdAt)
        : undefined,
  };
}

/**
 * Adapter utility that maps Drizzle ORM admin user records with associated
 * lead community info to AdminUserRow domain types (snake_case) expected by the frontend.
 */
export function formatAdminUser(row: DrizzleAdminUserRow): AdminUserRow {
  return {
    ...formatUser(row),
    community_id: row.communityId ?? null,
    community_name: row.communityName ?? null,
  };
}
