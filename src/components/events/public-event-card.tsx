"use client";

import * as React from "react";
import Link from "next/link";
import { Event } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { format, parseISO } from "date-fns";
import { MapPin, ExternalLink, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicEventCardProps {
  event: Event;
  onSelect?: (event: Event) => void;
  className?: string;
  showDate?: boolean;
}

export function PublicEventCard({
  event,
  onSelect,
  className,
  showDate = false,
}: PublicEventCardProps) {
  const startTimeFormatted = React.useMemo(() => {
    try {
      return format(parseISO(event.start_time), "h:mm a");
    } catch {
      return event.start_time;
    }
  }, [event.start_time]);

  const endTimeFormatted = React.useMemo(() => {
    try {
      return format(parseISO(event.end_time), "h:mm a");
    } catch {
      return event.end_time;
    }
  }, [event.end_time]);

  const dateFormatted = React.useMemo(() => {
    try {
      return format(parseISO(event.start_time), "EEE, MMM d");
    } catch {
      return "";
    }
  }, [event.start_time]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid triggering when user clicks on an external registration link or tag
    if ((e.target as HTMLElement).closest("a[target='_blank']")) {
      return;
    }
    if (onSelect) {
      onSelect(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      if ((e.target as HTMLElement).tagName !== "A") {
        e.preventDefault();
        if (onSelect) onSelect(event);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-xs p-4 sm:p-5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1",
        className
      )}
      aria-label={`Event: ${event.title} by ${event.community?.name || "Campus Organization"}`}
    >
      {/* Left Column: Time & Details */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Time Pillar */}
        <div className="shrink-0 w-24 text-left sm:text-right pt-0.5">
          {showDate && (
            <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-tight">
              {dateFormatted}
            </div>
          )}
          <div className="text-sm font-bold text-slate-900 leading-tight">
            {startTimeFormatted}
          </div>
          <div className="text-xs text-slate-400 font-medium leading-tight mt-0.5">
            {endTimeFormatted}
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden sm:block w-px self-stretch bg-slate-100 group-hover:bg-slate-200 transition" />

        {/* Event Content */}
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Metadata Row: Category + Virtual/Location Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} size="sm" />

            {event.is_virtual ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                <Radio className="h-3 w-3" />
                Virtual
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{event.location_name}</span>
              </span>
            )}
          </div>

          {/* Event Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
            <Link
              href={`/events/${event.slug}`}
              onClick={(e) => {
                if (onSelect) {
                  e.preventDefault();
                  onSelect(event);
                }
              }}
              className="focus:outline-none"
            >
              {event.title}
            </Link>
          </h3>

          {/* Host Community & Description Snippet */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {event.community?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.community.logo_url}
                alt=""
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
            )}
            <span className="font-medium text-slate-700 truncate">
              {event.community?.name || "Campus Community"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Registration CTA & Action */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        {/* Registration State */}
        {event.external_registration_url ? (
          <a
            href={event.external_registration_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition border border-slate-200/80 active:scale-98"
            title="Register for this event (opens external site)"
          >
            Register
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </a>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
            Open Event
          </span>
        )}

        {/* View Details Text Link */}
        <Link
          href={`/events/${event.slug}`}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect(event);
            }
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 sm:hidden"
        >
          Details &rarr;
        </Link>
      </div>
    </div>
  );
}
