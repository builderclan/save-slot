import { EventCategory } from "@/types/database";

interface CategoryBadgeProps {
  category: EventCategory | string;
  className?: string;
  size?: "sm" | "md";
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Tech: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  Arts: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  Career: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Social: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  Sports: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  Academic: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  Workshop: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
};

export function CategoryBadge({ category, className = "", size = "md" }: CategoryBadgeProps) {
  const style = CATEGORY_STYLES[category] || {
    bg: "bg-zinc-800",
    text: "text-zinc-300",
    border: "border-zinc-700",
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      {category}
    </span>
  );
}
