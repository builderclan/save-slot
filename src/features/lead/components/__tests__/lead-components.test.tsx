import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LeadStatsRow } from "../lead-stats-row";
import { LeadFilterBar } from "../lead-filter-bar";
import { LeadEventsList, getRelativeDateBadge } from "../lead-events-list";
import { LeadWithdrawModal } from "../lead-withdraw-modal";
import { LeadRejectionNoticeModal } from "../lead-rejection-notice-modal";
import { CampusEvent } from "@/types/database";

const mockEvents: CampusEvent[] = [
  {
    id: "ev-1",
    campus_id: "campus-1",
    community_id: "comm-1",
    title: "Intro to Rust Workshop",
    slug: "intro-to-rust-workshop",
    description: "Hands-on systems programming session",
    category: "Tech",
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
    end_time: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    location_name: "Auditorium A",
    venue_id: "v-1",
    status: "published",
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    target_audience: ["CS Dept", "Engineering"],
    venue: {
      id: "v-1",
      campus_id: "campus-1",
      name: "Main Auditorium",
      building: "Science Wing",
      capacity: 250,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "ev-2",
    campus_id: "campus-1",
    community_id: "comm-1",
    title: "Career Hackathon Proposal",
    slug: "career-hackathon-proposal",
    description: "Annual 24hr campus hackathon",
    category: "Career",
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 5 + 14400000).toISOString(),
    location_name: "Innovation Lab",
    status: "pending",
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ev-3",
    campus_id: "campus-1",
    community_id: "comm-1",
    title: "Gaming Night",
    slug: "gaming-night",
    description: "Lan party in room 101",
    category: "Social",
    start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 7 + 7200000).toISOString(),
    location_name: "Room 101",
    status: "rejected",
    rejection_reason: "Room 101 is undergoing maintenance.",
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("LeadStatsRow Component", () => {
  it("renders 4 metric cards with correct counts", () => {
    const onStatusFilterChange = vi.fn();
    const html = renderToString(
      <LeadStatsRow
        communityEvents={mockEvents}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    expect(html).toContain("Total Submissions");
    expect(html).toContain("Approved &amp; Live");
    expect(html).toContain("Pending Review");
    expect(html).toContain("Needs Revision");

    // Verify calculated metric values
    expect(html).toContain("3"); // Total
    expect(html).toContain("1"); // Approved
  });

  it("applies active selection classes when a filter is chosen", () => {
    const html = renderToString(
      <LeadStatsRow
        communityEvents={mockEvents}
        statusFilter="pending"
        onStatusFilterChange={vi.fn()}
      />
    );

    expect(html).toContain("bg-amber-600");
    expect(html).toContain("• Active filter");
  });
});

describe("LeadFilterBar Component", () => {
  it("renders search, category selector, and sorting dropdown", () => {
    const html = renderToString(
      <LeadFilterBar
        totalCount={3}
        filteredCount={1}
        searchQuery="hackathon"
        onSearchChange={vi.fn()}
        categoryFilter="Career"
        onCategoryChange={vi.fn()}
        sortBy="date-asc"
        onSortChange={vi.fn()}
        hasActiveFilters={true}
        onResetFilters={vi.fn()}
      />
    );

    expect(html).toContain("Event Proposals");
    expect(html).toContain("Showing");
    expect(html).toContain("Reset Filters");
    expect(html).toContain("Search by event title");
    expect(html).toContain("Career");
  });

  it("hides reset filters action when no filters are active", () => {
    const html = renderToString(
      <LeadFilterBar
        totalCount={3}
        filteredCount={3}
        searchQuery=""
        onSearchChange={vi.fn()}
        categoryFilter="all"
        onCategoryChange={vi.fn()}
        sortBy="date-asc"
        onSortChange={vi.fn()}
        hasActiveFilters={false}
        onResetFilters={vi.fn()}
      />
    );

    expect(html).not.toContain("Reset Filters");
  });
});

describe("LeadEventsList Component", () => {
  it("renders event cards and relevant action buttons", () => {
    const html = renderToString(
      <LeadEventsList
        events={mockEvents}
        hasActiveFilters={false}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onWithdraw={vi.fn()}
        onShowRejectionNotice={vi.fn()}
        onProposeNew={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    expect(html).toContain("Intro to Rust Workshop");
    expect(html).toContain("Career Hackathon Proposal");
    expect(html).toContain("Gaming Night");
    expect(html).toContain("Main Auditorium");
    expect(html).toContain("250");
    expect(html).toContain("cap");
    expect(html).toContain("Preview");
    expect(html).toContain("View Live");
    expect(html).toContain("Revise &amp; Resubmit");
    expect(html).toContain("Edit");
  });

  it("renders empty state when no events match", () => {
    const noEventsHtml = renderToString(
      <LeadEventsList
        events={[]}
        hasActiveFilters={false}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onWithdraw={vi.fn()}
        onProposeNew={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    expect(noEventsHtml).toContain("No event proposals submitted yet");
    expect(noEventsHtml).toContain("Submit Your First Event");

    const filteredEmptyHtml = renderToString(
      <LeadEventsList
        events={[]}
        hasActiveFilters={true}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onWithdraw={vi.fn()}
        onProposeNew={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    expect(filteredEmptyHtml).toContain("No matching proposals found");
    expect(filteredEmptyHtml).toContain("Reset All Filters");
  });

  it("calculates relative date badges accurately", () => {
    const today = new Date().toISOString();
    expect(getRelativeDateBadge(today).label).toBe("Today");

    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
    expect(getRelativeDateBadge(pastDate).label).toBe("Concluded");

    const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();
    expect(getRelativeDateBadge(futureDate).label).toMatch(/In \d+ days/);
  });
});

describe("LeadWithdrawModal Component", () => {
  it("renders event details and warning text", () => {
    const html = renderToString(
      <LeadWithdrawModal
        isOpen={true}
        event={mockEvents[1]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isWithdrawing={false}
      />
    );

    expect(html).toContain("Withdraw Event Proposal?");
    expect(html).toContain("Career Hackathon Proposal");
    expect(html).toContain("Confirm Withdrawal");
    expect(html).toContain("Cancel");
  });
});

describe("LeadRejectionNoticeModal Component", () => {
  it("renders administrator feedback and resubmit CTA", () => {
    const html = renderToString(
      <LeadRejectionNoticeModal
        isOpen={true}
        event={mockEvents[2]}
        onClose={vi.fn()}
        onRevise={vi.fn()}
      />
    );

    expect(html).toContain("Administrative Rejection Notice");
    expect(html).toContain("Room 101 is undergoing maintenance.");
    expect(html).toContain("Revise &amp; Resubmit");
    expect(html).toContain("Close");
  });
});
