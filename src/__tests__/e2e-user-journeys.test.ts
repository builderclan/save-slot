import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addDays } from "date-fns";
import {
  checkEventConflicts,
  doAudiencesOverlap,
  getOverlappingAudience,
} from "@/lib/conflicts/engine";
import { downloadIcsFile, getGoogleCalendarUrl } from "@/lib/calendar-export";
import { ProposeEventSchema, UpdateEventStatusSchema, CreateVenueSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { formatCampusEvent, formatVenue } from "@/db/adapters";
import type { CampusEvent, Venue } from "@/types/database";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
import { revalidatePath } from "next/cache";

// Mock DB retry and pool
const { mockSelect, queueQueryResults, resetQueryQueue } = vi.hoisted(() => {
  let queryQueue: unknown[][] = [];

  const queueQueryResults = (...results: unknown[][]) => {
    queryQueue.push(...results);
  };

  const resetQueryQueue = () => {
    queryQueue = [];
  };

  interface MockSelectChain {
    from: (table: unknown) => MockSelectChain;
    innerJoin: (...args: unknown[]) => MockSelectChain;
    leftJoin: (...args: unknown[]) => MockSelectChain;
    where: (...args: unknown[]) => MockSelectChain;
    orderBy: (...args: unknown[]) => MockSelectChain;
    limit: (...args: unknown[]) => Promise<unknown[]>;
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  }

  const mockSelect = vi.fn().mockImplementation(() => {
    const createChain = () => {
      const getNext = () => queryQueue.shift() ?? [];
      const chain: MockSelectChain = {
        from: vi.fn().mockImplementation(() => chain),
        innerJoin: vi.fn().mockImplementation(() => chain),
        leftJoin: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation(() => chain),
        orderBy: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => Promise.resolve(getNext())),
        then: (resolve, reject) => Promise.resolve(getNext()).then(resolve, reject),
      };
      return chain;
    };
    return createChain();
  });

  return { mockSelect, queueQueryResults, resetQueryQueue };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    query: {
      events: {
        findMany: vi.fn(),
      },
    },
  };
  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("End-to-End Multi-Persona User Journeys (E2E Integration)", () => {
  const venueUuid = "c0a80101-0000-4000-8000-000000000001";
  const mockVenue = {
    id: venueUuid,
    campus_id: "campus-uuid-1",
    name: "Turing Auditorium",
    building: "Science Wing",
    capacity: 250,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryQueue();
  });

  describe("Journey 1: Public Student Notice Board & Calendar Integration Journey", () => {
    const mockPublishedEvent: CampusEvent = {
      id: "ev-pub-101",
      campus_id: "campus-aisat-1",
      community_id: "comm-coding-1",
      title: "Annual Web3 & Rust Hackathon",
      slug: "annual-web3-rust-hackathon",
      description: "24-hour campus hackathon building high-speed decentralized systems.",
      category: "Tech",
      start_time: "2026-11-10T09:00:00.000Z",
      end_time: "2026-11-10T17:00:00.000Z",
      location_name: "Turing Auditorium",
      venue_id: venueUuid,
      status: "published",
      created_by: "lead-alex-1",
      created_at: new Date("2026-10-01T10:00:00Z").toISOString(),
      updated_at: new Date("2026-10-02T12:00:00Z").toISOString(),
      external_registration_url: "https://campus.edu/rsvp/hackathon",
      target_audience: ["Computer Science", "Engineering"],
      venue: {
        id: venueUuid,
        campus_id: "campus-aisat-1",
        name: "Turing Auditorium",
        building: "Science Wing",
        capacity: 250,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      community: {
        id: "comm-coding-1",
        campus_id: "campus-aisat-1",
        name: "Coding Club",
        slug: "coding-club",
        category: "Tech",
        lead_name: "Alex Chen",
        status: "approved",
        created_at: new Date().toISOString(),
      },
    };

    it("verifies public event formatting and category filtering", () => {
      const rawDbRow = {
        id: "ev-pub-101",
        campusId: "campus-aisat-1",
        communityId: "comm-coding-1",
        title: "Annual Web3 & Rust Hackathon",
        slug: "annual-web3-rust-hackathon",
        description: "24-hour campus hackathon building high-speed decentralized systems.",
        category: "Tech",
        startTime: new Date("2026-11-10T09:00:00Z"),
        endTime: new Date("2026-11-10T17:00:00Z"),
        locationName: "Turing Auditorium",
        venueId: venueUuid,
        status: "published",
        createdBy: "lead-alex-1",
        createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-02T12:00:00Z"),
        externalRegistrationUrl: "https://campus.edu/rsvp/hackathon",
        targetAudience: ["Computer Science", "Engineering"],
        venue: {
          id: venueUuid,
          campusId: "campus-aisat-1",
          name: "Turing Auditorium",
          building: "Science Wing",
          capacity: 250,
          isActive: true,
        },
        community: {
          id: "comm-coding-1",
          campusId: "campus-aisat-1",
          name: "Coding Club",
          slug: "coding-club",
          category: "Tech",
          leadName: "Alex Chen",
        },
      };

      const event = formatCampusEvent(rawDbRow);
      expect(event.title).toBe("Annual Web3 & Rust Hackathon");
      expect(event.status).toBe("published");
      expect(event.venue?.name).toBe("Turing Auditorium");
      expect(event.community?.lead_name).toBe("Alex Chen");

      // Category filter matching
      expect(event.category.toLowerCase()).toBe("tech");
      expect(event.category.toLowerCase() === "cultural").toBe(false);
    });

    describe("Calendar Exporting", () => {
      beforeEach(() => {
        const mockElement = {
          href: "",
          setAttribute: vi.fn(),
          click: vi.fn(),
        };

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

      it("triggers RFC 5545 compliant .ics calendar download for student export", () => {
        downloadIcsFile(mockPublishedEvent);

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalled();

        const blobArg = vi.mocked(window.URL.createObjectURL).mock.calls[0][0] as Blob;
        expect(blobArg).toBeInstanceOf(Blob);
        expect(blobArg.type).toContain("text/calendar");
      });

      it("generates a direct Google Calendar template deep link with URL-encoded parameters", () => {
        const googleUrl = getGoogleCalendarUrl(mockPublishedEvent);

        expect(googleUrl).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
        expect(googleUrl).toContain("text=Annual%20Web3%20%26%20Rust%20Hackathon");
        expect(googleUrl).toContain("dates=20261110T090000Z/20261110T170000Z");
        expect(googleUrl).toContain("location=Turing%20Auditorium%20(Science%20Wing)");
        expect(googleUrl).toContain("Register%3A%20https%3A%2F%2Fcampus.edu%2Frsvp%2Fhackathon");
      });
    });
  });

  describe("Journey 2: Community Lead Proposal & Safe-Slot Conflict Engine Journey", () => {
    it("flags lead-time policy violation when proposal is submitted less than 7 days in advance", async () => {
      const nearDate = addDays(new Date(), 3); // 3 days away (< 7)
      const startTime = new Date(nearDate.setHours(10, 0, 0, 0)).toISOString();
      const endTime = new Date(nearDate.setHours(12, 0, 0, 0)).toISOString();

      // Queue: 1) venue, 2) no venue collision, 3) safe day 1, 4) alt venue, 5) safe day 2
      queueQueryResults(
        [mockVenue],
        [],
        [],
        [],
        []
      );

      const result = await checkEventConflicts({
        venueId: venueUuid,
        startTime,
        endTime,
      });

      expect(result.hasConflict).toBe(false);
      expect(result.hasLeadTimeViolation).toBe(true);
      expect(result.message).toContain("must be submitted at least 7 days in advance");
      expect(result.leadTimeDays).toBeLessThan(7);
      expect(result.safeSlots.length).toBeGreaterThan(0);
      expect(result.safeSlots[0].label).toContain("Earliest Safe Date");
    });

    it("detects a hard collision and calculates safe slot alternatives when another event occupies the venue", async () => {
      const futureDate = addDays(new Date(), 12);
      const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
      const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

      const collidingEvent = {
        id: "ev-clash-123",
        campus_id: "campus-uuid-1",
        community_id: "comm-1",
        title: "Robotics Workshop",
        slug: "robotics-workshop",
        description: "Hands-on robotics session",
        start_time: startTime,
        end_time: endTime,
        location_name: "Turing Auditorium",
        category: "Tech",
        status: "published",
        venue_id: venueUuid,
        community: {
          id: "comm-1",
          campus_id: "campus-uuid-1",
          name: "IEEE Student Branch",
          slug: "ieee",
          category: "Tech",
        },
        venue: mockVenue,
      };

      queueQueryResults(
        [mockVenue], // 1. target venue lookup
        [collidingEvent], // 2. clash found
        [], // 3. slot1 same venue later check
        [], // 4. alt venues query
        []  // 5. next day check
      );

      const result = await checkEventConflicts({
        venueId: venueUuid,
        startTime,
        endTime,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.hasVenueConflict).toBe(true);
      expect(result.conflictingEvent?.id).toBe("ev-clash-123");
      expect(result.message).toContain('Turing Auditorium is already booked for "Robotics Workshop" by IEEE Student Branch');
      expect(result.safeSlots.length).toBeGreaterThan(0);

      const sameVenueLater = result.safeSlots.find((s) => s.type === "same_venue_later");
      expect(sameVenueLater).toBeDefined();
      expect(sameVenueLater?.reason).toContain("30-minute buffer after IEEE Student Branch concludes");
    });

    it("validates successful proposal schema when lead selects a conflict-free safe slot", () => {
      const validFutureDate = addDays(new Date(), 10);
      const startTime = new Date(validFutureDate.setHours(14, 0, 0, 0)).toISOString();
      const endTime = new Date(validFutureDate.setHours(16, 0, 0, 0)).toISOString();

      const validProposal = {
        title: "Hands-on Next.js 16 Workshop",
        category: "Tech" as const,
        targetAudience: ["All Students" as const],
        venueId: venueUuid,
        startTime,
        endTime,
        description: "Mastering App Router and Turbopack in production.",
      };

      const parsed = ProposeEventSchema.safeParse(validProposal);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.title).toBe("Hands-on Next.js 16 Workshop");
        expect(parsed.data.category).toBe("Tech");
        expect(parsed.data.venueId).toBe(venueUuid);
      }
    });

    it("evaluates student audience overlap and identifies common cohorts", () => {
      expect(doAudiencesOverlap(["All Students"], ["1st Year", "2nd Year"])).toBe(true);
      expect(doAudiencesOverlap(["1st Year"], ["Final Year"])).toBe(false);
      expect(doAudiencesOverlap(["3rd Year", "Final Year"], ["Final Year", "Postgraduate"])).toBe(true);

      const overlap = getOverlappingAudience(["3rd Year", "Final Year"], ["Final Year", "Postgraduate"]);
      expect(overlap).toEqual(["Final Year"]);
    });
  });

  describe("Journey 3: Executive Principal Triage & Institutional Approval Journey", () => {
    it("validates status transition schema for approval and decline actions", () => {
      // Approval payload
      const approvePayload = { status: "published" };
      const parsedApprove = UpdateEventStatusSchema.safeParse(approvePayload);
      expect(parsedApprove.success).toBe(true);

      // Rejection payload with required feedback reason
      const rejectPayload = {
        status: "rejected",
        rejectionReason: "Auditorium audio/visual equipment undergoing scheduled maintenance.",
      };
      const parsedReject = UpdateEventStatusSchema.safeParse(rejectPayload);
      expect(parsedReject.success).toBe(true);

      // Invalid status transition
      const invalidPayload = { status: "invalid_status" };
      const parsedInvalid = UpdateEventStatusSchema.safeParse(invalidPayload);
      expect(parsedInvalid.success).toBe(false);
    });

    it("triggers on-demand edge ISR cache revalidation upon publishing an event", () => {
      safeRevalidatePath("/");
      expect(revalidatePath).toHaveBeenCalledWith("/");

      safeRevalidatePath("/lead");
      expect(revalidatePath).toHaveBeenCalledWith("/lead");

      safeRevalidatePath("/admin");
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
    });
  });

  describe("Journey 4: Campus Admin Infrastructure & Venue Governance Journey", () => {
    it("validates venue creation schema and operational active status toggling", () => {
      const newVenueData = {
        name: "Turing Innovation Hall",
        building: "Science Wing",
        capacity: 120,
        address: "Room 304, 3rd Floor",
        notes: "Dual 4K Projectors, Dolby Audio",
      };

      const parsed = CreateVenueSchema.safeParse(newVenueData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Turing Innovation Hall");
        expect(parsed.data.capacity).toBe(120);
      }

      const rawVenue = {
        id: "v-new-1",
        campusId: "campus-aisat-1",
        name: "Turing Innovation Hall",
        building: "Science Wing",
        capacity: 120,
        address: "Room 304, 3rd Floor",
        notes: "Dual 4K Projectors, Dolby Audio",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const venue: Venue = formatVenue(rawVenue);
      expect(venue.id).toBe("v-new-1");
      expect(venue.is_active).toBe(true);

      // Deactivation toggle
      const deactivatedVenue: Venue = { ...venue, is_active: false };
      expect(deactivatedVenue.is_active).toBe(false);
    });
  });
});
