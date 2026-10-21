"use client";

import Image from "next/image";
import {
  Calendar,
  Clock,
  ImageIcon,
  Link as LinkIcon,
  MapPin,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { CategoryBadge } from "@/features/events";
import { EventCategory, Venue } from "@/types/database";
import { PRESET_COVERS } from "./types";

interface StepPosterProps {
  title: string;
  description: string;
  category: EventCategory;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  selectedVenue?: Venue;
  targetAudience: string[];
  coverImageUrl: string;
  setCoverImageUrl: (url: string) => void;
  registrationUrl: string;
  setRegistrationUrl: (url: string) => void;
}

export function StepPoster({
  title,
  description,
  category,
  dateStr,
  startTimeStr,
  endTimeStr,
  selectedVenue,
  targetAudience,
  coverImageUrl,
  setCoverImageUrl,
  registrationUrl,
  setRegistrationUrl,
}: StepPosterProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Preset Cover Selector */}
      <div>
        <label className="block text-xs font-semibold text-zinc-900 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Event Poster / Cover</span>
          </span>
          <span className="text-[11px] text-zinc-400 font-normal">Choose preset or paste URL</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {PRESET_COVERS.map((cov) => (
            <button
              key={cov.url}
              type="button"
              onClick={() => setCoverImageUrl(cov.url)}
              className={`relative h-16 sm:h-18 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                coverImageUrl === cov.url
                  ? "border-indigo-600 ring-2 ring-indigo-600/30 shadow-xs"
                  : "border-zinc-200/90 hover:border-zinc-400 opacity-75 hover:opacity-100"
              }`}
            >
              <Image
                src={cov.url}
                alt={cov.name}
                fill
                sizes="200px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent flex items-end p-2 text-[10px] font-medium text-white">
                {cov.name}
              </div>
            </button>
          ))}
        </div>
        <input
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://... (or choose from presets above)"
          className="w-full px-3.5 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs font-mono text-zinc-700 placeholder:text-zinc-400 placeholder:font-sans focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
        />
      </div>

      {/* External Registration Link */}
      <div>
        <label className="block text-xs font-semibold text-zinc-900 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Registration / RSVP Link</span>
          </span>
          <span className="text-[11px] text-zinc-400 font-normal">Optional</span>
        </label>
        <input
          type="url"
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
          placeholder="https://forms.gle/... or https://luma.com/..."
          className="w-full px-3.5 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
        />
      </div>

      {/* Proposal Summary Card */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200/90 bg-zinc-50/60 space-y-2.5 shadow-2xs">
        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Proposal Summary
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{description}</p>
          </div>
          <CategoryBadge category={category} size="sm" />
        </div>
        <div className="pt-2 border-t border-zinc-200/80 flex items-center gap-2.5 sm:gap-4 text-xs text-zinc-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {dateStr ? format(new Date(`${dateStr}T12:00:00`), "EEE, MMM d, yyyy") : "Date TBD"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {startTimeStr && endTimeStr
                ? `${format(new Date(`2000-01-01T${startTimeStr}`), "h:mm a")} – ${format(new Date(`2000-01-01T${endTimeStr}`), "h:mm a")}`
                : "Time TBD"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span>{selectedVenue?.name || "Venue TBD"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium text-indigo-700">
              {targetAudience.join(", ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
