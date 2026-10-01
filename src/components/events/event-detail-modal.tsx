"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format, parseISO, differenceInMinutes } from "date-fns";
import {
  X,
  MapPin,
  Clock,
  ExternalLink,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  Share2,
  Check,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-export";

interface EventDetailModalProps {
  event: CampusEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);
  const googleCalUrl = getGoogleCalendarUrl(event);

  const durationMinutes = differenceInMinutes(endDate, startDate);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationLabel =
    hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/?event=${event.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        className="relative w-full max-w-2xl rounded-2xl border border-stone-200/90 bg-white text-stone-900 shadow-2xl shadow-stone-900/15 overflow-hidden z-10 my-6 flex flex-col max-h-[92vh]"
      >
        {/* Editorial Top Navigation Bar */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
              <span className="truncate">{event.community?.name || "Campus Community"}</span>
            </span>
            <span className="text-stone-300">•</span>
            <CategoryBadge category={event.category} size="sm" />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Copy event link"
              aria-label="Copy event link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Framed Cover Media */}
          {event.cover_image_url && (
            <div className="p-5 pb-0">
              <div className="relative h-48 sm:h-56 w-full rounded-xl overflow-hidden border border-stone-200/80 bg-stone-100 shadow-inner">
                <Image
                  src={event.cover_image_url}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent pointer-events-none" />

                {/* Safe-Slot Conflict-Free Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-stone-900 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-stone-200/90 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                  <span>Safe-Slot Conflict-Free</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Info */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Title & Safe Slot badge if no cover */}
            <div>
              {!event.cover_image_url && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Safe-Slot Conflict-Free</span>
                </div>
              )}
              <h2
                id="event-title"
                className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 leading-snug"
              >
                {event.title}
              </h2>
            </div>

            {/* Logistics Grid (Editorial & Tactile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-stone-200/90 bg-stone-50/60 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/70">
              {/* Left Column: Date & Time */}
              <div className="flex items-start gap-3.5">
                {/* Physical paper tear-off badge */}
                <div className="flex flex-col items-center justify-center w-11 rounded-lg bg-white border border-stone-200 text-center shadow-xs overflow-hidden shrink-0 mt-0.5">
                  <span className="w-full text-[9px] font-bold uppercase tracking-wider bg-stone-900 text-amber-50 py-0.5 px-1 font-mono">
                    {format(startDate, "MMM")}
                  </span>
                  <span className="text-base font-bold leading-tight text-stone-900 font-serif py-1">
                    {format(startDate, "d")}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-900">
                    {format(startDate, "EEEE, MMMM d, yyyy")}
                  </div>
                  <div className="text-xs text-stone-600 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>
                      {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-500 font-mono text-[11px]">{durationLabel}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Venue & Space */}
              <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:pl-4">
                <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-500 shadow-xs shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-stone-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-900 flex items-center gap-1.5 flex-wrap">
                    <span>{event.venue?.name || event.location_name}</span>
                    {event.venue?.capacity && (
                      <span className="text-[11px] font-normal text-stone-500 bg-white border border-stone-200/90 px-1.5 py-0.5 rounded-md">
                        {event.venue.capacity} cap
                      </span>
                    )}
                  </div>
                  {event.venue?.address && (
                    <div className="text-xs text-stone-600 mt-0.5">{event.venue.address}</div>
                  )}
                  {event.venue?.notes && (
                    <div className="text-[11px] text-stone-500 mt-1 font-mono leading-normal">
                      {event.venue.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overview / Description */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-400 mb-2">
                Overview
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line font-normal">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-stone-200/80 bg-stone-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Calendar export links */}
          <div className="flex items-center gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
              <span>Google Calendar</span>
            </a>

            <button
              type="button"
              onClick={() => downloadIcsFile(event)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>iCal / Apple</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {event.external_registration_url ? (
            <a
              href={event.external_registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Register & RSVP</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
