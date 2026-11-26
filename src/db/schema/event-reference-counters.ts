import { pgTable, varchar, integer, primaryKey } from "drizzle-orm/pg-core";

export const eventReferenceCounters = pgTable(
  "event_reference_counters",
  {
    academicYear: varchar("academic_year", { length: 20 }).notNull(),
    hostCode: varchar("host_code", { length: 20 }).notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
  },
  (table) => [
    primaryKey({
      name: "event_reference_counters_pkey",
      columns: [table.academicYear, table.hostCode],
    }),
  ],
);

export type EventReferenceCounterRecord =
  typeof eventReferenceCounters.$inferSelect;
export type NewEventReferenceCounter =
  typeof eventReferenceCounters.$inferInsert;
