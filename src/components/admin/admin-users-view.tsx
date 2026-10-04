"use client";

import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  community_name?: string;
  community_slug?: string;
}

interface AdminUsersViewProps {
  users: AdminUserRow[];
  onAddUserClick: () => void;
}

export function AdminUsersView({ users, onAddUserClick }: AdminUsersViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Administrators provision user accounts directly. Public registration is closed.
        </p>
        <button
          type="button"
          onClick={onAddUserClick}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create User Account</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[540px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">Name & Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Assigned Community</th>
                <th className="p-4 font-semibold">Provisioned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-900 text-sm">{u.full_name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === "principal"
                          ? "bg-purple-50 border-purple-200 text-purple-900"
                          : u.role === "vice_principal"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                          : u.role === "admin"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {u.role === "principal"
                        ? "College Principal"
                        : u.role === "vice_principal"
                        ? "Vice Principal"
                        : u.role === "admin"
                        ? "Campus Admin"
                        : "Community Lead"}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">
                    {u.community_name ||
                      (u.role === "admin" || u.role === "principal" || u.role === "vice_principal"
                        ? "All (Campus-Wide)"
                        : "Unassigned")}
                  </td>
                  <td className="p-4 text-slate-400">
                    {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "Pre-seeded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
