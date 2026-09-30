"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { eventService } from "@/lib/data/store";
import { Venue, EventCategory, ConflictReport, EventStatus } from "@/types/database";
import { ConflictAlert } from "@/components/conflicts/conflict-alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [venues, setVenues] = React.useState<Venue[]>([]);

  // Form Fields
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<EventCategory>("Tech");
  const [date, setDate] = React.useState("2026-09-18");
  const [startTime, setStartTime] = React.useState("17:00");
  const [endTime, setEndTime] = React.useState("19:00");
  const [venueId, setVenueId] = React.useState<string>("");
  const [isVirtual, setIsVirtual] = React.useState(false);
  const [virtualLink, setVirtualLink] = React.useState("");
  const [requiresRegistration, setRequiresRegistration] = React.useState(true);
  const [externalRegUrl, setExternalRegUrl] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [status, setStatus] = React.useState<EventStatus>("published");

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

  // Load event and venues
  React.useEffect(() => {
    let isMounted = true;
    Promise.all([eventService.getEventById(eventId), eventService.getVenues()])
      .then(([eventData, venueData]) => {
        if (!isMounted) return;
        if (!eventData) {
          router.push("/organizer");
          return;
        }
        setVenues(venueData);
        setTitle(eventData.title);
        setCategory(eventData.category);
        try {
          setDate(format(parseISO(eventData.start_time), "yyyy-MM-dd"));
          setStartTime(format(parseISO(eventData.start_time), "HH:mm"));
          setEndTime(format(parseISO(eventData.end_time), "HH:mm"));
        } catch {
          // fallback
        }
        setVenueId(eventData.venue_id || "");
        setIsVirtual(eventData.is_virtual);
        setVirtualLink(eventData.virtual_link || "");
        setRequiresRegistration(Boolean(eventData.external_registration_url));
        setExternalRegUrl(eventData.external_registration_url || "");
        setCoverImageUrl(eventData.cover_image_url || "");
        setDescription(eventData.description);
        setTagsInput(eventData.tags?.join(", ") || "");
        setStatus(eventData.status);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load event");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, router]);

  // Real-time conflict detector (debounced live PostgreSQL RPC check)
  const [conflictReport, setConflictReport] = React.useState<ConflictReport>({
    hasVenueConflict: false,
    hasScheduleOverlap: false,
    venueConflicts: [],
    scheduleOverlaps: [],
  });

  React.useEffect(() => {
    if (!date || !startTime || !endTime) return;

    const timer = setTimeout(async () => {
      try {
        const startIso = `${date}T${startTime}:00Z`;
        const endIso = `${date}T${endTime}:00Z`;

        const report = await eventService.checkConflicts({
          eventId,
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
  }, [date, startTime, endTime, venueId, isVirtual, eventId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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

    setSaving(true);
    setError(null);

    try {
      await eventService.updateEvent(eventId, {
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        start_time: startIso,
        end_time: endIso,
        venue_id: isVirtual ? null : venueId || null,
        location_name: locationName,
        is_virtual: isVirtual,
        virtual_link: isVirtual ? virtualLink.trim() : null,
        external_registration_url: requiresRegistration && externalRegUrl.trim() ? externalRegUrl.trim() : null,
        cover_image_url: coverImageUrl.trim() || null,
        status,
      });

      router.push("/organizer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-xs text-slate-500">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading event details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Edit Event: {title || "Event"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update timing, venue, or details. Real-time conflict checks will re-verify availability.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        </div>

        {/* Real-time conflict alert */}
        {(conflictReport.hasVenueConflict || conflictReport.hasScheduleOverlap) && (
          <ConflictAlert report={conflictReport} />
        )}

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Title and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
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

          {/* Date and Time Fields */}
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
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="Stream Link"
                  value={virtualLink}
                  onChange={(e) => setVirtualLink(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg"
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
                  name="registrationOptionEdit"
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
                  name="registrationOptionEdit"
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

          {/* Status Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Event Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium"
            >
              <option value="published">Published (Visible to all students)</option>
              <option value="draft">Draft (Hidden from public calendar)</option>
              <option value="pending">Pending Admin Review</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Event Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/organizer"
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Discard Changes
            </Link>

            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving Changes..." : "Save Event Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
