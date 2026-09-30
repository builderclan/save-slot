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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image or Accent Header */}
        {event.cover_image_url ? (
          <div className="relative h-48 sm:h-56 w-full bg-slate-100 overflow-hidden">
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600/90 text-white backdrop-blur-xs">
                  <Radio className="h-3 w-3 animate-pulse" /> Virtual Event
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <CategoryBadge category={event.category} />
              {event.is_virtual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Radio className="h-3 w-3" /> Virtual
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {event.title}
            </h2>

            {/* Organizing Community */}
            {event.community && (
              <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600">
                <span className="text-slate-400">Hosted by</span>
                <Link
                  href={`/communities/${event.community.slug}`}
                  className="font-medium text-slate-900 hover:underline inline-flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {event.community.name}
                </Link>
              </div>
            )}
          </div>

          {/* Key Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs shrink-0">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {formatEventDate(event.start_time)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatEventTimeRange(event.start_time, event.end_time)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {event.location_name}
                </p>
                {event.venue?.building && (
                  <p className="text-xs text-slate-500">
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
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              About This Event
            </h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-normal"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1 sm:flex-initial"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Link Copied" : "Share"}
            </Button>

            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-medium transition-colors border border-slate-200 bg-transparent text-slate-800 hover:bg-slate-50 text-xs px-2.5 py-1.5 h-8 gap-1.5 rounded-lg flex-1 sm:flex-initial"
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.99] transition"
            >
              Register on External Site
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Open Event • No registration required
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
