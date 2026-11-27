import { format, parseISO } from "date-fns";

interface ApprovalRow {
  id: string;
  stage: string;
  action: string;
  actorName?: string | null;
  actorRole?: string | null;
  timestamp: string;
  remarks?: string | null;
}

interface ApprovalLogTableProps {
  rows: ApprovalRow[];
}

const STAGE_LABEL: Record<string, string> = {
  stage2_hod: "Stage 2 — HOD",
  stage2_fic: "Stage 2 — FIC",
  executive: "Executive (Principal / VP)",
  report_fic: "Report — FIC",
  report_hod: "Report — HOD",
  report_executive: "Report — Principal",
};

const ACTION_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Returned",
  needs_revision: "Revision Requested",
  submitted: "Submitted",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export function ApprovalLogTable({ rows }: ApprovalLogTableProps) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-xs text-zinc-400 italic">No approval records.</p>
    );
  }

  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr className="bg-zinc-50 border-b border-zinc-200">
          <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Stage</th>
          <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Action</th>
          <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">By</th>
          <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Date &amp; Time</th>
          <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-zinc-100">
            <td className="py-1.5 px-2 text-zinc-700">
              {STAGE_LABEL[row.stage] ?? row.stage}
            </td>
            <td className="py-1.5 px-2">
              <span
                className={`font-semibold ${
                  row.action === "approved"
                    ? "text-emerald-700"
                    : row.action === "rejected" || row.action === "needs_revision"
                    ? "text-rose-700"
                    : "text-zinc-700"
                }`}
              >
                {ACTION_LABEL[row.action] ?? row.action}
              </span>
            </td>
            <td className="py-1.5 px-2 text-zinc-600">
              <span className="block">{row.actorName ?? "—"}</span>
              {row.actorRole && (
                <span className="text-[10px] text-zinc-400 capitalize">{row.actorRole}</span>
              )}
            </td>
            <td className="py-1.5 px-2 text-zinc-500 whitespace-nowrap">
              {format(parseISO(row.timestamp), "dd MMM yyyy, h:mm a")}
            </td>
            <td className="py-1.5 px-2 text-zinc-500 max-w-[160px] leading-snug">
              {row.remarks ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
