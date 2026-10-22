"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

export type ViewMode = "month" | "week" | "cards";

interface CalendarContextType {
  activeDate: Date;
  setActiveDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search: string;
  setSearch: (query: string) => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleToday: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [activeDate, setActiveDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handlePrev = useCallback(() => {
    setActiveDate((prev) => (viewMode === "week" ? subWeeks(prev, 1) : subMonths(prev, 1)));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setActiveDate((prev) => (viewMode === "week" ? addWeeks(prev, 1) : addMonths(prev, 1)));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setActiveDate(new Date());
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      activeDate,
      setActiveDate,
      viewMode,
      setViewMode,
      search,
      setSearch,
      handlePrev,
      handleNext,
      handleToday,
      isSidebarOpen,
      setIsSidebarOpen,
      toggleSidebar,
    }),
    [activeDate, viewMode, search, handlePrev, handleNext, handleToday, isSidebarOpen, toggleSidebar]
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  return context;
}
