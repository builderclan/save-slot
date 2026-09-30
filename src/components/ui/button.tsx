import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none rounded-lg cursor-pointer";

    const variants = {
      primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.99]",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.99]",
      outline: "border border-slate-200 bg-transparent text-slate-800 hover:bg-slate-50 active:scale-[0.99]",
      ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.99]",
      subtle: "bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-slate-100",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 h-8 gap-1.5",
      md: "text-sm px-3.5 py-2 h-9 gap-2",
      lg: "text-base px-4 py-2.5 h-11 gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
