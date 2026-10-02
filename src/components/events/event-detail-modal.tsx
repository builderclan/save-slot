"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format, parseISO, differenceInMinutes, isSameDay } from "date-fns";
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
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [event?.id]);

  useEffect(() => {
    if (event) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [event]);

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
  const isSameDayEvent = isSameDay(startDate, endDate);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 overflow-hidden sm:overflow-y-auto">
      {/* Backdrop (visible on sm+ screens) */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity hidden sm:block"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: Full-screen on mobile (< sm), centered framed card on sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 bg-white text-slate-900 shadow-none sm:shadow-2xl sm:shadow-slate-900/15 overflow-hidden z-10 flex flex-col"
      >
        {/* Editorial Top Navigation Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">{event.community?.name || "Campus Community"}</span>
            </span>
            <span className="text-slate-300">•</span>
            <CategoryBadge category={event.category} size="sm" />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
              className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Framed Cover Media */}
          {event.cover_image_url && !imageError && (
            <div className="p-0 sm:p-5 sm:pb-0">
              <div className="relative h-52 sm:h-56 w-full rounded-none sm:rounded-xl overflow-hidden border-b sm:border border-slate-200/80 bg-slate-100 shadow-inner">
                <Image
                  src={event.cover_image_url}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                  priority
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />

                {/* Safe-Slot Conflict-Free Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-800 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>Safe-Slot Conflict-Free</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Info */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Title & Safe Slot badge if no cover */}
            <div>
              {(!event.cover_image_url || imageError) && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Safe-Slot Conflict-Free</span>
                </div>
              )}
              <h2
                id="event-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug font-sans"
              >
                {event.title}
              </h2>
            </div>

            {/* Logistics Grid (in sync with mini-calendar & sidebar) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200/90 bg-slate-50/70 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
              {/* Left Column: Date & Time */}
              <div className="flex items-start gap-3.5">
                {/* Modern date badge matching mini-calendar */}
                <div className="flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-white border border-slate-200/90 text-center shadow-xs overflow-hidden shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-tight pt-1">
                    {format(startDate, "MMM")}
                  </span>
                  <span className="text-base font-extrabold leading-none text-slate-900 pb-1">
                    {format(startDate, "d")}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {isSameDayEvent
                      ? format(startDate, "EEEE, MMMM d, yyyy")
                      : `${format(startDate, "EEE, MMM d")} – ${format(endDate, "EEE, MMM d, yyyy")}`}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {isSameDayEvent
                        ? `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`
                        : `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-[11px] font-medium">{durationLabel}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Venue & Space */}
              <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:pl-4">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-xs shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-slate-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>{event.venue?.name || event.location_name}</span>
                    {event.venue?.capacity && (
                      <span className="text-[11px] font-normal text-slate-500 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded-md">
                        {event.venue.capacity} cap
                      </span>
                    )}
                  </div>
                  {event.venue?.address && (
                    <div className="text-xs text-slate-600 mt-0.5">{event.venue.address}</div>
                  )}
                  {event.venue?.notes && (
                    <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                      {event.venue.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overview / Description */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                Overview
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-normal">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 sm:px-7 pt-3 pb-4 sm:py-3 border-t border-slate-200/80 bg-white sm:bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Calendar export links */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Google Cal</span>
            </a>

            <button
              type="button"
              onClick={() => downloadIcsFile(event)}
              className="px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>iCal / Apple</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {event.external_registration_url ? (
            <a
              href={event.external_registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Register & RSVP</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer text-center"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
