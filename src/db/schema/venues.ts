import { pgTable, uuid, varchar, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    building: varchar("building", { length: 255 }).notNull(),
    capacity: integer("capacity"),
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("venues_building_name_key").on(table.building, table.name)]
);

export type VenueRecord = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
