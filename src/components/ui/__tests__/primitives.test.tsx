import { describe, it, expect, vi } from "vitest";
import React from "react";
import { StatusBadge } from "../status-badge";
import { NotificationBanner } from "../notification-banner";
import { EmptyState } from "../empty-state";
import { Modal } from "../modal";
import { Button } from "../button";
import { Input } from "../input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../card";
import { Tabs } from "../tabs";
import { UserAvatar } from "../avatar";
import { Select } from "../select";
import { DatePicker } from "../date-picker";
import { TimePicker } from "../time-picker";
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

    it("renders inline error alert when errorMessage is provided", () => {
      const el = RejectionModal({
        rejectingEvent: mockEvent,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onSubmit: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
        errorMessage: "Event not found",
      });
      expect(el).not.toBeNull();
      const form = el!.props.children;
      expect(form).toBeDefined();
    });

    it("passes errorMessage through PrincipalRejectionModal wrapper", () => {
      const el = PrincipalRejectionModal({
        rejectingEvent: mockEvent,
        rejectionNote: "",
        onRejectionNoteChange: vi.fn(),
        onConfirm: vi.fn(),
        onClose: vi.fn(),
        isSubmitting: false,
        errorMessage: "Event not found",
      });
      expect(el).not.toBeNull();
      expect(el!.props.errorMessage).toBe("Event not found");
    });
  });

  describe("Button (src/components/ui/button.tsx)", () => {
    it("renders primary button variant with default md sizing", () => {
      const el = Button({ children: "Save changes" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("bg-zinc-900");
      expect(el.props.className).toContain("h-9");
      expect(el.props.children).toBeDefined();
    });

    it("renders secondary button variant and sm size", () => {
      const el = Button({ variant: "secondary", size: "sm", children: "Cancel" });
      expect(el).toBeTruthy();
      expect(el.props.className).toContain("bg-white");
      expect(el.props.className).toContain("h-8");
    });

    it("renders loading spinner state and disables interaction", () => {
      const el = Button({ isLoading: true, children: "Submitting" });
      expect(el).toBeTruthy();
      expect(el.props.disabled).toBe(true);
    });
  });

  describe("Input (src/components/ui/input.tsx)", () => {
    it("renders input with label and placeholder", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(<Input label="Venue Name" placeholder="e.g. Auditorium" />);
      expect(html).toContain("Venue Name");
      expect(html).toContain('placeholder="e.g. Auditorium"');
    });

    it("renders error state with aria-invalid and aria-describedby", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(<Input error="Title is required" />);
      expect(html).toContain("border-rose-400");
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain("Title is required");
    });
  });

  describe("Card (src/components/ui/card.tsx)", () => {
    it("renders card container with header, content, and footer", () => {
      const card = Card({ children: "Card body" });
      expect(card).toBeTruthy();
      expect(card.props.className).toContain("bg-white");
      expect(card.props.className).toContain("rounded-2xl");

      const header = CardHeader({ children: CardTitle({ children: "Header Title" }) });
      expect(header.props.className).toContain("border-b");

      const content = CardContent({ children: "Main body" });
      expect(content.props.className).toContain("p-5");

      const footer = CardFooter({ children: "Footer info" });
      expect(footer.props.className).toContain("bg-zinc-50/60");
    });

    it("renders card with keyboard semantics when onClick is provided", () => {
      const onClick = vi.fn();
      const card = Card({ onClick, children: "Clickable card" });
      expect(card.props.role).toBe("button");
      expect(card.props.tabIndex).toBe(0);
    });
  });

  describe("Tabs (src/components/ui/tabs.tsx)", () => {
    it("renders segmented tabs with active state and roving tabIndex", () => {
      const onSelect = vi.fn();
      const items = [
        { id: "month", label: "Month", count: 12 },
        { id: "week", label: "Week" },
      ];
      const el = Tabs({ items, activeId: "month", onChange: onSelect });
      expect(el).toBeTruthy();
      expect(el.props.role).toBe("tablist");
      expect(el.props.children.length).toBe(2);
      expect(el.props.children[0].props["aria-selected"]).toBe(true);
      expect(el.props.children[0].props.tabIndex).toBe(0);
      expect(el.props.children[1].props["aria-selected"]).toBe(false);
      expect(el.props.children[1].props.tabIndex).toBe(-1);
    });
  });

  describe("UserAvatar (src/components/ui/avatar.tsx)", () => {
    it("renders blobatar with name as seed", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(<UserAvatar name="Alex Rivera" role="admin" />);
      expect(html).toContain("ring-amber-300");
      expect(html).toContain('title="Alex Rivera"');
      expect(html).toMatch(/<img|<svg/);
    });

    it("falls back to 'User' seed when name is not provided", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(<UserAvatar email="test@example.com" />);
      expect(html).toMatch(/<img|<svg/);
    });
  });

  describe("Select (src/components/ui/select.tsx)", () => {
    it("renders select trigger with selected option label", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <Select
          label="Category"
          value="Tech"
          onChange={() => {}}
          options={[
            { value: "Tech", label: "Technology" },
            { value: "Arts", label: "Creative Arts" },
          ]}
        />
      );
      expect(html).toContain("Category");
      expect(html).toContain("Technology");
      expect(html).toContain('aria-haspopup="listbox"');
    });

    it("renders placeholder when no option matches value", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <Select
          value=""
          onChange={() => {}}
          options={["Tech", "Arts"]}
          placeholder="Pick a track..."
        />
      );
      expect(html).toContain("Pick a track...");
    });
  });

  describe("DatePicker (src/components/ui/date-picker.tsx)", () => {
    it("renders formatted date string on trigger", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <DatePicker
          label="Event Date"
          value="2026-10-29"
          onChange={() => {}}
        />
      );
      expect(html).toContain("Event Date");
      expect(html).toContain("Oct 29, 2026");
      expect(html).toContain('aria-haspopup="dialog"');
    });

    it("renders placeholder when no value is provided", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <DatePicker
          value=""
          onChange={() => {}}
          placeholder="Choose event date..."
        />
      );
      expect(html).toContain("Choose event date...");
    });
  });

  describe("TimePicker (src/components/ui/time-picker.tsx)", () => {
    it("renders formatted 12-hour time string on trigger", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <TimePicker
          label="Start Time"
          value="14:00"
          onChange={() => {}}
        />
      );
      expect(html).toContain("Start Time");
      expect(html).toContain("02:00 PM");
      expect(html).toContain('aria-haspopup="listbox"');
    });

    it("renders badge when provided", async () => {
      const { renderToString } = await import("react-dom/server");
      const html = renderToString(
        <TimePicker
          label="End Time"
          badge={<span>Overnight (+1 day)</span>}
          value="02:00"
          onChange={() => {}}
        />
      );
      expect(html).toContain("Overnight (+1 day)");
    });
  });
});


