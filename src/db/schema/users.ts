import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { campuses } from "./campuses";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // references auth.users(id) in Supabase
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("student"),
  avatarUrl: text("avatar_url"),
  campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
