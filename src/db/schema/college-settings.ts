import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const collegeSettings = pgTable("college_settings", {
  id: integer("id").primaryKey().default(1),
  collegeName: varchar("college_name", { length: 255 })
    .notNull()
    .default("Albertian Institute of Science & Technology (AISAT)"),
  shortCode: varchar("short_code", { length: 20 }).notNull().default("AISAT"),
  letterheadSubtitle: varchar("letterhead_subtitle", { length: 255 }).default(
    "Affiliated to APJ Abdul Kalam Technological University",
  ),
  logoUrl: text("logo_url"),
  academicYearStartMonth: integer("academic_year_start_month")
    .notNull()
    .default(7),
  timezone: varchar("timezone", { length: 50 })
    .notNull()
    .default("Asia/Kolkata"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type CollegeSettingsRecord = typeof collegeSettings.$inferSelect;
export type NewCollegeSettings = typeof collegeSettings.$inferInsert;
