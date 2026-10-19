"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import type { AdminCommunityRow, EventCategory } from "@/types/database";

export interface EditCommunityData {
  name: string;
  slug: string;
  category: EventCategory;
  description: string;
  logoUrl: string;
  website: string;
  instagram: string;
  leadUserId: string;
  status: "approved" | "pending" | "rejected";
}

export interface AdminEditCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (communityId: string, data: EditCommunityData) => Promise<void>;
  community: AdminCommunityRow | null;
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

export function AdminEditCommunityModal({
  isOpen,
  onClose,
  onSubmit,
  community,
  eligibleUsers,
  isSubmitting = false,
}: AdminEditCommunityModalProps) {
  const [name, setName] = useState(community?.name || "");
  const [slug, setSlug] = useState(community?.slug || "");
  const [category, setCategory] = useState<EventCategory>(community?.category || "Tech");
  const [description, setDescription] = useState(community?.description || "");
  const [logoUrl, setLogoUrl] = useState(community?.logo_url || "");
  const [website, setWebsite] = useState(community?.website || "");
  const [instagram, setInstagram] = useState(community?.instagram || "");
  const [leadUserId, setLeadUserId] = useState(community?.lead_id || "");
  const [status, setStatus] = useState<"approved" | "pending" | "rejected">(
    community?.status || "approved"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (community && isOpen) {
      setName(community.name);
      setSlug(community.slug);
      setCategory(community.category);
      setDescription(community.description || "");
      setLogoUrl(community.logo_url || "");
      setWebsite(community.website || "");
      setInstagram(community.instagram || "");
      setLeadUserId(community.lead_id || "");
      setStatus(community.status || "approved");
      setError(null);
    }
  }, [community, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;
    setError(null);
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!name.trim() || !cleanSlug) {
      setError("Club name and a valid slug are required.");
      return;
    }
    try {
      await onSubmit(community.id, {
        name: name.trim(),
        slug: cleanSlug,
        category,
        description: description.trim(),
        logoUrl: logoUrl.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        leadUserId,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating community");
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!community}
      onClose={onClose}
      title="Edit Student Community"
      description={community ? `Manage metadata, lead assignment, and status for "${community.name}".` : ""}
      maxWidth="lg"
    >
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Club Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">URL Identifier (Slug) *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Designated Club Lead</label>
            <select
              value={leadUserId}
              onChange={(e) => setLeadUserId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "approved" | "pending" | "rejected")}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
            >
              <option value="approved">Approved & Active</option>
              <option value="pending">Pending Onboarding</option>
              <option value="rejected">Suspended / Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mission / Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Official Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram Handle</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 text-[11px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Saving..." : "Save Community"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
