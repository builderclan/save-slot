import { describe, it, expect } from "vitest";
import { formatDisplayName } from "../utils";

describe("formatDisplayName utility", () => {
  it("returns empty string for null or undefined", () => {
    expect(formatDisplayName(null)).toBe("");
    expect(formatDisplayName(undefined)).toBe("");
    expect(formatDisplayName("")).toBe("");
  });

  it("leaves standard plain names untouched", () => {
    expect(formatDisplayName("Marcus Vance")).toBe("Marcus Vance");
    expect(formatDisplayName("Dr. Jane Doe")).toBe("Dr. Jane Doe");
  });

  it("strips standard administrative roles in parentheses", () => {
    expect(formatDisplayName("Dr. K. S. Mathew (Principal)")).toBe("Dr. K. S. Mathew");
    expect(formatDisplayName("Dr. Veena V (Vice Principal)")).toBe("Dr. Veena V");
    expect(formatDisplayName("Campus Admin (Admin)")).toBe("Campus Admin");
  });

  it("strips customized community lead roles in parentheses", () => {
    expect(formatDisplayName("Marcus Vance (E-Cell Lead)")).toBe("Marcus Vance");
    expect(formatDisplayName("Alex Chen (Coding Lead)")).toBe("Alex Chen");
    expect(formatDisplayName("Sarah Lin (Design Lead)")).toBe("Sarah Lin");
    expect(formatDisplayName("John Doe (Community Lead)")).toBe("John Doe");
    expect(formatDisplayName("Jane Smith (Lead)")).toBe("Jane Smith");
  });
});
