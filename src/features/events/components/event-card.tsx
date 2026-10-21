"use client";

import { useState } from "react";
import Image from "next/image";
import { format, parseISO, isSameDay } from "date-fns";
import { MapPin, Clock, ArrowUpRight, Calendar as CalendarIcon, CheckCircle2, Users } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge, CATEGORY_STYLES } from "./category-badge";
import { formatDisplayName } from "@/lib/utils";

interface EventCardProps {
  event: CampusEvent;
  onSelect: (event: CampusEvent) => void;
}

function toDate(val: string | Date): Date {
  return typeof val === "string" ? parseISO(val) : new Date(val);
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const startDate = toDate(event.start_time);
  const endDate = toDate(event.end_time);
  const leadName = event.community?.lead_name;

  const isSameDayEvent = isSameDay(startDate, endDate);

  const catStyle = CATEGORY_STYLES[event.category] || {
    bg: "bg-indigo-50/80",
    text: "text-indigo-700",
    border: "border-indigo-100",
    dot: "bg-indigo-500",
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(event);
        }
      }}
      className="group relative flex flex-col rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer shadow-2xs overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-left"
    >
      {/* Editorial Header Strip: Organizer & Category */}
      <div className="px-4 py-2.5 border-b border-zinc-100/90 flex items-center justify-between gap-2 bg-zinc-50/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot} shrink-0`} />
          <span className="text-[11px] font-medium text-zinc-600 truncate">
            {event.community?.name || "Campus Community"}
            {leadName && (
              <span className="text-zinc-400 font-normal"> · {formatDisplayName(leadName)}</span>
            )}
          </span>
        </div>
        <CategoryBadge category={event.category} size="sm" showDot />
      </div>

      {/* Cover Media Banner (Clean, unencumbered by floating pills) */}
      <div className="relative aspect-[16/9] w-full bg-zinc-100 overflow-hidden border-b border-zinc-100/90">
        {event.cover_image_url && !imageError ? (
          <>
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-50 via-zinc-100/50 to-zinc-50">
            <div className={`w-11 h-11 rounded-xl ${catStyle.bg} ${catStyle.border} border flex items-center justify-center mb-2 shadow-2xs`}>
              <CalendarIcon className={`w-5 h-5 ${catStyle.text}`} />
            </div>
            <span className="text-xs font-semibold text-zinc-700 line-clamp-1">{event.title}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">{event.community?.name || "Campus Community"}</span>
          </div>
        )}
      </div>

      {/* Body Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Integrated Calendar Date Tile + Event Title */}
          <div className="flex items-start gap-3">
            {/* Calendar Date Badge (Signature SaveSlot Style) */}
            <div className="flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-zinc-50 border border-zinc-200/90 text-center shadow-2xs shrink-0 group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-tight pt-1">
                {format(startDate, "MMM")}
              </span>
              <span className="text-base font-extrabold text-zinc-900 leading-none pb-1">
                {format(startDate, "d")}
              </span>
            </div>

            {/* Title & Timing */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                {event.title}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate font-medium">
                  {isSameDayEvent
                    ? `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`
                    : `${format(startDate, "MMM d, h:mm a")} – ${format(endDate, "MMM d, h:mm a")}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description Snippet */}
          <p className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Location & Audience Logistics Box */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-zinc-50/70 border border-zinc-100 text-xs text-zinc-600">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate font-medium text-zinc-700">
              {event.venue?.name || event.location_name}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 font-medium">
            <Users className="w-3 h-3 text-zinc-400" />
            <span className="truncate max-w-[110px]" title={event.target_audience?.join(", ") || "All Students"}>
              {event.target_audience && event.target_audience.length > 0 && !event.target_audience.includes("All Students")
                ? event.target_audience.join(", ")
                : "All Students"}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Safe-Slot Status & Action */}
      <div className="px-4 py-2.5 border-t border-zinc-100/90 flex items-center justify-between text-xs bg-zinc-50/30">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Safe-Slot Verified</span>
        </div>

        <span className="font-semibold text-xs text-indigo-600 group-hover:text-indigo-700 flex items-center gap-0.5">
          <span>Details</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </div>
    </article>
  );
}
