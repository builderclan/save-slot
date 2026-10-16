import { describe, it, expect } from "vitest";
import { formatCampusEvent, type DrizzleEventRow } from "../adapters";

describe("formatCampusEvent adapter", () => {
  it("maps creator and community lead_name accurately", () => {
    const rawRow: DrizzleEventRow = {
      id: "ev-1",
      campusId: "campus-1",
      communityId: "comm-1",
      title: "Startup Pitch Arena",
      slug: "startup-pitch-arena",
      description: "Pitch competition",
      category: "Career",
      targetAudience: ["All Students"],
      startTime: new Date("2026-10-25T14:00:00Z"),
      endTime: new Date("2026-10-25T17:00:00Z"),
      locationName: "Central Quad",
      status: "published",
      community: {
        id: "comm-1",
        name: "Entrepreneurship Cell",
        slug: "ecell",
        category: "Career",
        leadName: "Marcus Vance (E-Cell Lead)",
      },
      creator: {
        id: "user-lead-1",
        fullName: "Marcus Vance (E-Cell Lead)",
        email: "lead.ecell@campus.edu",
        role: "organizer",
      },
      reviewer: {
        id: "user-admin-1",
        fullName: "Dr. Veena V (Vice Principal)",
        email: "vp@campus.edu",
        role: "vice_principal",
      },
    };

    const formatted = formatCampusEvent(rawRow);

    expect(formatted.id).toBe("ev-1");
    expect(formatted.community?.name).toBe("Entrepreneurship Cell");
    expect(formatted.community?.lead_name).toBe("Marcus Vance (E-Cell Lead)");
    expect(formatted.creator).toEqual({
      id: "user-lead-1",
      full_name: "Marcus Vance (E-Cell Lead)",
      email: "lead.ecell@campus.edu",
      role: "organizer",
    });
    expect(formatted.reviewer?.full_name).toBe("Dr. Veena V (Vice Principal)");
  });

  it("handles missing creator gracefully and maps community fallback", () => {
    const rawRow: DrizzleEventRow = {
      id: "ev-2",
      campusId: "campus-1",
      communityId: "comm-2",
      title: "Legacy Event",
      slug: "legacy-event",
      description: "No direct creator",
      category: "Tech",
      startTime: new Date("2026-10-25T14:00:00Z"),
      endTime: new Date("2026-10-25T17:00:00Z"),
      locationName: "Lab 1",
      status: "published",
      community: {
        id: "comm-2",
        name: "Coding Club",
        slug: "coding-club",
        leadName: "Alex Chen (Coding Lead)",
      },
    };

    const formatted = formatCampusEvent(rawRow);

    expect(formatted.creator).toBeUndefined();
    expect(formatted.community?.lead_name).toBe("Alex Chen (Coding Lead)");
  });
});
