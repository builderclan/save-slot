"use client";

import { useEffect, useState, useRef } from "react";
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
  ShieldCheck,
  Users,
  UserCheck,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-export";
import { formatDisplayName } from "@/lib/utils";

interface EventDetailModalProps {
  event: CampusEvent | null;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

function isElementVisible(el: HTMLElement): boolean {
  return (
    el.getAttribute("aria-hidden") !== "true" &&
    (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  );
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const isOpen = Boolean(event);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isElementVisible);
        focusables[0]?.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (e.defaultPrevented) return;
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isElementVisible);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === "function"
      ) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    };
  }, [isOpen]);

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

  const leadName = event.community?.lead_name;

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
        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity hidden sm:block animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: Full-screen on mobile (< sm), centered framed card on sm+ */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border border-zinc-200/90 bg-white text-zinc-900 shadow-none sm:shadow-2xl overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Editorial Top Navigation Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-medium text-zinc-600 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">{event.community?.name || "Campus Community"}</span>
              {leadName && (
                <span className="text-zinc-400 font-normal truncate hidden xs:inline">
                  {" "}· {formatDisplayName(leadName)}
                </span>
              )}
            </span>
            <span className="text-zinc-300">•</span>
            <CategoryBadge category={event.category} size="sm" showDot />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
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
              className="p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
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
              <div className="relative h-52 sm:h-56 w-full rounded-none sm:rounded-xl overflow-hidden border-b sm:border border-zinc-200/80 bg-zinc-100 shadow-inner">
                <Image
                  src={event.cover_image_url}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                  priority
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent pointer-events-none" />

                {/* Safe-Slot Conflict-Free Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-zinc-800 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-zinc-200/90 shadow-2xs">
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
                className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 leading-snug font-sans"
              >
                {event.title}
              </h2>
            </div>

            {/* Logistics Card (Date, Venue, and Target Audience Strip) */}
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 overflow-hidden divide-y divide-zinc-200/70 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70">
                {/* Left Column: Date & Time */}
                <div className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-white border border-zinc-200/90 text-center shadow-2xs overflow-hidden shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-tight pt-1">
                      {format(startDate, "MMM")}
                    </span>
                    <span className="text-base font-extrabold leading-none text-zinc-900 pb-1">
                      {format(startDate, "d")}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">
                      {isSameDayEvent
                        ? format(startDate, "EEEE, MMMM d, yyyy")
                        : `${format(startDate, "EEE, MMM d")} – ${format(endDate, "EEE, MMM d, yyyy")}`}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5 flex-wrap font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>
                        {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                      </span>
                      <span className="text-zinc-300 font-sans">•</span>
                      <span className="text-zinc-500 text-[11px] font-medium font-sans">{durationLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Venue & Space */}
                <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:pl-4">
                  <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 shadow-2xs shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-zinc-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5 flex-wrap">
                      <span>{event.venue?.name || event.location_name}</span>
                      {event.venue?.capacity && (
                        <span className="text-[11px] font-normal text-zinc-500 bg-white border border-zinc-200/90 px-1.5 py-0.5 rounded-md">
                          {event.venue.capacity} cap
                        </span>
                      )}
                    </div>
                    {event.venue?.address && (
                      <div className="text-xs text-zinc-600 mt-0.5">{event.venue.address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Strip: Target Audience */}
              <div className="px-4 py-2.5 bg-zinc-100/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-zinc-700 shrink-0 text-[11px]">Audience:</span>
                  <div className="flex flex-wrap gap-1">
                    {(event.target_audience && event.target_audience.length > 0
                      ? event.target_audience
                      : ["All Students"]
                    ).map((aud) => (
                      <span
                        key={aud}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-zinc-800 border border-zinc-200/80 shadow-2xs"
                      >
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Governance & Leadership Grid (Campus Lead & Institutional Sign-Off) */}
            {(leadName || event.reviewer) && (
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 overflow-hidden shadow-2xs">
                <div
                  className={`grid grid-cols-1 ${
                    leadName && event.reviewer
                      ? "sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70"
                      : ""
                  } p-3.5 sm:p-4 gap-3.5 sm:gap-4`}
                >
                  {/* Left Column: Campus Lead / Organizer */}
                  {leadName && (
                    <div className="flex items-center justify-between gap-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border bg-indigo-50 border-indigo-200/70 text-indigo-700 shadow-2xs">
                          {formatDisplayName(leadName).charAt(0) || "L"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 font-medium leading-tight">
                            Organized by
                          </div>
                          <div className="font-semibold text-zinc-900 truncate text-xs">
                            {formatDisplayName(leadName)}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-normal truncate">
                            {event.community?.name || "Campus Community"} Lead
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-white border-zinc-200/90 text-indigo-700 flex items-center gap-1 shrink-0 shadow-2xs">
                        <UserCheck className="w-3 h-3 text-indigo-600" />
                        <span>Campus Lead</span>
                      </span>
                    </div>
                  )}

                  {/* Right Column: Institutional Sign-Off */}
                  {event.reviewer && (
                    <div
                      className={`flex items-center justify-between gap-2.5 min-w-0 ${
                        leadName ? "pt-3 sm:pt-0 sm:pl-4" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs ${
                            event.reviewer.role === "vice_principal"
                              ? "bg-indigo-50 border-indigo-200/70 text-indigo-700"
                              : event.reviewer.role === "principal"
                              ? "bg-purple-50 border-purple-200/70 text-purple-700"
                              : "bg-amber-50 border-amber-200/70 text-amber-800"
                          }`}
                        >
                          {formatDisplayName(event.reviewer.full_name).charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 font-medium leading-tight">
                            {event.status === "published" ? "Approved by" : "Reviewed by"}
                          </div>
                          <div className="font-semibold text-zinc-900 truncate text-xs">
                            {formatDisplayName(event.reviewer.full_name)}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-normal truncate">
                            {event.reviewer.role === "vice_principal"
                              ? "Office of the Vice Principal"
                              : event.reviewer.role === "principal"
                              ? "Executive Office of the Principal"
                              : "Campus Administration"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-white border-zinc-200/90 text-zinc-700 flex items-center gap-1 shrink-0 shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Sign-Off</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overview / Description */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                Overview
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line font-normal">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/60 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 sm:px-7 pt-3 pb-4 sm:py-3 border-t border-zinc-200/80 bg-white sm:bg-zinc-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Calendar export links */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 sm:py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
              <span>Google Cal</span>
            </a>

            <button
              type="button"
              onClick={() => downloadIcsFile(event)}
              className="px-3 py-2 sm:py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>iCal / Apple</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {event.external_registration_url ? (
            <a
              href={event.external_registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <span>Register & RSVP</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all shadow-2xs cursor-pointer text-center active:scale-[0.98]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
