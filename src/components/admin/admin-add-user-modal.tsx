"use client";

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  onNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  role: "admin" | "principal" | "organizer";
  onRoleChange: (r: "admin" | "principal" | "organizer") => void;
  communityId: string;
  onCommunityIdChange: (id: string) => void;
  communities: Array<{ id: string; name: string }>;
  error: string | null;
}

export function AdminAddUserModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  role,
  onRoleChange,
  communityId,
  onCommunityIdChange,
  communities,
  error,
}: AdminAddUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 z-10 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Provision New User Account
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Create official credentials for an Administrator or Community Lead.
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
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="e.g. elena@campus.edu"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) =>
                onRoleChange(e.target.value as "admin" | "principal" | "organizer")
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="organizer">Community Lead</option>
              <option value="principal">College Principal (Executive Approver)</option>
              <option value="admin">Campus Administrator (Operations)</option>
            </select>
          </div>

          {role === "organizer" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Community</label>
              <select
                value={communityId}
                onChange={(e) => onCommunityIdChange(e.target.value)}
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
