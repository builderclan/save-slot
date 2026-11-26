import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function HodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session || (!session.isHod && !session.isActingHod)) {
    redirect("/login?error=hod_required");
    return null;
  }

  return <>{children}</>;
}
