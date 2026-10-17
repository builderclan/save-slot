import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import NoticeBoardLoading from "../loading";
import AdminLoading from "../admin/loading";
import LeadLoading from "../lead/loading";
import AdminError from "../admin/error";
import LeadError from "../lead/error";
import PrincipalLoading from "../principal/loading";
import PrincipalError from "../principal/error";
import RootError from "../error";

describe("Route Loading Skeletons & Error Boundaries", () => {
  describe("Loading Skeletons (SSR)", () => {
    it("renders root notice board loading skeleton without throwing", () => {
      const html = renderToString(<NoticeBoardLoading />);
      expect(html).toContain("animate-pulse");
    });

    it("renders admin dashboard loading skeleton without throwing", () => {
      const html = renderToString(<AdminLoading />);
      expect(html).toContain("animate-pulse");
    });

    it("renders lead workspace loading skeleton without throwing", () => {
      const html = renderToString(<LeadLoading />);
      expect(html).toContain("animate-pulse");
    });

    it("renders principal desk loading skeleton without throwing", () => {
      const html = renderToString(<PrincipalLoading />);
      expect(html).toContain("animate-pulse");
    });
  });

  describe("Error Boundaries (SSR)", () => {
    it("renders root error boundary with retry trigger and error digest", () => {
      const mockReset = vi.fn();
      const mockError = Object.assign(new Error("Database disconnected"), {
        digest: "DIGEST-ROOT-123",
      });

      const html = renderToString(<RootError error={mockError} reset={mockReset} />);
      expect(html).toContain("Something went wrong");
      expect(html).toContain("DIGEST-ROOT-123");
      expect(html).toContain("Try Again");
    });

    it("renders admin error boundary with scoped notice and admin link", () => {
      const mockReset = vi.fn();
      const mockError = Object.assign(new Error("Admin RPC timeout"), {
        digest: "DIGEST-ADMIN-456",
      });

      const html = renderToString(<AdminError error={mockError} reset={mockReset} />);
      expect(html).toContain("Admin Console Exception");
      expect(html).toContain("Administrative View Unavailable");
      expect(html).toContain("DIGEST-ADMIN-456");
      expect(html).toContain("Retry Queue");
      expect(html).toContain("Admin Home");
    });

    it("renders lead error boundary with scoped notice and lead link", () => {
      const mockReset = vi.fn();
      const mockError = Object.assign(new Error("Club proposal fetch failed"), {
        digest: "DIGEST-LEAD-789",
      });

      const html = renderToString(<LeadError error={mockError} reset={mockReset} />);
      expect(html).toContain("Workspace Notice");
      expect(html).toContain("Lead Workspace Interrupted");
      expect(html).toContain("DIGEST-LEAD-789");
      expect(html).toContain("Reload Workspace");
      expect(html).toContain("Lead Home");
    });

    it("renders principal error boundary with scoped notice and principal link", () => {
      const mockReset = vi.fn();
      const mockError = Object.assign(new Error("Executive desk failure"), {
        digest: "DIGEST-PRIN-101",
      });

      const html = renderToString(<PrincipalError error={mockError} reset={mockReset} />);
      expect(html).toContain("Executive Portal Exception");
      expect(html).toContain("Executive Desk Unavailable");
      expect(html).toContain("DIGEST-PRIN-101");
      expect(html).toContain("Reload Desk");
      expect(html).toContain("Desk Home");
    });
  });
});
