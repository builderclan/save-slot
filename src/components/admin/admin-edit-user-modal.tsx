"use client";

import { AdminUserRow } from "./admin-users-view";

interface AdminEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  user: AdminUserRow | null;
  name: string;
  onNameChange: (v: string) => void;
  role: "admin" | "principal" | "vice_principal" | "organizer";
  onRoleChange: (r: "admin" | "principal" | "vice_principal" | "organizer") => void;
  communityId: string;
  onCommunityIdChange: (id: string) => void;
  communities: Array<{ id: string; name: string }>;
  error: string | null;
  isSubmitting?: boolean;
}

export function AdminEditUserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  name,
  onNameChange,
  role,
  onRoleChange,
  communityId,
  onCommunityIdChange,
  communities,
  error,
  isSubmitting = false,
}: AdminEditUserModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Edit User Account
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Update role permissions or assigned community for <span className="font-mono font-medium text-slate-700">{user.email}</span>.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) =>
                onRoleChange(e.target.value as "admin" | "principal" | "vice_principal" | "organizer")
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
                onChange={(e) => onCommunityIdChange(e.target.value)}
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
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}
