import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-900 text-white border border-zinc-950/80 hover:bg-zinc-800 shadow-2xs hover:shadow-xs focus-visible:ring-zinc-900/20",
  secondary:
    "bg-white text-zinc-800 border border-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs focus-visible:ring-zinc-400/30",
  ghost:
    "bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 border border-transparent focus-visible:ring-zinc-400/20",
  danger:
    "bg-rose-600 text-white border border-rose-700 hover:bg-rose-700 shadow-2xs hover:shadow-xs focus-visible:ring-rose-500/20",
  outline:
    "bg-transparent text-zinc-700 border border-zinc-300/90 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-zinc-400/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[44px] sm:min-h-0 h-auto sm:h-8 px-2.5 py-2 sm:py-0 text-xs rounded-lg gap-1.5",
  md: "min-h-[44px] sm:min-h-0 h-auto sm:h-9 px-3.5 py-2 sm:py-0 text-sm rounded-lg gap-2",
  lg: "min-h-[44px] sm:min-h-0 h-auto sm:h-10 px-4 py-2 sm:py-0 text-sm font-medium rounded-xl gap-2",
  "icon-sm": "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-8 sm:w-8 p-0 rounded-lg justify-center",
  "icon-md": "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-lg justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const isIconOnly = size === "icon-sm" || size === "icon-md";

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium select-none cursor-pointer transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          {!isIconOnly && children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
