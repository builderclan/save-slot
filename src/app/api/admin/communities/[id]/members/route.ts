import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { communityMembers } from "@/db/schema";
import { AssignCommunityMemberSchema } from "@/lib/validations";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id: communityId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = AssignCommunityMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid member payload" },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;
    const [member] = await withDbRetry((client) =>
      client
        .insert(communityMembers)
        .values({
          communityId,
          userId,
          role,
          status: "active",
        })
        .onConflictDoUpdate({
          target: [communityMembers.communityId, communityMembers.userId],
          set: { role, status: "active" },
        })
        .returning()
    );

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/admin/communities/[id]/members] Error:", err);
    return NextResponse.json({ error: "Failed to assign community member" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id: communityId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    await withDbRetry((client) =>
      client
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, userId)
          )
        )
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/communities/[id]/members] Error:", err);
    return NextResponse.json({ error: "Failed to remove community member" }, { status: 500 });
  }
}
