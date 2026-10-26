import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrimaryCampusId, resetCampusCache } from "../campus";

const {
  mockSelect,
  mockSelectLimit,
  mockInsert,
  mockInsertReturning,
  mockUpdate,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectOrderBy = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertOnConflictDoUpdate = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  mockSelectOrderBy.mockReturnValue({ limit: mockSelectLimit });
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockSelectOrderBy });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertOnConflictDoUpdate.mockReturnValue({ returning: mockInsertReturning });
  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockInsertOnConflictDoUpdate });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  mockUpdateWhere.mockReturnValue(Promise.resolve([]));
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectLimit,
    mockInsert,
    mockInsertReturning,
    mockUpdate,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("Campus Domain Resolver (getPrimaryCampusId)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCampusCache();
  });

  it("resolves primary campus from database and caches result", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-aisat-uuid" }]);

    const campusId1 = await getPrimaryCampusId();
    expect(campusId1).toBe("campus-aisat-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);

    // Second call should return cached value without executing db query
    const campusId2 = await getPrimaryCampusId();
    expect(campusId2).toBe("campus-aisat-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("adopts existing earliest campus if slug differs without mutating database on read path", async () => {
    // 1. Where query by slug returns empty
    mockSelectLimit.mockResolvedValueOnce([]);
    // 2. Select earliest campus returns existing campus
    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-earliest-uuid" }]);

    const campusId = await getPrimaryCampusId();
    expect(campusId).toBe("campus-earliest-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("self-seeds configured canonical campus when database is completely fresh", async () => {
    // 1. Where query by slug returns empty
    mockSelectLimit.mockResolvedValueOnce([]);
    // 2. Select earliest campus returns empty
    mockSelectLimit.mockResolvedValueOnce([]);
    // 3. Insert returns newly seeded configured campus
    mockInsertReturning.mockResolvedValueOnce([{ id: "campus-seeded-uuid" }]);

    const campusId = await getPrimaryCampusId();
    expect(campusId).toBe("campus-seeded-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("handles database error gracefully and returns empty string", async () => {
    mockSelectLimit.mockRejectedValueOnce(new Error("Database connection lost"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const campusId = await getPrimaryCampusId();
    expect(campusId).toBe("");
    consoleSpy.mockRestore();
  });

  it("resets in-memory cache when resetCampusCache is invoked", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-initial-uuid" }]);

    const campusId1 = await getPrimaryCampusId();
    expect(campusId1).toBe("campus-initial-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);

    resetCampusCache();

    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-refreshed-uuid" }]);
    const campusId2 = await getPrimaryCampusId();
    expect(campusId2).toBe("campus-refreshed-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
