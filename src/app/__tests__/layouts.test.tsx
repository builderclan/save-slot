import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminLayout from "../admin/layout";
import PrincipalLayout from "../principal/layout";
import LeadLayout from "../lead/layout";
import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { getCurrentUser as getServerCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

function makeSession(overrides: Partial<AuthSession> & { role: AuthSession["profile"]["role"] }): AuthSession {
  const { role, ...rest } = overrides;
  return {
    userId: `u-${role}`,
    email: `${role}@aisat.ac.in`,
    profile: {
      id: `u-${role}`,
      email: `${role}@aisat.ac.in`,
      full_name: role.toUpperCase(),
      role,
    },
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [],
    isAdmin: role === "admin",
    isPrincipal: role === "principal" || role === "vice_principal",
    isVicePrincipal: role === "vice_principal",
    isHod: role === "hod",
    isActingHod: false,
    isFic: role === "fic",
    isStaff: role === "staff",
    isLead: role === "lead",
    ...rest,
  };
}

describe("Strict Role Isolation - Layout Guards (v1.0.0)", () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser);
  const mockGetServerCurrentUser = vi.mocked(getServerCurrentUser);
  const mockRedirect = vi.mocked(redirect);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerCurrentUser.mockImplementation((...args) => mockGetCurrentUser(...args));
  });

  describe("AdminLayout (src/app/admin/layout.tsx)", () => {
    it("allows Admin into /admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "admin" }));
      const res = await AdminLayout({ children: "Admin Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();
    });

    it("blocks Principal from /admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "principal" }));
      await AdminLayout({ children: "Admin Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=admin_required");
    });

    it.each(["lead", "hod"] as const)(
      "blocks %s from /admin",
      async (role) => {
        mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role }));
        await AdminLayout({ children: "Admin Content" });
        expect(mockRedirect).toHaveBeenCalledWith("/login?error=admin_required");
      }
    );
  });

  describe("PrincipalLayout (src/app/principal/layout.tsx)", () => {
    it("allows Principal and Vice Principal into /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "principal" }));
      const res = await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(res).toBeTruthy();

      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "vice_principal" }));
      const resVp = await PrincipalLayout({ children: "VP Content" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(resVp).toBeTruthy();
    });

    it("blocks Admin from /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "admin" }));
      await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });

    it("blocks Lead from /principal", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role: "lead" }));
      await PrincipalLayout({ children: "Principal Content" });
      expect(mockRedirect).toHaveBeenCalledWith("/login?error=principal_required");
    });
  });

  describe("LeadLayout (src/app/lead/layout.tsx)", () => {
    it.each(["lead", "fic", "hod", "staff"] as const)(
      "allows %s into /lead",
      async (role) => {
        mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role }));
        const res = await LeadLayout({ children: "Workspace Content" });
        expect(mockRedirect).not.toHaveBeenCalled();
        expect(res).toBeTruthy();
      }
    );

    it.each(["admin", "principal"] as const)(
      "blocks %s from /lead",
      async (role) => {
        mockGetCurrentUser.mockResolvedValueOnce(makeSession({ role }));
        await LeadLayout({ children: "Lead Content" });
        expect(mockRedirect).toHaveBeenCalledWith("/login?error=lead_required");
      }
    );
  });
});
