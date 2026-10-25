/**
 * Institutional Configuration for SaveSlot Single-Instance Deployments.
 *
 * Single source of truth for the institution's identity across server & client.
 * Strictly reads from environment variables, with clean generic fallbacks.
 */

export interface CampusConfig {
  /** Full official name of the institution */
  name: string;
  /** Short abbreviation or acronym (e.g. 'AISAT', 'MIT') */
  shortName: string;
  /** Unique URL and database slug identifier (e.g. 'aisat', 'apex-tech') */
  slug: string;
  /** Primary timezone for scheduling & calendar events */
  timezone: string;
  /** Primary institutional email domain for staff & students */
  domain: string;
  /** Canonical base website URL (used for sitemaps, robots.txt, and metadata) */
  siteUrl: string;
}

/**
 * Generates a clean URL-friendly slug from arbitrary text.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts a concise acronym from a multi-word institutional name (e.g. "Apex Tech" -> "AT").
 */
export function extractAcronym(text: string): string {
  const clean = text.trim();
  if (!clean) return "CAMPUS";

  // If already an acronym or single word (e.g. "MIT", "Stanford")
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 6).toUpperCase();
  }

  // Filter out minor stopwords to extract primary initials
  const stopWords = new Set(["of", "in", "at", "the", "for"]);
  const meaningfulWords = words.filter((w) => !stopWords.has(w.toLowerCase()));

  const initials = (meaningfulWords.length > 0 ? meaningfulWords : words)
    .map((w) => (w === "&" ? "" : w[0].toUpperCase()))
    .join("");

  return initials.slice(0, 8);
}

// Strict environment validation: require NEXT_PUBLIC_CAMPUS_NAME in non-test runtimes
if (!process.env.NEXT_PUBLIC_CAMPUS_NAME?.trim() && process.env.NODE_ENV !== "test") {
  throw new Error(
    "[SaveSlot Config] Missing required environment variable: NEXT_PUBLIC_CAMPUS_NAME. " +
      "Every deployment instance must define NEXT_PUBLIC_CAMPUS_NAME in its environment or .env file."
  );
}

const rawName = process.env.NEXT_PUBLIC_CAMPUS_NAME || "Campus";

const rawShortName =
  process.env.NEXT_PUBLIC_CAMPUS_SHORT_NAME ||
  (process.env.NEXT_PUBLIC_CAMPUS_NAME
    ? extractAcronym(rawName)
    : "CAMPUS");

const rawSlug =
  process.env.NEXT_PUBLIC_CAMPUS_SLUG ||
  slugify(rawShortName || rawName) ||
  "campus";

const rawDomain =
  process.env.NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN ||
  process.env.CAMPUS_EMAIL_DOMAIN ||
  "campus.edu";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const campusConfig: CampusConfig = {
  name: rawName,
  shortName: rawShortName,
  slug: rawSlug,
  timezone: process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE || "Asia/Kolkata",
  domain: rawDomain,
  siteUrl: rawSiteUrl,
};
