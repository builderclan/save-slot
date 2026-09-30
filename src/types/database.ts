export type UserRole = "student" | "organizer" | "admin";

export type EventStatus = "draft" | "pending" | "published" | "cancelled" | "rejected";

export type EventCategory =
  | "Tech"
  | "Career"
  | "Arts"
  | "Social"
  | "Sports"
  | "Academic"
  | "Workshop";

export interface Campus {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  campus_id: string;
  created_at: string;
}

export interface Community {
  id: string;
  campus_id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  website?: string;
  instagram?: string;
  status: "pending" | "approved" | "rejected";
  applicant_name?: string;
  applicant_email?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_by?: string;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: "lead" | "member";
  status: "active" | "invited";
  created_at: string;
}

export interface Venue {
  id: string;
  campus_id: string;
  name: string;
  building: string;
  capacity?: number;
  address?: string;
  is_active: boolean;
  notes?: string;
}

export interface Event {
  id: string;
  campus_id: string;
  community_id: string;
  venue_id?: string | null;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  tags: string[];
  start_time: string; // ISO string
  end_time: string;   // ISO string
  timezone: string;
  location_name: string; // Venue name or custom location
  is_virtual: boolean;
  virtual_link?: string | null;
  external_registration_url?: string | null; // Optional: null for open events requiring no external registration
  cover_image_url?: string | null;
  status: EventStatus;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Joined relations for convenience
  community?: Community;
  venue?: Venue;
}

export interface VenueConflict {
  type: "venue";
  venueId: string;
  venueName: string;
  conflictingEvent: Event;
  message: string;
}

export interface ScheduleOverlap {
  type: "schedule";
  conflictingEvent: Event;
  message: string;
}

export interface ConflictReport {
  hasVenueConflict: boolean;
  hasScheduleOverlap: boolean;
  venueConflicts: VenueConflict[];
  scheduleOverlaps: ScheduleOverlap[];
}
