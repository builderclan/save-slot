import { pgTable, uuid, varchar, text, boolean, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
import { departments } from "./departments";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // references auth.users(id) in Supabase
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("lead"),
  designation: varchar("designation", { length: 150 }),
  departmentId: uuid("department_id").references((): AnyPgColumn => departments.id, {
    onDelete: "set null",
  }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
