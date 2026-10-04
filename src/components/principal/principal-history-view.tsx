"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Clock,
  MapPin,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Check,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { CampusEvent } from "@/types/database";
import { formatDisplayName } from "@/lib/utils";
import { CategoryBadge } from "@/components/events/category-badge";

type SortField = "decision_date" | "scheduled" | "title" | "club" | "verdict" | "reviewer";
type SortDirection = "asc" | "desc";

interface PrincipalHistoryViewProps {
  filteredHistoryEvents: CampusEvent[];
  allHistoryEvents?: CampusEvent[];
  historyCounts: { all: number; published: number; rejected: number };
  historyStatusFilter: "all" | "published" | "rejected";
  onStatusFilterChange: (status: "all" | "published" | "rejected") => void;
  historySearch: string;
  onSearchChange: (query: string) => void;
  onSelectEvent: (event: CampusEvent) => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "EX";
  const clean = formatDisplayName(name);
  const parts = clean.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getClubInitials(name?: string | null): string {
  if (!name) return "CC";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getRoleLabel(role?: string | null): string {
  switch (role) {
    case "vice_principal":
      return "Vice Principal";
    case "principal":
      return "College Principal";
    case "admin":
      return "Campus Admin";
    default:
      return "Executive Desk";
  }
}

export function PrincipalHistoryView({
  filteredHistoryEvents,
  allHistoryEvents,
  historyCounts,
  historyStatusFilter,
  onStatusFilterChange,
  historySearch,
  onSearchChange,
  onSelectEvent,
}: PrincipalHistoryViewProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("decision_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Reviewer filter state & custom dropdown UI
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Auto-hide toolbar on scroll down, show on scroll up
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Handle scroll detection for smooth toolbar slide up / down
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const diff = currentScrollY - lastScrollY.current;

    // At the very top, always show toolbar
    if (currentScrollY <= 15) {
      setToolbarVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Keep toolbar visible while custom dropdown menu is open
    if (isDropdownOpen) {
      lastScrollY.current = currentScrollY;
      return;
    }

    // Scroll delta threshold to avoid jitter
    if (Math.abs(diff) > 8) {
      if (diff > 0) {
        // Scrolling down -> slide up / hide
        setToolbarVisible(false);
      } else {
        // Scrolling up -> slide down / show
        setToolbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  };

  // Close custom dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Extract distinct reviewers across the full history dataset
  const basePool = allHistoryEvents && allHistoryEvents.length > 0 ? allHistoryEvents : filteredHistoryEvents;
  const availableReviewers = useMemo(() => {
    const map = new Map<string, { id: string; displayName: string; roleLabel: string }>();
    basePool.forEach((e) => {
      if (e.reviewer?.full_name) {
        const id = e.reviewer.id || e.reviewer.full_name;
        if (!map.has(id)) {
          map.set(id, {
            id,
            displayName: formatDisplayName(e.reviewer.full_name),
            roleLabel: getRoleLabel(e.reviewer.role),
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [basePool]);

  // Selected reviewer display label
  const selectedReviewerLabel = useMemo(() => {
    if (authorFilter === "all") return "All Reviewers";
    const found = availableReviewers.find((r) => r.id === authorFilter);
    return found ? found.displayName : "All Reviewers";
  }, [authorFilter, availableReviewers]);

  // Apply Author Filter
  const authorFilteredEvents = useMemo(() => {
    if (authorFilter === "all") return filteredHistoryEvents;
    return filteredHistoryEvents.filter((ev) => {
      const revId = ev.reviewer?.id || ev.reviewer?.full_name;
      return revId === authorFilter;
    });
  }, [filteredHistoryEvents, authorFilter]);

  // Apply Sorting
  const sortedEvents = useMemo(() => {
    return [...authorFilteredEvents].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "decision_date": {
          const timeA = new Date(a.updated_at || a.created_at || a.start_time).getTime();
          const timeB = new Date(b.updated_at || b.created_at || b.start_time).getTime();
          comparison = timeA - timeB;
          break;
        }
        case "scheduled": {
          const timeA = new Date(a.start_time).getTime();
          const timeB = new Date(b.start_time).getTime();
          comparison = timeA - timeB;
          break;
        }
        case "title": {
          comparison = a.title.localeCompare(b.title);
          break;
        }
        case "club": {
          const clubA = a.community?.name || "";
          const clubB = b.community?.name || "";
          comparison = clubA.localeCompare(clubB);
          break;
        }
        case "verdict": {
          comparison = a.status.localeCompare(b.status);
          break;
        }
        case "reviewer": {
          const nameA = formatDisplayName(a.reviewer?.full_name) || "";
          const nameB = formatDisplayName(b.reviewer?.full_name) || "";
          comparison = nameA.localeCompare(nameB);
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [authorFilteredEvents, sortField, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedEvents.length;
  const isAllPages = pageSize === 0;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEvents = useMemo(() => {
    if (isAllPages) return sortedEvents;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedEvents.slice(startIndex, startIndex + pageSize);
  }, [sortedEvents, safeCurrentPage, pageSize, isAllPages]);

  const startRecord = totalRecords === 0 ? 0 : isAllPages ? 1 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = isAllPages ? totalRecords : Math.min(safeCurrentPage * pageSize, totalRecords);

  // Toggle sort direction or change column
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "decision_date" || field === "scheduled" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    onStatusFilterChange("all");
    onSearchChange("");
    setAuthorFilter("all");
    setSortField("decision_date");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    historyStatusFilter !== "all" || Boolean(historySearch) || authorFilter !== "all";

  // Header Sort Icon helper
  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 relative">
      {/* Scrollable Container with onScroll listener */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Sticky Header Toolbar: Slides up on scroll down, slides down on scroll up */}
        <div
          className={`sticky top-0 z-30 transition-transform duration-300 ease-out border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs ${
            toolbarVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Decision History</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium tabular-nums border border-slate-200/60">
                  {totalRecords} {totalRecords === 1 ? "record" : "records"}
                </span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    Filtered
                  </span>
                )}
              </div>
              <p className="hidden md:block text-xs text-slate-500 mt-0.5">
                Audit trail of approved and declined campus proposals
              </p>
            </div>

            {/* Toolbar Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Status Filter Buttons with Live Counts */}
              <div className="grid grid-cols-3 p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onStatusFilterChange("all");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    historyStatusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                      historyStatusFilter === "all"
                        ? "bg-slate-100 text-slate-800"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {historyCounts.all}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStatusFilterChange("published");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    historyStatusFilter === "published"
                      ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Approved</span>
                  <span
                    className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                      historyStatusFilter === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {historyCounts.published}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStatusFilterChange("rejected");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    historyStatusFilter === "rejected"
                      ? "bg-white text-rose-800 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Declined</span>
                  <span
                    className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                      historyStatusFilter === "rejected"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {historyCounts.rejected}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Custom Reviewer Dropdown UI */}
                {availableReviewers.length > 0 && (
                  <div ref={dropdownRef} className="relative shrink-0 flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      className={`w-full sm:w-auto h-7.5 pl-2.5 pr-2 rounded-lg border text-xs font-medium inline-flex items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs ${
                        isDropdownOpen
                          ? "border-slate-900 bg-white text-slate-900 ring-2 ring-slate-900/10"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{selectedReviewerLabel}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isDropdownOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                      />
                    </button>

                    {/* Popover Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 z-50 rounded-xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 p-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Filter by Decision Author
                        </div>
                        <div className="space-y-0.5 mt-0.5 max-h-56 overflow-y-auto">
                          {/* All Reviewers Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthorFilter("all");
                              setCurrentPage(1);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              authorFilter === "all"
                                ? "bg-slate-900 text-white font-semibold"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  authorFilter === "all"
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                All
                              </div>
                              <span>All Reviewers</span>
                            </div>
                            {authorFilter === "all" && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </button>

                          {/* Distinct Reviewers Options */}
                          {availableReviewers.map((rev) => {
                            const isSelected = authorFilter === rev.id;
                            return (
                              <button
                                key={rev.id}
                                type="button"
                                onClick={() => {
                                  setAuthorFilter(rev.id);
                                  setCurrentPage(1);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-slate-900 text-white font-semibold"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}
                                  >
                                    {getInitials(rev.displayName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-xs leading-snug">{rev.displayName}</div>
                                    <div
                                      className={`text-[10px] leading-tight ${
                                        isSelected ? "text-slate-300" : "text-slate-400"
                                      }`}
                                    >
                                      {rev.roleLabel}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Search Input */}
                <div className="relative flex-1 sm:w-44 md:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search..."
                    className="w-full pl-8 pr-7 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors h-7.5"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Reset Filters Shortcut */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Reset all filters"
                    className="h-7.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden lg:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-0 md:p-5">
          {totalRecords === 0 ? (
            <div className="text-center py-16 p-6 rounded-xl border border-dashed border-slate-200 bg-white m-4 md:m-0">
              <Clock className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-800">No decision records found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "No past decisions matched your active search, reviewer, or verdict filter."
                  : "No recorded executive decisions yet."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* MOBILE AUDIT LIST (< md) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white border-y border-slate-200">
                {paginatedEvents.map((ev) => {
                  const isApproved = ev.status === "published";
                  const decisionDate = ev.updated_at || ev.created_at || ev.start_time;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100/80 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      {/* Left Verdict Pill */}
                      <div
                        className={`w-10 shrink-0 flex flex-col items-center justify-center rounded-lg py-1.5 border mt-0.5 ${
                          isApproved
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 mb-0.5" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                          {isApproved ? "Appr" : "Decl"}
                        </span>
                      </div>

                      {/* Center Event Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                            {ev.community?.name || "Campus Community"}
                          </span>
                          <CategoryBadge category={ev.category} size="sm" showDot />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                          {ev.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{format(parseISO(ev.start_time), "MMM d, h:mm a")}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.venue?.name || "Venue"}</span>
                          </span>
                        </div>

                        {/* Reviewer line */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="text-slate-400">By</span>
                          <span className="font-medium text-slate-800">
                            {formatDisplayName(ev.reviewer?.full_name) || "Campus Executive"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 text-[10px]">
                            {format(parseISO(decisionDate), "MMM d")}
                          </span>
                        </div>

                        {/* Rejection Remarks - Full width block below the reviewer line */}
                        {ev.status === "rejected" && ev.rejection_reason && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-50/80 border border-rose-200/60 text-[11px] text-rose-800 leading-relaxed italic break-words w-full">
                            &ldquo;{ev.rejection_reason}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Right Chevron */}
                      <div className="shrink-0 flex items-center self-center pl-1 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DESKTOP ELEVATED DATA TABLE (md+) */}
              <div className="hidden md:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-600 text-[11px] font-semibold tracking-wide border-b border-slate-200 select-none">
                      <tr>
                        <th
                          scope="col"
                          onClick={() => handleSort("title")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Event & Category</span>
                            {renderSortIndicator("title")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("club")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Host Club</span>
                            {renderSortIndicator("club")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("scheduled")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Scheduled For</span>
                            {renderSortIndicator("scheduled")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("verdict")}
                          className="py-2.5 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Verdict</span>
                            {renderSortIndicator("verdict")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("reviewer")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Decision Author</span>
                            {renderSortIndicator("reviewer")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort("decision_date")}
                          className="py-2.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th min-w-[280px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Decision & Remarks</span>
                            {renderSortIndicator("decision_date")}
                          </div>
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-right w-10">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEvents.map((ev) => {
                        const isApproved = ev.status === "published";
                        const decisionTimestamp = ev.updated_at || ev.created_at || ev.start_time;

                        return (
                          <tr
                            key={ev.id}
                            onClick={() => onSelectEvent(ev)}
                            className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                          >
                            {/* 1. Event & Category */}
                            <td className="py-2.5 px-4 max-w-xs">
                              <div
                                className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-xs"
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <CategoryBadge category={ev.category} size="sm" showDot />
                              </div>
                            </td>

                            {/* 2. Host Club */}
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                                  {getClubInitials(ev.community?.name)}
                                </div>
                                <span
                                  className="font-medium text-slate-700 truncate max-w-[150px]"
                                  title={ev.community?.name || "Campus Community"}
                                >
                                  {ev.community?.name || "Campus Community"}
                                </span>
                              </div>
                            </td>

                            {/* 3. Scheduled For */}
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{format(parseISO(ev.start_time), "MMM d, yyyy")}</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]" title={ev.venue?.name || "Venue"}>
                                  {ev.venue?.name || "Campus Venue"}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span>{format(parseISO(ev.start_time), "h:mm a")}</span>
                              </div>
                            </td>

                            {/* 4. Verdict */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  isApproved
                                    ? "bg-emerald-50 border-emerald-200/80 text-emerald-800"
                                    : "bg-rose-50 border-rose-200/80 text-rose-800"
                                }`}
                              >
                                {isApproved ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Approved
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    Declined
                                  </>
                                )}
                              </span>
                            </td>

                            {/* 5. Decision Author */}
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                                  {getInitials(ev.reviewer?.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className="font-medium text-slate-900 text-xs truncate max-w-[130px]"
                                    title={formatDisplayName(ev.reviewer?.full_name) || "Campus Executive"}
                                  >
                                    {formatDisplayName(ev.reviewer?.full_name) || "Campus Executive"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 leading-tight">
                                    {getRoleLabel(ev.reviewer?.role)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 6. Decision Date & Remarks */}
                            <td className="py-2.5 px-4 min-w-[280px] max-w-lg">
                              <div className="text-[11px] font-medium text-slate-500">
                                {format(parseISO(decisionTimestamp), "MMM d, yyyy")}
                              </div>
                              <div className="mt-0.5 text-[11px] leading-relaxed">
                                {ev.status === "rejected" ? (
                                  <p
                                    className="text-rose-700 font-medium italic break-words"
                                    title={ev.rejection_reason || "Declined without remarks"}
                                  >
                                    &ldquo;{ev.rejection_reason || "Declined without remarks"}&rdquo;
                                  </p>
                                ) : (
                                  <span className="text-slate-400">
                                    Published to calendar
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 7. Action Arrow */}
                            <td className="py-2.5 px-3 text-right">
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all inline-block" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Pagination & Records Counter Bar */}
              <div className="px-4 py-2.5 border border-slate-200/80 bg-white rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-900 font-semibold">{startRecord}</strong> to{" "}
                    <strong className="text-slate-900 font-semibold">{endRecord}</strong> of{" "}
                    <strong className="text-slate-900 font-semibold">{totalRecords}</strong> decisions
                  </span>
                  <span className="text-slate-300">•</span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      aria-label="Records per page"
                      className="h-6 px-1.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 cursor-pointer focus:outline-none focus:border-slate-900"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={0}>All</option>
                    </select>
                  </div>
                </div>

                {!isAllPages && totalPages > 1 && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors cursor-pointer"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <span className="px-2 text-xs font-medium text-slate-700">
                      Page {safeCurrentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors cursor-pointer"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
