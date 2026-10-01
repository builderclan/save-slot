"use client";

import Image from "next/image";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

interface EventCardProps {
  event: CampusEvent;
  onSelect: (event: CampusEvent) => void;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);

  return (
    <div
      onClick={() => onSelect(event)}
      className="group relative flex flex-col rounded-2xl border border-stone-200/90 bg-white hover:border-stone-400 transition-all duration-300 overflow-hidden cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.07)] hover:-translate-y-1"
    >
      {/* Event Banner */}
      <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-400 font-serif text-2xl font-bold">
            Apex Event
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent pointer-events-none" />

        {/* Physical Paper Tear-off Calendar Date Badge */}
        <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-12 rounded-lg bg-white border border-stone-200 text-center shadow-md overflow-hidden z-10">
          <span className="w-full text-[9px] font-bold uppercase tracking-wider bg-stone-900 text-amber-50 py-0.5 px-1 font-mono">
            {format(startDate, "MMM")}
          </span>
          <span className="text-base font-bold leading-tight text-stone-900 font-serif py-1">
            {format(startDate, "d")}
          </span>
        </div>

        {/* Category Badge (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <CategoryBadge category={event.category} size="sm" />
        </div>

        {/* Verified Safe Slot Pill (Bottom Left) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-stone-900 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
          <span>Safe Slot</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 flex flex-col justify-between bg-white">
        <div>
          {/* Organizing Club */}
          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span className="truncate">{event.community?.name || "Campus Community"}</span>
          </div>

          {/* Event Title */}
          <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-2 leading-snug mb-2">
            {event.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4 font-normal">
            {event.description}
          </p>
        </div>

        {/* Logistics Footer */}
        <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
          <div className="flex items-center gap-2 truncate">
            <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-medium text-stone-700">
              {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{event.venue?.name || event.location_name}</span>
            </div>

            <span className="text-stone-900 font-medium text-[11px] flex items-center group-hover:translate-x-0.5 transition-transform">
              Details <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
