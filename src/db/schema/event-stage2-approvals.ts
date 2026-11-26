import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { events } from "./events";
import { departments } from "./departments";
import { communities } from "./communities";
import { users } from "./users";

export const eventStage2Approvals = pgTable(
  "event_stage2_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 20 }).notNull(), // 'department' | 'community'
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),
    communityId: uuid("community_id").references(() => communities.id, {
      onDelete: "cascade",
    }),
    isPrimary: boolean("is_primary").notNull().default(false),
    approvalStatus: varchar("approval_status", { length: 20 })
      .notNull()
      .default("pending"),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalRemarks: text("approval_remarks"),
    reportVerifyStatus: varchar("report_verify_status", { length: 20 })
      .notNull()
      .default("pending"),
    reportVerifiedBy: uuid("report_verified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reportVerifiedAt: timestamp("report_verified_at", { withTimezone: true }),
    reportRemarks: text("report_remarks"),
  },
  (table) => [
    uniqueIndex("idx_stage2_unique_dept")
      .on(table.eventId, table.departmentId)
      .where(sql`${table.departmentId} IS NOT NULL`),
    uniqueIndex("idx_stage2_unique_comm")
      .on(table.eventId, table.communityId)
      .where(sql`${table.communityId} IS NOT NULL`),
  ],
);

export type EventStage2ApprovalRecord =
  typeof eventStage2Approvals.$inferSelect;
export type NewEventStage2Approval = typeof eventStage2Approvals.$inferInsert;
