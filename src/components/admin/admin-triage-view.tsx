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
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { CategoryBadge } from "@/components/events/category-badge";

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

  // Keyboard navigation through queue + triage shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (filteredEvents.length > 1) {
        const currentIndex = filteredEvents.findIndex((ev) => ev.id === activeEvent?.id);
        if (e.key === "ArrowDown" && currentIndex < filteredEvents.length - 1) {
          e.preventDefault();
          setSelectedEventId(filteredEvents[currentIndex + 1].id);
          return;
        } else if (e.key === "ArrowUp" && currentIndex > 0) {
          e.preventDefault();
          setSelectedEventId(filteredEvents[currentIndex - 1].id);
          return;
        }
      }

      if (activeEvent && actionInProgress !== activeEvent.id) {
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          onApprove(activeEvent.id);
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          onOpenReject(activeEvent);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredEvents, activeEvent, actionInProgress, onApprove, onOpenReject]);

  if (pendingEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">All caught up</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
          No student club proposals waiting for review. You will be notified when new events are submitted.
        </p>
      </div>
    );
  }

  const clashingEvent = activeEvent ? conflictMap.get(activeEvent.id) : null;
  const hasConflict = !!clashingEvent;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
      {/* PANE 2: Submissions Queue */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/30 flex-col h-full overflow-hidden ${
          mobileDetailView ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span>Awaiting Review</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold tabular-nums">
              {pendingEvents.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">By submission date</span>
        </div>

        {/* Search & Filter Strip */}
        <div className="p-2.5 border-b border-slate-200 bg-white space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter queue by title, club..."
              className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
            />
          </div>

          {communities.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="all">All Student Clubs ({pendingEvents.length})</option>
                {communities.map((c) => {
                  const count = pendingEvents.filter((e) => e.community_id === c.id).length;
                  if (count === 0) return null;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Queue Items */}
        <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
          {filteredEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No proposals match your search.
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isSelected = ev.id === activeEvent?.id;
              const startDate = parseISO(ev.start_time);
              const leadNotice = differenceInDays(startDate, new Date());
              const eventConflict = conflictMap.get(ev.id);
              const isColliding = !!eventConflict;

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
                      ? "md:bg-indigo-50/70 md:border-l-3 md:border-indigo-700 bg-white"
                      : "hover:bg-slate-100/60 text-slate-700 bg-white"
                  }`}
                >
                  {/* MOBILE DATE-RAIL ITEM (< md) */}
                  <div className="md:hidden p-4 flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                    {/* Left Date Block */}
                    <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/70 py-1.5 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors leading-none">
                        {format(startDate, "MMM")}
                      </span>
                      <span className="text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tabular-nums leading-tight my-0.5">
                        {format(startDate, "d")}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 leading-none">
                        {format(startDate, "EEE")}
                      </span>
                    </div>

                    {/* Center Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {ev.community?.name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <CategoryBadge category={ev.category} size="sm" />
                      </div>
                      <div className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${
                            isColliding
                              ? "text-rose-800 bg-rose-50 border-rose-200"
                              : "text-emerald-800 bg-emerald-50 border-emerald-200"
                          }`}
                        >
                          {isColliding ? "⚠ Clash" : "✓ Safe Slot"}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Affordance */}
                    <div className="shrink-0 flex items-center gap-1 text-indigo-700 font-semibold text-xs pl-1">
                      <span className="hidden xs:inline">Review</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* DESKTOP SPLIT-QUEUE ITEM (md+) */}
                  <div className="hidden md:block p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {ev.community?.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          isColliding
                            ? "text-rose-800 bg-rose-50 border-rose-200"
                            : leadNotice < 7
                            ? "text-amber-800 bg-amber-50 border-amber-200"
                            : "text-emerald-800 bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        {isColliding ? "⚠ Clash" : leadNotice < 7 ? `${leadNotice}d notice` : "✓ Safe Slot"}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                      {ev.title}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{format(startDate, "MMM d, yyyy")}</span>
                      <span>•</span>
                      <span className="truncate">{ev.venue?.name || ev.location_name}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Helper */}
        <div className="hidden md:flex p-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center items-center justify-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↑</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↓</kbd>
            <span>Navigate queue</span>
          </span>
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
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileDetailView(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Queue ({pendingEvents.length})</span>
                </button>

                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                </span>
              </div>

              {/* Proposal Document Header */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      {activeEvent.community?.name}
                    </span>
                    <span className="text-slate-300">•</span>
                    <CategoryBadge category={activeEvent.category} size="sm" />
                  </div>

                  <span className="hidden md:inline-flex text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                    {differenceInDays(parseISO(activeEvent.start_time), new Date())}d lead notice
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {activeEvent.title}
                </h2>
                {activeEvent.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {activeEvent.description}
                  </p>
                )}
              </div>

              {/* Schedule, Venue & Clearance */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Target Schedule */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100/80">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Target Schedule
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {format(parseISO(activeEvent.start_time), "EEE, MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
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
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Venue & Capacity
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {activeEvent.venue?.name || activeEvent.location_name || "Campus Facility"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {activeEvent.venue ? `${activeEvent.venue.building || "Campus"} • Capacity: ${activeEvent.venue.capacity || "N/A"}` : "Campus Grounds"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conflict / Clearance Strip */}
                <div className="pt-3 border-t border-slate-100">
                  {hasConflict ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-amber-950">
                          Venue Collision Detected
                        </div>
                        <div className="mt-0.5 text-amber-800 leading-relaxed">
                          Overlaps with live event &quot;{clashingEvent?.title}&quot; at {clashingEvent && format(parseISO(clashingEvent.start_time), "h:mm a")}.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-xs">
                        Deterministic Safe Slot Verified • Zero conflicts detected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Poster Preview */}
              <div>
                <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1.5">
                  Event Poster
                </div>
                <div
                  className="relative aspect-[21/9] max-h-36 sm:max-h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group"
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
              <div className="pt-3 sm:pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    ID: <code className="font-mono text-slate-600">{activeEvent.id.slice(0, 8)}</code>
                  </span>
                  <div className="hidden lg:flex items-center gap-1.5 ml-2 text-[11px] text-slate-400">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600 font-semibold">A</kbd>
                    <span>Approve</span>
                    <span className="mx-1 text-slate-300">•</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600 font-semibold">R</kbd>
                    <span>Reject</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={actionInProgress === activeEvent.id}
                    onClick={() => onOpenReject(activeEvent)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-700 transition-colors cursor-pointer text-center"
                  >
                    Decline with Note
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === activeEvent.id}
                    onClick={() => onApprove(activeEvent.id)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0"
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
