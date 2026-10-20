import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRedirect = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  redirect: (url: string) => mockRedirect(url),
}));

// Mock getCurrentUser
let mockCurrentUser: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
  isVicePrincipal: boolean;
} | null = null;

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockCurrentUser)),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((cb) =>
    cb({
      query: {
        events: {
          findMany: vi.fn(() => Promise.resolve([])),
        },
      },
    })
  ),
}));

// Mock sub-views
vi.mock("@/features/principal/components/principal-nav-sidebar", () => ({
  PrincipalNavSidebar: (props: { activeTab: string; userName?: string }) => (
    <div data-testid="principal-sidebar" data-tab={props.activeTab} data-user={props.userName} />
  ),
}));

vi.mock("@/features/principal/components/principal-inbox-view", () => ({
  PrincipalInboxView: () => <div data-testid="inbox-view">Inbox View</div>,
}));

vi.mock("@/features/principal/components/principal-schedule-view", () => ({
  PrincipalScheduleView: () => <div data-testid="schedule-view">Schedule View</div>,
}));

vi.mock("@/features/principal/components/principal-history-view", () => ({
  PrincipalHistoryView: () => <div data-testid="history-view">History View</div>,
}));

vi.mock("@/features/principal/components/principal-rejection-modal", () => ({
  PrincipalRejectionModal: () => null,
  DEFAULT_REJECTION_PRESETS: ["Preset 1"],
}));

vi.mock("@/features/events/components/event-detail-modal", () => ({
  EventDetailModal: () => null,
}));

import PrincipalDeskPage from "../principal/page";
import { PrincipalClientDesk } from "@/features/principal";
import type { CampusEvent } from "@/types/database";

const mockEvent: CampusEvent = {
  id: "ev-1",
  campus_id: "campus-1",
  community_id: "comm-1",
  title: "Annual Tech Symposium",
  slug: "annual-tech-symposium",
  description: "Flagship symposium",
  category: "Tech",
  start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
  end_time: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString(),
  location_name: "Auditorium A",
  venue_id: "v-1",
  status: "pending",
  created_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Principal Desk (RSC & Client Desk)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockCurrentUser = {
      id: "principal-1",
      email: "principal@campus.edu",
      fullName: "Dr. Mathew",
      role: "principal",
      isAdmin: false,
      isPrincipal: true,
      isVicePrincipal: false,
    };
  });

  describe("PrincipalDeskPage (Server Component)", () => {
    it("redirects unauthorized users to login", async () => {
      mockCurrentUser = null;
      await PrincipalDeskPage();
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });

    it("redirects users without principal credentials", async () => {
      mockCurrentUser = {
        id: "student-1",
        email: "student@campus.edu",
        fullName: "John",
        role: "student",
        isAdmin: false,
        isPrincipal: false,
        isVicePrincipal: false,
      };
      await PrincipalDeskPage();
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });

    it("renders PrincipalClientDesk when authorized as Principal", async () => {
      const pageJsx = await PrincipalDeskPage();
      const html = renderToString(pageJsx);
      expect(html).toContain("data-user=\"Dr. Mathew\"");
      expect(html).toContain("data-tab=\"inbox\"");
    });

    it("permits vice-principal authorization", async () => {
      mockCurrentUser = {
        id: "vp-1",
        email: "vp@campus.edu",
        fullName: "Prof. Sarah",
        role: "vice_principal",
        isAdmin: false,
        isPrincipal: false,
        isVicePrincipal: true,
      };
      const pageJsx = await PrincipalDeskPage();
      const html = renderToString(pageJsx);
      expect(html).toContain("data-user=\"Prof. Sarah\"");
    });
  });

  describe("PrincipalClientDesk (Interactive Client Desk)", () => {
    it("renders default inbox view when no tab parameter is supplied", () => {
      const html = renderToString(
        <PrincipalClientDesk
          initialEvents={[mockEvent]}
          user={{ fullName: "Dr. Mathew", email: "principal@campus.edu" }}
        />
      );
      expect(html).toContain("data-tab=\"inbox\"");
      expect(html).toContain("data-user=\"Dr. Mathew\"");
      expect(html).toContain("data-testid=\"inbox-view\"");
    });

    it("renders master-schedule view when tab=master-schedule", () => {
      mockSearchParams = new URLSearchParams("tab=master-schedule");
      const html = renderToString(
        <PrincipalClientDesk
          initialEvents={[mockEvent]}
          user={{ fullName: "Dr. Mathew" }}
        />
      );
      expect(html).toContain("data-tab=\"master-schedule\"");
      expect(html).toContain("data-testid=\"schedule-view\"");
    });

    it("renders history view when tab=history", () => {
      mockSearchParams = new URLSearchParams("tab=history");
      const html = renderToString(
        <PrincipalClientDesk
          initialEvents={[mockEvent]}
          user={{ fullName: "Dr. Mathew" }}
        />
      );
      expect(html).toContain("data-tab=\"history\"");
      expect(html).toContain("data-testid=\"history-view\"");
    });

    it("falls back to inbox when invalid tab query param is passed", () => {
      mockSearchParams = new URLSearchParams("tab=invalid-view");
      const html = renderToString(
        <PrincipalClientDesk
          initialEvents={[mockEvent]}
          user={{ fullName: "Dr. Mathew" }}
        />
      );
      expect(html).toContain("data-tab=\"inbox\"");
      expect(html).toContain("data-testid=\"inbox-view\"");
    });
  });
});
