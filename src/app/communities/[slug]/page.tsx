import * as React from "react";
import { notFound } from "next/navigation";
import { serverEventService as eventService } from "@/lib/data/server-store";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  AtSign,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { Metadata } from "next";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const community = await eventService.getCommunityBySlug(slug);

  if (!community) {
    return { title: "Community Not Found — Campus Calendar" };
  }

  return {
    title: `${community.name} — Campus Calendar`,
    description: community.description,
  };
}

export default async function CommunityDetailPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const community = await eventService.getCommunityBySlug(slug);

  if (!community) {
    notFound();
  }

  const events = await eventService.getEvents({
    communityId: community.id,
    status: "published",
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/communities"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all communities
        </Link>
      </div>

      {/* Community Banner & Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {community.banner_url && (
          <div className="relative h-48 sm:h-56 w-full bg-slate-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={community.banner_url}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={community.logo_url}
              alt={community.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
            />

            {/* External Links */}
            <div className="flex items-center gap-2">
              {community.website && (
                <a
                  href={community.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
              {community.instagram && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                  <AtSign className="h-3.5 w-3.5" />
                  {community.instagram}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{community.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {community.category}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              {community.description}
            </p>
          </div>
        </div>
      </div>

      {/* Events Hosted by this Community */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
          <span>Upcoming Events ({events.length})</span>
        </h2>

        {events.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">
              No upcoming public events scheduled yet for {community.name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={evt.category} size="sm" />
                    <span className="text-xs text-slate-500 font-medium">
                      {formatEventDate(evt.start_time)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 hover:text-blue-600 transition">
                    <Link href={`/events/${evt.slug}`}>{evt.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {evt.description}
                  </p>

                  <div className="pt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatEventTimeRange(evt.start_time, evt.end_time)}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {evt.location_name}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/events/${evt.slug}`}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    View details
                  </Link>

                  {evt.external_registration_url ? (
                    <a
                      href={evt.external_registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Register Externally
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Open Event
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
