import {
  pgTable,
  uuid,
  numeric,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

export const eventReports = pgTable("event_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: "cascade" }),
  actualFundUsed: numeric("actual_fund_used", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  fundingSource: varchar("funding_source", { length: 100 })
    .notNull()
    .default("No Cost"),
  fundNotes: text("fund_notes"),
  studentCount: integer("student_count").notNull().default(0),
  facultyCount: integer("faculty_count").notNull().default(0),
  externalCount: integer("external_count").notNull().default(0),
  summary: text("summary").notNull(),
  outcomes: text("outcomes").notNull(),
  evidenceUrl: text("evidence_url"),
  submittedBy: uuid("submitted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type EventReportRecord = typeof eventReports.$inferSelect;
export type NewEventReport = typeof eventReports.$inferInsert;
