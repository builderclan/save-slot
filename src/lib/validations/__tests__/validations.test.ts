import { describe, it, expect } from "vitest";
import {
  LoginSchema,
  ProposeEventSchema,
  UpdateEventStatusSchema,
  ConflictCheckSchema,
  CreateVenueSchema,
  UpdateVenueSchema,
  CreateUserSchema,
} from "../index";


describe("Zod Validation Schemas", () => {
  describe("LoginSchema", () => {
    it("accepts valid email and password", () => {
      const result = LoginSchema.safeParse({
        email: "lead.coding@campus.edu",
        password: "securePassword123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("lead.coding@campus.edu");
      }
    });

    it("trims whitespace around emails", () => {
      const result = LoginSchema.safeParse({
        email: "  admin@campus.edu  ",
        password: "adminPassword",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("admin@campus.edu");
      }
    });

    it("rejects invalid email formats", () => {
      const result = LoginSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const result = LoginSchema.safeParse({
        email: "user@campus.edu",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ProposeEventSchema", () => {
    const validProposal = {
      title: "Annual Hackathon 2026",
      category: "Tech",
      venueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      startTime: "2026-10-20T10:00:00.000Z",
      endTime: "2026-10-20T18:00:00.000Z",
      description: "An intensive 8-hour sprint for campus developers and engineers.",
      coverImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      externalRegistrationUrl: "https://eventbrite.com/e/hackathon",
    };

    it("accepts a complete, valid event proposal", () => {
      const result = ProposeEventSchema.safeParse(validProposal);
      expect(result.success).toBe(true);
    });

    it("rejects when endTime is before or equal to startTime", () => {
      const result = ProposeEventSchema.safeParse({
        ...validProposal,
        startTime: "2026-10-20T18:00:00.000Z",
        endTime: "2026-10-20T10:00:00.000Z",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("End time must be after start time");
      }
    });

    it("rejects invalid venue UUID", () => {
      const result = ProposeEventSchema.safeParse({
        ...validProposal,
        venueId: "not-a-valid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short titles (< 3 characters)", () => {
      const result = ProposeEventSchema.safeParse({
        ...validProposal,
        title: "Hi",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unrecognized categories", () => {
      const result = ProposeEventSchema.safeParse({
        ...validProposal,
        category: "GamingParty",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateEventStatusSchema", () => {
    it("accepts valid statuses", () => {
      expect(UpdateEventStatusSchema.safeParse({ status: "published" }).success).toBe(true);
      expect(UpdateEventStatusSchema.safeParse({ status: "rejected", rejectionReason: "Venue booked" }).success).toBe(true);
      expect(UpdateEventStatusSchema.safeParse({ status: "pending" }).success).toBe(true);
    });

    it("rejects invalid status values", () => {
      expect(UpdateEventStatusSchema.safeParse({ status: "approved" }).success).toBe(false);
      expect(UpdateEventStatusSchema.safeParse({ status: "draft" }).success).toBe(false);
      expect(UpdateEventStatusSchema.safeParse({ status: "unknown" }).success).toBe(false);
    });
  });

  describe("ConflictCheckSchema", () => {
    it("validates required venue and ISO times", () => {
      const valid = {
        venueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        startTime: "2026-10-25T14:00:00.000Z",
        endTime: "2026-10-25T17:00:00.000Z",
      };
      expect(ConflictCheckSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects missing venueId or invalid timestamp", () => {
      expect(
        ConflictCheckSchema.safeParse({
          venueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          startTime: "invalid-date",
          endTime: "2026-10-25T17:00:00.000Z",
        }).success
      ).toBe(false);
    });
  });

  describe("CreateVenueSchema", () => {
    it("coerces numeric string capacity to integer", () => {
      const result = CreateVenueSchema.safeParse({
        name: "Seminar Hall B",
        building: "Block 2",
        capacity: "150",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.capacity).toBe(150);
      }
    });
  });

  describe("UpdateVenueSchema", () => {
    it("validates valid UUID and boolean status", () => {
      const result = UpdateVenueSchema.safeParse({
        id: "a1b2c3d4-e5f6-4890-a123-ef1234567890",
        is_active: false,
      });
      expect(result.success).toBe(true);
    });


    it("rejects non-boolean is_active or invalid UUID", () => {
      expect(
        UpdateVenueSchema.safeParse({
          id: "not-a-uuid",
          is_active: false,
        }).success
      ).toBe(false);

      expect(
        UpdateVenueSchema.safeParse({
          id: "11111111-2222-3333-4444-555555555555",
          is_active: "yes",
        }).success
      ).toBe(false);
    });
  });


  describe("CreateUserSchema", () => {
    it("accepts valid administrator provisioning payload", () => {
      const result = CreateUserSchema.safeParse({
        fullName: "Dr. Paul Mathew",
        email: "paul.mathew@campus.edu",
        password: "TempPass#2026",
        role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid vice_principal provisioning payload", () => {
      const result = CreateUserSchema.safeParse({
        fullName: "Dr. Sarah Varghese (Vice Principal)",
        email: "viceprincipal@campus.edu",
        password: "viceprincipal123",
        role: "vice_principal",
      });
      expect(result.success).toBe(true);
    });

    it("rejects passwords shorter than 6 characters", () => {
      const result = CreateUserSchema.safeParse({
        fullName: "Student Lead",
        email: "lead@campus.edu",
        password: "12345",
        role: "organizer",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("at least 6 characters");
      }
    });

    it("rejects unauthorized/unknown roles", () => {
      const result = CreateUserSchema.safeParse({
        fullName: "Guest Speaker",
        email: "speaker@campus.edu",
        password: "Password123",
        role: "superuser",
      });
      expect(result.success).toBe(false);
    });
  });
});
