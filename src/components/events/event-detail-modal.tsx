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
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden z-10 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cover Image & Banner */}
        <div className="relative h-64 sm:h-80 w-full bg-slate-100 overflow-hidden">
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
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl text-slate-400 font-bold">
              Apex Campus
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Badges Overlay */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2 flex-wrap z-10">
            <CategoryBadge category={event.category} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-900 text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              <span>Safe-Slot Verified</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Title & Host info */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Organized by {event.community?.name || "Campus Community"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs mt-0.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Date
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {format(startDate, "EEEE, MMMM d, yyyy")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs mt-0.5">
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Time
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:col-span-2 pt-2 border-t border-slate-200/60">
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs mt-0.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Venue & Facility
                </div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{event.venue?.name || event.location_name}</span>
                  {event.venue?.capacity && (
                    <span className="text-xs text-slate-500 font-normal">
                      ({event.venue.capacity} capacity)
                    </span>
                  )}
                </div>
                {event.venue?.address && (
                  <div className="text-xs text-slate-600 mt-0.5">{event.venue.address}</div>
                )}
                {event.venue?.notes && (
                  <div className="text-[11px] text-slate-500 mt-1 italic">
                    ℹ️ {event.venue.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
              Event Details
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
              {event.description}
            </p>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Google Cal */}
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Calendar</span>
              </a>

              {/* Download ICS */}
              <button
                type="button"
                onClick={() => downloadIcsFile(event)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>iCal / Apple</span>
              </button>
            </div>

            {/* External Registration */}
            {event.external_registration_url && (
              <a
                href={event.external_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
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
