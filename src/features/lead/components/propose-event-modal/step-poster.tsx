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
import { CategoryBadge } from "@/components/events/category-badge";
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">Step 3: Poster & Registration Link</h3>
        <p className="text-xs text-slate-500">
          Select a cover image and optional external RSVP link, then review your submission before submitting for administrator approval.
        </p>
      </div>

      {/* Preset Cover Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Choose Event Poster / Cover</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
          {PRESET_COVERS.map((cov) => (
            <button
              key={cov.url}
              type="button"
              onClick={() => setCoverImageUrl(cov.url)}
              className={`relative h-20 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                coverImageUrl === cov.url
                  ? "border-indigo-600 ring-2 ring-indigo-600/30 shadow-xs"
                  : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={cov.url}
                alt={cov.name}
                fill
                sizes="200px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2 text-[10px] font-semibold text-white">
                {cov.name}
              </div>
            </button>
          ))}
        </div>
        <input
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="Or paste custom image URL..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
        />
      </div>

      {/* External Registration Link */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>External RSVP / Registration Link (Optional)</span>
        </label>
        <input
          type="url"
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
          placeholder="https://forms.gle/... or https://luma.com/..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-xs"
        />
      </div>

      {/* Proposal Summary Card */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Proposal Summary
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{description}</p>
          </div>
          <CategoryBadge category={category} size="sm" />
        </div>
        <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {dateStr ? format(new Date(`${dateStr}T12:00:00`), "EEE, MMM d, yyyy") : "Date TBD"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {startTimeStr && endTimeStr
                ? `${format(new Date(`2000-01-01T${startTimeStr}`), "h:mm a")} – ${format(new Date(`2000-01-01T${endTimeStr}`), "h:mm a")}`
                : "Time TBD"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
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
