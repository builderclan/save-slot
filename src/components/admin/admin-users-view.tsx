"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Shield,
  GraduationCap,
  Sparkles,
  UserCheck,
} from "lucide-react";

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "principal" | "vice_principal" | "organizer";
  community_id?: string | null;
  community_name?: string | null;
  created_at?: string;
}

interface AdminUsersViewProps {
  users: AdminUserRow[];
  currentUserId?: string;
  onAddUserClick: () => void;
  onEditUserClick: (user: AdminUserRow) => void;
  onDeleteUserClick: (user: AdminUserRow) => void;
  actionInProgress?: string | null;
}

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.full_name || "").toLowerCase().includes(q);
        const matchesEmail = (u.email || "").toLowerCase().includes(q);
        const matchesClub = (u.community_name || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesClub;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "principal":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-50 border-purple-200 text-purple-900">
            <GraduationCap className="w-3 h-3 text-purple-700" />
            <span>Principal</span>
          </span>
        );
      case "vice_principal":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-indigo-50 border-indigo-200 text-indigo-900">
            <Sparkles className="w-3 h-3 text-indigo-700" />
            <span>Vice Principal</span>
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 border-amber-200 text-amber-900">
            <Shield className="w-3 h-3 text-amber-700" />
            <span>Campus Admin</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-50 border-slate-200 text-slate-800">
            <UserCheck className="w-3 h-3 text-slate-500" />
            <span>Community Lead</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">User Accounts</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums border border-slate-200/60">
                {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
              </span>
              <span className="hidden sm:inline-block text-slate-300">•</span>
              <p className="hidden sm:block text-xs text-slate-500">
                Staff & organizer permissions
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, club..."
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors h-7.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onAddUserClick}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-7.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Role Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: `All Roles (${users.length})` },
              { id: "admin", label: "Administrators" },
              { id: "principal", label: "Principal" },
              { id: "vice_principal", label: "Vice Principal" },
              { id: "organizer", label: "Community Leads" },
            ].map((role) => {
              const isSelected = roleFilter === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setRoleFilter(role.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-0 md:p-5">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-xl border border-dashed border-slate-200 bg-white m-4 md:m-0">
              <p className="text-sm font-semibold text-slate-800">No user accounts found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or role filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Mobile View (< md) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white border-y border-slate-200">
                {filteredUsers.map((u) => {
                  const isSelf = currentUserId === u.id;
                  return (
                    <div key={u.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-mono text-xs">{u.email}</div>
                        </div>
                        {getRoleBadge(u.role)}
                      </div>

                      <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                        <span>
                          <strong className="text-slate-700 font-medium">Assignment:</strong>{" "}
                          {u.community_name ||
                            (u.role === "admin" || u.role === "principal" || u.role === "vice_principal"
                              ? "All Campus"
                              : "Unassigned")}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "Pre-seeded"}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                        <button
                          type="button"
                          onClick={() => onEditUserClick(u)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            disabled={actionInProgress === u.id}
                            onClick={() => onDeleteUserClick(u)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-medium text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (md+) */}
              <div className="hidden md:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-600 text-[11px] font-semibold tracking-wide border-b border-slate-200 select-none">
                      <tr>
                        <th className="py-2.5 px-4">User Identity</th>
                        <th className="py-2.5 px-4">System Role</th>
                        <th className="py-2.5 px-4">Assigned Community</th>
                        <th className="py-2.5 px-4">Registered Date</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isSelf = currentUserId === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/90 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                <span>{u.full_name}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                            </td>
                            <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {u.community_name ||
                                (u.role === "admin" || u.role === "principal" || u.role === "vice_principal"
                                  ? "All Campus"
                                  : "Unassigned")}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "Pre-seeded"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onEditUserClick(u)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    disabled={actionInProgress === u.id}
                                    onClick={() => onDeleteUserClick(u)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                                    title="Delete Account"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
