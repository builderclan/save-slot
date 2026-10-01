"use client";

import { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
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
  const [displayMonth, setDisplayMonth] = useState<Date>(currentDate);

  useEffect(() => {
    setDisplayMonth(currentDate);
  }, [currentDate]);

  const prevMonth = () => setDisplayMonth(subMonths(displayMonth, 1));
  const nextMonth = () => setDisplayMonth(addMonths(displayMonth, 1));

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full">
      {/* Month header & navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-slate-800">
          {format(displayMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week day initials */}
      <div className="grid grid-cols-7 text-center mb-1">
        {weekDays.map((d) => (
          <span key={d} className="text-[10px] font-medium text-slate-400 py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`h-7 w-7 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : isDayToday
                  ? "bg-indigo-50 text-indigo-600 font-semibold"
                  : isCurrentMonth
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-50"
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
