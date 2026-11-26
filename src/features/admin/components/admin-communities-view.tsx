"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, X, Compass, Globe, Building2, Calendar, UserCheck } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { AdminCommunityRow, CommunityScope } from "@/types/database";

interface AdminCommunitiesViewProps {
  communities: AdminCommunityRow[];
  onAddCommunityClick: () => void;
  onEditCommunityClick: (community: AdminCommunityRow) => void;
  onDeleteCommunityClick: (community: AdminCommunityRow) => void;
  actionInProgress?: string | null;
}

export function AdminCommunitiesView({
  communities,
  onAddCommunityClick,
  onEditCommunityClick,
  onDeleteCommunityClick,
  actionInProgress,
}: AdminCommunitiesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | CommunityScope>("all");

  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => {
      if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code || "").toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.lead_name || "").toLowerCase().includes(q) ||
        (c.tic_names || []).some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [communities, searchQuery, scopeFilter]);

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: `All Scopes (${communities.length})` },
      {
        value: "internal",
        label: `Internal Clubs (${communities.filter((c) => c.scope === "internal").length})`,
      },
      {
        value: "external",
        label: `External Chapters (${communities.filter((c) => c.scope === "external").length})`,
      },
    ],
    [communities]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                Communities & Chapters
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium tabular-nums border border-zinc-200/60">
                {filteredCommunities.length}{" "}
                {filteredCommunities.length === 1 ? "community" : "communities"}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-48 hidden md:block">
                <Select
                  value={scopeFilter}
                  onChange={(val) => setScopeFilter(val as "all" | CommunityScope)}
                  options={scopeOptions}
                  size="sm"
                  aria-label="Filter communities by scope"
                />
              </div>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, code, TIC, lead..."
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
                onClick={onAddCommunityClick}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-8 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Club</span>
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <Select
              value={scopeFilter}
              onChange={(val) => setScopeFilter(val as "all" | CommunityScope)}
              options={scopeOptions}
              size="sm"
              aria-label="Filter communities by scope"
            />
          </div>
        </div>

        <div className="p-0 md:p-5">
          {filteredCommunities.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white m-4 md:m-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-800 mb-1">No communities found</h4>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                Register internal student clubs and external society chapters with assigned Faculty TICs.
              </p>
              <button
                type="button"
                onClick={onAddCommunityClick}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register First Community</span>
              </button>
            </div>
          ) : (
            <div className="bg-white md:rounded-2xl md:border md:border-zinc-200/80 md:shadow-2xs overflow-hidden divide-y divide-zinc-100">
              {filteredCommunities.map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white">
                        {comm.code}
                      </span>
                      <span className="text-sm font-bold text-zinc-900 truncate">{comm.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          comm.scope === "external"
                            ? "bg-amber-50 text-amber-800 border-amber-200/80"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                        }`}
                      >
                        {comm.scope === "external" ? (
                          <Globe className="w-2.5 h-2.5" />
                        ) : (
                          <Building2 className="w-2.5 h-2.5" />
                        )}
                        {comm.scope === "external" ? "External Chapter" : "Internal Club"}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                        {comm.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-500">Lead:</span>{" "}
                        <strong className="font-medium text-zinc-800">
                          {comm.lead_name || "Unassigned"}
                        </strong>
                      </span>

                      <span>
                        <span className="text-zinc-500">TIC(s):</span>{" "}
                        <strong className="font-medium text-zinc-800">
                          {comm.tic_names && comm.tic_names.length > 0
                            ? comm.tic_names.join(", ")
                            : "None"}
                        </strong>
                      </span>

                      <span className="flex items-center gap-1 text-zinc-500 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {comm.event_count} events • {comm.member_count} members
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditCommunityClick(comm)}
                      disabled={actionInProgress === comm.id}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-xs font-medium text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCommunityClick(comm)}
                      disabled={actionInProgress === comm.id}
                      className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Community"
                      aria-label={`Delete ${comm.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
