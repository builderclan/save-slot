"use client";

import { EventCategory, AdminCommunityRow } from "@/types/database";
import { Check, X } from "lucide-react";

interface EligibleUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface AdminEditCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  community: AdminCommunityRow | null;
  name: string;
  onNameChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  category: EventCategory;
  onCategoryChange: (v: EventCategory) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  logoUrl: string;
  onLogoUrlChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  instagram: string;
  onInstagramChange: (v: string) => void;
  leadUserId: string;
  onLeadUserIdChange: (v: string) => void;
  status: "approved" | "pending" | "rejected";
  onStatusChange: (v: "approved" | "pending" | "rejected") => void;
  eligibleUsers: EligibleUser[];
  error: string | null;
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
  name,
  onNameChange,
  slug,
  onSlugChange,
  category,
  onCategoryChange,
  description,
  onDescriptionChange,
  logoUrl,
  onLogoUrlChange,
  website,
  onWebsiteChange,
  instagram,
  onInstagramChange,
  leadUserId,
  onLeadUserIdChange,
  status,
  onStatusChange,
  eligibleUsers,
  error,
  isSubmitting = false,
}: AdminEditCommunityModalProps) {
  if (!isOpen || !community) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white text-slate-900 p-5 sm:p-6 z-10 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Edit Community: {community.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update organization profile, assigned lead, or recognition status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Community Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Coding Club"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Slug / Handle *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">/@{slug}</span>
              </div>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value as EventCategory)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointed Community Lead
              </label>
              <select
                value={leadUserId}
                onChange={(e) => onLeadUserIdChange(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="">(None / No Lead)</option>
                {Array.from(new Map(eligibleUsers.map((u) => [u.id, u])).values()).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recognition Status
              </label>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value as "approved" | "pending" | "rejected")}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="approved">Approved & Active</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected / Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Mission
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief summary of activities and workshops..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => onLogoUrlChange(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => onWebsiteChange(e.target.value)}
                placeholder="https://club.campus.edu"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => onInstagramChange(e.target.value)}
                placeholder="@clubhandle"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-semibold text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
