import * as React from "react";
import { serverEventService as eventService } from "@/lib/data/server-store";
import Link from "next/link";
import { Globe, ArrowRight, PlusCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Communities — Campus Calendar",
  description: "Browse clubs, student organizations, and academic departments at Apex Institute.",
};

export default async function CommunitiesDirectoryPage() {
  const communities = await eventService.getCommunities();
  const allEvents = await eventService.getEvents({ status: "published" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Campus Communities
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore clubs, organizations, and teams hosting events across campus.
          </p>
        </div>

        <Link
          href="/organizer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Register Community
        </Link>
      </div>

      {/* Grid of Communities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {communities.map((comm) => {
          const commEvents = allEvents.filter((e) => e.community_id === comm.id);

          return (
            <div
              key={comm.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Logo and Category */}
                <div className="flex items-start justify-between">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comm.logo_url}
                    alt={comm.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-2xs"
                  />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {comm.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 hover:text-blue-600 transition">
                    <Link href={`/communities/${comm.slug}`}>{comm.name}</Link>
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {comm.description}
                  </p>
                </div>
              </div>

              {/* Bottom links and events count */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {commEvents.length} upcoming event{commEvents.length === 1 ? "" : "s"}
                </span>

                <div className="flex items-center gap-3 text-slate-400">
                  {comm.website && (
                    <a
                      href={comm.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-700"
                      title="Website"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  {comm.instagram && (
                    <span className="text-[11px] text-slate-500">{comm.instagram}</span>
                  )}
                  <Link
                    href={`/communities/${comm.slug}`}
                    className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5 ml-1"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
