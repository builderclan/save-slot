import { describe, it, expect, vi } from "vitest";
import React from "react";
import { StatusBadge } from "../status-badge";
import { NotificationBanner } from "../notification-banner";
import { EmptyState } from "../empty-state";
import { Modal } from "../modal";
import { RejectionModal } from "@/features/events";
import { AdminRejectionModal } from "@/features/admin";
import { PrincipalRejectionModal } from "@/features/principal";
import type { CampusEvent } from "@/types/database";

describe("UI Design System Primitives", () => {
  describe("StatusBadge (src/components/ui/status-badge.tsx)", () => {
    it("renders published status as pill by default", () => {
      const el = StatusBadge({ status: "published" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("rounded-full");
      expect(el.props.className).toContain("bg-emerald-50");
      expect(el.props.children).toBeDefined();
    });

    it("renders custom label override when provided", () => {
      const el = StatusBadge({ status: "pending", label: "Awaiting Dean" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("bg-amber-50");
      // Children array contains icon and span with label
      const labelSpan = el.props.children[1];
      expect(labelSpan.props.children).toBe("Awaiting Dean");
    });

    it("renders badge variant with uppercase font styling", () => {
      const el = StatusBadge({ status: "rejected", variant: "badge" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("uppercase");
      expect(el.props.className).toContain("bg-rose-50");
      expect(el.props.children).toBe("Needs Revision");
    });

    it("renders dot variant", () => {
      const el = StatusBadge({ status: "approved", variant: "dot" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("inline-flex");
      const [dotSpan, textSpan] = el.props.children;
      expect(dotSpan.props.className).toContain("bg-emerald-500");
      expect(textSpan.props.children).toBe("Approved");
    });

    it("handles fallback for unknown status keys gracefully", () => {
      const el = StatusBadge({ status: "archived" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("bg-slate-50");
      const labelSpan = el.props.children[1];
      expect(labelSpan.props.children).toBe("archived");
    });
  });

  describe("NotificationBanner (src/components/ui/notification-banner.tsx)", () => {
    it("renders toast variant with role status for success", () => {
      const el = NotificationBanner({
        message: "Settings saved",
        type: "success",
        variant: "toast",
      });
      expect(el.props.role).toBe("status");
      expect(el.props.className).toContain("fixed bottom-6");
      expect(el.props.className).toContain("bg-slate-900");
    });

    it("renders inline variant with role alert for errors", () => {
      const el = NotificationBanner({
        message: "Failed to connect",
        type: "error",
        variant: "inline",
      });
      expect(el.props.role).toBe("alert");
      expect(el.props.className).toContain("bg-rose-50/80");
    });

    it("handles dismiss click event when onClose is passed", () => {
      const onCloseMock = vi.fn();
      const el = NotificationBanner({
        message: "Warning text",
        type: "warning",
        onClose: onCloseMock,
      });
      // The dismiss button is the last child in the toast container
      const dismissBtn = el.props.children[el.props.children.length - 1];
      expect(dismissBtn.props["aria-label"]).toBe("Dismiss notification");
      dismissBtn.props.onClick();
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("EmptyState (src/components/ui/empty-state.tsx)", () => {
    it("renders empty state with title and description", () => {
      const el = EmptyState({
        title: "No proposals found",
        description: "Submit your first proposal using the button above.",
      });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("border-dashed");
    });

    it("renders card variant when requested", () => {
      const el = EmptyState({
        title: "No active bookings",
        variant: "card",
      });
      expect(el.props.className).toContain("shadow-2xs");
    });
  });

  describe("Modal (src/components/ui/modal.tsx)", () => {
    it("returns null / empty when isOpen is false", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <Modal
          isOpen={false}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          <div>Body</div>
        </Modal>
      );
      expect(html).toBe("");
    });

    it("renders dialog card when isOpen is true", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <Modal
          isOpen={true}
          onClose={vi.fn()}
          title="Edit Profile"
          description="Update details"
        >
          <div>Body</div>
        </Modal>
      );
      expect(html).toContain("Edit Profile");
      expect(html).toContain("Update details");
      expect(html).toContain("role=\"dialog\"");
    });
  });

  describe("RejectionModal (src/features/events/components/rejection-modal.tsx)", () => {
    const mockEvent: CampusEvent = {
      id: "ev-1",
      campus_id: "c-1",
      community_id: "comm-1",
      title: "AI Hackathon",
      slug: "ai-hackathon",
      location_name: "Auditorium",
      description: "An annual hackathon",
      start_time: "2026-11-01T10:00:00Z",
      end_time: "2026-11-01T18:00:00Z",
      status: "pending",
      category: "Tech",
      community: {
        id: "comm-1",
        campus_id: "c-1",
        name: "Coding Club",
        slug: "coding-club",
        category: "Tech",
      },
    };

    it("returns null when rejectingEvent is null", () => {
      const el = RejectionModal({
        rejectingEvent: null,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
      });
      expect(el).toBeNull();
    });

    it("renders modal form with presets when rejectingEvent is provided", () => {
      const el = RejectionModal({
        rejectingEvent: mockEvent,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
      });
      expect(el).not.toBeNull();
      expect(el!.props.isOpen).toBe(true);
      expect(el!.props.title).toBe("Reject Event Proposal");
    });

    it("works identically with AdminRejectionModal wrapper", () => {
      const el = AdminRejectionModal({
        rejectingEvent: mockEvent,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
      });
      expect(el).not.toBeNull();
      expect(el!.props.submitLabel).toBe("Submit Rejection");
    });

    it("works identically with PrincipalRejectionModal wrapper", () => {
      const el = PrincipalRejectionModal({
        rejectingEvent: mockEvent,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onConfirm: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
      });
      expect(el).not.toBeNull();
      expect(el!.props.title).toBe("Decline Event Proposal");
      expect(el!.props.submitLabel).toBe("Confirm Decline");
    });
  });
});
