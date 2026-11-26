"use client";

import { useState } from "react";
import { Building2, Plus, ShieldAlert, Sparkles, Users } from "lucide-react";
import type { Community, Department, EventCategory } from "@/types/database";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/features/lead/components/propose-event-modal/types";
import { principalApi } from "../api";

interface PrincipalGovernanceViewProps {
  departments: Department[];
  communities: Community[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: "success" | "error") => void;
  onOpenCollegeEventModal: () => void;
}

export function PrincipalGovernanceView({
  departments,
  communities,
  onRefresh,
  onNotify,
  onOpenCollegeEventModal,
}: PrincipalGovernanceViewProps) {
  const [togglingDeptId, setTogglingDeptId] = useState<string | null>(null);
  const [showAddCommunity, setShowAddCommunity] = useState(false);
  const [commName, setCommName] = useState("");
  const [commCode, setCommCode] = useState("");
  const [commScope, setCommScope] = useState<"internal" | "external">("internal");
  const [commCategory, setCommCategory] = useState<EventCategory>("Tech");
  const [commDescription, setCommDescription] = useState("");
  const [creatingComm, setCreatingComm] = useState(false);

  const handleToggleActingHod = async (dept: Department) => {
    try {
      setTogglingDeptId(dept.id);
      const next = !dept.is_acting_hod_active;
      await principalApi.toggleActingHod(dept.id, next);
      await onRefresh();
      onNotify(
        next
          ? `Emergency Acting HOD activated for ${dept.code}.`
          : `Acting HOD deactivated for ${dept.code}.`
      );
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : "Failed to toggle Acting HOD", "error");
    } finally {
      setTogglingDeptId(null);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingComm(true);
      await principalApi.createCommunity({
        name: commName.trim(),
        code: commCode.trim().toUpperCase(),
        scope: commScope,
        category: commCategory,
        description: commDescription.trim(),
      });
      setCommName("");
      setCommCode("");
      setCommDescription("");
      setShowAddCommunity(false);
      await onRefresh();
      onNotify("Community created and available immediately.");
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : "Failed to create community", "error");
    } finally {
      setCreatingComm(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/40 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900">
            Executive Governance & Overrides
          </h2>
          <p className="text-xs text-zinc-500">
            Schedule institutional College events, create campus communities, or perform emergency Acting HOD cover switches.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAddCommunity((prev) => !prev)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Community</span>
          </button>
          <button
            type="button"
            onClick={onOpenCollegeEventModal}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Schedule College Event</span>
          </button>
        </div>
      </div>

      {/* Inline Add Community Drawer */}
      {showAddCommunity && (
        <form
          onSubmit={handleCreateCommunity}
          className="p-4 rounded-2xl border border-indigo-200 bg-white space-y-3 shadow-2xs"
        >
          <h3 className="text-xs font-bold text-zinc-900">Register Campus Community / Chapter</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              required
              minLength={2}
              value={commName}
              onChange={(e) => setCommName(e.target.value)}
              placeholder="Community Name"
              className="sm:col-span-2 px-3 py-2 rounded-xl border border-zinc-200"
            />
            <input
              type="text"
              value={commCode}
              onChange={(e) => setCommCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. GDG)"
              className="px-3 py-2 rounded-xl border border-zinc-200 font-mono uppercase"
            />
            <select
              value={commScope}
              onChange={(e) => setCommScope(e.target.value === "external" ? "external" : "internal")}
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white"
            >
              <option value="internal">Internal Club</option>
              <option value="external">External Organization</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
            <Select
              label="Category"
              value={commCategory}
              onChange={(val) => setCommCategory(val as EventCategory)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <input
              type="text"
              value={commDescription}
              onChange={(e) => setCommDescription(e.target.value)}
              placeholder="Brief scope description..."
              className="sm:col-span-2 px-3 py-2 rounded-xl border border-zinc-200"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddCommunity(false)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingComm}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {creatingComm ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>
      )}

      {/* Emergency Acting HOD Panel */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>Emergency Acting HOD Toggles ({departments.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-4 rounded-2xl border border-zinc-200/90 bg-white flex items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[11px] font-bold">
                    {dept.code}
                  </span>
                  <span className="text-xs font-bold text-zinc-900 truncate">{dept.name}</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">
                  HOD: {dept.hod?.full_name || "Unassigned"}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  Cover: {dept.acting_hod?.full_name || "None configured"}
                </p>
              </div>
              {dept.acting_hod_user_id ? (
                <button
                  type="button"
                  disabled={togglingDeptId === dept.id}
                  onClick={() => handleToggleActingHod(dept)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold shrink-0 cursor-pointer disabled:opacity-50 ${
                    dept.is_acting_hod_active
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {dept.is_acting_hod_active ? "Acting Active" : "Activate Cover"}
                </button>
              ) : (
                <span className="text-[10px] text-zinc-400 inline-flex items-center gap-1 shrink-0">
                  <ShieldAlert className="w-3 h-3" />
                  No cover
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Communities Overview */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Campus Communities & Chapters ({communities.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {communities.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl border border-zinc-200/90 bg-white space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {c.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 capitalize">
                  {c.scope}
                </span>
              </div>
              <div className="text-xs font-bold text-zinc-900 truncate">{c.name}</div>
              {c.description && (
                <p className="text-[11px] text-zinc-500 line-clamp-2">{c.description}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
