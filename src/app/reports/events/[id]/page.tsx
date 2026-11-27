import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getDossierPayload } from "@/server/reports";
import { EventDossier } from "@/features/reports/components/event-dossier";
import { campusConfig } from "@/lib/config/campus";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDossierPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) {
    redirect(`/login?next=/reports/events/${id}`);
  }

  const result = await getDossierPayload(id, session);
  if (!result.ok) {
    if (result.status === 403) redirect("/");
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${campusConfig.shortName.toLowerCase()}.saveslot.app`;
  const verifyUrl = result.data.event.reference_number
    ? `${baseUrl}/verify/${result.data.event.reference_number}`
    : `${baseUrl}/verify/${id}`;

  return <EventDossier {...result.data} verifyUrl={verifyUrl} />;
}
