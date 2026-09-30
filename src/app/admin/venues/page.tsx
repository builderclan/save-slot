"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Venue } from "@/types/database";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  PlusCircle,
  Users,
  MapPin,
} from "lucide-react";

export default function AdminVenuesPage() {
  const [version, setVersion] = React.useState(0);
  const [showAddForm, setShowAddForm] = React.useState(false);

  // New venue form fields
  const [name, setName] = React.useState("");
  const [building, setBuilding] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    eventService
      .getAllVenues()
      .then((data) => {
        if (isMounted) setVenues(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load venues");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !building.trim()) return;

    try {
      await eventService.createVenue({
        campus_id: "", // Derived server-side
        name: name.trim(),
        building: building.trim(),
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: true,
      });

      setName("");
      setBuilding("");
      setCapacity("");
      setAddress("");
      setNotes("");
      setShowAddForm(false);
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create venue");
    }
  };

  const toggleVenueActive = async (venue: Venue) => {
    try {
      await eventService.updateVenue(venue.id, { is_active: !venue.is_active });
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle venue status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Campus Venues & Facilities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure physical auditoriums, labs, and spaces available for student booking.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {showAddForm ? "Cancel" : "Add Campus Venue"}
        </button>
      </div>

      {/* Add New Venue Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateVenue}
          className="bg-white p-6 rounded-2xl border border-blue-200 shadow-xs space-y-4 text-xs animate-in fade-in duration-150"
        >
          <h3 className="text-sm font-bold text-slate-900">New Campus Venue Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Turing Auditorium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Building *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Computer Science Center"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                placeholder="e.g., 250"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Address / Location Hint
              </label>
              <input
                type="text"
                placeholder="e.g., Level 1, North Wing"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Equipment & Notes
              </label>
              <input
                type="text"
                placeholder="e.g., Dual 4K projectors, microphone, stage"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Save Venue
            </button>
          </div>
        </form>
      )}

      {/* Venues Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 animate-pulse">
          <p className="text-sm font-semibold text-slate-700">Loading venues...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 text-center rounded-2xl border border-red-200">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className={`p-5 bg-white rounded-2xl border shadow-xs transition flex flex-col justify-between ${
              venue.is_active ? "border-slate-200" : "border-slate-200/60 opacity-60 bg-slate-50"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {venue.building}
                </span>

                <button
                  onClick={() => toggleVenueActive(venue)}
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    venue.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {venue.is_active ? "Active" : "Archived"}
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-900">{venue.name}</h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {venue.capacity && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Capacity: {venue.capacity}
                  </span>
                )}
                {venue.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {venue.address}
                  </span>
                )}
              </div>

              {venue.notes && (
                <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-100 mt-2">
                  Notes: {venue.notes}
                </p>
              )}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
