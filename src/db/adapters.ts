import {
  CampusEvent,
  CollegeSettings,
  Community,
  CommunityScope,
  AdminCommunityRow,
  Department,
  Venue,
  EventCategory,
  EventOriginType,
  EventStatus,
  EventStage2Approval,
  EventApprovalEntry,
  EventMentor,
  EventReport,
  NotificationItem,
  UserRole,
  UserProfile,
  AdminUserRow,
} from "@/types/database";

const VALID_ROLES: UserRole[] = [
  "admin",
  "principal",
  "vice_principal",
  "hod",
  "fic",
  "staff",
  "lead",
];

function normalizeRole(role?: string | null): UserRole {
  if (role && VALID_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  if (role === "organizer" || role === "student") {
    return "lead";
  }
  return "lead";
}

function toIsoString(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface DrizzleCollegeSettingsRow {
  id: number;
  collegeName: string;
  shortCode: string;
  letterheadSubtitle?: string | null;
  logoUrl?: string | null;
  academicYearStartMonth: number;
  timezone: string;
  updatedAt?: Date | string | null;
}

export function formatCollegeSettings(row: DrizzleCollegeSettingsRow): CollegeSettings {
  return {
    id: row.id,
    college_name: row.collegeName,
    short_code: row.shortCode,
    letterhead_subtitle: row.letterheadSubtitle ?? null,
    logo_url: row.logoUrl ?? null,
    academic_year_start_month: row.academicYearStartMonth,
    timezone: row.timezone,
    updated_at: toIsoString(row.updatedAt),
  };
}

export interface DrizzleDepartmentRow {
  id: string;
  name: string;
  code: string;
  hodUserId?: string | null;
  actingHodUserId?: string | null;
  isActingHodActive: boolean;
  actingHodToggledBy?: string | null;
  actingHodToggledAt?: Date | string | null;
  isActive: boolean;
  createdAt?: Date | string | null;
  hod?: { id: string; fullName: string; email: string } | null;
  actingHod?: { id: string; fullName: string; email: string } | null;
}

export function formatDepartment(row: DrizzleDepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    hod_user_id: row.hodUserId ?? null,
    acting_hod_user_id: row.actingHodUserId ?? null,
    is_acting_hod_active: row.isActingHodActive,
    acting_hod_toggled_by: row.actingHodToggledBy ?? null,
    acting_hod_toggled_at: toIsoString(row.actingHodToggledAt) ?? null,
    is_active: row.isActive,
    created_at: toIsoString(row.createdAt),
    hod: row.hod
      ? { id: row.hod.id, full_name: row.hod.fullName, email: row.hod.email }
      : null,
    acting_hod: row.actingHod
      ? {
          id: row.actingHod.id,
          full_name: row.actingHod.fullName,
          email: row.actingHod.email,
        }
      : null,
  };
}

export interface DrizzleEventRow {
  id: string;
  originType?: string | null;
  communityId?: string | null;
  departmentId?: string | null;
  venueId?: string | null;
  coordinatorId?: string | null;
  referenceNumber?: string | null;
  academicYear?: string | null;
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
  estimatedBudget?: string | number | null;
  fundingSource?: string | null;
  isLeadTimeOverridden?: boolean | null;
  overrideReason?: string | null;
  status: string;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  createdBy?: string | null;
  reviewedBy?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  community?: DrizzleCommunityRow | null;
  department?: DrizzleDepartmentRow | null;
  venue?: DrizzleVenueRow | null;
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
  stage2Approvals?: DrizzleStage2ApprovalRow[] | null;
  approvals?: DrizzleApprovalEntryRow[] | null;
  mentors?: DrizzleMentorRow[] | null;
  report?: DrizzleEventReportRow | null;
}

export interface DrizzleStage2ApprovalRow {
  id: string;
  eventId: string;
  entityType: string;
  departmentId?: string | null;
  communityId?: string | null;
  isPrimary: boolean;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  approvalRemarks?: string | null;
  reportVerifyStatus: string;
  reportVerifiedBy?: string | null;
  reportVerifiedAt?: Date | string | null;
  reportRemarks?: string | null;
  department?: { id: string; name: string; code: string } | null;
  community?: { id: string; name: string; code?: string | null } | null;
}

export interface DrizzleApprovalEntryRow {
  id: string;
  eventId: string;
  stage: string;
  action: string;
  actorId?: string | null;
  actorNameSnapshot: string;
  actorRoleSnapshot: string;
  remarks?: string | null;
  createdAt: Date | string;
}

export interface DrizzleMentorRow {
  id: string;
  eventId: string;
  name: string;
  roleTitle: string;
  organization: string;
  mentorType: string;
  phase: string;
}

export interface DrizzleEventReportRow {
  id: string;
  eventId: string;
  actualFundUsed: string | number;
  fundingSource: string;
  fundNotes?: string | null;
  studentCount: number;
  facultyCount: number;
  externalCount: number;
  summary: string;
  outcomes: string;
  evidenceUrl?: string | null;
  submittedBy?: string | null;
  submittedAt: Date | string;
  updatedAt?: Date | string | null;
}

export interface DrizzleNotificationRow {
  id: string;
  userId: string;
  eventId?: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}

export function formatStage2Approval(row: DrizzleStage2ApprovalRow): EventStage2Approval {
  const entityName = row.department?.name || row.community?.name || undefined;
  const entityCode = row.department?.code || row.community?.code || undefined;
  return {
    id: row.id,
    event_id: row.eventId,
    entity_type: row.entityType === "community" ? "community" : "department",
    department_id: row.departmentId ?? null,
    community_id: row.communityId ?? null,
    is_primary: Boolean(row.isPrimary),
    approval_status: (row.approvalStatus as EventStage2Approval["approval_status"]) || "pending",
    approved_by: row.approvedBy ?? null,
    approved_at: toIsoString(row.approvedAt) ?? null,
    approval_remarks: row.approvalRemarks ?? null,
    report_verify_status:
      (row.reportVerifyStatus as EventStage2Approval["report_verify_status"]) || "pending",
    report_verified_by: row.reportVerifiedBy ?? null,
    report_verified_at: toIsoString(row.reportVerifiedAt) ?? null,
    report_remarks: row.reportRemarks ?? null,
    entity_name: entityName,
    entity_code: entityCode ?? undefined,
  };
}

export function formatApprovalEntry(row: DrizzleApprovalEntryRow): EventApprovalEntry {
  return {
    id: row.id,
    event_id: row.eventId,
    stage: row.stage,
    action: row.action,
    actor_id: row.actorId ?? null,
    actor_name_snapshot: row.actorNameSnapshot,
    actor_role_snapshot: row.actorRoleSnapshot,
    remarks: row.remarks ?? null,
    created_at: toIsoString(row.createdAt) ?? "",
  };
}

export function formatEventMentor(row: DrizzleMentorRow): EventMentor {
  return {
    id: row.id,
    event_id: row.eventId,
    name: row.name,
    role_title: row.roleTitle,
    organization: row.organization,
    mentor_type: row.mentorType === "internal" ? "internal" : "external",
    phase: row.phase === "confirmed" ? "confirmed" : "planned",
  };
}

export function formatEventReport(row: DrizzleEventReportRow): EventReport {
  return {
    id: row.id,
    event_id: row.eventId,
    actual_fund_used: Number(row.actualFundUsed || 0),
    funding_source: row.fundingSource,
    fund_notes: row.fundNotes ?? null,
    student_count: Number(row.studentCount || 0),
    faculty_count: Number(row.facultyCount || 0),
    external_count: Number(row.externalCount || 0),
    summary: row.summary,
    outcomes: row.outcomes,
    evidence_url: row.evidenceUrl ?? null,
    submitted_by: row.submittedBy ?? null,
    submitted_at: toIsoString(row.submittedAt) ?? "",
    updated_at: toIsoString(row.updatedAt),
  };
}

export function formatNotification(row: DrizzleNotificationRow): NotificationItem {
  return {
    id: row.id,
    user_id: row.userId,
    event_id: row.eventId ?? null,
    type: row.type,
    title: row.title,
    message: row.message,
    is_read: Boolean(row.isRead),
    created_at: toIsoString(row.createdAt) ?? "",
  };
}

export interface DrizzleVenueRow {
  id: string;
  name: string;
  building?: string | null;
  capacity?: number | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
}

/**
 * Maps Drizzle venue rows (camelCase) to frontend Venue contracts (snake_case).
 */
export function formatVenue(row: DrizzleVenueRow): Venue {
  const rowAny = row as unknown as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    building: row.building || (rowAny.building as string) || "",
    capacity: row.capacity ?? (rowAny.capacity as number) ?? null,
    address: row.address ?? (rowAny.address as string) ?? null,
    notes: row.notes ?? (rowAny.notes as string) ?? null,
    is_active: row.isActive ?? (rowAny.is_active as boolean) ?? true,
    created_at: toIsoString(row.createdAt ?? (rowAny.created_at as string | undefined)),
  };
}

export interface DrizzleCommunityRow {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  scope?: string | null;
  category?: string | null;
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
  leadName?: string | null;
  leadEmail?: string | null;
  createdAt?: Date | string | null;
}

export interface DrizzleAdminCommunityRow extends DrizzleCommunityRow {
  leadId?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  ficIds?: string[];
  ficNames?: string[];
  memberCount: number | string;
  eventCount: number | string;
}

/**
 * Maps Drizzle community rows (camelCase) to frontend Community contracts (snake_case).
 */
export function formatCommunity(row: DrizzleCommunityRow): Community {
  const commAny = row as unknown as Record<string, unknown>;
  const members = commAny.members as
    | Array<{ role?: string; user?: { fullName?: string; email?: string } }>
    | undefined;
  const leadMember = Array.isArray(members)
    ? members.find((m) => m.role === "lead")
    : undefined;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    code:
      row.code ||
      (commAny.code as string) ||
      row.slug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase(),
    scope: (row.scope === "external" ? "external" : "internal") as CommunityScope,
    category: (row.category as EventCategory) || (commAny.category as EventCategory) || "Social",
    description: row.description ?? undefined,
    logo_url: row.logoUrl ?? (commAny.logo_url as string) ?? undefined,
    banner_url: row.bannerUrl ?? (commAny.banner_url as string) ?? undefined,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    status: (row.status as "pending" | "approved" | "rejected") ?? undefined,
    applicant_name: row.applicantName ?? undefined,
    applicant_email: row.applicantEmail ?? undefined,
    rejection_reason: row.rejectionReason ?? undefined,
    lead_name:
      row.leadName ||
      (commAny.lead_name as string) ||
      leadMember?.user?.fullName ||
      undefined,
    lead_email:
      row.leadEmail ||
      (commAny.lead_email as string) ||
      leadMember?.user?.email ||
      undefined,
    reviewed_at: toIsoString(row.reviewedAt),
    reviewed_by: row.reviewedBy ?? undefined,
    created_at: toIsoString(row.createdAt ?? (commAny.created_at as string | undefined)),
  };
}

export function formatAdminCommunity(row: DrizzleAdminCommunityRow): AdminCommunityRow {
  const formatted = formatCommunity(row);
  return {
    ...formatted,
    lead_id: row.leadId ?? null,
    lead_name: row.leadName ?? formatted.lead_name ?? null,
    lead_email: row.leadEmail ?? formatted.lead_email ?? null,
    fic_ids: row.ficIds ?? [],
    fic_names: row.ficNames ?? [],
    member_count: Number(row.memberCount || 0),
    event_count: Number(row.eventCount || 0),
  };
}

/**
 * Maps Drizzle event rows (camelCase) to frontend CampusEvent contracts (snake_case).
 */
export function formatCampusEvent(row: DrizzleEventRow): CampusEvent {
  const rowAny = row as unknown as Record<string, unknown>;
  const community = row.community && row.community.id ? formatCommunity(row.community) : undefined;
  const department =
    row.department && row.department.id ? formatDepartment(row.department) : undefined;
  const venue = row.venue && row.venue.id ? formatVenue(row.venue) : undefined;

  const creator =
    row.creator && row.creator.id
      ? {
          id: row.creator.id,
          full_name: row.creator.fullName || "",
          email: row.creator.email || undefined,
          role: normalizeRole(row.creator.role),
        }
      : undefined;

  const reviewer =
    row.reviewer && row.reviewer.id
      ? {
          id: row.reviewer.id,
          full_name: row.reviewer.fullName || "",
          email: row.reviewer.email || undefined,
          role: normalizeRole(row.reviewer.role),
        }
      : undefined;

  const rawStart = row.startTime ?? (rowAny.start_time as Date | string | undefined);
  const rawEnd = row.endTime ?? (rowAny.end_time as Date | string | undefined);
  const rawCreatedAt = row.createdAt ?? (rowAny.created_at as Date | string | undefined);
  const rawUpdatedAt = row.updatedAt ?? (rowAny.updated_at as Date | string | undefined);
  const rawBudget = row.estimatedBudget ?? (rowAny.estimated_budget as string | number | undefined);

  return {
    id: row.id,
    origin_type: ((row.originType ?? (rowAny.origin_type as string)) || "community") as EventOriginType,
    community_id: row.communityId !== undefined ? row.communityId : (rowAny.community_id as string | null),
    department_id:
      row.departmentId !== undefined ? row.departmentId : (rowAny.department_id as string | null),
    venue_id: row.venueId !== undefined ? row.venueId : (rowAny.venue_id as string | null),
    coordinator_id:
      row.coordinatorId !== undefined ? row.coordinatorId : (rowAny.coordinator_id as string | null),
    reference_number:
      row.referenceNumber !== undefined
        ? row.referenceNumber
        : (rowAny.reference_number as string | null),
    academic_year:
      row.academicYear !== undefined ? row.academicYear : (rowAny.academic_year as string | null),
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: (row.category as EventCategory) || (rowAny.category as EventCategory),
    target_audience: row.targetAudience || (rowAny.target_audience as string[]) || ["All Students"],
    tags: row.tags || (rowAny.tags as string[]) || [],
    start_time: toIsoString(rawStart) ?? "",
    end_time: toIsoString(rawEnd) ?? "",
    timezone: row.timezone || (rowAny.timezone as string) || undefined,
    location_name: row.locationName || (rowAny.location_name as string) || "",
    is_virtual: row.isVirtual ?? (rowAny.is_virtual as boolean) ?? false,
    virtual_link: row.virtualLink || (rowAny.virtual_link as string) || undefined,
    external_registration_url:
      row.externalRegistrationUrl || (rowAny.external_registration_url as string) || undefined,
    cover_image_url: row.coverImageUrl || (rowAny.cover_image_url as string) || undefined,
    estimated_budget: rawBudget !== undefined && rawBudget !== null ? Number(rawBudget) : 0,
    funding_source: row.fundingSource || (rowAny.funding_source as string) || "No Cost",
    is_lead_time_overridden:
      row.isLeadTimeOverridden ?? (rowAny.is_lead_time_overridden as boolean) ?? false,
    override_reason: row.overrideReason ?? (rowAny.override_reason as string | null) ?? null,
    status: (row.status as EventStatus) || (rowAny.status as EventStatus),
    rejection_reason: row.rejectionReason || (rowAny.rejection_reason as string) || undefined,
    cancellation_reason:
      row.cancellationReason || (rowAny.cancellation_reason as string) || undefined,
    created_by: row.createdBy || (rowAny.created_by as string) || undefined,
    reviewed_by: row.reviewedBy || (rowAny.reviewed_by as string) || undefined,
    created_at: toIsoString(rawCreatedAt),
    updated_at: toIsoString(rawUpdatedAt),
    community,
    department,
    venue,
    creator,
    reviewer,
    stage2_approvals: Array.isArray(row.stage2Approvals)
      ? row.stage2Approvals.map(formatStage2Approval)
      : undefined,
    approvals: Array.isArray(row.approvals)
      ? row.approvals.map(formatApprovalEntry)
      : undefined,
    mentors: Array.isArray(row.mentors)
      ? row.mentors.map(formatEventMentor)
      : undefined,
    report: row.report ? formatEventReport(row.report) : row.report === null ? null : undefined,
  };
}

export interface DrizzleUserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  designation?: string | null;
  departmentId?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
}

export interface DrizzleAdminUserRow extends DrizzleUserRow {
  departmentName?: string | null;
  departmentCode?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  communityMemberRole?: string | null;
}

export function formatUser(row: DrizzleUserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    role: normalizeRole(row.role),
    designation: row.designation ?? null,
    department_id: row.departmentId ?? null,
    avatar_url: row.avatarUrl ?? undefined,
    is_active: row.isActive ?? true,
    created_at: toIsoString(row.createdAt),
  };
}

export function formatAdminUser(row: DrizzleAdminUserRow): AdminUserRow {
  return {
    ...formatUser(row),
    department_name: row.departmentName ?? null,
    department_code: row.departmentCode ?? null,
    community_id: row.communityId ?? null,
    community_name: row.communityName ?? null,
    community_member_role:
      (row.communityMemberRole as "lead" | "fic" | "member" | null) ?? null,
  };
}
