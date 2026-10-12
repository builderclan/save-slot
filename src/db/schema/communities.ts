import { pgTable, uuid, varchar, text, timestamp, unique } from "drizzle-orm/pg-core";
import { campuses } from "./campuses";
import { users } from "./users";

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    category: varchar("category", { length: 100 }).notNull().default("General"),
    description: text("description"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),
    website: text("website"),
    instagram: varchar("instagram", { length: 100 }),
    status: varchar("status", { length: 50 }).default("approved"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    applicantName: text("applicant_name"),
    applicantEmail: text("applicant_email"),
    rejectionReason: text("rejection_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("communities_campus_id_slug_key").on(table.campusId, table.slug),
  ]
);

export type CommunityRecord = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
