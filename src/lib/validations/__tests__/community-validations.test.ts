import { describe, it, expect } from "vitest";
import { CreateCommunitySchema, UpdateCommunityFullSchema } from "../index";

describe("Community Validation Schemas", () => {
  describe("CreateCommunitySchema", () => {
    it("accepts valid minimum community payload", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "Robotics Club",
        category: "Tech",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Robotics Club");
        expect(result.data.category).toBe("Tech");
      }
    });

    it("accepts valid full community payload", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "Design Guild",
        slug: "design-guild",
        category: "Arts",
        description: "Creative design & UI/UX workshops",
        logoUrl: "https://example.com/logo.png",
        website: "https://design.campus.edu",
        instagram: "@designguild",
        leadUserId: "a0000000-0000-4000-8000-000000000001",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short or empty name", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "A",
        category: "Tech",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("at least 2 characters");
      }
    });

    it("rejects invalid slug characters", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "Tech Club",
        slug: "Tech Club!",
        category: "Tech",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("lowercase letters, numbers, and hyphens");
      }
    });

    it("rejects invalid category", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "Cooking Society",
        category: "InvalidCategory",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid logo URL", () => {
      const result = CreateCommunitySchema.safeParse({
        name: "Tech Club",
        category: "Tech",
        logoUrl: "not-a-valid-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateCommunityFullSchema", () => {
    it("accepts partial updates", () => {
      const result = UpdateCommunityFullSchema.safeParse({
        name: "Updated Name",
        description: "New description",
        status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status changes", () => {
      const result = UpdateCommunityFullSchema.safeParse({
        status: "rejected",
      });
      expect(result.success).toBe(true);
    });
  });
});
