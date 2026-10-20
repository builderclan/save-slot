import { type ComponentType, type ReactNode } from "react";
import { FolderOpen } from "lucide-react";

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }> | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "dashed" | "card" | "plain";
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  variant = "dashed",
  className = "",
}: EmptyStateProps) {
  const containerClasses = {
    dashed: "rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center",
    card: "rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-2xs",
    plain: "p-6 sm:p-8 text-center",
  }[variant];

  // Helper to render icon whether it's a component or a React element
  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === "function") {
      const IconComp = Icon;
      return <IconComp className="w-9 h-9 text-slate-300 mx-auto mb-3" />;
    }
    return <div className="mx-auto mb-3 text-slate-300">{Icon}</div>;
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      {renderIcon()}
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
