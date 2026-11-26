import { and, eq, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import {
  communityMembers,
  departments,
  notifications,
  users,
} from "@/db/schema";

export type DbClientOrTx = NodePgDatabase<typeof schema>;

export interface DispatchNotificationInput {
  userId: string;
  eventId?: string | null;
  type: string;
  title: string;
  message: string;
}

export interface NotificationProvider {
  send(client: DbClientOrTx, items: DispatchNotificationInput[]): Promise<void>;
}

/**
 * Default v1.0.0 In-App Notification Provider writing rows to `public.notifications`.
 * WhatsApp/SMS adapters can implement `NotificationProvider` later without workflow changes.
 */
export class InAppNotificationProvider implements NotificationProvider {
  async send(
    client: DbClientOrTx,
    items: DispatchNotificationInput[],
  ): Promise<void> {
    if (items.length === 0) return;
    await client.insert(notifications).values(
      items.map((item) => ({
        userId: item.userId,
        eventId: item.eventId ?? null,
        type: item.type,
        title: item.title,
        message: item.message,
      })),
    );
  }
}

const activeProviders: NotificationProvider[] = [
  new InAppNotificationProvider(),
];

/**
 * Deduplicates notification payloads per `(userId, eventId, type)` and dispatches
 * across configured notification channels.
 */
export async function dispatchNotifications(
  client: DbClientOrTx,
  items: DispatchNotificationInput[],
): Promise<void> {
  if (items.length === 0) return;

  const seen = new Set<string>();
  const uniqueItems: DispatchNotificationInput[] = [];
  for (const item of items) {
    if (!item.userId) continue;
    const key = `${item.userId}:${item.eventId ?? ""}:${item.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  if (uniqueItems.length === 0) return;

  for (const provider of activeProviders) {
    await provider.send(client, uniqueItems);
  }
}

/**
 * Resolves all active Stage 2 recipient user IDs (Department HOD or active Acting HOD,
 * plus all active Community FIC users) for notification routing.
 */
export async function getStage2NotificationUserIds(
  client: DbClientOrTx,
  entities: Array<{
    entityType: "department" | "community";
    departmentId?: string | null;
    communityId?: string | null;
  }>,
): Promise<string[]> {
  const deptIds = entities
    .filter((e) => e.entityType === "department" && e.departmentId)
    .map((e) => e.departmentId as string);
  const commIds = entities
    .filter((e) => e.entityType === "community" && e.communityId)
    .map((e) => e.communityId as string);

  const recipients = new Set<string>();

  if (deptIds.length > 0) {
    const deptRows = await client
      .select({
        hodUserId: departments.hodUserId,
        actingHodUserId: departments.actingHodUserId,
        isActingHodActive: departments.isActingHodActive,
      })
      .from(departments)
      .where(
        and(inArray(departments.id, deptIds), eq(departments.isActive, true)),
      );

    for (const d of deptRows) {
      const effectiveHodId =
        d.isActingHodActive && d.actingHodUserId
          ? d.actingHodUserId
          : d.hodUserId;
      if (effectiveHodId) {
        recipients.add(effectiveHodId);
      }
    }
  }

  if (commIds.length > 0) {
    const ficRows = await client
      .select({ userId: communityMembers.userId })
      .from(communityMembers)
      .where(
        and(
          inArray(communityMembers.communityId, commIds),
          eq(communityMembers.role, "fic"),
          eq(communityMembers.status, "active"),
        ),
      );

    for (const row of ficRows) {
      recipients.add(row.userId);
    }
  }

  return Array.from(recipients);
}

/**
 * Resolves all active Principal and Vice Principal user IDs for executive triage notices.
 */
export async function getExecutiveUserIds(
  client: DbClientOrTx,
): Promise<string[]> {
  const rows = await client
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.role, ["principal", "vice_principal"]),
        eq(users.isActive, true),
      ),
    );

  return rows.map((r) => r.id);
}
