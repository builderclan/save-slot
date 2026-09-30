"use client";

import * as React from "react";
import { Event } from "@/types/database";
import { CategoryBadge } from "./category-badge";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  X,
  ExternalLink,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Share2,
  Check,
  Globe,
  Radio,
} from "lucide-react";
import Link from "next/link";

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleShare = () => {
    const url = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    const startIso = new Date(event.start_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endIso = new Date(event.end_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const text = encodeURIComponent(event.title);
    const registrationDetail = event.external_registration_url
      ? `\n\nExternal Registration: ${event.external_registration_url}`
      : "\n\nOpen Event - No registration required";
    const details = encodeURIComponent(event.description + registrationDetail);
    const location = encodeURIComponent(event.location_name);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#12161f]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image or Accent Header */}
        {event.cover_image_url ? (
          <div className="relative h-48 sm:h-56 w-full bg-stone-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <CategoryBadge category={event.category} />
              {event.is_virtual && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-600/90 text-white backdrop-blur-xs font-mono">
                  <Radio className="h-3 w-3 animate-pulse" /> Virtual Event
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <CategoryBadge category={event.category} />
              {event.is_virtual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 font-mono">
                  <Radio className="h-3 w-3" /> Virtual
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-stone-500 hover:text-[#12161f] hover:bg-stone-200 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#12161f] tracking-tight leading-snug font-display">
              {event.title}
            </h2>

            {/* Organizing Community */}
            {event.community && (
              <div className="mt-2.5 flex items-center gap-2 text-sm text-stone-600">
                <span className="text-stone-400">Hosted by</span>
                <Link
                  href={`/communities/${event.community.slug}`}
                  className="font-semibold text-stone-900 hover:underline inline-flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-stone-500" />
                  {event.community.name}
                </Link>
              </div>
            )}
          </div>

          {/* Key Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-xs shrink-0">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-[#12161f]">
                  {formatEventDate(event.start_time)}
                </p>
                <p className="text-xs text-stone-500 font-mono">
                  {formatEventTimeRange(event.start_time, event.end_time)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-xs shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-[#12161f]">
                  {event.location_name}
                </p>
                {event.venue?.building && (
                  <p className="text-xs text-stone-500 font-mono">
                    {event.venue.building} {event.venue.capacity ? `(Cap: ${event.venue.capacity})` : ""}
                  </p>
                )}
                {event.is_virtual && event.virtual_link && (
                  <a
                    href={event.virtual_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Globe className="h-3 w-3" /> Join Virtual Stream
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider font-mono">
              About This Event
            </h4>
            <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line font-sans">
              {event.description}
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-mono font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1 sm:flex-initial border-stone-200 hover:bg-white text-stone-800"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Link Copied" : "Share"}
            </Button>

            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-semibold transition-colors border border-stone-200 bg-transparent text-stone-800 hover:bg-white text-xs px-2.5 py-1.5 h-8 gap-1.5 rounded-lg flex-1 sm:flex-initial"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Add to Cal
            </a>
          </div>

          {/* Registration CTA */}
          {event.external_registration_url ? (
            <a
              href={event.external_registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#12161f] text-white hover:bg-stone-800 shadow-sm active:scale-[0.99] transition cursor-pointer"
            >
              Register on External Site
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Open Event • No registration required
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
