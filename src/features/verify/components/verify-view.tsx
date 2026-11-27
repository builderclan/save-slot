import { format, parseISO } from "date-fns";
import { CheckCircle2, Calendar, MapPin, ShieldCheck, Building2 } from "lucide-react";
import type { PublicVerifyPayload } from "@/server/reports";

interface VerifyViewProps {
  data: PublicVerifyPayload;
}

export function VerifyView({ data }: VerifyViewProps) {
  const start = parseISO(data.start_time);
  const end = parseISO(data.end_time);

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Letterhead */}
        <div className="bg-zinc-900 text-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                SaveSlot · Official Verification
              </p>
              <h1 className="text-base font-bold mt-0.5">{data.college_name}</h1>
              {data.letterhead_subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5">{data.letterhead_subtitle}</p>
              )}
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Reference & Title */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800">
                {data.reference_number}
              </span>
              {data.academic_year && (
                <span className="text-xs text-zinc-500 font-medium">
                  AY {data.academic_year}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize bg-teal-50 text-teal-800 border border-teal-200">
                {data.status.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 leading-snug">{data.title}</h2>
            <p className="text-xs text-zinc-500 mt-1 capitalize">
              {data.category.replace(/_/g, " ")} · {data.origin_type} event
            </p>
          </div>

          {/* Key Metadata */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-2.5 text-xs text-zinc-700">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                <strong className="text-zinc-900">{data.host_name}</strong>
                {data.host_code ? ` (${data.host_code})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                {format(start, "EEEE, MMMM d, yyyy")} · {format(start, "h:mm a")} –{" "}
                {format(end, "h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                {data.venue_name ?? data.location_name}
                {data.venue_building ? ` (${data.venue_building})` : ""}
              </span>
            </div>
          </div>

          {/* Co-Hosts */}
          {data.co_hosts.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Co-Hosting Units
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.co_hosts.map((ch, idx) => (
                  <span
                    key={`${ch.entity_type}-${idx}`}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-700"
                  >
                    {ch.name}
                    {ch.code ? ` (${ch.code})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Approval Chain */}
          {data.approval_chain.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Approval Trail
              </h3>
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                {data.approval_chain.map((step) => (
                  <div
                    key={step.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs bg-white"
                  >
                    <div>
                      <p className="font-medium text-zinc-800">
                        {step.actor_name_snapshot}{" "}
                        <span className="text-zinc-400 font-normal capitalize">
                          ({step.actor_role_snapshot})
                        </span>
                      </p>
                      <p className="text-[11px] text-zinc-500 capitalize">
                        {step.stage.replace(/_/g, " ")} · {step.action}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                      {format(parseISO(step.created_at), "dd MMM yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
