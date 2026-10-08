import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getGoogleCalendarUrl, downloadIcsFile } from "../calendar-export";
import { CampusEvent } from "@/types/database";

describe("Calendar Export Utility (src/lib/calendar-export.ts)", () => {
  const sampleEvent: CampusEvent = {
    id: "event-uuid-1234",
    campus_id: "campus-uuid-1",
    community_id: "comm-uuid-1",
    venue_id: "venue-uuid-1",
    title: "AI & Robotics Summit",
    slug: "ai-robotics-summit",
    description: "Annual keynote on autonomous systems.\nJoin us for workshops.",
    category: "Tech",
    start_time: "2026-10-25T10:00:00.000Z",
    end_time: "2026-10-25T16:00:00.000Z",
    location_name: "Turing Hall",
    status: "published",
    external_registration_url: "https://campus.edu/register/summit",
    community: {
      id: "comm-uuid-1",
      campus_id: "campus-uuid-1",
      name: "Robotics Club",
      slug: "robotics-club",
      category: "Tech",
    },
    venue: {
      id: "venue-uuid-1",
      campus_id: "campus-uuid-1",
      name: "Turing Auditorium",
      building: "CS Block",
      capacity: 250,
      is_active: true,
    },
  };

  describe("getGoogleCalendarUrl", () => {
    it("generates a valid Google Calendar URL with correct parameters", () => {
      const url = getGoogleCalendarUrl(sampleEvent);

      expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
      expect(url).toContain("text=AI%20%26%20Robotics%20Summit");
      expect(url).toContain("dates=20261025T100000Z/20261025T160000Z");
      expect(url).toContain("location=Turing%20Auditorium%20(CS%20Block)");
      expect(url).toContain("Register%3A%20https%3A%2F%2Fcampus.edu%2Fregister%2Fsummit");
    });

    it("falls back to location_name when venue is not assigned", () => {
      const eventWithoutVenue: CampusEvent = {
        ...sampleEvent,
        venue: undefined,
        location_name: "Open Lawn B",
      };

      const url = getGoogleCalendarUrl(eventWithoutVenue);
      expect(url).toContain("location=Open%20Lawn%20B");
    });

    it("handles events without external registration URL", () => {
      const eventWithoutReg: CampusEvent = {
        ...sampleEvent,
        external_registration_url: undefined,
      };

      const url = getGoogleCalendarUrl(eventWithoutReg);
      expect(url).not.toContain("Register%3A");
    });
  });

  describe("downloadIcsFile", () => {
    beforeEach(() => {
      const mockElement = {
        href: "",
        setAttribute: vi.fn(),
        click: vi.fn(),
      };

      // Mock DOM globals in Node.js test environment
      vi.stubGlobal("window", {
        URL: {
          createObjectURL: vi.fn().mockReturnValue("blob:mock-ics-url"),
          revokeObjectURL: vi.fn(),
        },
      });

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(mockElement),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("creates and triggers download of RFC-compliant .ics file", () => {
      downloadIcsFile(sampleEvent);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();

      const blobCall = vi.mocked(window.URL.createObjectURL).mock.calls[0][0] as Blob;
      expect(blobCall).toBeInstanceOf(Blob);
      expect(blobCall.type).toContain("text/calendar");
    });
  });
});
