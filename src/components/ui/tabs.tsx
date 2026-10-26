import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({
  items,
  activeId,
  onChange,
  className = "",
  size = "md",
}: TabsProps) {
  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs"
      : "px-3 py-1.5 text-xs font-medium";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();

    const tabElements = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    );
    const focusedIndex = tabElements.findIndex((el) => el === document.activeElement);
    const startingIndex =
      focusedIndex !== -1 ? focusedIndex : items.findIndex((t) => t.id === activeId);

    if (startingIndex === -1) return;

    const nextIndex =
      e.key === "ArrowRight"
        ? (startingIndex + 1) % items.length
        : (startingIndex - 1 + items.length) % items.length;

    const nextTab = items[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      tabElements[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80 gap-1 ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg select-none transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 ${sizeClasses} ${
              isActive
                ? "bg-white text-zinc-900 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-200/70 text-zinc-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
