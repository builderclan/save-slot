"use client";

import { useState, useMemo } from "react";
import {
  format,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
}

export function MiniCalendar({ currentDate, onSelectDate }: MiniCalendarProps) {
  const [prevDate, setPrevDate] = useState(currentDate);
  const [monthOffset, setMonthOffset] = useState(0);

  // Reset navigation offset when currentDate changes externally
  if (currentDate.getTime() !== prevDate.getTime()) {
    setPrevDate(currentDate);
    setMonthOffset(0);
  }

  const displayMonth = useMemo(
    () => addMonths(startOfMonth(currentDate), monthOffset),
    [currentDate, monthOffset]
  );

  const prevMonth = () => setMonthOffset((prev) => prev - 1);
  const nextMonth = () => setMonthOffset((prev) => prev + 1);

  const handleSelectDate = (day: Date) => {
    onSelectDate(day);
    setMonthOffset(0);
  };

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full select-none">
      {/* Month header & navigation */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">
          {format(displayMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Week day initials */}
      <div className="grid grid-cols-7 text-center mb-1">
        {weekDays.map((d) => (
          <span key={d} className="text-[10px] font-medium text-zinc-400 py-0.5">
            {d.charAt(0)}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDate(day)}
              className={`h-6.5 w-6.5 mx-auto rounded-md text-xs font-medium tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : isDayToday
                  ? "ring-1 ring-zinc-900/30 font-semibold text-zinc-900 bg-zinc-50 hover:bg-zinc-100"
                  : isCurrentMonth
                  ? "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  : "text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
