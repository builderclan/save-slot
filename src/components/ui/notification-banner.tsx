"use client";

import { type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationBannerProps {
  message: ReactNode;
  type?: NotificationType;
  variant?: "toast" | "inline";
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    toastBg: "bg-slate-900 text-white border-slate-800",
    inlineBg: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
    role: "status",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-rose-500",
    toastBg: "bg-rose-950 text-white border-rose-800",
    inlineBg: "bg-rose-50/80 border-rose-200 text-rose-950",
    role: "alert",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    toastBg: "bg-slate-900 text-white border-amber-900/50",
    inlineBg: "bg-amber-50/80 border-amber-200 text-amber-950",
    role: "alert",
  },
  info: {
    icon: Info,
    iconColor: "text-indigo-400",
    toastBg: "bg-slate-900 text-white border-slate-800",
    inlineBg: "bg-indigo-50/80 border-indigo-200 text-indigo-950",
    role: "status",
  },
} as const;

export function NotificationBanner({
  message,
  type = "info",
  variant = "toast",
  onClose,
  action,
  className = "",
}: NotificationBannerProps) {
  const config = TYPE_CONFIG[type];
  const IconComponent = config.icon;

  if (variant === "inline") {
    return (
      <div
        role={config.role}
        className={`w-full p-3.5 sm:p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs ${config.inlineBg} ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <IconComponent className={`w-4 h-4 shrink-0 ${config.iconColor}`} />
          <div className="leading-relaxed font-medium">{message}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
            >
              {action.label}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Floating Toast variant
  return (
    <div
      role={config.role}
      className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-150 ${config.toastBg} ${className}`}
    >
      <IconComponent className={`w-4 h-4 shrink-0 ${config.iconColor}`} />
      <span className="text-xs font-medium leading-relaxed">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer ml-1"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer ml-2"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
