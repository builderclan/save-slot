import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

export const eventApprovals = pgTable(
  "event_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    stage: varchar("stage", { length: 50 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorNameSnapshot: varchar("actor_name_snapshot", {
      length: 255,
    }).notNull(),
    actorRoleSnapshot: varchar("actor_role_snapshot", {
      length: 100,
    }).notNull(),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_event_approvals_event_created").on(
      table.eventId,
      table.createdAt,
    ),
  ],
);

export type EventApprovalRecord = typeof eventApprovals.$inferSelect;
export type NewEventApproval = typeof eventApprovals.$inferInsert;
