import * as React from "react";
import { EventCategory } from "@/types/database";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: EventCategory;
  className?: string;
  size?: "sm" | "md";
}

const categoryStyles: Record<EventCategory, string> = {
  Tech: "badge-tech",
  Career: "badge-career",
  Arts: "badge-arts",
  Social: "badge-social",
  Sports: "badge-sports",
  Academic: "badge-academic",
  Workshop: "badge-workshop",
};

export function CategoryBadge({ category, className, size = "md" }: CategoryBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border transition-colors",
        categoryStyles[category] || "badge-tech",
        sizeClasses,
        className
      )}
    >
      {category}
    </span>
  );
}
