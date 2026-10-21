"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

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

const ROLE_OPTIONS = [
  { value: "organizer", label: "Community Lead" },
  { value: "principal", label: "College Principal (Executive Approver)" },
  { value: "vice_principal", label: "Vice Principal (Executive Approver)" },
  { value: "admin", label: "Campus Administrator (Operations)" },
];

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

  const communityOptions = useMemo(
    () => [
      { value: "", label: "Select Club..." },
      ...communities.map((c) => ({ value: c.id, label: c.name })),
    ],
    [communities]
  );

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
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Elena Rostova"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Campus Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. elena@campus.edu"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 mb-1">Temporary Password *</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters (e.g. TempPass#2026)"
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
              label="Assigned Community"
              value={communityId}
              onChange={(val) => setCommunityId(val)}
              options={communityOptions}
            />
          </div>
        )}

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
            {isSubmitting ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
