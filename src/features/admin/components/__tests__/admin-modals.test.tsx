import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AdminAddUserModal } from "../admin-add-user-modal";
import { AdminEditUserModal } from "../admin-edit-user-modal";
import { AdminAddVenueModal } from "../admin-add-venue-modal";
import { AdminEditVenueModal } from "../admin-edit-venue-modal";
import { AdminAddCommunityModal } from "../admin-add-community-modal";
import { AdminEditCommunityModal } from "../admin-edit-community-modal";
import type { AdminUserRow } from "../admin-users-view";
import type { Venue, AdminCommunityRow } from "@/types/database";

describe("Admin Modular Components & Modals", () => {
  const dummyCommunities = [
    { id: "comm-1", name: "Coding Club" },
    { id: "comm-2", name: "Design Society" },
  ];

  const dummyEligibleUsers = [
    { id: "u-1", fullName: "Alice Lead", email: "alice@campus.edu", role: "organizer" },
  ];

  const mockUserRow: AdminUserRow = {
    id: "user-42",
    email: "elena@campus.edu",
    full_name: "Elena Rostova",
    role: "organizer",
    community_id: "comm-1",
    community_name: "Coding Club",
    created_at: "2026-01-01T00:00:00Z",
  };

  const mockVenue: Venue = {
    id: "venue-10",
    campus_id: "campus-1",
    name: "Main Auditorium",
    building: "Central Block",
    capacity: 500,
    address: "Level 1",
    notes: "Projector & Sound",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  };

  const mockCommunityRow: AdminCommunityRow = {
    id: "comm-100",
    campus_id: "campus-1",
    name: "Robotics Chapter",
    slug: "robotics-chapter",
    category: "Tech",
    description: "Autonomous robotics and hardware prototyping.",
    logo_url: "https://example.com/logo.png",
    website: "https://robotics.aisat.edu",
    instagram: "@robotics_aisat",
    lead_id: "u-1",
    lead_name: "Alice Lead",
    lead_email: "alice@campus.edu",
    status: "approved",
    event_count: 3,
    member_count: 50,
    created_at: "2026-01-01T00:00:00Z",
  };

  describe("AdminAddUserModal", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <AdminAddUserModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          communities={dummyCommunities}
        />
      );
      expect(html).toBe("");
    });

    it("renders provision form inside modal when isOpen is true", () => {
      const html = renderToString(
        <AdminAddUserModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          communities={dummyCommunities}
        />
      );
      expect(html).toContain("Provision New User Account");
      expect(html).toContain("Campus Email");
      expect(html).toContain("Coding Club");
    });
  });

  describe("AdminEditUserModal", () => {
    it("renders user information when open", () => {
      const html = renderToString(
        <AdminEditUserModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          user={mockUserRow}
          communities={dummyCommunities}
        />
      );
      expect(html).toContain("Edit User Account");
      expect(html).toContain("elena@campus.edu");
      expect(html).toContain("Elena Rostova");
    });
  });

  describe("AdminAddVenueModal", () => {
    it("renders facility creation fields when open", () => {
      const html = renderToString(
        <AdminAddVenueModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      expect(html).toContain("Add Campus Facility / Venue");
      expect(html).toContain("Venue Name");
      expect(html).toContain("Capacity");
    });
  });

  describe("AdminEditVenueModal", () => {
    it("pre-populates existing venue details", () => {
      const html = renderToString(
        <AdminEditVenueModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          venue={mockVenue}
        />
      );
      expect(html).toContain("Edit Campus Facility");
      expect(html).toContain("Main Auditorium");
      expect(html).toContain("Central Block");
    });
  });

  describe("AdminAddCommunityModal", () => {
    it("renders community registration fields", () => {
      const html = renderToString(
        <AdminAddCommunityModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          eligibleUsers={dummyEligibleUsers}
        />
      );
      expect(html).toContain("Register Student Community");
      expect(html).toContain("URL Identifier (Slug)");
      expect(html).toContain("Alice Lead");
    });
  });

  describe("AdminEditCommunityModal", () => {
    it("renders community edit fields with status selector", () => {
      const html = renderToString(
        <AdminEditCommunityModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          community={mockCommunityRow}
          eligibleUsers={dummyEligibleUsers}
        />
      );
      expect(html).toContain("Edit Student Community");
      expect(html).toContain("Robotics Chapter");
      expect(html).toContain("robotics-chapter");
      expect(html).toContain("Approved &amp; Active");
    });
  });
});
