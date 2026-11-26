import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function LeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (
    !session ||
    (!session.isLead &&
      !session.isFic &&
      !session.isHod &&
      !session.isActingHod &&
      !session.isStaff)
  ) {
    redirect("/login?error=lead_required");
    return null;
  }

  return <>{children}</>;
}
