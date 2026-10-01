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
import { X, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CATEGORY_STYLES, CategoryBadge } from "@/components/events/category-badge";

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
  const [popoverDay, setPopoverDay] = useState<Date | null>(null);
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

  const popoverEvents = popoverDay ? getEventsForDay(popoverDay) : [];
  const selectedDayEvents = getEventsForDay(activeDate);

  return (
    <div className="w-full bg-white flex flex-col flex-1 select-none">
      {/* Weekday Names Header matching Image 1 */}
      <div className="grid grid-cols-7 border-b border-slate-200 divide-x divide-slate-200/80 text-center py-2.5 bg-white text-xs font-semibold text-slate-500">
        <div><span className="sm:hidden">Sun</span><span className="hidden sm:inline">Sunday</span></div>
        <div><span className="sm:hidden">Mon</span><span className="hidden sm:inline">Monday</span></div>
        <div><span className="sm:hidden">Tue</span><span className="hidden sm:inline">Tuesday</span></div>
        <div><span className="sm:hidden">Wed</span><span className="hidden sm:inline">Wednesday</span></div>
        <div><span className="sm:hidden">Thu</span><span className="hidden sm:inline">Thursday</span></div>
        <div><span className="sm:hidden">Fri</span><span className="hidden sm:inline">Friday</span></div>
        <div><span className="sm:hidden">Sat</span><span className="hidden sm:inline">Saturday</span></div>
      </div>

      {/* Days Grid with crisp thin lines matching Image 1 */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80 bg-white">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, activeDate);
          const isSelected = isSameDay(day, activeDate);
          const isCurrentDay = isToday(day);
          const isDay1 = format(day, "d") === "1";

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => handleDateChange(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDateChange(day);
                }
              }}
              className={`min-h-[58px] sm:min-h-[110px] lg:min-h-[125px] p-1 sm:p-2 flex flex-col transition-colors cursor-pointer group focus:outline-none focus:bg-indigo-50/30 ${
                !isCurrentMonth ? "bg-slate-50/40 text-slate-400" : "hover:bg-slate-50/70"
              }`}
            >
              {/* Day header inside cell centered matching Image 1 */}
              <div className="text-center mb-1 sm:mb-1.5 flex items-center justify-center">
                {isSelected ? (
                  <span className="h-6 sm:h-7 px-1.5 sm:px-2 min-w-6 sm:min-w-7 rounded-lg bg-indigo-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs">
                    {isDay1 ? format(day, "MMM d") : format(day, "d")}
                  </span>
                ) : isCurrentDay ? (
                  <span className="h-6 sm:h-7 px-1.5 sm:px-2 min-w-6 sm:min-w-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] sm:text-xs flex items-center justify-center border border-indigo-200/90">
                    {isDay1 ? format(day, "MMM d") : format(day, "d")}
                  </span>
                ) : (
                  <span
                    className={`text-[11px] sm:text-xs font-semibold px-1 sm:px-2 py-0.5 rounded-md ${
                      isCurrentMonth
                        ? "text-slate-800 group-hover:text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    {isDay1 ? format(day, "MMM d") : format(day, "d")}
                  </span>
                )}
              </div>

              {/* Event Chips inside Day Cell */}
              <div className="flex-1 overflow-hidden mt-0.5">
                {/* Desktop (lg+): Full readable chips with time & title */}
                <div className="hidden lg:block space-y-1">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const startTime = format(parseISO(ev.start_time), "h:mm a");
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverDay(day);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/80 px-1.5 py-0.5 rounded-md font-semibold text-left transition-colors cursor-pointer block w-full truncate"
                    >
                      +{dayEvents.length - 3} more
                    </button>
                  )}
                </div>

                {/* Tablet (sm to lg): Compact pills maximizing title visibility */}
                <div className="hidden sm:block lg:hidden space-y-1">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const catStyle = CATEGORY_STYLES[ev.category] || {
                      bg: "bg-indigo-50/80",
                      text: "text-indigo-700",
                      border: "border-indigo-100",
                      dot: "bg-indigo-500",
                    };

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block transition-all ${catStyle.bg} ${catStyle.text} border ${catStyle.border} hover:opacity-90 cursor-pointer`}
                        title={`${ev.title} (${ev.venue?.name || ev.location_name})`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${catStyle.dot} mr-1`} />
                        <span>{ev.title}</span>
                      </button>
                    );
                  })}

                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-indigo-600 font-bold block text-center truncate">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>

                {/* Mobile (< sm): Category Dot Indicators */}
                <div className="sm:hidden flex items-center justify-center gap-1 mt-0.5 flex-wrap px-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const catStyle = CATEGORY_STYLES[ev.category];
                    const dotBg = catStyle?.dot || "bg-indigo-500";
                    return (
                      <span
                        key={ev.id}
                        className={`w-1.5 h-1.5 rounded-full ${dotBg}`}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-slate-500 leading-none">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Agenda (Visible on Mobile & Tablet: lg:hidden) */}
      <div className="lg:hidden border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              {format(activeDate, "EEEE, MMM d, yyyy")}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "event" : "events"}
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-400">
            <p className="text-xs font-medium">No events scheduled on this day</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tap another date with colored dots above</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayEvents.map((ev) => {
              const startTime = format(parseISO(ev.start_time), "h:mm a");
              const endTime = format(parseISO(ev.end_time), "h:mm a");

              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEvent(ev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEvent(ev);
                    }
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <CategoryBadge category={ev.category} size="sm" />
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {startTime} – {endTime}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    {ev.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium truncate">{ev.community?.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popover for Day Overflow (+N more) */}
      {popoverDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {format(popoverDay, "EEEE, MMMM d, yyyy")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPopoverDay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {popoverEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setPopoverDay(null);
                    onSelectEvent(ev);
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <CategoryBadge category={ev.category} size="sm" />
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {format(parseISO(ev.start_time), "h:mm a")}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {ev.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium truncate">{ev.community?.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 text-right">
              <button
                type="button"
                onClick={() => setPopoverDay(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
