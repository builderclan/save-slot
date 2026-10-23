import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const authRateLimits = pgTable("auth_rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  failedAttempts: integer("failed_attempts").notNull().default(1),
  firstFailedAt: timestamp("first_failed_at", { withTimezone: true }).defaultNow().notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AuthRateLimitRecord = typeof authRateLimits.$inferSelect;
export type NewAuthRateLimit = typeof authRateLimits.$inferInsert;
