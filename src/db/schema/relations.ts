import { relations } from "drizzle-orm";
import { departments } from "./departments";
import { venues } from "./venues";
import { communities } from "./communities";
import { communityMembers } from "./community-members";
import { users } from "./users";
import { events } from "./events";
import { eventStage2Approvals } from "./event-stage2-approvals";
import { eventApprovals } from "./event-approvals";
import { eventMentors } from "./event-mentors";
import { eventReports } from "./event-reports";
import { notifications } from "./notifications";

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  hod: one(users, {
    fields: [departments.hodUserId],
    references: [users.id],
    relationName: "departmentHod",
  }),
  actingHod: one(users, {
    fields: [departments.actingHodUserId],
    references: [users.id],
    relationName: "departmentActingHod",
  }),
  actingHodToggler: one(users, {
    fields: [departments.actingHodToggledBy],
    references: [users.id],
    relationName: "departmentActingHodToggler",
  }),
  members: many(users, { relationName: "userDepartment" }),
  events: many(events),
  stage2Approvals: many(eventStage2Approvals),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, {
    fields: [communities.createdBy],
    references: [users.id],
    relationName: "communityCreator",
  }),
  reviewer: one(users, {
    fields: [communities.reviewedBy],
    references: [users.id],
    relationName: "communityReviewer",
  }),
  members: many(communityMembers),
  events: many(events),
  stage2Approvals: many(eventStage2Approvals),
}));

export const communityMembersRelations = relations(
  communityMembers,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityMembers.communityId],
      references: [communities.id],
    }),
    user: one(users, {
      fields: [communityMembers.userId],
      references: [users.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
    relationName: "userDepartment",
  }),
  memberships: many(communityMembers),
  createdCommunities: many(communities, { relationName: "communityCreator" }),
  reviewedCommunities: many(communities, { relationName: "communityReviewer" }),
  createdEvents: many(events, { relationName: "eventCreator" }),
  reviewedEvents: many(events, { relationName: "eventReviewer" }),
  coordinatedEvents: many(events, { relationName: "eventCoordinator" }),
  notifications: many(notifications),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  community: one(communities, {
    fields: [events.communityId],
    references: [communities.id],
  }),
  department: one(departments, {
    fields: [events.departmentId],
    references: [departments.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
    relationName: "eventCreator",
  }),
  reviewer: one(users, {
    fields: [events.reviewedBy],
    references: [users.id],
    relationName: "eventReviewer",
  }),
  coordinator: one(users, {
    fields: [events.coordinatorId],
    references: [users.id],
    relationName: "eventCoordinator",
  }),
  stage2Approvals: many(eventStage2Approvals),
  approvals: many(eventApprovals),
  mentors: many(eventMentors),
  report: one(eventReports),
  notifications: many(notifications),
}));

export const eventStage2ApprovalsRelations = relations(
  eventStage2Approvals,
  ({ one }) => ({
    event: one(events, {
      fields: [eventStage2Approvals.eventId],
      references: [events.id],
    }),
    department: one(departments, {
      fields: [eventStage2Approvals.departmentId],
      references: [departments.id],
    }),
    community: one(communities, {
      fields: [eventStage2Approvals.communityId],
      references: [communities.id],
    }),
    approver: one(users, {
      fields: [eventStage2Approvals.approvedBy],
      references: [users.id],
      relationName: "stage2Approver",
    }),
    reportVerifier: one(users, {
      fields: [eventStage2Approvals.reportVerifiedBy],
      references: [users.id],
      relationName: "stage2ReportVerifier",
    }),
  }),
);

export const eventApprovalsRelations = relations(eventApprovals, ({ one }) => ({
  event: one(events, {
    fields: [eventApprovals.eventId],
    references: [events.id],
  }),
  actor: one(users, {
    fields: [eventApprovals.actorId],
    references: [users.id],
  }),
}));

export const eventMentorsRelations = relations(eventMentors, ({ one }) => ({
  event: one(events, {
    fields: [eventMentors.eventId],
    references: [events.id],
  }),
}));

export const eventReportsRelations = relations(eventReports, ({ one }) => ({
  event: one(events, {
    fields: [eventReports.eventId],
    references: [events.id],
  }),
  submitter: one(users, {
    fields: [eventReports.submittedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [notifications.eventId],
    references: [events.id],
  }),
}));
