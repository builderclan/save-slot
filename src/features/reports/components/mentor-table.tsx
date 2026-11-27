interface MentorRow {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  confirmed: boolean;
  attended?: boolean | null;
}

interface MentorTableProps {
  mentors: MentorRow[];
}

export function MentorTable({ mentors }: MentorTableProps) {
  const planned = mentors.filter((m) => !m.confirmed);
  const confirmed = mentors.filter((m) => m.confirmed);

  return (
    <div className="space-y-3">
      {confirmed.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
            Confirmed Mentors / Coordinators
          </h4>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Name</th>
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Designation</th>
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Department</th>
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Attended</th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100">
                  <td className="py-1.5 px-2 text-zinc-800 font-medium">{m.name}</td>
                  <td className="py-1.5 px-2 text-zinc-600">{m.designation ?? "—"}</td>
                  <td className="py-1.5 px-2 text-zinc-600">{m.department ?? "—"}</td>
                  <td className="py-1.5 px-2">
                    {m.attended == null ? (
                      <span className="text-zinc-400">—</span>
                    ) : m.attended ? (
                      <span className="text-emerald-700 font-semibold">Yes</span>
                    ) : (
                      <span className="text-rose-600">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {planned.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
            Planned Mentors (Proposed)
          </h4>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Name</th>
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Designation</th>
                <th className="text-left py-1.5 px-2 font-semibold text-zinc-700">Department</th>
              </tr>
            </thead>
            <tbody>
              {planned.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100">
                  <td className="py-1.5 px-2 text-zinc-700">{m.name}</td>
                  <td className="py-1.5 px-2 text-zinc-500">{m.designation ?? "—"}</td>
                  <td className="py-1.5 px-2 text-zinc-500">{m.department ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mentors.length === 0 && (
        <p className="text-xs text-zinc-400 italic">No mentor records.</p>
      )}
    </div>
  );
}
