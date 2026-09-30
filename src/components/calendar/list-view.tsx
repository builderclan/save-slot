"use client";

import * as React from "react";
import { Event } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatEventDate } from "@/lib/utils";
import { parseISO, format } from "date-fns";
import { MapPin, ExternalLink, Calendar, Radio } from "lucide-react";

interface ListViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export function ListView({ events, onSelectEvent }: ListViewProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-3">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-stone-800 font-display">No events found</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
          No campus events match your selected filters. Try choosing a different category or clearing search terms.
        </p>
      </div>
    );
  }

  // Group events by Day (YYYY-MM-DD)
  const groupedEvents = events.reduce((groups, event) => {
    try {
      const dateKey = format(parseISO(event.start_time), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    } catch {
      // Fallback
      if (!groups["Other"]) groups["Other"] = [];
      groups["Other"].push(event);
    }
    return groups;
  }, {} as Record<string, Event[]>);

  const sortedDateKeys = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {sortedDateKeys.map((dateKey) => {
        const dayEvents = groupedEvents[dateKey];
        const sampleEvent = dayEvents[0];
        const dateHeader = sampleEvent ? formatEventDate(sampleEvent.start_time) : dateKey;

        return (
          <div key={dateKey} className="space-y-2.5">
            {/* Date Group Heading */}
            <div className="sticky top-16 z-10 bg-stone-50/95 backdrop-blur-xs py-1.5 px-1 flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-stone-700 font-display">
                {dateHeader}
              </span>
              <div className="h-px bg-stone-200 flex-1" />
              <span className="text-[11px] text-stone-400 font-mono font-medium">
                {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Event Cards Stream */}
            <div className="grid grid-cols-1 gap-2.5">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="group relative bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-400 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Time and Main Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Time Pill */}
                    <div className="w-20 shrink-0 text-left sm:text-right pt-0.5">
                      <div className="text-xs font-bold text-[#12161f] leading-tight font-mono">
                        {format(parseISO(event.start_time), "h:mm a")}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {format(parseISO(event.end_time), "h:mm a")}
                      </div>
                    </div>

                    {/* Divider Bar */}
                    <div className="hidden sm:block w-0.5 self-stretch bg-stone-100 group-hover:bg-stone-300 transition" />

                    {/* Information */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={event.category} size="sm" />
                        {event.is_virtual ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                            <Radio className="h-3 w-3" /> Virtual
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium truncate max-w-xs">
                            <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                            {event.location_name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-[#12161f] group-hover:text-amber-800 transition truncate font-display">
                        {event.title}
                      </h4>

                      <p className="text-xs text-stone-500 line-clamp-1">
                        {event.description}
                      </p>

                      {/* Community Lead */}
                      {event.community && (
                        <div className="text-[11px] text-stone-400 flex items-center gap-1">
                          <span>by</span>
                          <span className="font-medium text-stone-600">
                            {event.community.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Direct Registration CTA */}
                  <div
                    className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.external_registration_url ? (
                      <a
                        href={event.external_registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#12161f] text-white hover:bg-stone-800 transition shadow-2xs active:scale-[0.98]"
                      >
                        Register
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        Open Event
                      </span>
                    )}
                    <button
                      onClick={() => onSelectEvent(event)}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline sm:no-underline sm:hover:underline cursor-pointer"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
