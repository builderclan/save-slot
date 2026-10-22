"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { EventCategory } from "@/types/database";

export interface NewCommunityData {
  name: string;
  slug: string;
  category: EventCategory;
  description: string;
  logoUrl: string;
  website: string;
  instagram: string;
  leadUserId: string;
}

export interface AdminAddCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewCommunityData) => Promise<void>;
  eligibleUsers: Array<{ id: string; fullName: string; email: string; role: string }>;
  isSubmitting?: boolean;
}

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

export function AdminAddCommunityModal({
  isOpen,
  onClose,
  onSubmit,
  eligibleUsers,
  isSubmitting = false,
}: AdminAddCommunityModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<EventCategory>("Tech");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [leadUserId, setLeadUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSlug("");
      setCategory("Tech");
      setDescription("");
      setLogoUrl("");
      setWebsite("");
      setInstagram("");
      setLeadUserId("");
      setError(null);
    }
  }, [isOpen]);

  const slugify = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(val));
    }
  };

  const categoryOptions = useMemo(
    () => CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    []
  );

  const leadUserOptions = useMemo(
    () => [
      { value: "", label: "Unassigned (Assign later)" },
      ...eligibleUsers.map((u) => ({
        value: u.id,
        label: `${u.fullName} (${u.email})`,
      })),
    ],
    [eligibleUsers]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!name.trim() || !cleanSlug) {
      setError("Club name and a valid slug are required.");
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        slug: cleanSlug,
        category,
        description: description.trim(),
        logoUrl: logoUrl.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        leadUserId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating community");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Student Community"
      description="Create a student club, chapter, or campus society for event hosting and student engagement."
      maxWidth="lg"
    >
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Club Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Developer Student Club"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">URL Identifier (Slug) *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. dsc-aisat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs font-mono transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Select
              label="Category *"
              value={category}
              onChange={(val) => setCategory(val as EventCategory)}
              options={categoryOptions}
            />
          </div>

          <div>
            <Select
              label="Designated Club Lead"
              value={leadUserId}
              onChange={(val) => setLeadUserId(val)}
              options={leadUserOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Mission / Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief charter description of this campus student society..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Official Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Instagram Handle</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@clubname"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all text-[11px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Registering..." : "Register Club"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
