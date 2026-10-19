"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "admin" | "principal" | "vice_principal" | "organizer")
            }
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
          >
            <option value="organizer">Community Lead (Club Organizer)</option>
            <option value="principal">College Principal (Final Sign-off Authority)</option>
            <option value="vice_principal">Vice Principal (Academic Review)</option>
            <option value="admin">Campus Administrator (Full Operations Access)</option>
          </select>
        </div>

        {role === "organizer" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Student Community *
            </label>
            <select
              required
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
            >
              <option value="">-- Select a recognized club / society --</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
