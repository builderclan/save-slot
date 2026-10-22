"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Globe,
  Shield,
  X,
  Compass,
} from "lucide-react";
import { AdminCommunityRow, EventCategory } from "@/types/database";
import { Select } from "@/components/ui/select";

interface AdminCommunitiesViewProps {
  communities: AdminCommunityRow[];
  onAddCommunityClick: () => void;
  onEditCommunityClick: (community: AdminCommunityRow) => void;
  onDeleteCommunityClick: (community: AdminCommunityRow) => void;
  actionInProgress?: string | null;
}

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Tech: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/80" },
  Career: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/80" },
  Arts: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200/80" },
  Social: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200/80" },
  Sports: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200/80" },
  Academic: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200/80" },
  Workshop: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200/80" },
};

function getCategoryBadge(category: string) {
  const style = CATEGORY_STYLES[category] || {
    bg: "bg-zinc-50",
    text: "text-zinc-700",
    border: "border-zinc-200/80",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      {category}
    </span>
  );
}

function getStatusBadge(status?: "pending" | "approved" | "rejected") {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Inactive
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/80">
          Active
        </span>
      );
  }
}

export function AdminCommunitiesView({
  communities,
  onAddCommunityClick,
  onEditCommunityClick,
  onDeleteCommunityClick,
  actionInProgress,
}: AdminCommunitiesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const categoryOptions = useMemo(() => {
    return [
      { value: "all", label: "All Categories" },
      ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    ];
  }, []);

  const statusOptions = useMemo(() => {
    return [
      { value: "all", label: "Any Status" },
      { value: "approved", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "rejected", label: "Rejected" },
    ];
  }, []);

  const filteredCommunities = useMemo(() => {
    return communities.filter((comm) => {
      if (selectedCategory !== "all" && comm.category !== selectedCategory) return false;
      if (selectedStatus !== "all") {
        const commStatus = comm.status || "approved";
        if (commStatus !== selectedStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = comm.name.toLowerCase().includes(q);
        const matchesSlug = comm.slug.toLowerCase().includes(q);
        const matchesDesc = (comm.description || "").toLowerCase().includes(q);
        const matchesCategory = comm.category.toLowerCase().includes(q);
        const matchesLead = (comm.lead_name || "").toLowerCase().includes(q);
        const matchesEmail = (comm.lead_email || "").toLowerCase().includes(q);
        return (
          matchesName ||
          matchesSlug ||
          matchesDesc ||
          matchesCategory ||
          matchesLead ||
          matchesEmail
        );
      }

      return true;
    });
  }, [communities, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-50/50 relative">
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                Clubs & Societies
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium tabular-nums border border-zinc-200/60">
                {filteredCommunities.length}{" "}
                {filteredCommunities.length === 1 ? "organization" : "organizations"}
              </span>
              <span className="hidden sm:inline-block text-zinc-300">•</span>
              <p className="hidden sm:block text-xs text-zinc-500">
                Authorized campus bodies & organizers
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clubs, leads, category..."
                  className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors h-7.5"
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
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 h-7.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Club</span>
              </button>
            </div>
          </div>

          {/* Mobile Filter Control Bar (< md) */}
          <div className="flex md:hidden items-center gap-1.5 pt-0.5">
            {/* Category Select */}
            <div className="flex-1 min-w-0">
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryOptions}
                size="sm"
                aria-label="Filter student clubs by category"
                triggerClassName="bg-zinc-100/90 hover:bg-zinc-200/70 text-zinc-800 text-xs font-semibold h-7.5 py-1 px-2.5 rounded-lg border-zinc-200/80"
              />
            </div>

            {/* Status Select */}
            <div className="flex-1 min-w-0">
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={statusOptions}
                size="sm"
                aria-label="Filter student clubs by status"
                triggerClassName="bg-zinc-100/90 hover:bg-zinc-200/70 text-zinc-800 text-xs font-semibold h-7.5 py-1 px-2.5 rounded-lg border-zinc-200/80"
              />
            </div>

            {/* Clear Button */}
            {(selectedCategory !== "all" || selectedStatus !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Desktop Filter Pills (md+) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === "all"
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-zinc-200 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStatus("all")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  selectedStatus === "all"
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Any Status
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("approved")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  selectedStatus === "approved"
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("pending")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  selectedStatus === "pending"
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("rejected")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  selectedStatus === "rejected"
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        <div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
          {filteredCommunities.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-800 mb-1">
                No campus clubs match your criteria
              </h4>
              <p className="text-xs text-zinc-500 max-w-xs mb-4">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Try clearing filters or adjusting your search term."
                  : "No official campus communities are registered yet. Create the first club below."}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunities.map((comm) => {
                const isOperating = actionInProgress === comm.id;

                return (
                  <div
                    key={comm.id}
                    className="p-4 sm:p-5 rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Monogram/Logo, Category, Status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {comm.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comm.logo_url}
                              alt={comm.name}
                              className="w-10 h-10 rounded-xl object-cover border border-zinc-200/80 shrink-0 bg-zinc-50"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                              {comm.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {comm.name}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-400">
                              /@{comm.slug}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {getStatusBadge(comm.status)}
                          {getCategoryBadge(comm.category)}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-3.5 min-h-[2rem]">
                        {comm.description || (
                          <span className="text-zinc-400 italic">No description provided.</span>
                        )}
                      </p>

                      {/* Lead Organizer Pill */}
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-[10px] font-bold">
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-800 truncate">
                              {comm.lead_name || "Unassigned Lead"}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {comm.lead_email || "No lead organizer linked"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Metrics Row */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50/60 border border-zinc-100 text-xs mb-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-bold text-zinc-800 tabular-nums">
                            {comm.event_count}
                          </span>
                          <span className="text-[10px] text-zinc-500">Scheduled Events</span>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400">
                          {comm.status === "approved" ? "Active Booking" : "Notice Only"}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        {comm.website && /^https?:\/\//i.test(comm.website) && (
                          <a
                            href={comm.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md hover:text-indigo-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Visit website"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {comm.instagram && (
                          <span
                            className="text-[10px] text-zinc-500 font-mono truncate max-w-[90px]"
                            title={comm.instagram}
                          >
                            {comm.instagram}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditCommunityClick(comm)}
                          disabled={isOperating}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCommunityClick(comm)}
                          disabled={isOperating || comm.event_count > 0}
                          title={
                            comm.event_count > 0
                              ? "Cannot delete community with active or pending events"
                              : "Archive or remove community"
                          }
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-400 text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
