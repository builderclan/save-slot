"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminCommunityRow, Department, UserRole } from "@/types/database";

export interface NewUserData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  designation: string;
  departmentId: string;
  communityId: string;
  communityMemberRole: "lead" | "fic" | "member";
}

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewUserData) => Promise<void>;
  communities: AdminCommunityRow[];
  departments: Department[];
  isSubmitting?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "staff", label: "Faculty / Staff (Organizer / Mentor)" },
  { value: "fic", label: "Faculty-in-Charge (FIC)" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "lead", label: "Student Community Lead" },
  { value: "vice_principal", label: "Vice Principal (Executive)" },
  { value: "principal", label: "Principal (Final Approver)" },
  { value: "admin", label: "IT / Ops Administrator" },
];

export function AdminAddUserModal({
  isOpen,
  onClose,
  onSubmit,
  communities,
  departments,
  isSubmitting = false,
}: AdminAddUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [communityMemberRole, setCommunityMemberRole] = useState<"lead" | "fic" | "member">("member");

  useEffect(() => {
    if (isOpen) {
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setDesignation("");
      setDepartmentId("");
      setCommunityId("");
      setCommunityMemberRole("member");
    }
  }, [isOpen]);

  useEffect(() => {
    if (role === "lead") {
      setCommunityMemberRole("lead");
    } else if (role === "fic") {
      setCommunityMemberRole("fic");
    } else {
      setCommunityMemberRole("member");
    }
  }, [role]);

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
    await onSubmit({
      fullName,
      email,
      password,
      role,
      designation,
      departmentId,
      communityId,
      communityMemberRole,
    });
  };

  const showCommunityLink = role === "lead" || role === "fic" || role === "staff" || role === "hod";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision User Account"
      description="Create a college faculty, executive, FIC, student lead, or IT admin account."
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
              placeholder="e.g. Dr. Meera Nair"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
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
              placeholder="e.g. Assistant Professor, CSE"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              College Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. meera.cse@aisat.ac.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Temporary Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
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
                label="Link Community (Optional)"
                value={communityId}
                onChange={setCommunityId}
                options={communityOptions}
              />
            </div>
            <div>
              <Select
                label="Community Role"
                value={communityMemberRole}
                onChange={(val) => setCommunityMemberRole(val as "lead" | "fic" | "member")}
                disabled={!communityId}
                options={[
                  { value: "lead", label: "Student Lead" },
                  { value: "fic", label: "Faculty-in-Charge (FIC)" },
                  { value: "member", label: "Member" },
                ]}
              />
            </div>
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
