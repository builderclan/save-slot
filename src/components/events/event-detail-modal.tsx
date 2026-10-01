"use client";

import { useEffect } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Download,
  CheckCircle2,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-export";

interface EventDetailModalProps {
  event: CampusEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#0d0f17] text-zinc-100 shadow-2xl overflow-hidden z-10 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cover Image & Banner */}
        <div className="relative h-56 sm:h-72 w-full bg-zinc-900 overflow-hidden">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-zinc-900 flex items-center justify-center">
              <Calendar className="w-16 h-16 text-indigo-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-black/30 pointer-events-none" />

          {/* Badges Overlay */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2 flex-wrap z-10">
            <CategoryBadge category={event.category} />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Safe-Slot Verified</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Title & Host info */}
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
              <span>Organized by</span>
              <span className="font-semibold text-zinc-200">
                {event.community?.name || "Campus Community"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Date
                </div>
                <div className="text-sm font-semibold text-zinc-100">
                  {format(startDate, "EEEE, MMMM d, yyyy")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Time
                </div>
                <div className="text-sm font-semibold text-zinc-100">
                  {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:col-span-2 pt-2 border-t border-zinc-800/60">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Venue & Location
                </div>
                <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span>{event.venue?.name || event.location_name}</span>
                  {event.venue?.capacity && (
                    <span className="text-xs text-zinc-400 font-normal">
                      (Capacity: {event.venue.capacity} seats)
                    </span>
                  )}
                </div>
                {event.venue?.address && (
                  <div className="text-xs text-zinc-400 mt-0.5">{event.venue.address}</div>
                )}
                {event.venue?.notes && (
                  <div className="text-[11px] text-zinc-500 mt-1 italic">
                    ℹ️ {event.venue.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs uppercase font-semibold text-zinc-400 tracking-wider mb-2">
              About This Event
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Google Cal */}
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Calendar</span>
              </a>

              {/* Download ICS */}
              <button
                type="button"
                onClick={() => downloadIcsFile(event)}
                className="px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>iCal / Apple (.ics)</span>
              </button>
            </div>

            {/* External Registration */}
            {event.external_registration_url && (
              <a
                href={event.external_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                <span>Register & RSVP</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
