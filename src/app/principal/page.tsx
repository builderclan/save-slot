import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withDbRetry } from "@/lib/db";
import { events, communityMembers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatCampusEvent } from "@/db/adapters";
import { CampusEvent } from "@/types/database";
import { PrincipalClientDesk } from "@/features/principal";

export default async function PrincipalDeskPage() {
  const session = await getCurrentUser();
  if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
    redirect("/login?error=principal_required");
    return null;
  }

  const campusId = session.profile?.campus_id;
  if (!campusId) {
    return <PrincipalClientDesk initialEvents={[]} user={session} />;
  }

  let initialEvents: CampusEvent[] = [];
  try {
    const rows = await withDbRetry((client) =>
      client.query.events.findMany({
        where: eq(events.campusId, campusId),
        orderBy: [desc(events.startTime)],
        with: {
          community: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
            with: {
              members: {
                where: eq(communityMembers.role, "lead"),
                with: {
                  user: {
                    columns: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
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
            columns: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          reviewer: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );
    initialEvents = rows.map(formatCampusEvent);
  } catch (err) {
    console.warn("[PrincipalDesk] Database query unavailable during server render:", err);
  }

  return <PrincipalClientDesk initialEvents={initialEvents} user={session} />;
}
