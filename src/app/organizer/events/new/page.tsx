"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { eventService } from "@/lib/data/store";
import { Community, Venue, EventCategory, ConflictReport } from "@/types/database";
import { slugify } from "@/lib/utils";
import { ConflictAlert } from "@/components/conflicts/conflict-alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Users,
} from "lucide-react";

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCommunityId = searchParams.get("communityId");

  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Form Fields
  const [communityId, setCommunityId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<EventCategory>("Tech");
  const [date, setDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = React.useState("16:30");
  const [endTime, setEndTime] = React.useState("18:30");
  const [venueId, setVenueId] = React.useState<string>("");
  const [isVirtual, setIsVirtual] = React.useState(false);
  const [virtualLink, setVirtualLink] = React.useState("");
  const [requiresRegistration, setRequiresRegistration] = React.useState(true);
  const [externalRegUrl, setExternalRegUrl] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");

  // Auto-advance endTime if missing or invalid relative to startTime
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    if (!endTime || endTime <= newStartTime) {
      const parts = newStartTime.split(":");
      if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parts[1];
        if (!isNaN(h)) {
          const nextH = (h + 1) % 24;
          setEndTime(`${String(nextH).padStart(2, "0")}:${m}`);
        }
      }
    }
  };

  const [conflictReport, setConflictReport] = React.useState<ConflictReport>({
    hasVenueConflict: false,
    hasScheduleOverlap: false,
    venueConflicts: [],
    scheduleOverlaps: [],
  });

  // Load communities and venues
  React.useEffect(() => {
    let isMounted = true;
    Promise.all([eventService.getCommunities(), eventService.getVenues()])
      .then(([commData, venueData]) => {
        if (!isMounted) return;
        setCommunities(commData);
        setVenues(venueData);
        if (commData.length > 0) {
          const hasParam = paramCommunityId && commData.some((c) => c.id === paramCommunityId);
          setCommunityId(hasParam ? paramCommunityId : commData[0].id);
        }
        if (venueData.length > 0) setVenueId(venueData[0].id);
      })
      .catch((err) => {
        if (isMounted) setSubmitError(err.message || "Failed to load campus resources");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [paramCommunityId]);

  // Real-time conflict detector (debounced live PostgreSQL RPC check)
  React.useEffect(() => {
    if (!date || !startTime || !endTime) {
      setConflictReport({
        hasVenueConflict: false,
        hasScheduleOverlap: false,
        venueConflicts: [],
        scheduleOverlaps: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const startIso = `${date}T${startTime}:00Z`;
        const endIso = `${date}T${endTime}:00Z`;

        const report = await eventService.checkConflicts({
          venueId: isVirtual ? null : venueId || null,
          startTime: startIso,
          endTime: endIso,
        });
        setConflictReport(report);
      } catch {
        // Ignore background conflict check error
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [date, startTime, endTime, venueId, isVirtual]);

  const handleSubmit = async (targetStatus: "draft" | "published" | "pending") => {
    if (!title.trim()) {
      alert("Please provide an event title.");
      return;
    }

    if (endTime <= startTime) {
      alert("End time must be after start time.");
      return;
    }

    const startIso = `${date}T${startTime}:00Z`;
    const endIso = `${date}T${endTime}:00Z`;
    const selectedVenue = venues.find((v) => v.id === venueId);
    const locationName = isVirtual
      ? "Virtual Event"
      : selectedVenue
      ? `${selectedVenue.name} (${selectedVenue.building})`
      : "Campus Venue";

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    setSubmitError(null);

    try {
      await eventService.createEvent({
        campus_id: "", // Will be strictly derived server-side
        community_id: communityId,
        venue_id: isVirtual ? null : venueId || null,
        title: title.trim(),
        slug: `${slugify(title)}-${Date.now().toString().slice(-4)}`,
        description: description.trim(),
        category: category,
        tags: tags.length > 0 ? tags : [category],
        start_time: startIso,
        end_time: endIso,
        timezone: "America/New_York",
        location_name: locationName,
        is_virtual: isVirtual,
        virtual_link: isVirtual ? virtualLink.trim() : null,
        external_registration_url: requiresRegistration && externalRegUrl.trim() ? externalRegUrl.trim() : null,
        cover_image_url: coverImageUrl.trim() || null,
        status: targetStatus,
        created_by: "", // Will be strictly derived server-side
      });

      router.push("/organizer");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create event in database");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-xs text-slate-500">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading campus communities and venues...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Organizer Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Create Campus Event
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish an event for students to discover. Live conflict detection will check venue and schedule availability.
          </p>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <p className="font-semibold">Unable to create event</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        )}

        {/* Live Conflict Warning Box */}
        {(conflictReport.hasVenueConflict || conflictReport.hasScheduleOverlap) && (
          <ConflictAlert report={conflictReport} />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("published");
          }}
          className="space-y-5 text-xs"
        >
          {/* Community & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hosting Community *
              </label>
              {communities.length === 1 ? (
                <div className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between">
                  <span>{communities[0].name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                    Lead
                  </span>
                </div>
              ) : (
                <select
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 font-medium"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Approved Lead)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
              >
                <option value="Tech">Tech</option>
                <option value="Career">Career</option>
                <option value="Arts">Arts</option>
                <option value="Social">Social</option>
                <option value="Sports">Sports</option>
                <option value="Academic">Academic</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>
          </div>

          {/* Event Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Intro to Machine Learning with PyTorch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Date and Times (Triggers conflict detection) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" /> Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> End Time *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full py-2 px-3 bg-white border rounded-lg focus:outline-none focus:ring-1 ${
                  endTime && startTime && endTime <= startTime
                    ? "border-rose-400 focus:ring-rose-400 bg-rose-50/30"
                    : "border-slate-200 focus:ring-slate-400"
                }`}
              />
              {endTime && startTime && endTime <= startTime && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  End time must be after start time.
                </p>
              )}
            </div>
          </div>

          {/* Venue & Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-500" /> Venue / Location *
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={isVirtual}
                  onChange={(e) => setIsVirtual(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>This is a virtual event</span>
              </label>
            </div>

            {!isVirtual ? (
              <div>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.building}) — Cap: {v.capacity || "N/A"}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting a campus venue automatically verifies booking availability against other scheduled events.
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="Stream Link (Zoom, Discord, YouTube Live, etc.)"
                  value={virtualLink}
                  onChange={(e) => setVirtualLink(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            )}
          </div>

          {/* Registration Options: Option A (Registration required) vs Option B (No registration required) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-0.5">
                Event Registration
              </label>
              <p className="text-[11px] text-slate-500">
                Choose whether students must register externally before attending, or if this is an open drop-in event.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                  requiresRegistration
                    ? "bg-blue-50/80 border-blue-300 text-blue-950"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <input
                  type="radio"
                  name="registrationOption"
                  checked={requiresRegistration}
                  onChange={() => setRequiresRegistration(true)}
                  className="mt-0.5 text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold block text-xs">Registration required</span>
                  <span className="text-[11px] text-slate-500 block">
                    Directs students to an external registration URL (Lu.ma, Google Forms, Eventbrite, etc.)
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                  !requiresRegistration
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <input
                  type="radio"
                  name="registrationOption"
                  checked={!requiresRegistration}
                  onChange={() => setRequiresRegistration(false)}
                  className="mt-0.5 text-emerald-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold block text-xs">No registration required</span>
                  <span className="text-[11px] text-slate-500 block">
                    Open event — all campus students can drop in without registering
                  </span>
                </div>
              </label>
            </div>

            {requiresRegistration && (
              <div className="pt-2 space-y-1.5 animate-in fade-in duration-150">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                  External Registration URL (Lu.ma, Google Forms, Eventbrite, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://lu.ma/your-event-slug or https://forms.gle/..."
                  value={externalRegUrl}
                  onChange={(e) => setExternalRegUrl(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Event Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detailed description, agenda, prerequisites, speaker background, food/perks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="Hackathon, AI, Python, Free Food"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Submission Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/organizer"
              className="text-xs text-slate-500 hover:text-slate-900 order-2 sm:order-1"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => handleSubmit("draft")}
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? "Publishing..." : "Publish Event"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading form...</div>}>
      <CreateEventForm />
    </React.Suspense>
  );
}
