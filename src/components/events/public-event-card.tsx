"use client";

import * as React from "react";
import Link from "next/link";
import { Event } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { MapPin, ExternalLink, Radio, ArrowUpRight, Ticket } from "lucide-react";
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
  const parsedStart = React.useMemo(() => {
    try {
      return parseISO(event.start_time);
    } catch {
      return new Date();
    }
  }, [event.start_time]);

  const parsedEnd = React.useMemo(() => {
    try {
      return parseISO(event.end_time);
    } catch {
      return new Date();
    }
  }, [event.end_time]);

  const startTimeFormatted = React.useMemo(() => {
    try {
      return format(parsedStart, "h:mm a");
    } catch {
      return event.start_time;
    }
  }, [parsedStart, event.start_time]);

  const endTimeFormatted = React.useMemo(() => {
    try {
      return format(parsedEnd, "h:mm a");
    } catch {
      return event.end_time;
    }
  }, [parsedEnd, event.end_time]);

  const dayNumber = React.useMemo(() => {
    try {
      return format(parsedStart, "d");
    } catch {
      return "";
    }
  }, [parsedStart]);

  const monthShort = React.useMemo(() => {
    try {
      return format(parsedStart, "MMM").toUpperCase();
    } catch {
      return "";
    }
  }, [parsedStart]);

  const dayOfWeek = React.useMemo(() => {
    try {
      return format(parsedStart, "EEE").toUpperCase();
    } catch {
      return "";
    }
  }, [parsedStart]);

  const durationLabel = React.useMemo(() => {
    try {
      const minutes = differenceInMinutes(parsedEnd, parsedStart);
      if (minutes <= 0) return null;
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } catch {
      return null;
    }
  }, [parsedStart, parsedEnd]);

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
        "group relative bg-white rounded-2xl border border-[#e8e5de] hover:border-[#12161f]/40 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#12161f] focus:ring-offset-2 flex flex-col md:flex-row items-stretch",
        className
      )}
      aria-label={`Event Pass: ${event.title} by ${event.community?.name || "Campus Community"}`}
    >
      {/* 1. Ticket Pass Stub: Date & Schedule Block */}
      <div className="md:w-36 shrink-0 bg-[#faf9f6] border-b md:border-b-0 md:border-r border-[#e8e5de] p-4 flex md:flex-col items-center justify-between md:justify-center text-center gap-1.5 transition-colors group-hover:bg-[#f4f2ec]">
        {/* Ticket Notch Cutout Indicator */}
        <div className="flex md:flex-col items-center gap-2 md:gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8c827a]">
            {monthShort}
          </span>
          <span className="text-2xl md:text-3xl font-black text-[#12161f] tracking-tight leading-none">
            {dayNumber}
          </span>
          <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase">
            {dayOfWeek}
          </span>
        </div>

        {/* Vertical Perforation divider on mobile */}
        <div className="h-6 w-px bg-[#e8e5de] md:hidden" />

        {/* Time Interval & Duration Badge */}
        <div className="flex flex-col items-end md:items-center text-right md:text-center">
          <span className="text-xs font-bold text-[#12161f] tracking-tight whitespace-nowrap">
            {startTimeFormatted}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] text-[#71717a] font-medium whitespace-nowrap">
              to {endTimeFormatted}
            </span>
            {durationLabel && (
              <span className="text-[9px] font-bold bg-[#e8e5de] text-[#52525b] px-1.5 py-0.2 rounded-sm ml-1 uppercase">
                {durationLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Pass Body: Content, Metadata, Host */}
      <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Metadata Ribbon: Category Stamp + Location */}
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} size="sm" />

            {event.is_virtual ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                <Radio className="h-3 w-3 animate-pulse text-purple-600" />
                Live Virtual Stream
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[#52525b] font-medium truncate max-w-[280px]">
                <MapPin className="h-3.5 w-3.5 text-[#a1a1aa] shrink-0" />
                <span className="truncate">{event.location_name}</span>
              </span>
            )}
          </div>

          {/* Event Title */}
          <h3 className="text-base sm:text-lg font-bold text-[#12161f] group-hover:text-blue-700 transition leading-snug">
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

          {/* Description Snippet */}
          {event.description && (
            <p className="text-xs text-[#52525b] line-clamp-1 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Footer of Card: Host Community + Action Button */}
        <div className="pt-2 border-t border-[#f4f2ec] flex items-center justify-between gap-3 text-xs">
          {/* Host Community Pill */}
          <div className="flex items-center gap-2 min-w-0">
            {event.community?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.community.logo_url}
                alt=""
                className="w-4 h-4 rounded-full object-cover border border-[#e8e5de] shrink-0"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-[#12161f] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                {(event.community?.name || "C").slice(0, 1)}
              </div>
            )}
            <span className="font-semibold text-[#3f3f46] truncate">
              {event.community?.name || "Campus Community"}
            </span>
          </div>

          {/* Action Callout */}
          <div className="flex items-center gap-2 shrink-0">
            {event.external_registration_url ? (
              <a
                href={event.external_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#12161f] text-white hover:bg-black transition shadow-xs"
                title="Register for this event"
              >
                <span>RSVP</span>
                <ExternalLink className="h-3 w-3 text-white/70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Ticket className="h-3 w-3 text-emerald-600" />
                Open Access
              </span>
            )}

            {/* Micro-Affordance arrow icon */}
            <div className="w-6 h-6 rounded-full bg-[#f4f2ec] group-hover:bg-[#12161f] group-hover:text-white transition flex items-center justify-center text-[#71717a]">
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
