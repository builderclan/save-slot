import { pgTable, uuid, varchar, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { campuses } from "./campuses";

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    building: varchar("building", { length: 255 }).notNull(),
    capacity: integer("capacity"),
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("venues_campus_building_name_key").on(table.campusId, table.building, table.name),
  ]
);

export type VenueRecord = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
