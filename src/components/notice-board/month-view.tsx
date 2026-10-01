"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { CampusEvent } from "@/types/database";
import { CATEGORY_STYLES } from "@/components/events/category-badge";

interface MonthViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function MonthView({
  events,
  onSelectEvent,
  currentDate = new Date(),
  onDateChange,
}: MonthViewProps) {
  const [internalDate, setInternalDate] = useState<Date>(currentDate);
  const activeDate = currentDate || internalDate;

  const handleDateChange = (newDate: Date) => {
    setInternalDate(newDate);
    onDateChange?.(newDate);
  };

  const monthStart = startOfMonth(activeDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => isSameDay(parseISO(ev.start_time), day));
  };

  return (
    <div className="w-full bg-white flex flex-col flex-1 select-none">
      {/* Weekday Names Header matching Image 1 */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center py-3 bg-white text-xs font-semibold text-slate-500">
        <div>Sunday</div>
        <div>Monday</div>
        <div>Tuesday</div>
        <div>Wednesday</div>
        <div>Thursday</div>
        <div>Friday</div>
        <div>Saturday</div>
      </div>

      {/* Days Grid with crisp thin lines matching Image 1 */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white flex-1 min-h-[640px]">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, activeDate);
          const isCurrentDay = isToday(day);
          const isDay1 = format(day, "d") === "1";

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDateChange(day)}
              className={`min-h-[110px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                !isCurrentMonth ? "bg-slate-50/40 text-slate-300" : "hover:bg-slate-50/70"
              }`}
            >
              {/* Day header inside cell */}
              <div className="flex items-center justify-between mb-1">
                {isCurrentDay ? (
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {format(day, "d")}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                      isCurrentMonth
                        ? "text-slate-700 group-hover:text-indigo-600"
                        : "text-slate-300"
                    }`}
                  >
                    {isDay1 ? format(day, "MMM 1") : format(day, "d")}
                  </span>
                )}

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Chips inside Day Cell matching Image 1 pastel badges */}
              <div className="flex-1 space-y-1 overflow-hidden mt-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const startTime = format(parseISO(ev.start_time), "H:mm");
                  const catStyle = CATEGORY_STYLES[ev.category] || {
                    bg: "bg-indigo-50/80",
                    text: "text-indigo-700",
                    border: "border-indigo-100",
                  };

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate block transition-all ${catStyle.bg} ${catStyle.text} border ${catStyle.border} hover:opacity-90 hover:shadow-2xs cursor-pointer`}
                      title={`${startTime} ${ev.title} (${ev.venue?.name || ev.location_name})`}
                    >
                      <span className="font-semibold text-[10px] opacity-80 mr-1">
                        {startTime}
                      </span>
                      <span>{ev.title}</span>
                    </button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-slate-500 pl-1 font-medium">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
