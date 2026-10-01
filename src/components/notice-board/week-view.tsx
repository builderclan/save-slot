"use client";

import { useState } from "react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface WeekViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
}

export function WeekView({ events, onSelectEvent }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => isSameDay(parseISO(ev.start_time), day));
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </h2>
            <p className="text-xs text-zinc-400">Weekly campus schedule timeline</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Timeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const currentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`p-3 sm:p-4 min-h-[300px] flex flex-col ${
                currentDay ? "bg-indigo-500/5" : ""
              }`}
            >
              {/* Day Title Header */}
              <div className="text-center pb-3 mb-3 border-b border-zinc-800/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-extrabold mx-auto mt-0.5 w-8 h-8 flex items-center justify-center rounded-full ${
                    currentDay
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-zinc-200"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Event Stack for Day */}
              <div className="space-y-2.5 flex-1">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-zinc-600 italic">
                    No events
                  </div>
                ) : (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 hover:border-indigo-500/40 transition-all cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <CategoryBadge category={ev.category} size="sm" />
                        <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                          {format(parseISO(ev.start_time), "h:mm a")}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug mb-1">
                        {ev.title}
                      </h4>

                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
                        <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{ev.venue?.name || ev.location_name}</span>
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
