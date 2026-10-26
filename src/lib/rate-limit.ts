import { withDbRetry } from "@/lib/db";
import { authRateLimits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const MAX_FAILED_ATTEMPTS = 3;
export const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes rolling window

// L1 in-memory cache for ultra-low latency on warm serverless instances
interface L1CacheEntry {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
  lastAccessed: number;
}
export const MAX_L1_CACHE_SIZE = 1000;
const l1Cache = new Map<string, L1CacheEntry>();

function setL1Cache(key: string, entry: L1CacheEntry): void {
  // Prune expired or oldest entries if cache exceeds bound
  if (l1Cache.size >= MAX_L1_CACHE_SIZE) {
    const now = Date.now();
    for (const [k, v] of l1Cache.entries()) {
      const isExpired =
        (!v.lockedUntil && now - v.firstFailedAt > WINDOW_DURATION_MS) ||
        (v.lockedUntil !== null && v.lockedUntil < now);
      if (isExpired) {
        l1Cache.delete(k);
      }
    }
    // If still at capacity, evict the oldest accessed entry
    if (l1Cache.size >= MAX_L1_CACHE_SIZE) {
      const oldestKey = l1Cache.keys().next().value;
      if (oldestKey) l1Cache.delete(oldestKey);
    }
  }
  l1Cache.set(key, entry);
}

export function getClientRateLimitKey(request: Request, normalizedEmail: string): string {
  const realIp = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = realIp || (forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1");
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
    cached.lastAccessed = now;
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
        setL1Cache(key, {
          count: row.failedAttempts,
          firstFailedAt: row.firstFailedAt ? new Date(row.firstFailedAt).getTime() : now,
          lockedUntil: lockedUntilMs,
          lastAccessed: now,
        });
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
  const windowStart = new Date(nowMs - WINDOW_DURATION_MS);
  const lockUntil = new Date(nowMs + COOLDOWN_DURATION_MS);

  try {
    const rows = await withDbRetry((client) =>
      client
        .insert(authRateLimits)
        .values({
          key,
          failedAttempts: 1,
          firstFailedAt: now,
          lockedUntil: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: authRateLimits.key,
          set: {
            failedAttempts: sql`CASE WHEN ${authRateLimits.firstFailedAt} > ${windowStart} THEN ${authRateLimits.failedAttempts} + 1 ELSE 1 END`,
            firstFailedAt: sql`CASE WHEN ${authRateLimits.firstFailedAt} > ${windowStart} THEN ${authRateLimits.firstFailedAt} ELSE ${now.toISOString()}::timestamptz END`,
            lockedUntil: sql`CASE WHEN ${authRateLimits.firstFailedAt} > ${windowStart} AND ${authRateLimits.failedAttempts} + 1 >= ${MAX_FAILED_ATTEMPTS} THEN ${lockUntil.toISOString()}::timestamptz ELSE NULL END`,
            updatedAt: now,
          },
        })
        .returning({
          failedAttempts: authRateLimits.failedAttempts,
          firstFailedAt: authRateLimits.firstFailedAt,
          lockedUntil: authRateLimits.lockedUntil,
        })
    );

    const row = rows && rows[0];
    if (row) {
      setL1Cache(key, {
        count: row.failedAttempts,
        firstFailedAt: row.firstFailedAt ? new Date(row.firstFailedAt).getTime() : nowMs,
        lockedUntil: row.lockedUntil ? new Date(row.lockedUntil).getTime() : null,
        lastAccessed: nowMs,
      });
    }
  } catch (err) {
    console.error("[rate-limit] Error recording failed attempt:", err);
    // Fallback to L1 cache on DB failure with rolling window
    const existing = l1Cache.get(key);
    const isWithinWindow = existing && (nowMs - existing.firstFailedAt <= WINDOW_DURATION_MS);
    const count = isWithinWindow ? existing.count + 1 : 1;
    const firstFailedAt = isWithinWindow ? existing.firstFailedAt : nowMs;
    const lockedUntil = count >= MAX_FAILED_ATTEMPTS ? nowMs + COOLDOWN_DURATION_MS : null;

    setL1Cache(key, {
      count,
      firstFailedAt,
      lockedUntil,
      lastAccessed: nowMs,
    });
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
