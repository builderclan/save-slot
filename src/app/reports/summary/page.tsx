import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { hasSummaryRegisterAccess } from "@/server/reports";
import { SummaryRegister } from "@/features/reports/components/summary-register";
import { FileSpreadsheet } from "lucide-react";

export default async function SummaryRegisterPage() {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login?next=/reports/summary");
  }
  if (!hasSummaryRegisterAccess(session)) {
    redirect("/");
  }

  return (
    <div className="flex-1 w-full bg-zinc-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="pb-6 border-b border-zinc-200/80">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>NAAC / NBA Consolidated Register</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Event Summary Register
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Filter institutional events by academic year, origin, or status and export CSV or A4 printouts.
          </p>
        </div>

        <SummaryRegister />
      </div>
    </div>
  );
}
