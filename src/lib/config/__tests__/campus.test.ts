import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { slugify, extractAcronym } from "../campus";

describe("campusConfig auto-derivation utilities", () => {
  it("generates clean URL slugs from arbitrary strings", () => {
    expect(slugify("Apex Institute of Technology")).toBe("apex-institute-of-technology");
    expect(slugify("AISAT")).toBe("aisat");
    expect(slugify("Saint-Joseph's College")).toBe("saint-josephs-college");
  });

  it("extracts concise acronyms from multi-word names", () => {
    expect(extractAcronym("Apex Institute of Technology")).toBe("AIT");
    expect(extractAcronym("Stanford University")).toBe("SU");
    expect(extractAcronym("MIT")).toBe("MIT");
  });
});

describe("campusConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("provides sensible defaults when environment variables are not set", async () => {
    delete process.env.NEXT_PUBLIC_CAMPUS_NAME;
    delete process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME;
    delete process.env.NEXT_PUBLIC_CAMPUS_SLUG;
    delete process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE;
    delete process.env.NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN;
    delete process.env.CAMPUS_EMAIL_DOMAIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

    const { campusConfig } = await import("../campus");

    expect(campusConfig.name).toBe("Campus");
    expect(campusConfig.shortName).toBe("CAMPUS");
    expect(campusConfig.slug).toBe("campus");
    expect(campusConfig.timezone).toBe("Asia/Kolkata");
    expect(campusConfig.domain).toBe("campus.edu");
    expect(campusConfig.siteUrl).toBe("http://localhost:3000");
  });

  it("smartly auto-derives shortName and slug when only campus name is provided", async () => {
    process.env.NEXT_PUBLIC_CAMPUS_NAME = "Apex Institute of Technology";
    delete process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME;
    delete process.env.NEXT_PUBLIC_CAMPUS_SLUG;

    const { campusConfig } = await import("../campus");

    expect(campusConfig.name).toBe("Apex Institute of Technology");
    expect(campusConfig.shortName).toBe("AIT");
    expect(campusConfig.slug).toBe("ait");
  });

  it("dynamically reads custom campus metadata from environment variables", async () => {
    process.env.NEXT_PUBLIC_CAMPUS_NAME = "Apex Institute of Technology";
    process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME = "Apex";
    process.env.NEXT_PUBLIC_CAMPUS_SLUG = "apex-tech";
    process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE = "America/New_York";
    process.env.NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN = "apex.edu";
    process.env.NEXT_PUBLIC_SITE_URL = "https://apex.edu/events";

    const { campusConfig } = await import("../campus");

    expect(campusConfig.name).toBe("Apex Institute of Technology");
    expect(campusConfig.shortName).toBe("Apex");
    expect(campusConfig.slug).toBe("apex-tech");
    expect(campusConfig.timezone).toBe("America/New_York");
    expect(campusConfig.domain).toBe("apex.edu");
    expect(campusConfig.siteUrl).toBe("https://apex.edu/events");
  });

  it("throws a descriptive error when NEXT_PUBLIC_CAMPUS_NAME is missing in standalone production environments", async () => {
    delete process.env.NEXT_PUBLIC_CAMPUS_NAME;
    delete process.env.CI;
    delete process.env.VERCEL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    await expect(import("../campus")).rejects.toThrow(
      /Missing required environment variable: NEXT_PUBLIC_CAMPUS_NAME/
    );
  });

  it("gracefully falls back to default values in CI or Vercel preview environments when campus name is unset", async () => {
    delete process.env.NEXT_PUBLIC_CAMPUS_NAME;
    process.env.CI = "true";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const { campusConfig } = await import("../campus");
    expect(campusConfig.name).toBe("Campus");
    expect(campusConfig.slug).toBe("campus");
  });

  it("throws an error when slug cannot be derived from a non-ASCII name in standalone production environments", async () => {
    process.env.NEXT_PUBLIC_CAMPUS_NAME = "東京大学";
    delete process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME;
    delete process.env.NEXT_PUBLIC_CAMPUS_SLUG;
    delete process.env.CI;
    delete process.env.VERCEL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    await expect(import("../campus")).rejects.toThrow(
      /Unable to automatically derive a URL slug/
    );
  });
});

