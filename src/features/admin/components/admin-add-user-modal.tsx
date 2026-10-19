"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

export interface NewUserData {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "principal" | "vice_principal" | "organizer";
  communityId: string;
}

export interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewUserData) => Promise<void>;
  communities: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

export function AdminAddUserModal({
  isOpen,
  onClose,
  onSubmit,
  communities,
  isSubmitting = false,
}: AdminAddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "principal" | "vice_principal" | "organizer">("organizer");
  const [communityId, setCommunityId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("organizer");
      setCommunityId("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        fullName: name.trim(),
        email: email.trim(),
        password,
        role,
        communityId: role === "organizer" ? communityId : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating user account");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision New User Account"
      description="Create official credentials for an Administrator, Executive Approver, or Community Lead."
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
            placeholder="e.g. Elena Rostova"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. elena@campus.edu"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters (e.g. TempPass#2026)"
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
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
          >
            <option value="organizer">Community Lead</option>
            <option value="principal">College Principal (Executive Approver)</option>
            <option value="vice_principal">Vice Principal (Executive Approver)</option>
            <option value="admin">Campus Administrator (Operations)</option>
          </select>
        </div>

        {role === "organizer" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Community</label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="">Select Club...</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {isSubmitting ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
