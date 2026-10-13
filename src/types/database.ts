export type UserRole = "admin" | "principal" | "vice_principal" | "organizer" | "student";

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
  | "pending"
  | "published"
  | "cancelled"
  | "rejected";

export interface Campus {
  id: string;
  name: string;
  slug: string;
  location?: string;
  timezone?: string;
  created_at?: string;
}

export interface Venue {
  id: string;
  campus_id: string;
  name: string;
  building?: string;
  capacity?: number | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Community {
  id: string;
  campus_id: string;
  name: string;
  slug: string;
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
  reviewed_at?: string;
  reviewed_by?: string;
  created_at?: string;
}

export interface AdminCommunityRow extends Community {
  lead_id?: string | null;
  lead_name?: string | null;
  lead_email?: string | null;
  member_count: number;
  event_count: number;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: "lead" | "member";
  status: "active" | "invited";
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  campus_id?: string;
  created_at?: string;
}

export interface AdminUserRow extends UserProfile {
  community_id?: string | null;
  community_name?: string | null;
}

export interface CampusEvent {
  id: string;
  campus_id: string;
  community_id: string;
  venue_id?: string | null;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  tags?: string[];
  start_time: string;
  end_time: string;
  timezone?: string;
  location_name: string;
  is_virtual?: boolean;
  virtual_link?: string;
  external_registration_url?: string;
  cover_image_url?: string;
  status: EventStatus;
  rejection_reason?: string;
  cancellation_reason?: string;
  created_by?: string;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Hydrated joins
  community?: Community;
  venue?: Venue;
  creator?: UserProfile;
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  } | null;
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
  hasLeadTimeViolation: boolean;
  leadTimeDays: number;
  conflictingEvent?: CampusEvent | null;
  message: string;
  safeSlots: SafeSlotSuggestion[];
}
