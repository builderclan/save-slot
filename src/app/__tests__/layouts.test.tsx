import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminLayout from "../admin/layout";
import PrincipalLayout from "../principal/layout";
import LeadLayout from "../lead/layout";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Strict Role Isolation - Layout Guards", () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser);
  const mockRedirect = vi.mocked(redirect);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminLayout (src/app/admin/layout.tsx)", () => {
    it("allows Admin into /admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-admin",
        email: "admin@campus.edu",
        profile: { id: "u-admin", email: "admin@campus.edu", full_name: "Admin", role: "admin", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: true,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: false,
      });

      const res = await AdminLayout({ children: "Admin Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();
    });

    it("blocks and redirects Principal trying to access /admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-principal",
        email: "principal@campus.edu",
        profile: { id: "u-principal", email: "principal@campus.edu", full_name: "Principal", role: "principal", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: true,
        isVicePrincipal: false,
        isLead: false,
      });

      await AdminLayout({ children: "Admin Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=admin_required");
    });

    it("blocks and redirects Lead trying to access /admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-lead",
        email: "lead@campus.edu",
        profile: { id: "u-lead", email: "lead@campus.edu", full_name: "Lead", role: "organizer", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: true,
      });

      await AdminLayout({ children: "Admin Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=admin_required");
    });
  });

  describe("PrincipalLayout (src/app/principal/layout.tsx)", () => {
    it("allows Principal into /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-principal",
        email: "principal@campus.edu",
        profile: { id: "u-principal", email: "principal@campus.edu", full_name: "Principal", role: "principal", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: true,
        isVicePrincipal: false,
        isLead: false,
      });

      const res = await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();
    });

    it("allows Vice Principal into /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-vp",
        email: "vp@campus.edu",
        profile: { id: "u-vp", email: "vp@campus.edu", full_name: "VP", role: "vice_principal", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: true,
        isVicePrincipal: true,
        isLead: false,
      });

      const res = await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();
    });

    it("blocks and redirects Admin trying to access /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-admin",
        email: "admin@campus.edu",
        profile: { id: "u-admin", email: "admin@campus.edu", full_name: "Admin", role: "admin", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: true,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: false,
      });

      await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });

    it("blocks and redirects Lead trying to access /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-lead",
        email: "lead@campus.edu",
        profile: { id: "u-lead", email: "lead@campus.edu", full_name: "Lead", role: "organizer", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: true,
      });

      await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });
  });

  describe("LeadLayout (src/app/lead/layout.tsx)", () => {
    it("allows Lead into /lead", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-lead",
        email: "lead@campus.edu",
        profile: { id: "u-lead", email: "lead@campus.edu", full_name: "Lead", role: "organizer", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: true,
      });

      const res = await LeadLayout({ children: "Lead Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();
    });

    it("blocks and redirects Admin trying to access /lead", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-admin",
        email: "admin@campus.edu",
        profile: { id: "u-admin", email: "admin@campus.edu", full_name: "Admin", role: "admin", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: true,
        isPrincipal: false,
        isVicePrincipal: false,
        isLead: false,
      });

      await LeadLayout({ children: "Lead Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=lead_required");
    });

    it("blocks and redirects Principal trying to access /lead", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: "u-principal",
        email: "principal@campus.edu",
        profile: { id: "u-principal", email: "principal@campus.edu", full_name: "Principal", role: "principal", campus_id: "c-1" },
        leadCommunities: [],
        isAdmin: false,
        isPrincipal: true,
        isVicePrincipal: false,
        isLead: false,
      });

      await LeadLayout({ children: "Lead Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=lead_required");
    });
  });
});
