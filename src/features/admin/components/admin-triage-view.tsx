"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Check,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ExternalLink,
  Users,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/features/events";
import { doAudiencesOverlap } from "@/lib/conflicts/audience";
import { Select } from "@/components/ui/select";

export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  Tech: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
  Arts: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
  Career: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
  Social: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80",
  Academic: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
  Workshop: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
};

interface AdminTriageViewProps {
  pendingEvents: CampusEvent[];
  publishedEvents?: CampusEvent[];
  communities?: Array<{ id: string; name: string }>;
  onApprove: (id: string) => void;
  onOpenReject: (event: CampusEvent) => void;
  actionInProgress: string | null;
}

export function AdminTriageView({
  pendingEvents,
  publishedEvents = [],
  communities = [],
  onApprove,
  onOpenReject,
  actionInProgress,
}: AdminTriageViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileDetailView, setMobileDetailView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<string>("all");

  // Pre-select first pending event or update selection when queue changes
  useEffect(() => {
    if (pendingEvents.length > 0) {
      if (!selectedEventId || !pendingEvents.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(pendingEvents[0].id);
      }
    } else {
      setSelectedEventId(null);
      setMobileDetailView(false);
    }
  }, [pendingEvents, selectedEventId]);

  // Instant collision detection for all pending proposals against live published events
  const conflictMap = useMemo(() => {
    const map = new Map<string, CampusEvent | null>();

    for (const pending of pendingEvents) {
      if (!pending.venue_id) {
        map.set(pending.id, null);
        continue;
      }

      const pStart = new Date(pending.start_time).getTime();
      const pEnd = new Date(pending.end_time).getTime();

      const clashingEvent = publishedEvents.find((pub) => {
        if (pub.id === pending.id || pub.venue_id !== pending.venue_id) return false;
        const pubStart = new Date(pub.start_time).getTime();
        const pubEnd = new Date(pub.end_time).getTime();
        return pStart < pubEnd && pEnd > pubStart;
      });

      map.set(pending.id, clashingEvent || null);
    }

    return map;
  }, [pendingEvents, publishedEvents]);

  // Instant audience overlap detection against live published events
  const audienceConflictMap = useMemo(() => {
    const map = new Map<string, CampusEvent | null>();

    for (const pending of pendingEvents) {
      const pStart = new Date(pending.start_time).getTime();
      const pEnd = new Date(pending.end_time).getTime();
      const pAud = pending.target_audience || ["All Students"];

      const clashingAudience = publishedEvents.find((pub) => {
        if (pub.id === pending.id) return false;
        const pubStart = new Date(pub.start_time).getTime();
        const pubEnd = new Date(pub.end_time).getTime();
        if (pStart >= pubEnd || pEnd <= pubStart) return false;

        const pubAud = pub.target_audience || ["All Students"];
        return doAudiencesOverlap(pAud, pubAud);
      });

      map.set(pending.id, clashingAudience || null);
    }

    return map;
  }, [pendingEvents, publishedEvents]);

  // Filtered queue
  const filteredEvents = useMemo(() => {
    return pendingEvents.filter((ev) => {
      if (selectedCommunity !== "all" && ev.community_id !== selectedCommunity) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = (ev.description || "").toLowerCase().includes(q);
        const matchesVenue = (ev.venue?.name || ev.location_name || "").toLowerCase().includes(q);
        const matchesComm = (ev.community?.name || "").toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesVenue || matchesComm;
      }
      return true;
    });
  }, [pendingEvents, selectedCommunity, searchQuery]);

  const activeEvent = useMemo(() => {
    if (!selectedEventId) return filteredEvents[0] || null;
    return pendingEvents.find((e) => e.id === selectedEventId) || filteredEvents[0] || null;
  }, [pendingEvents, filteredEvents, selectedEventId]);

  const communityOptions = useMemo(() => {
    const list = [{ value: "all", label: `All Student Clubs (${pendingEvents.length})` }];
    for (const c of communities) {
      const count = pendingEvents.filter((e) => e.community_id === c.id).length;
      if (count > 0) {
        list.push({ value: c.id, label: `${c.name} (${count})` });
      }
    }
    return list;
  }, [communities, pendingEvents]);

  // Reset filter to "all" if selected club no longer has pending events
  useEffect(() => {
    if (!communityOptions.some((o) => o.value === selectedCommunity)) {
      setSelectedCommunity("all");
    }
  }, [communityOptions, selectedCommunity]);

  if (pendingEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-zinc-50/50">
        <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-500 mb-3 shadow-2xs">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900">All caught up</h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs text-center leading-relaxed">
          No student club proposals waiting for review. You will be notified when new events are submitted.
        </p>
      </div>
    );
  }

  const clashingEvent = activeEvent ? conflictMap.get(activeEvent.id) : null;
  const hasConflict = !!clashingEvent;
  const clashingAudienceEvent = activeEvent ? audienceConflictMap.get(activeEvent.id) : null;
  const hasAudienceConflict = !!clashingAudienceEvent;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
      {/* PANE 2: Submissions Queue */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-zinc-200/80 bg-zinc-50/30 flex-col h-full overflow-hidden ${
          mobileDetailView ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header toolbar */}
        <div className="p-3.5 border-b border-zinc-200/80 bg-white flex items-center justify-between text-xs font-semibold text-zinc-700 shrink-0">
          <div className="flex items-center gap-2">
            <span>Awaiting Review</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold tabular-nums">
              {pendingEvents.length}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-normal">By submission date</span>
        </div>

        {/* Search & Filter Strip */}
        <div className="p-2.5 border-b border-zinc-200/80 bg-white space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter queue by title, club..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
            />
          </div>

          {communities.length > 0 && (
            <Select
              value={selectedCommunity}
              onChange={setSelectedCommunity}
              options={communityOptions}
              size="sm"
              aria-label="Filter inbox by student club"
              leftIcon={<Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
              triggerClassName="w-full bg-zinc-50 border-zinc-200/90 text-xs text-zinc-700 h-8 rounded-xl shadow-2xs"
            />
          )}
        </div>

        {/* Queue Items */}
        <div className="divide-y divide-zinc-100 overflow-y-auto flex-1">
          {filteredEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              No proposals match your search.
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isSelected = ev.id === activeEvent?.id;
              const startDate = parseISO(ev.start_time);
              const leadNotice = differenceInDays(startDate, new Date());
              const eventConflict = conflictMap.get(ev.id);
              const isColliding = !!eventConflict;
              const audienceConflict = audienceConflictMap.get(ev.id);
              const isAudienceColliding = !!audienceConflict;

              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedEventId(ev.id);
                    setMobileDetailView(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedEventId(ev.id);
                      setMobileDetailView(true);
                    }
                  }}
                  className={`text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? "md:bg-indigo-50/50 md:border-l-2 md:border-indigo-600 bg-white"
                      : "hover:bg-zinc-50/80 text-zinc-700 bg-white"
                  }`}
                >
                  {/* MOBILE DATE-RAIL ITEM (< md) */}
                  <div className="md:hidden p-3.5 flex items-center gap-3 hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors">
                    {/* Left Date Block */}
                    <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-xl bg-zinc-100/80 border border-zinc-200/70 py-1.5 group-hover:bg-indigo-50/70 group-hover:border-indigo-200/80 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-indigo-600 transition-colors leading-none">
                        {format(startDate, "MMM")}
                      </span>
                      <span className="text-base font-bold text-zinc-900 group-hover:text-indigo-700 transition-colors tabular-nums leading-tight my-0.5">
                        {format(startDate, "d")}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 leading-none">
                        {format(startDate, "EEE")}
                      </span>
                    </div>

                    {/* Center Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-900 truncate">
                          {ev.community?.name}
                        </span>
                        <span className="text-zinc-300">•</span>
                        <CategoryBadge category={ev.category} size="sm" />
                      </div>
                      <div className="font-semibold text-zinc-900 text-sm line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                        <span className="text-zinc-300">•</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                            isColliding
                              ? "text-rose-700 bg-rose-50 border-rose-200/80"
                              : isAudienceColliding
                              ? "text-amber-700 bg-amber-50 border-amber-200/80"
                              : "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                          }`}
                        >
                          {isColliding ? "⚠ Clash" : isAudienceColliding ? "👥 Overlap" : "✓ Safe Slot"}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Affordance */}
                    <div className="shrink-0 flex items-center gap-1 text-indigo-600 font-medium text-xs pl-1">
                      <span className="hidden xs:inline">Review</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* DESKTOP SPLIT-QUEUE ITEM (md+) */}
                  <div className="hidden md:block p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-zinc-900 truncate">
                        {ev.community?.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          isColliding
                            ? "text-rose-700 bg-rose-50 border-rose-200/80"
                            : isAudienceColliding
                            ? "text-amber-700 bg-amber-50 border-amber-200/80"
                            : leadNotice < 7
                            ? "text-amber-700 bg-amber-50 border-amber-200/80"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                        }`}
                      >
                        {isColliding
                          ? "⚠ Clash"
                          : isAudienceColliding
                          ? "👥 Overlap"
                          : leadNotice < 7
                          ? `${leadNotice}d notice`
                          : "✓ Safe Slot"}
                      </span>
                    </div>

                    <div className="font-semibold text-zinc-900 text-sm line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                      {ev.title}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{format(startDate, "MMM d, yyyy")}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PANE 3: Clean Airy Inspector */}
      {activeEvent ? (
        <div
          className={`flex-1 flex-col bg-white h-full min-w-0 overflow-hidden ${
            mobileDetailView ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <div className="max-w-3xl space-y-3.5 sm:space-y-4">
              {/* Mobile Sub-Navigation Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileDetailView(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Queue ({pendingEvents.length})</span>
                </button>

                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                  {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                </span>
              </div>

              {/* Proposal Document Header */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-900 tracking-wide uppercase">
                      {activeEvent.community?.name}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <CategoryBadge category={activeEvent.category} size="sm" />
                  </div>

                  <span className="hidden md:inline-flex text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0">
                    {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                  {activeEvent.title}
                </h2>
                {activeEvent.description && (
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                    {activeEvent.description}
                  </p>
                )}
              </div>

              {/* Schedule, Venue & Clearance */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Target Schedule */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100/80">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Target Schedule
                      </div>
                      <div className="font-bold text-zinc-900 text-sm mt-0.5">
                        {format(parseISO(activeEvent.start_time), "EEE, MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {format(parseISO(activeEvent.start_time), "h:mm a")} –{" "}
                        {format(parseISO(activeEvent.end_time), "h:mm a")}
                      </div>
                    </div>
                  </div>

                  {/* Venue & Capacity */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100/80">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Venue & Capacity
                      </div>
                      <div className="font-bold text-zinc-900 text-sm mt-0.5">
                        {activeEvent.venue?.name || activeEvent.location_name || "Campus Facility"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {activeEvent.venue ? `${activeEvent.venue.building || "Campus"} • Capacity: ${activeEvent.venue.capacity || "N/A"}` : "Campus Grounds"}
                      </div>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100/80">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Target Audience
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(activeEvent.target_audience && activeEvent.target_audience.length > 0
                          ? activeEvent.target_audience
                          : ["All Students"]
                        ).map((aud) => (
                          <span
                            key={aud}
                            className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-white text-zinc-700 border border-zinc-200/80 shadow-2xs"
                          >
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conflict / Clearance Strip */}
                <div className="pt-3 border-t border-zinc-200/80 space-y-2.5">
                  {hasConflict && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs flex items-start gap-2.5 shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-rose-950">
                          Venue Clash
                        </div>
                        <div className="mt-0.5 text-rose-800 leading-relaxed">
                          This venue is already booked for &quot;{clashingEvent?.title}&quot; at {clashingEvent && format(parseISO(clashingEvent.start_time), "h:mm a")}.
                        </div>
                      </div>
                    </div>
                  )}

                  {hasAudienceConflict && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
                      <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-amber-950">
                          Audience Overlap
                        </div>
                        <div className="mt-0.5 text-amber-800 leading-relaxed">
                          &quot;{clashingAudienceEvent?.title}&quot; is also scheduled at this time for {(clashingAudienceEvent?.target_audience || ["All Students"]).join(", ")}. Student attendance may be split.
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasConflict && !hasAudienceConflict && (
                    <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-xs">
                        All clear • Venue is open and no audience overlap detected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Poster Preview */}
              <div>
                <div className="text-zinc-400 uppercase text-[10px] font-bold tracking-wider mb-1.5">
                  Event Poster
                </div>
                <div
                  className="relative aspect-[21/9] max-h-36 sm:max-h-40 w-full rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/80 shadow-2xs group"
                >
                  <Image
                    src={
                      activeEvent.cover_image_url ||
                      CATEGORY_DEFAULT_IMAGES[activeEvent.category] ||
                      CATEGORY_DEFAULT_IMAGES.Tech
                    }
                    alt={activeEvent.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 800px"
                    className="object-cover group-hover:scale-102 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>
              </div>

              {/* External Registration Link if present */}
              {activeEvent.external_registration_url && (
                <div className="pt-1">
                  <a
                    href={activeEvent.external_registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>External Link: {activeEvent.external_registration_url}</span>
                  </a>
                </div>
              )}

              {/* Decision Action Bar */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    ID: <code className="font-mono text-zinc-600">{activeEvent.id.slice(0, 8)}</code>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={actionInProgress === activeEvent.id}
                    onClick={() => onOpenReject(activeEvent)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-medium text-rose-700 transition-colors cursor-pointer text-center shadow-2xs active:scale-[0.98]"
                  >
                    Decline with Note
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === activeEvent.id}
                    onClick={() => onApprove(activeEvent.id)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0 active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" />
                    <span>{actionInProgress === activeEvent.id ? "Publishing..." : "Approve & Publish"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
