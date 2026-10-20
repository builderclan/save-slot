import { pgTable, uuid, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { campuses } from "./campuses";
import { communities } from "./communities";
import { venues } from "./venues";
import { users } from "./users";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    targetAudience: text("target_audience").array().notNull().default(["All Students"]),
    tags: text("tags").array().default([]),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
    locationName: varchar("location_name", { length: 255 }).notNull(),
    isVirtual: boolean("is_virtual").default(false),
    virtualLink: text("virtual_link"),
    externalRegistrationUrl: text("external_registration_url"),
    coverImageUrl: text("cover_image_url"),
    status: varchar("status", { length: 50 }).notNull().default("published"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_events_campus_status").on(table.campusId, table.status),
    index("idx_events_start_time").on(table.startTime),
    index("idx_events_status_start_time").on(table.status, table.startTime),
    index("idx_events_venue_time").on(table.venueId, table.startTime, table.endTime),
    index("idx_events_target_audience").using("gin", table.targetAudience),
  ]
);

export type EventRecord = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
