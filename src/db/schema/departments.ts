import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  hodUserId: uuid("hod_user_id").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  actingHodUserId: uuid("acting_hod_user_id").references(
    (): AnyPgColumn => users.id,
    {
      onDelete: "set null",
    },
  ),
  isActingHodActive: boolean("is_acting_hod_active").notNull().default(false),
  actingHodToggledBy: uuid("acting_hod_toggled_by").references(
    (): AnyPgColumn => users.id,
    {
      onDelete: "set null",
    },
  ),
  actingHodToggledAt: timestamp("acting_hod_toggled_at", {
    withTimezone: true,
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DepartmentRecord = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
