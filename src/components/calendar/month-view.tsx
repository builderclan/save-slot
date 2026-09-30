"use client";

import * as React from "react";
import { Event } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export function MonthView({ events, onSelectEvent }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    // Default to September 2026 or current active event date
    const firstEvent = events[0];
    return firstEvent ? parseISO(firstEvent.start_time) : new Date();
  });

  const [selectedDayEvents, setSelectedDayEvents] = React.useState<{
    day: Date;
    events: Event[];
  } | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Helper to get events for a given day
  const getEventsForDay = (day: Date) => {
    return events.filter((e) => {
      try {
        return isSameDay(parseISO(e.start_time), day);
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Month Navigation Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2.5 py-1 font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-xs font-semibold text-slate-500 py-2.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-100 min-h-[520px]">
        {calendarDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                if (dayEvents.length > 0) {
                  setSelectedDayEvents({ day, events: dayEvents });
                }
              }}
              className={cn(
                "p-1.5 sm:p-2 flex flex-col justify-between min-h-[95px] sm:min-h-[110px] transition group hover:bg-slate-50/80 cursor-pointer",
                !isCurrMonth && "bg-slate-50/40 text-slate-300",
                isCurrentDay && "bg-blue-50/30"
              )}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                    isCurrentDay
                      ? "bg-slate-900 text-white font-bold"
                      : isCurrMonth
                      ? "text-slate-800"
                      : "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium sm:hidden">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills (visible on medium & desktop screens) */}
              <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((evt) => (
                  <div
                    key={evt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt);
                    }}
                    className="truncate text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-800 transition"
                    title={`${evt.title} (${format(parseISO(evt.start_time), "h:mm a")})`}
                  >
                    <span className="text-[10px] font-semibold text-slate-500 mr-1">
                      {format(parseISO(evt.start_time), "h:mm")}
                    </span>
                    {evt.title}
                  </div>
                ))}

                {dayEvents.length > 2 && (
                  <div className="text-[10px] font-medium text-blue-600 hover:underline px-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Drawer / Mini-Modal */}
      {selectedDayEvents && (
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
              Events on {format(selectedDayEvents.day, "EEEE, MMMM d, yyyy")}
            </h4>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedDayEvents.events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryBadge category={evt.category} size="sm" />
                    <span className="text-[11px] text-slate-500 font-medium">
                      {format(parseISO(evt.start_time), "h:mm a")} - {format(parseISO(evt.end_time), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {evt.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {evt.location_name}
                  </p>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:underline shrink-0">
                  Details →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
