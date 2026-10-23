import { withDbRetry } from "@/lib/db";
import { authRateLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export const MAX_FAILED_ATTEMPTS = 3;
export const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes rolling window

// L1 in-memory cache for ultra-low latency on warm serverless instances
interface L1CacheEntry {
  count: number;
  lockedUntil: number | null;
}
const l1Cache = new Map<string, L1CacheEntry>();

export function getClientRateLimitKey(request: Request, normalizedEmail: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (request.headers.get("x-real-ip") || "127.0.0.1");
  return `${ip}:${normalizedEmail}`;
}

export function clearRateLimitMemoryCacheForTesting(): void {
  l1Cache.clear();
}

export interface RateLimitCheckResult {
  isLocked: boolean;
  remainingSeconds: number;
  remainingMinutes: number;
}

export async function checkAuthRateLimit(key: string): Promise<RateLimitCheckResult> {
  const now = Date.now();

  // 1. Fast path: check L1 cache
  const cached = l1Cache.get(key);
  if (cached?.lockedUntil && cached.lockedUntil > now) {
    const remainingSeconds = Math.ceil((cached.lockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return { isLocked: true, remainingSeconds, remainingMinutes };
  }

  // 2. Persistent distributed path: check PostgreSQL
  try {
    const [row] = await withDbRetry((client) =>
      client
        .select({
          failedAttempts: authRateLimits.failedAttempts,
          firstFailedAt: authRateLimits.firstFailedAt,
          lockedUntil: authRateLimits.lockedUntil,
        })
        .from(authRateLimits)
        .where(eq(authRateLimits.key, key))
        .limit(1)
    );

    if (row?.lockedUntil) {
      const lockedUntilMs = new Date(row.lockedUntil).getTime();
      if (lockedUntilMs > now) {
        l1Cache.set(key, { count: row.failedAttempts, lockedUntil: lockedUntilMs });
        const remainingSeconds = Math.ceil((lockedUntilMs - now) / 1000);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        return { isLocked: true, remainingSeconds, remainingMinutes };
      }
    }
  } catch (err) {
    console.error("[rate-limit] Error checking persistent rate limit:", err);
  }

  return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0 };
}

export async function recordFailedAuthAttempt(key: string): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  try {
    const [existing] = await withDbRetry((client) =>
      client
        .select({
          failedAttempts: authRateLimits.failedAttempts,
          firstFailedAt: authRateLimits.firstFailedAt,
        })
        .from(authRateLimits)
        .where(eq(authRateLimits.key, key))
        .limit(1)
    );

    let newCount = 1;
    let isLocked = false;
    let lockedUntilDate: Date | null = null;

    if (existing) {
      const firstFailedMs = new Date(existing.firstFailedAt).getTime();
      if (nowMs - firstFailedMs < WINDOW_DURATION_MS) {
        newCount = existing.failedAttempts + 1;
        if (newCount >= MAX_FAILED_ATTEMPTS) {
          isLocked = true;
          lockedUntilDate = new Date(nowMs + COOLDOWN_DURATION_MS);
        }
      }
    }

    const firstFailedAtToSave =
      existing && nowMs - new Date(existing.firstFailedAt).getTime() < WINDOW_DURATION_MS
        ? existing.firstFailedAt
        : now;

    // Upsert into persistent store
    await withDbRetry((client) =>
      client
        .insert(authRateLimits)
        .values({
          key,
          failedAttempts: newCount,
          firstFailedAt: firstFailedAtToSave,
          lockedUntil: lockedUntilDate,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: authRateLimits.key,
          set: {
            failedAttempts: newCount,
            firstFailedAt: firstFailedAtToSave,
            lockedUntil: lockedUntilDate,
            updatedAt: now,
          },
        })
    );

    // Update L1
    l1Cache.set(key, {
      count: newCount,
      lockedUntil: isLocked ? nowMs + COOLDOWN_DURATION_MS : null,
    });
  } catch (err) {
    console.error("[rate-limit] Error recording failed attempt:", err);
    // Fallback to L1 cache on DB failure
    const entry = l1Cache.get(key) || { count: 0, lockedUntil: null };
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = nowMs + COOLDOWN_DURATION_MS;
    }
    l1Cache.set(key, entry);
  }
}

export async function clearAuthRateLimit(key: string): Promise<void> {
  l1Cache.delete(key);
  try {
    await withDbRetry((client) =>
      client.delete(authRateLimits).where(eq(authRateLimits.key, key))
    );
  } catch (err) {
    console.error("[rate-limit] Error clearing rate limit:", err);
  }
}
