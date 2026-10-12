import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const campuses = pgTable("campuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CampusRecord = typeof campuses.$inferSelect;
export type NewCampus = typeof campuses.$inferInsert;
