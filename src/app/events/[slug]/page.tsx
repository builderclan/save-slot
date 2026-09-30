import * as React from "react";
import { notFound } from "next/navigation";
import { serverEventService as eventService } from "@/lib/data/server-store";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import { EventActionBar } from "@/components/events/event-action-bar";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Radio,
  Building,
  Tag,
} from "lucide-react";
import type { Metadata } from "next";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await eventService.getEventBySlug(slug);

  if (!event) {
    return { title: "Event Not Found — Campus Calendar" };
  }

  return {
    title: `${event.title} — Campus Calendar`,
    description: event.description.slice(0, 160),
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await eventService.getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back to Calendar / What's Happening */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all campus events
        </Link>
      </div>

      {/* Main Event Article */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Optional Cover Image (if present, reasonable height, not oversized) */}
        {event.cover_image_url && (
          <div className="relative h-48 sm:h-64 w-full bg-slate-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Metadata: Category & Virtual Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CategoryBadge category={event.category} />
              {event.is_virtual && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Radio className="h-3 w-3" /> Virtual Event
                </span>
              )}
            </div>

            {event.community && (
              <Link
                href={`/communities/${event.community.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                {event.community.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.community.logo_url}
                    alt={event.community.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <Users className="h-4 w-4 text-slate-400" />
                )}
                <span>{event.community.name}</span>
              </Link>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {event.title}
            </h1>
          </div>

          {/* Clean, Scannable Date/Time/Venue Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Date & Time
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatEventDate(event.start_time)}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {formatEventTimeRange(event.start_time, event.end_time)}
                </p>
              </div>
            </div>

            {/* Venue & Location */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-purple-600 shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Location
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {event.location_name}
                </p>
                {event.venue?.building && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Building className="h-3 w-3 text-slate-400" />
                    {event.venue.building}
                    {event.venue.capacity ? ` • Capacity: ${event.venue.capacity}` : ""}
                  </p>
                )}
                {event.is_virtual && event.virtual_link && (
                  <a
                    href={event.virtual_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    Join virtual stream ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar: Registration CTA, Add to Calendar, Share */}
          <EventActionBar event={event} />

          {/* Event Description */}
          <div className="space-y-2 pt-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              About This Event
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>

          {/* Event Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
