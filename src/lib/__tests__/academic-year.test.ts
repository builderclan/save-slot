import { describe, expect, it } from "vitest";
import { formatEventReferenceNumber, getAcademicYear } from "../academic-year";

describe("academic-year helpers", () => {
  it("computes July 1 – June 30 academic years accurately", () => {
    expect(getAcademicYear("2026-07-01T00:00:00.000Z", 7)).toBe("2026-27");
    expect(getAcademicYear("2026-11-26T12:00:00.000Z", 7)).toBe("2026-27");
    expect(getAcademicYear("2027-06-30T23:59:59.000Z", 7)).toBe("2026-27");
    expect(getAcademicYear("2026-06-30T23:59:59.000Z", 7)).toBe("2025-26");
  });

  it("formats official reference numbers with zero-padded 3-digit sequence", () => {
    expect(
      formatEventReferenceNumber({
        collegeShortCode: "aisat",
        academicYear: "2026-27",
        hostCode: "cse",
        sequence: 14,
      })
    ).toBe("AISAT/2026-27/CSE/014");

    expect(
      formatEventReferenceNumber({
        collegeShortCode: "AISAT",
        academicYear: "2026-27",
        hostCode: "COL",
        sequence: 1,
      })
    ).toBe("AISAT/2026-27/COL/001");
  });
});
