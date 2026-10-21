"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminUserRow } from "./admin-users-view";

export interface EditUserData {
  fullName: string;
  role: "admin" | "principal" | "vice_principal" | "organizer";
  communityId: string | null;
}

export interface AdminEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, data: EditUserData) => Promise<void>;
  user: AdminUserRow | null;
  communities: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

const ROLE_OPTIONS = [
  { value: "organizer", label: "Community Lead (Club Organizer)" },
  { value: "principal", label: "College Principal (Final Sign-off Authority)" },
  { value: "vice_principal", label: "Vice Principal (Academic Review)" },
  { value: "admin", label: "Campus Administrator (Full Operations Access)" },
];

export function AdminEditUserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  communities,
  isSubmitting = false,
}: AdminEditUserModalProps) {
  const [name, setName] = useState(user?.full_name || "");
  const [role, setRole] = useState<"admin" | "principal" | "vice_principal" | "organizer">(
    (user?.role as "admin" | "principal" | "vice_principal" | "organizer") || "organizer"
  );
  const [communityId, setCommunityId] = useState(user?.community_id || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.full_name || "");
      setRole((user.role as "admin" | "principal" | "vice_principal" | "organizer") || "organizer");
      setCommunityId(user.community_id || "");
      setError(null);
    }
  }, [user, isOpen]);

  const communityOptions = useMemo(
    () => [
      { value: "", label: "-- Select a recognized club / society --" },
      ...communities.map((c) => ({ value: c.id, label: c.name })),
    ],
    [communities]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    try {
      await onSubmit(user.id, {
        fullName: name.trim(),
        role,
        communityId: role === "organizer" ? communityId || null : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating user");
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!user}
      onClose={onClose}
      title="Edit User Account"
      description={
        user ? `Update role permissions or assigned community for ${user.email}.` : ""
      }
    >
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
          />
        </div>

        <div>
          <Select
            label="Role *"
            value={role}
            onChange={(val) =>
              setRole(val as "admin" | "principal" | "vice_principal" | "organizer")
            }
            options={ROLE_OPTIONS}
          />
        </div>

        {role === "organizer" && (
          <div>
            <Select
              label="Assigned Student Community *"
              value={communityId}
              onChange={(val) => setCommunityId(val)}
              options={communityOptions}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
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
            className="px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
