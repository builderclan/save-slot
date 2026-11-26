import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AdminAddUserModal } from "../admin-add-user-modal";
import { AdminEditUserModal } from "../admin-edit-user-modal";
import { AdminAddVenueModal } from "../admin-add-venue-modal";
import { AdminEditVenueModal } from "../admin-edit-venue-modal";
import { AdminAddCommunityModal } from "../admin-add-community-modal";
import { AdminEditCommunityModal } from "../admin-edit-community-modal";
import { AdminDepartmentModal } from "../admin-department-modal";
import { AdminConfirmDeleteModal } from "../admin-confirm-delete-modal";
import type { AdminUserRow, AdminCommunityRow, Department, Venue } from "@/types/database";

describe("Admin Modular Components & Modals (v1.0.0)", () => {
  const dummyDepartments: Department[] = [
    {
      id: "dept-cse",
      name: "Computer Science & Engineering",
      code: "CSE",
      is_acting_hod_active: false,
      is_active: true,
    },
  ];

  const dummyCommunities: AdminCommunityRow[] = [
    {
      id: "comm-1",
      name: "Coding Club",
      slug: "coding-club",
      code: "CC",
      scope: "internal",
      category: "Tech",
      member_count: 12,
      event_count: 4,
    },
    {
      id: "comm-2",
      name: "IEEE Student Branch",
      slug: "ieee",
      code: "IEEE",
      scope: "external",
      category: "Tech",
      member_count: 35,
      event_count: 6,
    },
  ];

  const dummyEligibleUsers: AdminUserRow[] = [
    {
      id: "u-1",
      full_name: "Alice Lead",
      email: "alice@aisat.ac.in",
      role: "lead",
    },
    {
      id: "u-2",
      full_name: "Prof. Arun Kumar",
      email: "arun.cse@aisat.ac.in",
      role: "staff",
      department_code: "CSE",
    },
  ];

  const mockUserRow: AdminUserRow = {
    id: "user-42",
    email: "elena@aisat.ac.in",
    full_name: "Elena Rostova",
    role: "hod",
    designation: "Professor & HOD, CSE",
    department_id: "dept-cse",
    department_code: "CSE",
    community_id: "comm-1",
    community_name: "Coding Club",
    created_at: "2026-01-01T00:00:00Z",
  };

  const mockVenue: Venue = {
    id: "venue-10",
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
    name: "Robotics Chapter",
    slug: "robotics-chapter",
    code: "ROBO",
    scope: "external",
    category: "Tech",
    description: "Autonomous robotics and hardware prototyping.",
    logo_url: "https://example.com/logo.png",
    website: "https://robotics.aisat.edu",
    instagram: "@robotics_aisat",
    lead_id: "u-1",
    lead_name: "Alice Lead",
    lead_email: "alice@aisat.ac.in",
    tic_ids: ["u-2"],
    tic_names: ["Prof. Arun Kumar"],
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
          departments={dummyDepartments}
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
          departments={dummyDepartments}
        />
      );
      expect(html).toContain("Provision User Account");
      expect(html).toContain("College Email");
      expect(html).toContain("Primary System Role");
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
          departments={dummyDepartments}
        />
      );
      expect(html).toContain("Edit User Account");
      expect(html).toContain("elena@aisat.ac.in");
      expect(html).toContain("Elena Rostova");
      expect(html).toContain("Account Active");
    });
  });

  describe("AdminDepartmentModal", () => {
    it("renders department and Acting HOD controls when open", () => {
      const html = renderToString(
        <AdminDepartmentModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          department={dummyDepartments[0]}
          users={dummyEligibleUsers}
        />
      );
      expect(html).toContain("Edit Department (CSE)");
      expect(html).toContain("Acting HOD");
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
    it("renders community registration fields including scope and multi-TIC", () => {
      const html = renderToString(
        <AdminAddCommunityModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          eligibleUsers={dummyEligibleUsers}
        />
      );
      expect(html).toContain("Register Community or Chapter");
      expect(html).toContain("Governance Scope");
      expect(html).toContain("Multi-TIC");
      expect(html).toContain("Prof. Arun Kumar");
    });
  });

  describe("AdminEditCommunityModal", () => {
    it("renders community edit fields with code and scope", () => {
      const html = renderToString(
        <AdminEditCommunityModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          community={mockCommunityRow}
          eligibleUsers={dummyEligibleUsers}
        />
      );
      expect(html).toContain("Edit Community (ROBO)");
      expect(html).toContain("Robotics Chapter");
      expect(html).toContain("robotics-chapter");
      expect(html).toContain("Governance Scope");
    });
  });

  describe("AdminConfirmDeleteModal", () => {
    it("renders nothing when target is null or isOpen is false", () => {
      const htmlClosed = renderToString(
        <AdminConfirmDeleteModal
          isOpen={false}
          target={{ type: "event", id: "ev-1", title: "Hackathon" }}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(htmlClosed).toBe("");

      const htmlNull = renderToString(
        <AdminConfirmDeleteModal
          isOpen={true}
          target={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(htmlNull).toBe("");
    });

    it("renders entity-aware destructive confirmation for events and departments", () => {
      const htmlEvent = renderToString(
        <AdminConfirmDeleteModal
          isOpen={true}
          target={{ type: "event", id: "ev-1", title: "Autonomous Drone Expo", subtitle: "Auditorium A" }}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(htmlEvent).toContain("Delete Event");

      const htmlDept = renderToString(
        <AdminConfirmDeleteModal
          isOpen={true}
          target={{ type: "department", id: "d-1", title: "CSE" }}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(htmlDept).toContain("Delete Dept");
    });
  });
});
