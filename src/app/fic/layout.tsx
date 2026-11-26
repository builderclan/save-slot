import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function FicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session || !session.isFic) {
    redirect("/login?error=fic_required");
    return null;
  }

  return <>{children}</>;
}
