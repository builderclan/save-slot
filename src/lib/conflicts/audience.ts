/**
 * Audience Cohort Conflict & Overlap Utilities
 * Pure helper functions safe for both Client and Server bundles.
 */

/**
 * Checks if two target audience lists share any overlapping cohorts.
 * Handles "All Students" as a campus-wide wildcard that overlaps with any student cohort.
 */
export function doAudiencesOverlap(
  a?: string[] | null,
  b?: string[] | null
): boolean {
  const audA = a && a.length > 0 ? a : ["All Students"];
  const audB = b && b.length > 0 ? b : ["All Students"];

  const aHasAll = audA.includes("All Students");
  const bHasAll = audB.includes("All Students");

  if (aHasAll && bHasAll) return true;

  if (aHasAll) {
    // "All Students" overlaps with any cohort except purely Faculty & Staff
    const bIsFacultyOnly = audB.length === 1 && audB[0] === "Faculty & Staff";
    return !bIsFacultyOnly || audA.includes("Faculty & Staff");
  }

  if (bHasAll) {
    const aIsFacultyOnly = audA.length === 1 && audA[0] === "Faculty & Staff";
    return !aIsFacultyOnly || audB.includes("Faculty & Staff");
  }

  return audA.some((val) => audB.includes(val));
}

/**
 * Computes intersecting cohorts between two target audience sets.
 */
export function getOverlappingAudience(
  a?: string[] | null,
  b?: string[] | null
): string[] {
  const audA = a && a.length > 0 ? a : ["All Students"];
  const audB = b && b.length > 0 ? b : ["All Students"];

  if (audA.includes("All Students") && audB.includes("All Students")) {
    return ["All Students"];
  }

  if (audA.includes("All Students")) {
    const matched = audB.filter((x) => x !== "Faculty & Staff" || audA.includes("Faculty & Staff"));
    return matched.length > 0 ? matched : ["All Students"];
  }

  if (audB.includes("All Students")) {
    const matched = audA.filter((x) => x !== "Faculty & Staff" || audB.includes("Faculty & Staff"));
    return matched.length > 0 ? matched : ["All Students"];
  }

  return audA.filter((val) => audB.includes(val));
}

export const ALL_STUDENT_COHORTS = [
  "All Students",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "Final Year",
  "Postgraduate",
];

/**
 * Returns all cohorts that can potentially overlap with the given target audience.
 * Used for index-accelerated SQL array overlap queries (`events.target_audience && ARRAY[...]`).
 */
export function getPotentiallyOverlappingCohorts(
  audience?: string[] | null
): string[] {
  const aud = audience && audience.length > 0 ? audience : ["All Students"];
  const hasAllStudents = aud.includes("All Students");
  const hasFaculty = aud.includes("Faculty & Staff");

  if (hasAllStudents) {
    return hasFaculty
      ? [...ALL_STUDENT_COHORTS, "Faculty & Staff"]
      : ALL_STUDENT_COHORTS;
  }

  const cohorts = new Set<string>(aud);
  // Any student cohort overlaps with campus-wide "All Students"
  const isFacultyOnly = aud.length === 1 && aud[0] === "Faculty & Staff";
  if (!isFacultyOnly) {
    cohorts.add("All Students");
  }

  return Array.from(cohorts);
}
