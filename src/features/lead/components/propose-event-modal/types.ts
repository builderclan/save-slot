import { CampusEvent, Community, Department, EventCategory, Venue } from "@/types/database";
import { EventMentorInput, CoHostEntityInput } from "@/lib/validations";

export interface PresetCover {
  name: string;
  url: string;
}

export const PRESET_COVERS: PresetCover[] = [
  {
    name: "Tech Hackathon",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Design Workshop",
    url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Startup Pitch",
    url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Campus Concert",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
  },
];

export const CATEGORIES: EventCategory[] = [
  "Tech",
  "Arts",
  "Career",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

export const FUNDING_SOURCES = [
  "No Cost",
  "College Fund",
  "Department Fund",
  "Sponsor / External",
  "Self-Funded",
] as const;

export interface ProposeEventModalProps {
  venues: Venue[];
  communityId?: string;
  communityName?: string;
  departmentId?: string | null;
  departments?: Department[];
  communities?: Community[];
  leadCommunities?: Array<{ id: string; name: string; slug: string; code?: string; scope?: string }>;
  overdueCount?: number;
  initialEvent?: CampusEvent | null;
  mode?: "create" | "edit";
  onClose: () => void;
  onSuccess: (submittedAction?: "draft" | "submit") => void;
}

export type { EventMentorInput, CoHostEntityInput };
