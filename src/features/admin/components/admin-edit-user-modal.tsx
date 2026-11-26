"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminCommunityRow, AdminUserRow, Department, UserRole } from "@/types/database";

export interface EditUserData {
  fullName: string;
  role: UserRole;
  designation: string;
  departmentId: string;
  communityId: string;
  communityMemberRole: "lead" | "tic" | "member";
  isActive: boolean;
}

interface AdminEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditUserData) => Promise<void>;
  user: AdminUserRow | null;
  communities: AdminCommunityRow[];
  departments: Department[];
  isSubmitting?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "staff", label: "Faculty / Staff (Organizer / Mentor)" },
  { value: "tic", label: "Teacher-in-Charge (TIC)" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "lead", label: "Student Community Lead" },
  { value: "vice_principal", label: "Vice Principal (Executive)" },
  { value: "principal", label: "Principal (Final Approver)" },
  { value: "admin", label: "IT / Ops Administrator" },
];

export function AdminEditUserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  communities,
  departments,
  isSubmitting = false,
}: AdminEditUserModalProps) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [role, setRole] = useState<UserRole>(user?.role || "staff");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [departmentId, setDepartmentId] = useState(user?.department_id || "");
  const [communityId, setCommunityId] = useState(user?.community_id || "");
  const [communityMemberRole, setCommunityMemberRole] = useState<"lead" | "tic" | "member">(
    user?.community_member_role || "member"
  );
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || "");
      setRole(user.role || "staff");
      setDesignation(user.designation || "");
      setDepartmentId(user.department_id || "");
      setCommunityId(user.community_id || "");
      setCommunityMemberRole(
        user.community_member_role ||
          (user.role === "lead" ? "lead" : user.role === "tic" ? "tic" : "member")
      );
      setIsActive(user.is_active ?? true);
    }
  }, [isOpen, user]);

  const departmentOptions = useMemo(
    () => [
      { value: "", label: "No Department Linked" },
      ...departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` })),
    ],
    [departments]
  );

  const communityOptions = useMemo(
    () => [
      { value: "", label: "No Community Linked" },
      ...communities.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    ],
    [communities]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await onSubmit(user.id, {
      fullName,
      role,
      designation,
      departmentId,
      communityId,
      communityMemberRole,
      isActive,
    });
  };

  if (!user) return null;

  const showCommunityLink = role === "lead" || role === "tic" || role === "staff" || role === "hod";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Account"
      description={`Update profile, department, and role assignments for ${user.email}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Professor & HOD, CSE"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Primary System Role *"
            value={role}
            onChange={(val) => setRole(val as UserRole)}
            options={ROLE_OPTIONS}
          />

          <Select
            label="Home Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={departmentOptions}
          />
        </div>

        {showCommunityLink && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 border-t border-zinc-100">
            <div className="sm:col-span-2">
              <Select
                label="Linked Community"
                value={communityId}
                onChange={setCommunityId}
                options={communityOptions}
              />
            </div>
            <div>
              <Select
                label="Community Role"
                value={communityMemberRole}
                onChange={(val) => setCommunityMemberRole(val as "lead" | "tic" | "member")}
                disabled={!communityId}
                options={[
                  { value: "lead", label: "Student Lead" },
                  { value: "tic", label: "Faculty TIC" },
                  { value: "member", label: "Member" },
                ]}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 cursor-pointer">
          <div>
            <div className="text-xs font-semibold text-zinc-900">Account Active</div>
            <div className="text-[11px] text-zinc-500">
              Inactive accounts are denied dashboard login while preserving audit history.
            </div>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-indigo-600 rounded"
          />
        </label>

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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
