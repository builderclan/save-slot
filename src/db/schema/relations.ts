import { relations } from "drizzle-orm";
import { campuses } from "./campuses";
import { venues } from "./venues";
import { communities } from "./communities";
import { communityMembers } from "./community-members";
import { users } from "./users";
import { events } from "./events";

export const campusesRelations = relations(campuses, ({ many }) => ({
  venues: many(venues),
  communities: many(communities),
  users: many(users),
  events: many(events),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  campus: one(campuses, {
    fields: [venues.campusId],
    references: [campuses.id],
  }),
  events: many(events),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  campus: one(campuses, {
    fields: [communities.campusId],
    references: [campuses.id],
  }),
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
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  campus: one(campuses, {
    fields: [users.campusId],
    references: [campuses.id],
  }),
  memberships: many(communityMembers),
  createdCommunities: many(communities, { relationName: "communityCreator" }),
  reviewedCommunities: many(communities, { relationName: "communityReviewer" }),
  createdEvents: many(events, { relationName: "eventCreator" }),
  reviewedEvents: many(events, { relationName: "eventReviewer" }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  campus: one(campuses, {
    fields: [events.campusId],
    references: [campuses.id],
  }),
  community: one(communities, {
    fields: [events.communityId],
    references: [communities.id],
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
}));
