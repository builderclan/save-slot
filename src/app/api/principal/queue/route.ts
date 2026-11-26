import { NextResponse } from "next/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import {
  communityMembers,
  departments,
  eventApprovals,
  events,
  users,
  venues,
  communities,
} from "@/db/schema";
import {
  formatCampusEvent,
  formatCommunity,
  formatDepartment,
  formatUser,
  formatVenue,
} from "@/db/adapters";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
      return NextResponse.json(
        { error: "Unauthorized executive access" },
        { status: 403 },
      );
    }

    const [eventRows, deptRows, commRows, venueRows, staffRows] =
      await withDbRetry((client) =>
        Promise.all([
          client.query.events.findMany({
            orderBy: [desc(events.startTime)],
            limit: 200,
            with: {
              community: {
                columns: {
                  id: true,
                  name: true,
                  slug: true,
                  code: true,
                  scope: true,
                  category: true,
                },
                with: {
                  members: {
                    where: eq(communityMembers.role, "lead"),
                    with: {
                      user: {
                        columns: { id: true, fullName: true, email: true },
                      },
                    },
                  },
                },
              },
              department: {
                columns: {
                  id: true,
                  name: true,
                  code: true,
                  isActingHodActive: true,
                  isActive: true,
                },
              },
              venue: {
                columns: {
                  id: true,
                  name: true,
                  building: true,
                  capacity: true,
                },
              },
              creator: {
                columns: { id: true, fullName: true, email: true, role: true },
              },
              reviewer: {
                columns: { id: true, fullName: true, email: true, role: true },
              },
              stage2Approvals: {
                with: {
                  department: { columns: { id: true, name: true, code: true } },
                  community: { columns: { id: true, name: true, code: true } },
                },
              },
              approvals: {
                orderBy: [asc(eventApprovals.createdAt)],
              },
              mentors: true,
              report: true,
            },
          }),
          client.query.departments.findMany({
            orderBy: [asc(departments.name)],
            with: {
              hod: { columns: { id: true, fullName: true, email: true } },
              actingHod: { columns: { id: true, fullName: true, email: true } },
            },
          }),
          client.select().from(communities).orderBy(asc(communities.name)),
          client
            .select()
            .from(venues)
            .where(eq(venues.isActive, true))
            .orderBy(asc(venues.name)),
          client
            .select()
            .from(users)
            .where(
              inArray(users.role, [
                "staff",
                "hod",
                "fic",
                "principal",
                "vice_principal",
              ]),
            )
            .orderBy(asc(users.fullName)),
        ]),
      );

    return NextResponse.json({
      events: eventRows.map(formatCampusEvent),
      departments: deptRows.map(formatDepartment),
      communities: commRows.map(formatCommunity),
      venues: venueRows.map(formatVenue),
      staffUsers: staffRows.filter((u) => u.isActive !== false).map(formatUser),
    });
  } catch (err: unknown) {
    console.error("[GET /api/principal/queue] Error:", err);
    return NextResponse.json(
      { error: "Failed to load Executive Desk data" },
      { status: 500 },
    );
  }
}
