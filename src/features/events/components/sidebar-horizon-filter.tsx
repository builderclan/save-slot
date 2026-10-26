"use client";

import React from "react";
import { Tabs } from "@/components/ui/tabs";

export type TimeHorizon = "all" | "today" | "week" | "weekend";

export interface SidebarHorizonFilterProps {
  selectedHorizon: TimeHorizon;
  onChangeHorizon: (horizon: TimeHorizon) => void;
  className?: string;
}

const HORIZON_TABS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "7 Days" },
  { id: "weekend", label: "Weekend" },
];

export function SidebarHorizonFilter({
  selectedHorizon,
  onChangeHorizon,
  className = "",
}: SidebarHorizonFilterProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block px-0.5">
        Time Horizon
      </span>
      <div className="w-full">
        <Tabs
          items={HORIZON_TABS}
          activeId={selectedHorizon}
          onChange={(id) => onChangeHorizon(id as TimeHorizon)}
          size="sm"
          className="w-full justify-between"
        />
      </div>
    </div>
  );
}
