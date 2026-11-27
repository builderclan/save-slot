import { format, parseISO } from "date-fns";
import type { DossierPayload } from "@/server/reports";
import { ApprovalLogTable } from "./approval-log-table";
import { MentorTable } from "./mentor-table";
import { DossierQR } from "./dossier-qr";
import { PrintControls } from "./print-controls";

interface EventDossierProps extends DossierPayload {
  verifyUrl: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-zinc-200 rounded-sm overflow-hidden">
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2">
        <h2 className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[12px] py-0.5">
      <span className="w-40 shrink-0 text-zinc-500 font-medium">{label}</span>
      <span className="text-zinc-800 flex-1">{value ?? "—"}</span>
    </div>
  );
}

export async function EventDossier({ event, collegeSettings, coordinator, verifyUrl }: EventDossierProps) {
  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);
  const report = event.report;
  const mentors = event.mentors ?? [];
  const approvals = event.approvals ?? [];

  const approvalChainRows = approvals.map((a) => ({
    id: a.id,
    stage: `executive`,
    action: a.action,
    actorName: a.actor_name_snapshot,
    actorRole: a.actor_role_snapshot,
    timestamp: a.created_at,
    remarks: a.remarks,
  }));

  const stage2Rows = (event.stage2_approvals ?? [])
    .filter((s) => s.approved_at)
    .map((s) => ({
      id: s.id,
      stage: `stage2_${s.entity_type === "department" ? "hod" : "fic"}`,
      action: s.approval_status === "approved" ? "approved" : s.approval_status === "rejected" ? "rejected" : "pending",
      actorName: s.entity_name ?? s.entity_code ?? null,
      actorRole: s.entity_type === "department" ? "HOD" : "FIC",
      timestamp: s.approved_at ?? event.created_at ?? event.start_time,
      remarks: s.approval_remarks ?? null,
    }));

  const allApprovalRows = [...stage2Rows, ...approvalChainRows];

  return (
    <>
      {/* Print controls – hidden on print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm 16mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PrintControls />

      <div className="max-w-[794px] mx-auto px-6 py-8 space-y-4 font-sans text-zinc-900">
        {/* Letterhead */}
        <div className="border-b-2 border-zinc-900 pb-4 mb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">
                {collegeSettings.college_name}
              </h1>
              {collegeSettings.letterhead_subtitle && (
                <p className="text-[11px] text-zinc-500 mt-0.5">{collegeSettings.letterhead_subtitle}</p>
              )}
              <p className="text-[11px] text-zinc-500 mt-1">
                Campus Events &amp; Scheduling — Post-Event Dossier
              </p>
            </div>
            <div className="text-right shrink-0">
              {event.reference_number && (
                <div className="font-mono text-xs font-bold bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-sm text-zinc-800">
                  {event.reference_number}
                </div>
              )}
              {event.academic_year && (
                <div className="text-[10px] text-zinc-500 mt-1">AY {event.academic_year}</div>
              )}
            </div>
          </div>
        </div>

        {/* Event Title */}
        <div className="border border-zinc-200 rounded-sm px-4 py-3 bg-zinc-50">
          <h2 className="text-base font-bold text-zinc-900">{event.title}</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
            {event.category.replace(/_/g, " ")} · {event.origin_type.replace(/_/g, " ")} event
            {event.status === "completed" && (
              <span className="ml-2 inline-block px-1.5 py-0.5 rounded-sm bg-teal-100 text-teal-800 text-[10px] font-semibold">Completed &amp; Filed</span>
            )}
          </p>
        </div>

        {/* Basic Details */}
        <Section title="1. Event Details">
          <InfoRow label="Date" value={format(startDate, "EEEE, MMMM d, yyyy")} />
          <InfoRow label="Time" value={`${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`} />
          <InfoRow label="Venue" value={event.venue?.name ?? event.location_name} />
          {event.venue?.building && <InfoRow label="Building / Block" value={event.venue.building} />}
          <InfoRow label="Target Audience" value={event.target_audience?.join(", ")} />
          {event.description && <InfoRow label="Description" value={event.description} />}
        </Section>

        {/* Host / Organizer */}
        <Section title="2. Organizing Club / Department">
          <InfoRow
            label="Host"
            value={
              event.community?.name ??
              event.department?.name ??
              collegeSettings.college_name
            }
          />
          {(event.community?.code || event.department?.code) && (
            <InfoRow label="Code" value={event.community?.code ?? event.department?.code} />
          )}
          {event.community?.scope && (
            <InfoRow label="Scope" value={<span className="capitalize">{event.community.scope}</span>} />
          )}
          {coordinator && (
            <InfoRow label="Coordinator" value={`${coordinator.full_name} (${coordinator.email})`} />
          )}
        </Section>

        {/* Mentors */}
        {mentors.length > 0 && (
          <Section title="3. Faculty Mentors &amp; Coordinators">
            <MentorTable
              mentors={mentors.map((m) => ({
                id: m.id,
                name: m.name,
                designation: m.role_title,
                department: m.organization,
                confirmed: m.phase === "confirmed",
                attended: m.phase === "confirmed" ? true : null,
              }))}
            />
          </Section>
        )}

        {/* Budget */}
        <Section title="4. Budget &amp; Finance">
          <InfoRow
            label="Estimated Budget"
            value={event.estimated_budget ? `₹${Number(event.estimated_budget).toLocaleString("en-IN")}` : "Not specified"}
          />
          {report && (
            <>
              <InfoRow
                label="Actual Fund Used"
                value={`₹${Number(report.actual_fund_used ?? 0).toLocaleString("en-IN")}`}
              />
              <InfoRow label="Funding Source" value={report.funding_source} />
              {report.fund_notes && <InfoRow label="Finance Notes" value={report.fund_notes} />}
            </>
          )}
        </Section>

        {/* Attendance */}
        {report && (
          <Section title="5. Attendance &amp; Participation">
            <InfoRow label="Students" value={String(report.student_count ?? 0)} />
            <InfoRow label="Faculty" value={String(report.faculty_count ?? 0)} />
            <InfoRow label="External Guests" value={String(report.external_count ?? 0)} />
            <InfoRow
              label="Total Participants"
              value={
                <strong className="text-zinc-900">
                  {((report.student_count ?? 0) + (report.faculty_count ?? 0) + (report.external_count ?? 0)).toLocaleString("en-IN")}
                </strong>
              }
            />
          </Section>
        )}

        {/* NAAC / NBA Summary */}
        {report && (
          <Section title="6. NAAC / NBA Summary &amp; Outcomes">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-[12px] text-zinc-800 leading-relaxed whitespace-pre-line">{report.summary}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Outcomes &amp; Impact</p>
                <p className="text-[12px] text-zinc-800 leading-relaxed whitespace-pre-line">{report.outcomes}</p>
              </div>
              {report.evidence_url && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Evidence / Documentation</p>
                  <p className="text-[12px] text-indigo-700 break-all">{report.evidence_url}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Approval Log */}
        {allApprovalRows.length > 0 && (
          <Section title="7. Approval Audit Log">
            <ApprovalLogTable rows={allApprovalRows} />
          </Section>
        )}

        {/* QR + Verification */}
        <Section title="8. Verification">
          <div className="flex items-start gap-6">
            <div className="flex-1 space-y-2">
              <p className="text-[12px] text-zinc-700 leading-relaxed">
                This document was generated by the SaveSlot campus scheduling system and can be verified
                at the URL below using the event reference number.
              </p>
              <p className="font-mono text-[11px] text-indigo-700 break-all">{verifyUrl}</p>
              {event.reference_number && (
                <InfoRow label="Reference No." value={<span className="font-mono font-bold">{event.reference_number}</span>} />
              )}
            </div>
            <DossierQR url={verifyUrl} label={verifyUrl} />
          </div>
        </Section>

        {/* Signature Block */}
        <div className="mt-6 pt-4 border-t border-zinc-200 grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-zinc-400 mb-1 pb-6" />
            <p className="text-[11px] text-zinc-600 font-semibold">Coordinator / Club Lead</p>
            <p className="text-[10px] text-zinc-400">Signature &amp; Date</p>
          </div>
          <div>
            <div className="border-b border-zinc-400 mb-1 pb-6" />
            <p className="text-[11px] text-zinc-600 font-semibold">Principal / Vice Principal</p>
            <p className="text-[10px] text-zinc-400">Signature, Stamp &amp; Date</p>
          </div>
        </div>

        <p className="text-[9px] text-zinc-400 text-center pt-2">
          Generated by SaveSlot · {collegeSettings.college_name} · {format(new Date(), "dd MMM yyyy, h:mm a")}
        </p>
      </div>
    </>
  );
}
