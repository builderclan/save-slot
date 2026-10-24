import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getClientRateLimitKey,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  clearAuthRateLimit,
  clearRateLimitMemoryCacheForTesting,
} from "../rate-limit";

const {
  mockSelect,
  mockSelectLimit,
  mockInsert,
  mockInsertValues,
  mockInsertOnConflict,
  mockDelete,
  mockDeleteWhere,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertOnConflict = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockInsertOnConflict });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  mockDelete.mockReturnValue({ where: mockDeleteWhere });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockInsert,
    mockInsertValues,
    mockInsertOnConflict,
    mockDelete,
    mockDeleteWhere,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("Persistent Auth Rate Limiter (src/lib/rate-limit.ts)", () => {
  const testKey = "192.168.1.1:user@campus.edu";

  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitMemoryCacheForTesting();
  });

  describe("getClientRateLimitKey()", () => {
    it("extracts client IP from x-forwarded-for header", () => {
      const req = new Request("http://localhost/api/auth/login", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      const key = getClientRateLimitKey(req, "admin@campus.edu");
      expect(key).toBe("203.0.113.195:admin@campus.edu");
    });

    it("falls back to x-real-ip when x-forwarded-for is missing", () => {
      const req = new Request("http://localhost/api/auth/login", {
        headers: { "x-real-ip": "10.0.0.5" },
      });
      const key = getClientRateLimitKey(req, "user@campus.edu");
      expect(key).toBe("10.0.0.5:user@campus.edu");
    });

    it("falls back to 127.0.0.1 when no IP headers are present", () => {
      const req = new Request("http://localhost/api/auth/login");
      const key = getClientRateLimitKey(req, "local@campus.edu");
      expect(key).toBe("127.0.0.1:local@campus.edu");
    });
  });

  describe("checkAuthRateLimit()", () => {
    it("returns isLocked: false when no record exists", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const result = await checkAuthRateLimit(testKey);
      expect(result.isLocked).toBe(false);
      expect(result.remainingSeconds).toBe(0);
    });

    it("returns isLocked: true when lockedUntil is in the future", async () => {
      const futureLock = new Date(Date.now() + 180 * 1000); // 3 minutes in future
      mockSelectLimit.mockResolvedValueOnce([
        {
          failedAttempts: 3,
          firstFailedAt: new Date(),
          lockedUntil: futureLock,
        },
      ]);

      const result = await checkAuthRateLimit(testKey);
      expect(result.isLocked).toBe(true);
      expect(result.remainingMinutes).toBe(3);
      expect(result.remainingSeconds).toBeGreaterThan(0);
    });

    it("uses L1 cache on second lookup without hitting the database", async () => {
      const futureLock = new Date(Date.now() + 240 * 1000); // 4 minutes
      mockSelectLimit.mockResolvedValueOnce([
        {
          failedAttempts: 3,
          firstFailedAt: new Date(),
          lockedUntil: futureLock,
        },
      ]);

      // First check populates L1 cache
      const firstCheck = await checkAuthRateLimit(testKey);
      expect(firstCheck.isLocked).toBe(true);

      // Second check should use L1 memory cache directly
      const secondCheck = await checkAuthRateLimit(testKey);
      expect(secondCheck.isLocked).toBe(true);
      expect(mockSelectLimit).toHaveBeenCalledTimes(1);
    });
  });

  describe("recordFailedAuthAttempt()", () => {
    it("inserts initial failure when no prior record exists", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);
      mockInsertOnConflict.mockResolvedValueOnce([]);

      await recordFailedAuthAttempt(testKey);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: testKey,
          failedAttempts: 1,
          lockedUntil: null,
        })
      );
    });

    it("locks the account on reaching MAX_FAILED_ATTEMPTS", async () => {
      mockSelectLimit.mockResolvedValueOnce([
        {
          failedAttempts: 2,
          firstFailedAt: new Date(),
        },
      ]);
      mockInsertOnConflict.mockResolvedValueOnce([]);

      await recordFailedAuthAttempt(testKey);

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: testKey,
          failedAttempts: 3,
          lockedUntil: expect.any(Date),
        })
      );

      // Verify L1 is locked
      const check = await checkAuthRateLimit(testKey);
      expect(check.isLocked).toBe(true);
    });
  });

  describe("clearAuthRateLimit()", () => {
    it("deletes database row and clears L1 cache", async () => {
      mockDeleteWhere.mockResolvedValueOnce([]);

      await clearAuthRateLimit(testKey);

      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });
});
