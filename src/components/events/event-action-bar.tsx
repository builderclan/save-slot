"use client";

import * as React from "react";
import { Event } from "@/types/database";
import { ExternalLink, Share2, Check, Calendar, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventActionBarProps {
  event: Event;
  className?: string;
}

export function EventActionBar({ event, className }: EventActionBarProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard && url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    const startIso = new Date(event.start_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endIso = new Date(event.end_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const text = encodeURIComponent(event.title);
    const registrationDetail = event.external_registration_url
      ? `\n\nRegistration: ${event.external_registration_url}`
      : "\n\nOpen Event - No registration required";
    const details = encodeURIComponent(event.description + registrationDetail);
    const location = encodeURIComponent(event.location_name);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white">
            {event.external_registration_url ? "Registration Required" : "Open Campus Event"}
          </p>
          {event.is_virtual && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <Radio className="h-3 w-3" /> Virtual
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300">
          {event.external_registration_url
            ? `Hosted by ${event.community?.name || "the community"}. Complete registration via their link.`
            : "No registration required. All students and campus members are welcome to drop in!"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          title="Share event link"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-slate-300" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Add to Google Calendar */}
        <a
          href={getGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Calendar className="h-3.5 w-3.5 text-slate-300" />
          <span>Add to Cal</span>
        </a>

        {/* Registration Link / Open Badge */}
        {event.external_registration_url ? (
          <a
            href={event.external_registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition flex-1 sm:flex-initial"
          >
            <span>Register</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600/90 text-white shadow-xs">
            Open Event · No registration required
          </span>
        )}
      </div>
    </div>
  );
}
