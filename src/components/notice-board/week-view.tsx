"use client";

import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { MapPin, Clock, Calendar as CalendarIcon } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CATEGORY_STYLES, CategoryBadge } from "@/components/events/category-badge";

interface WeekViewProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

function toDate(val: string | Date): Date {
  return typeof val === "string" ? parseISO(val) : new Date(val);
}

export function WeekView({
  events,
  onSelectEvent,
  currentDate = new Date(),
  onDateChange,
}: WeekViewProps) {
  const activeDate = currentDate;
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(activeDate);

  const weekStart = startOfWeek(activeDate);
  const weekEnd = endOfWeek(activeDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CampusEvent[]>();
    for (const ev of events) {
      if (!ev.start_time) continue;
      const key = format(toDate(ev.start_time), "yyyy-MM-dd");
      const list = map.get(key);
      if (list) {
        list.push(ev);
      } else {

        map.set(key, [ev]);
      }
    }
    return map;
  }, [events]);

  const getEventsForDay = useCallback(
    (day: Date) => {
      const key = format(day, "yyyy-MM-dd");
      return eventsByDay.get(key) || [];
    },
    [eventsByDay]
  );

  const handleSelectDay = (day: Date) => {
    setSelectedMobileDay(day);
    onDateChange?.(day);
  };

  // Events for active mobile day
  const mobileDayEvents = getEventsForDay(selectedMobileDay);

  return (
    <div className="w-full h-full bg-white flex flex-col flex-1 select-none min-h-0 overflow-hidden">
      {/* ============================================================== */}
      {/* MOBILE-ONLY VIEW (< md): Interactive Day Picker + Daily Stream */}
      {/* ============================================================== */}
      <div className="md:hidden flex flex-col flex-1 bg-white">
        {/* Horizontal Week Day Selector Pill Bar */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200">
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedMobileDay);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isCurrentDay
                      ? "bg-indigo-50 border border-indigo-200/80 text-indigo-700"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isSelected ? "text-indigo-100" : isCurrentDay ? "text-indigo-600" : "text-slate-400"
                    }`}
                  >
                    {format(day, "EEE")}
                  </span>
                  <span className="text-xs font-bold my-0.5">
                    {format(day, "d")}
                  </span>
                  {/* Event indicators */}
                  <div className="h-1.5 flex items-center justify-center gap-0.5">
                    {dayEvents.length > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-indigo-500"
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">
              {format(selectedMobileDay, "EEEE, MMMM d, yyyy")}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {mobileDayEvents.length} {mobileDayEvents.length === 1 ? "event" : "events"}
          </span>
        </div>

        {/* Selected Day Event List */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {mobileDayEvents.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium">No events on this day</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select another day above to see scheduled activities.
              </p>
            </div>
          ) : (
            mobileDayEvents.map((ev) => {
              const startStr = format(toDate(ev.start_time), "h:mm a");
              const endStr = format(toDate(ev.end_time), "h:mm a");
              const catStyle = CATEGORY_STYLES[ev.category] || {
                bg: "bg-indigo-50/80",
                text: "text-indigo-700",
                border: "border-indigo-100",
                dot: "bg-indigo-500",
              };

              return (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={`p-3.5 rounded-2xl border ${catStyle.border} bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CategoryBadge category={ev.category} size="sm" />
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {startStr} – {endStr}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mb-1.5">
                    {ev.title}
                  </h4>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700 font-medium truncate">{ev.community?.name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP & TABLET VIEW (>= md): Pinned Headers + Timeline Grid */}
      {/* ============================================================== */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 overflow-hidden bg-white">
        {/* Pinned 7-Day Header */}
        <div className="grid grid-cols-7 divide-x divide-slate-200/80 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-2xs">
          {days.map((day) => {
            const currentDay = isToday(day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => onDateChange?.(day)}
                className={`py-2 px-2 text-center transition-colors cursor-pointer ${
                  currentDay ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50/70"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-xs font-bold mx-auto mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg ${
                    currentDay
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-800"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable 7-Day Events Grid */}
        <div className="grid grid-cols-7 divide-x divide-slate-200/80 bg-white flex-1 min-h-0 overflow-y-auto">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const currentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`p-2.5 space-y-2 min-h-full transition-colors ${
                  currentDay ? "bg-indigo-50/15" : "bg-white"
                }`}
              >
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-slate-300 select-none">
                    No events
                  </div>
                ) : (
                  dayEvents.map((ev) => {
                    const startStr = format(toDate(ev.start_time), "h:mm a");
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
                        className={`p-2.5 rounded-xl border ${catStyle.border} ${catStyle.bg} hover:shadow-xs transition-colors cursor-pointer group`}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
