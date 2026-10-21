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
    border: "border-indigo-200/70",
    dot: "bg-indigo-500",
  },
  Arts: {
    bg: "bg-pink-50/80",
    text: "text-pink-700",
    border: "border-pink-200/70",
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
    border: "border-purple-200/70",
    dot: "bg-purple-500",
  },
  Sports: {
    bg: "bg-emerald-50/80",
    text: "text-emerald-700",
    border: "border-emerald-200/70",
    dot: "bg-emerald-500",
  },
  Academic: {
    bg: "bg-sky-50/80",
    text: "text-sky-700",
    border: "border-sky-200/70",
    dot: "bg-sky-500",
  },
  Workshop: {
    bg: "bg-orange-50/80",
    text: "text-orange-700",
    border: "border-orange-200/70",
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
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    border: "border-zinc-200",
    dot: "bg-zinc-400",
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
