import { pgTable, uuid, varchar, index } from "drizzle-orm/pg-core";
import { events } from "./events";

export const eventMentors = pgTable(
  "event_mentors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    roleTitle: varchar("role_title", { length: 255 }).notNull(),
    organization: varchar("organization", { length: 255 }).notNull(),
    mentorType: varchar("mentor_type", { length: 20 }).notNull(), // 'internal' | 'external'
    phase: varchar("phase", { length: 20 }).notNull().default("planned"), // 'planned' | 'confirmed'
  },
  (table) => [index("idx_event_mentors_event").on(table.eventId)],
);

export type EventMentorRecord = typeof eventMentors.$inferSelect;
export type NewEventMentor = typeof eventMentors.$inferInsert;
