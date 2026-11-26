"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminUserRow, CommunityScope, EventCategory } from "@/types/database";

export interface NewCommunityData {
  name: string;
  code: string;
  slug: string;
  scope: CommunityScope;
  category: EventCategory;
  description: string;
  logoUrl: string;
  website: string;
  instagram: string;
  leadUserId: string;
  ticUserIds: string[];
}

interface AdminAddCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewCommunityData) => Promise<void>;
  eligibleUsers: AdminUserRow[];
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

function suggestCode(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const candidate =
    words.length === 1
      ? words[0].slice(0, 8)
      : words.map((w) => w[0]).join("").slice(0, 8);
  if (candidate.length >= 2) return candidate;
  const compact = words.join("").slice(0, 8);
  return compact.length >= 2 ? compact : "";
}

export function AdminAddCommunityModal({
  isOpen,
  onClose,
  onSubmit,
  eligibleUsers,
  isSubmitting = false,
}: AdminAddCommunityModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [slug, setSlug] = useState("");
  const [scope, setScope] = useState<CommunityScope>("internal");
  const [category, setCategory] = useState<EventCategory>("Tech");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [leadUserId, setLeadUserId] = useState("");
  const [ticUserIds, setTicUserIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCode("");
      setCodeManuallyEdited(false);
      setFormError(null);
      setSlug("");
      setScope("internal");
      setCategory("Tech");
      setDescription("");
      setLogoUrl("");
      setWebsite("");
      setInstagram("");
      setLeadUserId("");
      setTicUserIds([]);
    }
  }, [isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!codeManuallyEdited) {
      setCode(suggestCode(val));
    }
  };

  const leadOptions = useMemo(
    () => [
      { value: "", label: "Unassigned (No Lead Yet)" },
      ...eligibleUsers
        .filter((u) => ["lead", "staff"].includes(u.role))
        .map((u) => ({ value: u.id, label: `${u.full_name} (${u.role.toUpperCase()})` })),
    ],
    [eligibleUsers]
  );

  const facultyTicPool = useMemo(
    () => eligibleUsers.filter((u) => ["tic", "staff", "hod"].includes(u.role)),
    [eligibleUsers]
  );

  const toggleTic = (userId: string) => {
    setTicUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,20}$/.test(normalizedCode)) {
      setFormError("Reference code must be 2–20 uppercase letters or numbers (no spaces).");
      return;
    }
    setFormError(null);
    await onSubmit({
      name: name.trim(),
      code: normalizedCode,
      slug,
      scope,
      category,
      description,
      logoUrl,
      website,
      instagram,
      leadUserId,
      ticUserIds,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Community or Chapter"
      description="Create an internal college club or external chapter (IEEE, CSI, NSS, IEDC) and assign TICs."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2">
            <label
              htmlFor="add-community-name"
              className="block text-xs font-semibold text-zinc-900 mb-1"
            >
              Community Name *
            </label>
            <input
              id="add-community-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. IEEE Student Branch"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="add-community-code"
              className="block text-xs font-semibold text-zinc-900 mb-1"
            >
              Ref. Code *
            </label>
            <input
              id="add-community-code"
              type="text"
              required
              minLength={2}
              value={code}
              onChange={(e) => {
                setCodeManuallyEdited(true);
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="e.g. IEEE"
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-mono font-bold uppercase text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Select
            label="Governance Scope *"
            value={scope}
            onChange={(val) => setScope(val as CommunityScope)}
            options={[
              { value: "internal", label: "Internal Club (Direct Exec)" },
              { value: "external", label: "External Chapter (HOD + VP Gate)" },
            ]}
          />

          <Select
            label="Category *"
            value={category}
            onChange={(val) => setCategory(val as EventCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              URL Slug (Optional)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="auto-generated"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Primary Student Lead"
            value={leadUserId}
            onChange={setLeadUserId}
            options={leadOptions}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Logo URL (Optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-900">
              Faculty Teachers-in-Charge (Multi-TIC)
            </label>
            <span className="text-[11px] text-zinc-500">
              {ticUserIds.length} selected
            </span>
          </div>
          {facultyTicPool.length === 0 ? (
            <p className="text-xs text-zinc-500 px-3 py-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
              No faculty accounts available yet. Provision Staff or TIC users first.
            </p>
          ) : (
            <div className="max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70">
              {facultyTicPool.map((u) => {
                const selected = ticUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                      selected
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                        : "bg-white border-zinc-200/70 text-zinc-700 hover:bg-zinc-100/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTic(u.id)}
                      className="h-3.5 w-3.5 accent-indigo-600"
                    />
                    <span className="truncate">{u.full_name}</span>
                    <span className="ml-auto text-[10px] uppercase text-zinc-400 font-mono">
                      {u.department_code || u.role}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly summarize mission, activities, and governing body..."
            className="w-full px-3.5 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Instagram Handle
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@aisat.chapter"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
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
            {isSubmitting ? "Creating..." : "Create Community"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
