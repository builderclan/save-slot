"use client";

import Image from "next/image";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Check,
  Calendar,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { CampusEvent, ConflictCheckResult } from "@/types/database";
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

interface PrincipalInboxViewProps {
  pendingEvents: CampusEvent[];
  activeEvent: CampusEvent | null;
  onSelectEvent: (eventId: string) => void;
  mobileDetailView: boolean;
  onSetMobileDetailView: (show: boolean) => void;
  checkingActiveConflict: boolean;
  activeConflictResult: ConflictCheckResult | null;
  onInspectLiveNotice: (event: CampusEvent) => void;
  onOpenReject: (event: CampusEvent) => void;
  onApprove: (eventId: string) => void;
  actionInProgress: string | null;
  onNavigateSchedule: () => void;
  onNavigateHistory: () => void;
  approvedCount: number;
  historyCount: number;
}

export function PrincipalInboxView({
  pendingEvents,
  activeEvent,
  onSelectEvent,
  mobileDetailView,
  onSetMobileDetailView,
  checkingActiveConflict,
  activeConflictResult,
  onInspectLiveNotice,
  onOpenReject,
  onApprove,
  actionInProgress,
  onNavigateSchedule,
  onNavigateHistory,
  approvedCount,
  historyCount,
}: PrincipalInboxViewProps) {
  if (pendingEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">All caught up</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
          No club proposals waiting for review. You will be notified when new events are submitted.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xs sm:max-w-none px-4">
          <button
            type="button"
            onClick={onNavigateSchedule}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Master Calendar</span>
            <span className="text-[11px] text-slate-400">({approvedCount})</span>
          </button>
          <button
            type="button"
            onClick={onNavigateHistory}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Decision History</span>
            <span className="text-[11px] text-slate-400">({historyCount})</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
      {/* PANE 2: Submissions Queue */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/30 flex-col h-full overflow-hidden ${
          mobileDetailView ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span>Awaiting Review</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold tabular-nums">
              {pendingEvents.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">By submission date</span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
          {pendingEvents.map((ev) => {
            const isSelected = ev.id === activeEvent?.id;
            const startDate = parseISO(ev.start_time);
            const leadNotice = differenceInDays(startDate, new Date());

            return (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectEvent(ev.id);
                  onSetMobileDetailView(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSelectEvent(ev.id);
                    onSetMobileDetailView(true);
                  }
                }}
                className={`text-left transition-colors cursor-pointer group ${
                  isSelected
                    ? "md:bg-purple-50/70 md:border-l-3 md:border-purple-700 bg-white"
                    : "hover:bg-slate-100/60 text-slate-700 bg-white"
                }`}
              >
                {/* MOBILE DATE-RAIL ITEM (< md) */}
                <div className="md:hidden p-4 flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                  {/* Left Date Block */}
                  <div className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/70 py-1.5 group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-600 transition-colors leading-none">
                      {format(startDate, "MMM")}
                    </span>
                    <span className="text-base font-bold text-slate-800 group-hover:text-purple-700 transition-colors tabular-nums leading-tight my-0.5">
                      {format(startDate, "d")}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 leading-none">
                      {format(startDate, "EEE")}
                    </span>
                  </div>

                  {/* Center Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                        {ev.community?.name}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {ev.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 group-hover:text-purple-700 transition-colors leading-snug line-clamp-1">
                      {ev.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="truncate max-w-[120px]">{ev.venue?.name}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                        ✓ Safe Slot
                      </span>
                    </div>
                  </div>

                  {/* Right Action Affordance */}
                  <div className="shrink-0 flex items-center gap-1 text-purple-700 font-semibold text-xs pl-1">
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
                        leadNotice < 7
                          ? "text-amber-800 bg-amber-50 border-amber-200"
                          : "text-emerald-800 bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      {leadNotice < 7 ? `${leadNotice}d notice` : "✓ Safe Slot"}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                    {ev.title}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{format(startDate, "MMM d, yyyy")}</span>
                    <span>•</span>
                    <span className="truncate">{ev.venue?.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:flex p-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center items-center justify-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↑</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px]">↓</kbd>
            <span>Use keys to navigate queue</span>
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
              {/* Mobile Sub-Navigation Bar (Hidden on desktop) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 md:hidden">
                <button
                  type="button"
                  onClick={() => onSetMobileDetailView(false)}
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

                  {/* On desktop, show lead notice badge aligned with organizer */}
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
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100/80">
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
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100/80">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Venue & Capacity
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {activeEvent.venue?.name || "Campus Venue"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {activeEvent.venue?.building} • Capacity: {activeEvent.venue?.capacity || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Safe Slot Clearance / Conflict Alert */}
                <div className="pt-3 border-t border-slate-100">
                  {checkingActiveConflict ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                      <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Verifying venue occupancy & campus schedule...</span>
                    </div>
                  ) : activeConflictResult?.hasConflict ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-amber-950">
                          Venue Collision Detected
                        </div>
                        <div className="mt-0.5 text-amber-800 leading-relaxed">
                          {activeConflictResult.message}
                        </div>
                      </div>
                    </div>
                  ) : activeConflictResult?.hasLeadTimeViolation ? (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-amber-950">Notice Policy Exception: </span>
                        <span className="text-amber-800">
                          Submitted with {activeConflictResult.leadTimeDays}d notice (policy: 7d). Venue is available.
                        </span>
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

              {/* Compact Poster Preview */}
              <div>
                <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1.5">
                  Event Poster
                </div>
                <div
                  onClick={() => onInspectLiveNotice(activeEvent)}
                  className="relative aspect-[21/9] max-h-36 sm:max-h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer group"
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

              {/* Decision Action Bar - Inline directly below poster */}
              <div className="pt-3 sm:pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onInspectLiveNotice(activeEvent)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inspect Live Notice</span>
                </button>

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
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0"
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
