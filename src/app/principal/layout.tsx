import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session || (!session.isPrincipal && !session.isAdmin)) {
    redirect("/login?error=principal_required");
  }

  return <>{children}</>;
}
