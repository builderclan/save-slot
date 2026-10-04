import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session || (!session.isPrincipal && !session.isVicePrincipal && !session.isAdmin)) {
    redirect("/login?error=principal_required");
  }

  return <>{children}</>;
}
