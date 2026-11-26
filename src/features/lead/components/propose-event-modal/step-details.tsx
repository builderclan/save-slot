"use client";

import { Building2, Check, Plus, Users } from "lucide-react";
import { Community, Department, EventCategory } from "@/types/database";
import { TARGET_AUDIENCE_OPTIONS } from "@/lib/validations";
import { Select } from "@/components/ui/select";
import { CATEGORIES, CoHostEntityInput } from "./types";

interface StepDetailsProps {
  originType: "community" | "department";
  setOriginType: (value: "community" | "department") => void;
  canChooseCommunity: boolean;
  canChooseDepartment: boolean;
  hostCommunityId: string;
  setHostCommunityId: (id: string) => void;
  hostDepartmentId: string;
  setHostDepartmentId: (id: string) => void;
  leadCommunities: Array<{ id: string; name: string; slug: string; code?: string; scope?: string }>;
  departments: Department[];
  allCommunities: Community[];
  coHosts: CoHostEntityInput[];
  onToggleCoHost: (entity: CoHostEntityInput) => void;
  title: string;
  setTitle: (value: string) => void;
  category: EventCategory;
  setCategory: (value: EventCategory) => void;
  targetAudience: string[];
  toggleAudience: (cohort: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onFieldChange: () => void;
}

export function StepDetails({
  originType,
  setOriginType,
  canChooseCommunity,
  canChooseDepartment,
  hostCommunityId,
  setHostCommunityId,
  hostDepartmentId,
  setHostDepartmentId,
  leadCommunities,
  departments,
  allCommunities,
  coHosts,
  onToggleCoHost,
  title,
  setTitle,
  category,
  setCategory,
  targetAudience,
  toggleAudience,
  description,
  setDescription,
  onFieldChange,
}: StepDetailsProps) {
  const coHostDeptOptions = departments.filter(
    (d) => !(originType === "department" && d.id === hostDepartmentId)
  );
  const coHostCommOptions = allCommunities.filter(
    (c) => !(originType === "community" && c.id === hostCommunityId)
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Event Origin & Primary Host */}
      <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="block text-xs font-semibold text-zinc-900">
              Event Origin & Primary Host
            </span>
            <span className="text-[11px] text-zinc-500">
              Determines Stage 2 reviewer (FIC or HOD) and official reference prefix
            </span>
          </div>

          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs shrink-0 self-start">
            <button
              type="button"
              disabled={!canChooseCommunity}
              onClick={() => {
                setOriginType("community");
                onFieldChange();
              }}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                originType === "community"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Community</span>
            </button>
            <button
              type="button"
              disabled={!canChooseDepartment}
              onClick={() => {
                setOriginType("department");
                onFieldChange();
              }}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                originType === "department"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Department</span>
            </button>
          </div>
        </div>

        {originType === "community" && leadCommunities.length > 0 && (
          <Select
            label="Primary Hosting Club / Community"
            value={hostCommunityId}
            onChange={(val) => {
              setHostCommunityId(val);
              onFieldChange();
            }}
            options={leadCommunities.map((c) => ({
              value: c.id,
              label: c.code ? `[${c.code}] ${c.name} (${c.scope || "internal"})` : c.name,
            }))}
          />
        )}

        {originType === "department" && (
          <Select
            label="Primary Hosting Department"
            value={hostDepartmentId}
            onChange={(val) => {
              setHostDepartmentId(val);
              onFieldChange();
            }}
            options={departments
              .filter((d) => !hostDepartmentId || d.id === hostDepartmentId)
              .map((d) => ({
                value: d.id,
                label: `[${d.code}] ${d.name}`,
              }))}
          />
        )}

        {/* Joint / Co-Host Multi-Picker */}
        {(coHostDeptOptions.length > 0 || coHostCommOptions.length > 0) && (
          <div className="pt-1 border-t border-zinc-200/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-700">
                Joint Co-Hosts <span className="text-zinc-400 font-normal">(optional parallel sign-off)</span>
              </span>
              {coHosts.length > 0 && (
                <span className="text-[10px] font-semibold text-indigo-600">
                  {coHosts.length} co-host{coHosts.length === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coHostDeptOptions.map((d) => {
                const selected = coHosts.some(
                  (ch) => ch.entityType === "department" && ch.id === d.id
                );
                return (
                  <button
                    key={`dept-${d.id}`}
                    type="button"
                    onClick={() => onToggleCoHost({ entityType: "department", id: d.id })}
                    className={`px-2 py-1 rounded-lg text-[11px] border transition-colors flex items-center gap-1 cursor-pointer ${
                      selected
                        ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {selected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-zinc-400" />}
                    <span>{d.code}</span>
                  </button>
                );
              })}
              {coHostCommOptions.map((c) => {
                const selected = coHosts.some(
                  (ch) => ch.entityType === "community" && ch.id === c.id
                );
                return (
                  <button
                    key={`comm-${c.id}`}
                    type="button"
                    onClick={() => onToggleCoHost({ entityType: "community", id: c.id })}
                    className={`px-2 py-1 rounded-lg text-[11px] border transition-colors flex items-center gap-1 cursor-pointer ${
                      selected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {selected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-zinc-400" />}
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event Title */}
      <div>
        <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
          Event Title <span className="hidden sm:inline text-zinc-400 font-normal">· Clear, recognizable name</span>
        </label>
        <input
          type="text"
          required
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onFieldChange();
          }}
          placeholder="e.g. Systems Programming Workshop & Hack"
          className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
        />
      </div>

      {/* Category & Audience Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 items-start">
        <div className="sm:col-span-1">
          <Select
            label="Category"
            value={category}
            onChange={(val) => setCategory(val as EventCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-900">
              Target Audience
            </label>
            <span className="text-[11px] text-zinc-400 font-medium">
              {targetAudience.includes("All Students")
                ? "Campus-Wide"
                : `${targetAudience.length} cohort${targetAudience.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_AUDIENCE_OPTIONS.map((aud) => {
              const isSelected = targetAudience.includes(aud);
              return (
                <button
                  key={aud}
                  type="button"
                  onClick={() => toggleAudience(aud)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-2xs"
                      : "bg-white text-zinc-600 border border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-indigo-600 stroke-[2.5]" />}
                  <span>{aud}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-900">
            Event Description
          </label>
          <span className="text-[11px] text-zinc-400">
            Visible on student notice board
          </span>
        </div>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onFieldChange();
          }}
          placeholder="Outline what attendees will learn or experience, prerequisites, schedule highlights, and key speakers..."
          className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all resize-none"
        />
      </div>
    </div>
  );
}
