"use client";

import { useState, useMemo } from "react";
import { Users, Plus, Search, Edit2, Trash2, X, Mail, ShieldCheck, Building2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import type { AdminUserRow, UserRole } from "@/types/database";

interface AdminUsersViewProps {
  users: AdminUserRow[];
  currentUserId?: string;
  onAddUserClick: () => void;
  onEditUserClick: (user: AdminUserRow) => void;
  onDeleteUserClick: (user: AdminUserRow) => void;
  actionInProgress?: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "IT Admin",
  principal: "Principal",
  vice_principal: "Vice Principal",
  hod: "HOD",
  fic: "FIC",
  staff: "Faculty / Staff",
  lead: "Student Lead",
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-amber-50 text-amber-800 border-amber-200/80",
  principal: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  vice_principal: "bg-violet-50 text-violet-700 border-violet-200/80",
  hod: "bg-teal-50 text-teal-700 border-teal-200/80",
  fic: "bg-sky-50 text-sky-700 border-sky-200/80",
  staff: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
  lead: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
};

export function AdminUsersView({
  users,
  currentUserId,
  onAddUserClick,
  onEditUserClick,
  onDeleteUserClick,
  actionInProgress,
}: AdminUsersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q) ||
        (u.designation || "").toLowerCase().includes(q) ||
        (u.department_code || "").toLowerCase().includes(q) ||
        (u.department_name || "").toLowerCase().includes(q) ||
        (u.community_name || "").toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const roleOptions = useMemo(
    () => [
      { value: "all", label: `All Roles (${users.length})` },
      ...(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({
        value: role,
        label: `${ROLE_LABELS[role]} (${users.filter((u) => u.role === role).length})`,
      })),
    ],
    [users]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">User Directory</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium tabular-nums border border-zinc-200/60">
                {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-44 hidden md:block">
                <Select
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={roleOptions}
                  size="sm"
                  aria-label="Filter users by role"
                />
              </div>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, dept, role..."
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors h-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onAddUserClick}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-8 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions}
              size="sm"
              aria-label="Filter users by role"
            />
          </div>
        </div>

        <div className="p-0 md:p-5">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white m-4 md:m-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-800 mb-1">No matching accounts</h4>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                Provision faculty, HOD, FIC, executive, or student lead accounts to assign responsibilities.
              </p>
              <button
                type="button"
                onClick={onAddUserClick}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Provision User</span>
              </button>
            </div>
          ) : (
            <div className="bg-white md:rounded-2xl md:border md:border-zinc-200/80 md:shadow-2xs overflow-hidden">
              {/* Mobile edge-to-edge list */}
              <div className="divide-y divide-zinc-100 md:hidden">
                {filteredUsers.map((u) => {
                  const isSelf = currentUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="px-4 py-3.5 flex items-start justify-between gap-3 active:bg-zinc-50/80"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <UserAvatar
                          name={u.full_name}
                          role={u.role}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {u.full_name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                            {u.is_active === false && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0 text-zinc-400" />
                            <span className="truncate">{u.email}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ROLE_BADGE_CLASSES[u.role]
                              }`}
                            >
                              {ROLE_LABELS[u.role]}
                            </span>
                            {u.department_code && (
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                                {u.department_code}
                              </span>
                            )}
                            {u.community_name && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                {u.community_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditUserClick(u)}
                          disabled={actionInProgress === u.id}
                          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          aria-label={`Edit ${u.full_name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => onDeleteUserClick(u)}
                            disabled={actionInProgress === u.id}
                            className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            aria-label={`Delete ${u.full_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop ledger table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="py-2.5 px-4">Member</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Community / Scope</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {filteredUsers.map((u) => {
                      const isSelf = currentUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={u.full_name} role={u.role} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-zinc-900 truncate">
                                    {u.full_name}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                      You
                                    </span>
                                  )}
                                  {u.is_active === false && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-500 truncate">
                                  {u.designation ? `${u.designation} • ` : ""}
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                ROLE_BADGE_CLASSES[u.role]
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {ROLE_LABELS[u.role]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.department_code ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">
                                <Building2 className="w-3 h-3 text-zinc-400" />
                                <span className="font-mono font-bold">{u.department_code}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.community_name ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-zinc-800">{u.community_name}</span>
                                {u.community_member_role && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                    {u.community_member_role}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditUserClick(u)}
                                disabled={actionInProgress === u.id}
                                className="px-2.5 py-1 rounded-lg border border-zinc-200 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteUserClick(u)}
                                  disabled={actionInProgress === u.id}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
