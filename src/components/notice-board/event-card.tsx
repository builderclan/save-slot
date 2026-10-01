"use client";

import Image from "next/image";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, ArrowUpRight, CheckCircle2 } from "lucide-react";
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
      className="group relative flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-200 overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-950/20 hover:-translate-y-0.5"
    >
      {/* Event Banner */}
      <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 flex items-center justify-center" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/20 pointer-events-none" />

        {/* Calendar Date Badge (Top Left) */}
        <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-12 h-13 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-center shadow-md z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            {format(startDate, "MMM")}
          </span>
          <span className="text-lg font-extrabold leading-none text-white">
            {format(startDate, "d")}
          </span>
        </div>

        {/* Category Badge (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <CategoryBadge category={event.category} size="sm" />
        </div>

        {/* Safe slot verification pill (Bottom Left) */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/30 z-10">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Safe Slot</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Organizing Club */}
          <div className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="truncate">{event.community?.name || "Campus Club"}</span>
          </div>

          {/* Event Title */}
          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug mb-2">
            {event.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
            {event.description}
          </p>
        </div>

        {/* Logistics Footer */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2 truncate">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">{event.venue?.name || event.location_name}</span>
            </div>

            <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[11px] font-medium">
              Details <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
