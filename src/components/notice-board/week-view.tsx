"use client";

import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { MapPin } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CATEGORY_STYLES } from "@/components/events/category-badge";

interface WeekViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function WeekView({
  events,
  onSelectEvent,
  currentDate = new Date(),
  onDateChange,
}: WeekViewProps) {
  const activeDate = currentDate;

  const weekStart = startOfWeek(activeDate);
  const weekEnd = endOfWeek(activeDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => isSameDay(parseISO(ev.start_time), day));
  };

  return (
    <div className="w-full bg-white flex flex-col flex-1 select-none">
      {/* Week Timeline Columns matching Image 2 */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 bg-white flex-1 min-h-[640px]">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const currentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateChange?.(day)}
              className={`p-3 flex flex-col transition-colors ${
                currentDay ? "bg-indigo-50/20" : "bg-white"
              }`}
            >
              {/* Day Title Header */}
              <div className="text-center pb-3 mb-3 border-b border-slate-100">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-sm font-semibold mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-lg ${
                    currentDay
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-800"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Event Stack for Day */}
              <div className="space-y-2 flex-1">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-slate-300">
                    No events
                  </div>
                ) : (
                  dayEvents.map((ev) => {
                    const startStr = format(parseISO(ev.start_time), "h:mm a");
                    const catStyle = CATEGORY_STYLES[ev.category] || {
                      bg: "bg-indigo-50/80",
                      text: "text-indigo-700",
                      border: "border-indigo-100",
                      dot: "bg-indigo-500",
                    };

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`p-2.5 rounded-xl border ${catStyle.border} ${catStyle.bg} hover:shadow-xs transition-all cursor-pointer group`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-semibold ${catStyle.text} flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            {ev.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {startStr}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-1">
                          {ev.title}
                        </h4>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
