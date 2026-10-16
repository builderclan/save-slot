import { CheckCircle2, Clock3, XCircle, Ban, FileEdit, Check } from "lucide-react";
import type { EventStatus } from "@/types/database";

export type StatusType = EventStatus | "approved";

export interface StatusBadgeProps {
  status: StatusType | string;
  variant?: "pill" | "badge" | "dot";
  size?: "xs" | "sm" | "md";
  label?: string;
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: typeof CheckCircle2;
  pillClasses: string;
  badgeClasses: string;
  dotColor: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  published: {
    label: "Approved & Live",
    icon: CheckCircle2,
    pillClasses: "border-emerald-200 bg-emerald-50 text-emerald-800",
    badgeClasses: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dotColor: "bg-emerald-500",
  },
  approved: {
    label: "Approved",
    icon: Check,
    pillClasses: "border-emerald-200 bg-emerald-50 text-emerald-800",
    badgeClasses: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dotColor: "bg-emerald-500",
  },
  pending: {
    label: "Pending Review",
    icon: Clock3,
    pillClasses: "border-amber-200 bg-amber-50 text-amber-800",
    badgeClasses: "border-amber-200 bg-amber-50 text-amber-800",
    dotColor: "bg-amber-500",
  },
  rejected: {
    label: "Needs Revision",
    icon: XCircle,
    pillClasses: "border-rose-200 bg-rose-50 text-rose-800",
    badgeClasses: "border-rose-200 bg-rose-50 text-rose-800",
    dotColor: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    pillClasses: "border-slate-200 bg-slate-100 text-slate-700",
    badgeClasses: "border-slate-200 bg-slate-100 text-slate-700",
    dotColor: "bg-slate-400",
  },
  draft: {
    label: "Draft",
    icon: FileEdit,
    pillClasses: "border-indigo-200 bg-indigo-50 text-indigo-700",
    badgeClasses: "border-indigo-200 bg-indigo-50 text-indigo-700",
    dotColor: "bg-indigo-500",
  },
};

const DEFAULT_CONFIG: StatusConfig = {
  label: "Unknown",
  icon: Clock3,
  pillClasses: "border-slate-200 bg-slate-50 text-slate-700",
  badgeClasses: "border-slate-200 bg-slate-50 text-slate-700",
  dotColor: "bg-slate-400",
};

export function StatusBadge({
  status,
  variant = "pill",
  size = "sm",
  label,
  showIcon = true,
  className = "",
}: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase();
  const config = STATUS_CONFIGS[normalizedKey] || {
    ...DEFAULT_CONFIG,
    label: status,
  };

  const displayLabel = label ?? config.label;
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: {
      pill: "px-2 py-0.5 text-[10px] gap-1",
      badge: "px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider",
      dot: "text-[10px] gap-1.5",
      icon: "w-2.5 h-2.5",
      dotSize: "w-1.5 h-1.5",
    },
    sm: {
      pill: "px-2.5 py-0.5 text-[11px] font-medium gap-1.5",
      badge: "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
      dot: "text-[11px] font-medium gap-1.5",
      icon: "w-3 h-3",
      dotSize: "w-2 h-2",
    },
    md: {
      pill: "px-3 py-1 text-xs font-medium gap-2",
      badge: "px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
      dot: "text-xs font-medium gap-2",
      icon: "w-3.5 h-3.5",
      dotSize: "w-2.5 h-2.5",
    },
  }[size];

  if (variant === "dot") {
    return (
      <span className={`inline-flex items-center ${sizeClasses.dot} text-slate-700 ${className}`}>
        <span className={`rounded-full shrink-0 ${sizeClasses.dotSize} ${config.dotColor}`} />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center border rounded ${sizeClasses.badge} ${config.badgeClasses} ${className}`}
      >
        {displayLabel}
      </span>
    );
  }

  // Default "pill"
  return (
    <span
      className={`inline-flex items-center border rounded-full ${sizeClasses.pill} ${config.pillClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${sizeClasses.icon} shrink-0`} />}
      <span>{displayLabel}</span>
    </span>
  );
}
