import { EventCategory } from "@/types/database";

interface CategoryBadgeProps {
  category: EventCategory | string;
  className?: string;
  size?: "sm" | "md";
}

export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Tech: {
    bg: "bg-indigo-50/80",
    text: "text-indigo-700",
    border: "border-indigo-100",
    dot: "bg-indigo-500",
  },
  Arts: {
    bg: "bg-pink-50/80",
    text: "text-pink-700",
    border: "border-pink-100",
    dot: "bg-pink-500",
  },
  Career: {
    bg: "bg-amber-50/80",
    text: "text-amber-800",
    border: "border-amber-200/70",
    dot: "bg-amber-500",
  },
  Social: {
    bg: "bg-purple-50/80",
    text: "text-purple-700",
    border: "border-purple-100",
    dot: "bg-purple-500",
  },
  Sports: {
    bg: "bg-teal-50/80",
    text: "text-teal-700",
    border: "border-teal-100",
    dot: "bg-teal-500",
  },
  Academic: {
    bg: "bg-blue-50/80",
    text: "text-blue-700",
    border: "border-blue-100",
    dot: "bg-blue-500",
  },
  Workshop: {
    bg: "bg-orange-50/80",
    text: "text-orange-700",
    border: "border-orange-100",
    dot: "bg-orange-500",
  },
};

export function CategoryBadge({
  category,
  className = "",
  size = "md",
  showDot = false,
}: CategoryBadgeProps & { showDot?: boolean }) {
  const style = CATEGORY_STYLES[category] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span>{category}</span>
    </span>
  );
}
