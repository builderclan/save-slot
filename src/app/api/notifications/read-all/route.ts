import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { notifications } from "@/db/schema";

export async function POST() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await withDbRetry((client) =>
      client
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, session.userId),
            eq(notifications.isRead, false)
          )
        )
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[POST /api/notifications/read-all] Error:", err);
    return NextResponse.json(
      { error: "Failed to mark all notifications read" },
      { status: 500 }
    );
  }
}
