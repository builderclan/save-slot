"use client";

import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { CampusEvent } from "@/types/database";

interface MonthViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
}

export function MonthView({ events, onSelectEvent }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => isSameDay(parseISO(ev.start_time), day));
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Calendar Header */}
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <p className="text-xs text-zinc-400">
              {events.length} campus event{events.length === 1 ? "" : "s"} scheduled
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 border-b border-zinc-800/80 text-center py-2.5 bg-zinc-950/40 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/50 bg-[#090a0f]/40">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[110px] sm:min-h-[130px] p-2 flex flex-col justify-between transition-colors ${
                !isCurrentMonth ? "bg-zinc-950/40 opacity-40" : "hover:bg-zinc-900/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                      : isCurrentMonth
                      ? "text-zinc-300"
                      : "text-zinc-600"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills inside Day Cell */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate block transition-all bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer"
                  >
                    <span className="font-semibold text-[10px] opacity-75 mr-1">
                      {format(parseISO(ev.start_time), "h:mm")}
                    </span>
                    {ev.title}
                  </button>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-zinc-500 pl-1 font-medium">
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
