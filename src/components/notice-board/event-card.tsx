"use client";

import { useState } from "react";
import Image from "next/image";
import { format, parseISO, isSameDay } from "date-fns";
import { MapPin, Clock, ArrowUpRight, Calendar as CalendarIcon, CheckCircle2, Users } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge, CATEGORY_STYLES } from "@/components/events/category-badge";

interface EventCardProps {
  event: CampusEvent;
  onSelect: (event: CampusEvent) => void;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);
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
      className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-400/80 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-200 cursor-pointer shadow-xs overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-left"
    >
      {/* Editorial Header Strip: Organizer & Category */}
      <div className="px-4.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${catStyle.dot} shrink-0`} />
          <span className="text-[11px] font-semibold text-slate-600 truncate">
            {event.community?.name || "Campus Community"}
          </span>
        </div>
        <CategoryBadge category={event.category} size="sm" />
      </div>

      {/* Cover Media Banner (Clean, unencumbered by floating pills) */}
      <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        {event.cover_image_url && !imageError ? (
          <>
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-103 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
            <div className={`w-11 h-11 rounded-xl ${catStyle.bg} ${catStyle.border} border flex items-center justify-center mb-2 shadow-2xs`}>
              <CalendarIcon className={`w-5 h-5 ${catStyle.text}`} />
            </div>
            <span className="text-xs font-semibold text-slate-700 line-clamp-1">{event.title}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{event.community?.name || "Campus Community"}</span>
          </div>
        )}
      </div>

      {/* Body Area */}
      <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Integrated Calendar Date Tile + Event Title */}
          <div className="flex items-start gap-3">
            {/* Calendar Date Badge (Signature SafeSlot Style) */}
            <div className="flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-slate-50 border border-slate-200/90 text-center shadow-2xs shrink-0 group-hover:border-indigo-200 group-hover:bg-indigo-50/40 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-tight pt-1">
                {format(startDate, "MMM")}
              </span>
              <span className="text-base font-black text-slate-900 leading-none pb-1">
                {format(startDate, "d")}
              </span>
            </div>

            {/* Title & Timing */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                {event.title}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium">
                  {isSameDayEvent
                    ? `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`
                    : `${format(startDate, "MMM d, h:mm a")} – ${format(endDate, "MMM d, h:mm a")}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description Snippet */}
          <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Location Logistics Box */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium text-slate-700">
              {event.venue?.name || event.location_name}
            </span>
          </div>

          {event.venue?.capacity ? (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 font-medium">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{event.venue.capacity}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Card Footer: Safe-Slot Status & Action */}
      <div className="px-4.5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/40">
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
