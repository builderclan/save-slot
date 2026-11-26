import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { communities, communityMembers, users } from "@/db/schema";
import { formatCommunity } from "@/db/adapters";
import { CreateCommunitySchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
      return NextResponse.json({ error: "Unauthorized executive access" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateCommunitySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid community payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = data.slug?.trim() || slugify(data.name) || "community";
    const code =
      data.code?.trim().toUpperCase() ||
      slug.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase() ||
      "COMM";

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const [dupSlug] = await tx
          .select({ id: communities.id })
          .from(communities)
          .where(eq(communities.slug, slug))
          .limit(1);
        if (dupSlug) {
          return { ok: false as const, status: 400, error: "Community slug already exists." };
        }

        const [dupCode] = await tx
          .select({ id: communities.id })
          .from(communities)
          .where(eq(communities.code, code))
          .limit(1);
        if (dupCode) {
          return { ok: false as const, status: 400, error: "Community code already exists." };
        }

        const ficUserIds = Array.from(new Set(data.ficUserIds || []));
        if (ficUserIds.length > 0) {
          const validUsers = await tx
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.id, ficUserIds));
          if (validUsers.length !== ficUserIds.length) {
            return { ok: false as const, status: 400, error: "Invalid FIC user selection." };
          }
        }

        const [created] = await tx
          .insert(communities)
          .values({
            name: data.name.trim(),
            slug,
            code,
            scope: data.scope,
            category: data.category,
            description: data.description?.trim() || null,
            logoUrl: data.logoUrl?.trim() || null,
            website: data.website?.trim() || null,
            instagram: data.instagram?.trim() || null,
            status: "approved",
            createdBy: session.userId,
          })
          .returning();

        const leadId = data.leadUserId?.trim() || null;
        if (leadId) {
          await tx.insert(communityMembers).values({
            communityId: created.id,
            userId: leadId,
            role: "lead",
            status: "active",
          });
        }

        for (const ficId of ficUserIds) {
          if (ficId === leadId) continue;
          await tx
            .insert(communityMembers)
            .values({
              communityId: created.id,
              userId: ficId,
              role: "fic",
              status: "active",
            })
            .onConflictDoNothing();
        }

        return { ok: true as const, community: created };
      })
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/principal");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/");

    return NextResponse.json(
      { success: true, community: formatCommunity(result.community) },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/principal/communities] Error:", err);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
