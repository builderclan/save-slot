"use client";

import * as React from "react";
import { Event } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export function WeekView({ events, onSelectEvent }: WeekViewProps) {
  const [currentWeekDate, setCurrentWeekDate] = React.useState<Date>(() => {
    const firstEvent = events[0];
    return firstEvent ? parseISO(firstEvent.start_time) : new Date();
  });

  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const nextWeek = () => setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  const prevWeek = () => setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  const goToToday = () => setCurrentWeekDate(new Date());

  const getEventsForDay = (day: Date) => {
    return events
      .filter((e) => {
        try {
          return isSameDay(parseISO(e.start_time), day);
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
      {/* Week Navigation Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#12161f] font-display">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2.5 py-1 font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 7-Day Columns (Scrollable on small mobile screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 min-h-[480px]">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2.5 sm:p-2 flex flex-col gap-2 min-h-[120px] transition",
                isCurrentDay && "bg-amber-50/30"
              )}
            >
              {/* Day Header */}
              <div
                className={cn(
                  "p-1.5 rounded-xl text-center transition",
                  isCurrentDay ? "bg-[#12161f] text-white shadow-xs" : "bg-stone-50 text-stone-700 border border-stone-200/50"
                )}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider font-mono">
                  {format(day, "EEE")}
                </div>
                <div className="text-sm font-bold font-mono">{format(day, "d")}</div>
              </div>

              {/* Day Events Column */}
              <div className="space-y-2 flex-1">
                {dayEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-6 text-center">
                    <span className="text-[11px] text-stone-300 italic">No events</span>
                  </div>
                ) : (
                  dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="p-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-400 transition cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <CategoryBadge category={evt.category} size="sm" />
                      </div>

                      <h5 className="text-xs font-bold text-[#12161f] group-hover:text-amber-800 line-clamp-2 leading-snug font-display">
                        {evt.title}
                      </h5>

                      <div className="mt-2 space-y-1 text-[10px] text-stone-500">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-stone-400 shrink-0" />
                          <span>{format(parseISO(evt.start_time), "h:mm a")}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="truncate">{evt.location_name}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
