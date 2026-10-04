import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session || (!session.isLead && !session.isAdmin && !session.isPrincipal)) {
    redirect("/login?error=lead_required");
  }

  return <>{children}</>;
}
