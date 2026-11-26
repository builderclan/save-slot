export type UserRole =
  | "admin"
  | "principal"
  | "vice_principal"
  | "hod"
  | "fic"
  | "staff"
  | "lead";

export type EventOriginType = "community" | "department" | "college";
export type CommunityScope = "internal" | "external";

export type EventCategory =
  | "Tech"
  | "Career"
  | "Arts"
  | "Social"
  | "Sports"
  | "Academic"
  | "Workshop";

export type EventStatus =
  | "draft"
  | "pending_stage2"
  | "pending_executive"
  | "published"
  | "needs_reschedule"
  | "rejected"
  | "cancelled"
  | "pending_report_verification"
  | "completed";

export interface CollegeSettings {
  id: number;
  college_name: string;
  short_code: string;
  letterhead_subtitle?: string | null;
  logo_url?: string | null;
  academic_year_start_month: number;
  timezone: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_user_id?: string | null;
  acting_hod_user_id?: string | null;
  is_acting_hod_active: boolean;
  acting_hod_toggled_by?: string | null;
  acting_hod_toggled_at?: string | null;
  is_active: boolean;
  created_at?: string;
  hod?: { id: string; full_name: string; email: string } | null;
  acting_hod?: { id: string; full_name: string; email: string } | null;
}

export interface Venue {
  id: string;
  name: string;
  building: string;
  capacity?: number | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  code: string;
  scope: CommunityScope;
  category: EventCategory;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website?: string;
  instagram?: string;
  status?: "pending" | "approved" | "rejected";
  applicant_name?: string;
  applicant_email?: string;
  rejection_reason?: string;
  lead_name?: string | null;
  lead_email?: string | null;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at?: string;
}

export interface AdminCommunityRow extends Community {
  lead_id?: string | null;
  lead_name?: string | null;
  lead_email?: string | null;
  fic_ids?: string[];
  fic_names?: string[];
  member_count: number;
  event_count: number;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: "lead" | "fic" | "member";
  status: "active" | "invited";
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  designation?: string | null;
  department_id?: string | null;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface AdminUserRow extends UserProfile {
  department_name?: string | null;
  department_code?: string | null;
  community_id?: string | null;
  community_name?: string | null;
  community_member_role?: "lead" | "fic" | "member" | null;
}

export type TargetAudience =
  | "All Students"
  | "1st Year"
  | "2nd Year"
  | "3rd Year"
  | "Final Year"
  | "Postgraduate"
  | "Faculty & Staff";

export interface EventStage2Approval {
  id: string;
  event_id: string;
  entity_type: "department" | "community";
  department_id?: string | null;
  community_id?: string | null;
  is_primary: boolean;
  approval_status: "pending" | "approved" | "rejected";
  approved_by?: string | null;
  approved_at?: string | null;
  approval_remarks?: string | null;
  report_verify_status: "pending" | "verified" | "revision_requested";
  report_verified_by?: string | null;
  report_verified_at?: string | null;
  report_remarks?: string | null;
  entity_name?: string;
  entity_code?: string;
}

export interface EventApprovalEntry {
  id: string;
  event_id: string;
  stage: string;
  action: string;
  actor_id?: string | null;
  actor_name_snapshot: string;
  actor_role_snapshot: string;
  remarks?: string | null;
  created_at: string;
}

export interface EventMentor {
  id: string;
  event_id: string;
  name: string;
  role_title: string;
  organization: string;
  mentor_type: "internal" | "external";
  phase: "planned" | "confirmed";
}

export interface EventReport {
  id: string;
  event_id: string;
  actual_fund_used: number;
  funding_source: string;
  fund_notes?: string | null;
  student_count: number;
  faculty_count: number;
  external_count: number;
  summary: string;
  outcomes: string;
  evidence_url?: string | null;
  submitted_by?: string | null;
  submitted_at: string;
  updated_at?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  event_id?: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface CampusEvent {
  id: string;
  origin_type: EventOriginType;
  community_id?: string | null;
  department_id?: string | null;
  venue_id?: string | null;
  coordinator_id?: string | null;
  reference_number?: string | null;
  academic_year?: string | null;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  target_audience?: string[];
  tags?: string[];
  start_time: string;
  end_time: string;
  timezone?: string;
  location_name: string;
  is_virtual?: boolean;
  virtual_link?: string;
  external_registration_url?: string;
  cover_image_url?: string;
  estimated_budget?: number;
  funding_source?: string;
  is_lead_time_overridden?: boolean;
  override_reason?: string | null;
  status: EventStatus;
  rejection_reason?: string;
  cancellation_reason?: string;
  created_by?: string;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Hydrated joins
  community?: Community;
  department?: Department;
  venue?: Venue;
  creator?: {
    id: string;
    full_name: string;
    email?: string | null;
    role?: UserRole;
  } | null;
  reviewer?: {
    id: string;
    full_name: string;
    email?: string | null;
    role: UserRole;
  } | null;
  stage2_approvals?: EventStage2Approval[];
  approvals?: EventApprovalEntry[];
  mentors?: EventMentor[];
  report?: EventReport | null;
}

export interface SafeSlotSuggestion {
  type: "same_venue_later" | "alternative_venue" | "next_day";
  label: string;
  venue_id: string;
  venue_name: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  hasVenueConflict?: boolean;
  hasAudienceConflict?: boolean;
  hasLeadTimeViolation: boolean;
  leadTimeDays: number;
  conflictingEvent?: CampusEvent | null;
  conflictingAudienceEvent?: CampusEvent | null;
  overlappingAudience?: string[];
  message: string;
  safeSlots: SafeSlotSuggestion[];
}
