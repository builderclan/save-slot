/**
 * Computes the academic year label (e.g. "2026-27") for a given date.
 * Default rollover starts on July 1 (month = 7, 1-indexed) through June 30.
 */
export function getAcademicYear(
  date: Date | string = new Date(),
  startMonth = 7,
): string {
  const d = date instanceof Date ? date : new Date(date);
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(startMonth)));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12

  const startYear = month >= safeMonth ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

/**
 * Formats an official college event reference number, e.g. "AISAT/2026-27/CSE/014".
 */
export function formatEventReferenceNumber(params: {
  collegeShortCode: string;
  academicYear: string;
  hostCode: string;
  sequence: number;
}): string {
  const college = params.collegeShortCode.trim().toUpperCase();
  const host = params.hostCode.trim().toUpperCase();
  const seq = String(params.sequence).padStart(3, "0");
  return `${college}/${params.academicYear}/${host}/${seq}`;
}
