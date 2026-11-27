import { Building2, Globe, GraduationCap, Shield } from "lucide-react";
import type { CampusEvent } from "@/types/database";

export function getEventHostLabel(event: CampusEvent): string {
  if (event.origin_type === "college") {
    return "College Event";
  }
  if (event.origin_type === "department") {
    return event.department?.name || "Department Event";
  }
  return event.community?.name || "Campus Community";
}

interface EventOriginBadgeProps {
  event: CampusEvent;
  showScope?: boolean;
}

export function EventOriginBadge({ event, showScope = true }: EventOriginBadgeProps) {
  if (event.origin_type === "college") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50/90 text-purple-800 text-[10px] font-semibold whitespace-nowrap">
        <GraduationCap className="w-2.5 h-2.5 text-purple-600 shrink-0" />
        <span>College</span>
      </span>
    );
  }

  if (event.origin_type === "department") {
    const code = event.department?.code || "Dept";
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50/90 text-teal-800 text-[10px] font-semibold whitespace-nowrap">
        <Building2 className="w-2.5 h-2.5 text-teal-600 shrink-0" />
        <span>Dept · {code}</span>
      </span>
    );
  }

  if (showScope && event.community?.scope === "external") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50/90 text-amber-800 text-[10px] font-semibold whitespace-nowrap">
        <Globe className="w-2.5 h-2.5 text-amber-600 shrink-0" />
        <span>External</span>
      </span>
    );
  }

  if (showScope && event.community?.scope === "internal") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50/90 text-indigo-700 text-[10px] font-semibold whitespace-nowrap">
        <Shield className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
        <span>Internal</span>
      </span>
    );
  }

  return null;
}
