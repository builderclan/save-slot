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
      className="group relative flex flex-col rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer shadow-xs"
    >
      {/* Event Banner */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center text-slate-400 font-bold text-xl">
            Apex Event
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />

        {/* Clean Modern Date Badge (in sync with mini-calendar) */}
        <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-center shadow-xs overflow-hidden z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-tight pt-1">
            {format(startDate, "MMM")}
          </span>
          <span className="text-base font-extrabold leading-none text-slate-900 pb-1">
            {format(startDate, "d")}
          </span>
        </div>

        {/* Category Badge (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <CategoryBadge category={event.category} size="sm" />
        </div>

        {/* Verified Safe Slot Pill (Bottom Left) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-800 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xs z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Safe Slot</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 flex flex-col justify-between bg-white">
        <div>
          {/* Organizing Club */}
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="truncate">{event.community?.name || "Campus Community"}</span>
          </div>

          {/* Event Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2 font-sans">
            {event.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 font-normal font-sans">
            {event.description}
          </p>
        </div>

        {/* Logistics Footer */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">
              {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-slate-600">{event.venue?.name || event.location_name}</span>
            </div>

            <span className="text-slate-900 font-semibold text-[11px] flex items-center shrink-0 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
              Details <ArrowUpRight className="w-3 h-3 ml-0.5 text-slate-400 group-hover:text-indigo-600" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
