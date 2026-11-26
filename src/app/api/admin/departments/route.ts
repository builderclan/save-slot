import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { departments, users } from "@/db/schema";
import { formatDepartment } from "@/db/adapters";
import { CreateDepartmentSchema } from "@/lib/validations";
import { aliasedTable, asc, eq } from "drizzle-orm";

const hodUsers = aliasedTable(users, "hod_users");
const actingHodUsers = aliasedTable(users, "acting_hod_users");

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const rows = await withDbRetry((client) =>
      client
        .select({
          id: departments.id,
          name: departments.name,
          code: departments.code,
          hodUserId: departments.hodUserId,
          actingHodUserId: departments.actingHodUserId,
          isActingHodActive: departments.isActingHodActive,
          actingHodToggledBy: departments.actingHodToggledBy,
          actingHodToggledAt: departments.actingHodToggledAt,
          isActive: departments.isActive,
          createdAt: departments.createdAt,
          hod: {
            id: hodUsers.id,
            fullName: hodUsers.fullName,
            email: hodUsers.email,
          },
          actingHod: {
            id: actingHodUsers.id,
            fullName: actingHodUsers.fullName,
            email: actingHodUsers.email,
          },
        })
        .from(departments)
        .leftJoin(hodUsers, eq(hodUsers.id, departments.hodUserId))
        .leftJoin(actingHodUsers, eq(actingHodUsers.id, departments.actingHodUserId))
        .orderBy(asc(departments.code))
    );

    const formatted = rows.map((r) =>
      formatDepartment({
        ...r,
        hod: r.hod?.id ? r.hod : null,
        actingHod: r.actingHod?.id ? r.actingHod : null,
      })
    );

    return NextResponse.json({ departments: formatted });
  } catch (err: unknown) {
    console.error("[GET /api/admin/departments] Error:", err);
    return NextResponse.json({ error: "Failed to load departments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = CreateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid department data" },
        { status: 400 }
      );
    }

    const { name, code, hodUserId, actingHodUserId, isActive } = parsed.data;
    const normalizedCode = code.trim().toUpperCase();

    const [created] = await withDbRetry((client) =>
      client
        .insert(departments)
        .values({
          name: name.trim(),
          code: normalizedCode,
          hodUserId: hodUserId?.trim() || null,
          actingHodUserId: actingHodUserId?.trim() || null,
          isActive: isActive ?? true,
        })
        .returning()
    );

    return NextResponse.json(
      { success: true, department: formatDepartment(created) },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A department with this code already exists." },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/departments] Error:", err);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
