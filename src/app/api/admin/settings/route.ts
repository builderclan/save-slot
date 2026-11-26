import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { collegeSettings } from "@/db/schema";
import { formatCollegeSettings } from "@/db/adapters";
import { UpdateCollegeSettingsSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const [row] = await withDbRetry((client) =>
      client.select().from(collegeSettings).where(eq(collegeSettings.id, 1)).limit(1)
    );

    if (!row) {
      const [created] = await withDbRetry((client) =>
        client.insert(collegeSettings).values({ id: 1 }).onConflictDoNothing().returning()
      );
      if (created) {
        return NextResponse.json({ settings: formatCollegeSettings(created) });
      }
      const [refetched] = await withDbRetry((client) =>
        client.select().from(collegeSettings).where(eq(collegeSettings.id, 1)).limit(1)
      );
      return NextResponse.json({
        settings: refetched ? formatCollegeSettings(refetched) : null,
      });
    }

    return NextResponse.json({ settings: formatCollegeSettings(row) });
  } catch (err: unknown) {
    console.error("[GET /api/admin/settings] Error:", err);
    return NextResponse.json({ error: "Failed to load college settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateCollegeSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid settings payload" },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof collegeSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.collegeName !== undefined) {
      updateData.collegeName = parsed.data.collegeName.trim();
    }
    if (parsed.data.shortCode !== undefined) {
      updateData.shortCode = parsed.data.shortCode.trim().toUpperCase();
    }
    if (parsed.data.letterheadSubtitle !== undefined) {
      updateData.letterheadSubtitle = parsed.data.letterheadSubtitle?.trim() || null;
    }
    if (parsed.data.logoUrl !== undefined) {
      updateData.logoUrl = parsed.data.logoUrl?.trim() || null;
    }
    if (parsed.data.academicYearStartMonth !== undefined) {
      updateData.academicYearStartMonth = parsed.data.academicYearStartMonth;
    }
    if (parsed.data.timezone !== undefined) {
      updateData.timezone = parsed.data.timezone.trim();
    }

    const [updated] = await withDbRetry((client) =>
      client
        .update(collegeSettings)
        .set(updateData)
        .where(eq(collegeSettings.id, 1))
        .returning()
    );

    if (!updated) {
      return NextResponse.json({ error: "College settings record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings: formatCollegeSettings(updated) });
  } catch (err: unknown) {
    console.error("[PATCH /api/admin/settings] Error:", err);
    return NextResponse.json({ error: "Failed to update college settings" }, { status: 500 });
  }
}
