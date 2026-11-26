"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminUserRow, Department } from "@/types/database";

export interface DepartmentFormData {
  name: string;
  code: string;
  hodUserId: string | null;
  actingHodUserId: string | null;
  isActingHodActive: boolean;
  isActive: boolean;
}

interface AdminDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormData, existingId?: string) => Promise<void>;
  department: Department | null;
  users: AdminUserRow[];
  isSubmitting?: boolean;
}

export function AdminDepartmentModal({
  isOpen,
  onClose,
  onSubmit,
  department,
  users,
  isSubmitting = false,
}: AdminDepartmentModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hodUserId, setHodUserId] = useState("");
  const [actingHodUserId, setActingHodUserId] = useState("");
  const [isActingHodActive, setIsActingHodActive] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || "");
      setCode(department?.code || "");
      setHodUserId(department?.hod_user_id || "");
      setActingHodUserId(department?.acting_hod_user_id || "");
      setIsActingHodActive(department?.is_acting_hod_active ?? false);
      setIsActive(department?.is_active ?? true);
      setError(null);
    }
  }, [isOpen, department]);

  const facultyOptions = useMemo(() => {
    const eligible = users.filter((u) =>
      ["hod", "staff", "fic"].includes(u.role)
    );
    return [
      { value: "", label: "Unassigned" },
      ...eligible.map((u) => ({
        value: u.id,
        label: `${u.full_name} (${u.role.toUpperCase()})`,
      })),
    ];
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    if (!name.trim() || !/^[A-Z0-9]{2,20}$/.test(cleanCode)) {
      setError("Department name and a valid 2–20 character code (e.g. CSE) are required.");
      return;
    }
    if (isActingHodActive && !actingHodUserId) {
      setError("Select an Acting HOD user before enabling Acting HOD mode.");
      return;
    }
    try {
      await onSubmit(
        {
          name: name.trim(),
          code: cleanCode,
          hodUserId: hodUserId || null,
          actingHodUserId: actingHodUserId || null,
          isActingHodActive,
          isActive,
        },
        department?.id
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save department");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? `Edit Department (${department.code})` : "Register Academic Department"}
      description="Configure department identity, primary HOD, and leave-cover Acting HOD."
    >
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="CSE"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-mono font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Primary HOD"
            value={hodUserId}
            onChange={setHodUserId}
            options={facultyOptions}
          />
          <Select
            label="Acting HOD (Leave Cover)"
            value={actingHodUserId}
            onChange={setActingHodUserId}
            options={facultyOptions}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800">
            <input
              type="checkbox"
              checked={isActingHodActive}
              onChange={(e) => setIsActingHodActive(e.target.checked)}
              className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Acting HOD Mode Active (Emergency Toggle)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Active</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? "Saving..." : department ? "Save Department" : "Create Department"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
