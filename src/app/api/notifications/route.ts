import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { notifications } from "@/db/schema";
import { formatNotification } from "@/db/adapters";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows, unreadRes] = await withDbRetry((client) =>
      Promise.all([
        client
          .select()
          .from(notifications)
          .where(eq(notifications.userId, session.userId))
          .orderBy(desc(notifications.createdAt))
          .limit(30),
        client
          .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, session.userId),
              eq(notifications.isRead, false)
            )
          ),
      ])
    );

    return NextResponse.json({
      notifications: rows.map(formatNotification),
      unreadCount: Number(unreadRes[0]?.count || 0),
    });
  } catch (err: unknown) {
    console.error("[GET /api/notifications] Error:", err);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
