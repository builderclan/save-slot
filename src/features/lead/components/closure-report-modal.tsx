"use client";

import { useState, type FormEvent } from "react";
import {
  FileCheck2,
  IndianRupee,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { CampusEvent } from "@/types/database";

interface MentorDraft {
  name: string;
  roleTitle: string;
  organization: string;
  mentorType: "internal" | "external";
}

interface ClosureReportModalProps {
  event: CampusEvent;
  onClose: () => void;
  onSuccess: (nextStatus: string) => void;
}

const FUNDING_SOURCES = [
  "No Cost",
  "College Fund",
  "Department Fund",
  "Sponsor / External",
  "Self-Funded",
] as const;

export function ClosureReportModal({
  event,
  onClose,
  onSuccess,
}: ClosureReportModalProps) {
  const existingReport = event.report;
  const confirmedMentors = (event.mentors || []).filter(
    (m) => m.phase === "confirmed"
  );
  const initialMentors: MentorDraft[] = (
    confirmedMentors.length > 0 ? confirmedMentors : event.mentors || []
  ).map((m) => ({
    name: m.name,
    roleTitle: m.role_title,
    organization: m.organization,
    mentorType: m.mentor_type,
  }));

  const [actualFundUsed, setActualFundUsed] = useState<string>(
    String(existingReport?.actual_fund_used ?? event.estimated_budget ?? 0)
  );
  const [fundingSource, setFundingSource] = useState<string>(
    existingReport?.funding_source || event.funding_source || "No Cost"
  );
  const [fundNotes, setFundNotes] = useState<string>(
    existingReport?.fund_notes || ""
  );
  const [studentCount, setStudentCount] = useState<string>(
    String(existingReport?.student_count ?? 0)
  );
  const [facultyCount, setFacultyCount] = useState<string>(
    String(existingReport?.faculty_count ?? 0)
  );
  const [externalCount, setExternalCount] = useState<string>(
    String(existingReport?.external_count ?? 0)
  );
  const [summary, setSummary] = useState<string>(existingReport?.summary || "");
  const [outcomes, setOutcomes] = useState<string>(existingReport?.outcomes || "");
  const [evidenceUrl, setEvidenceUrl] = useState<string>(
    existingReport?.evidence_url || ""
  );
  const [mentors, setMentors] = useState<MentorDraft[]>(initialMentors);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalParticipants =
    (Number(studentCount) || 0) +
    (Number(facultyCount) || 0) +
    (Number(externalCount) || 0);

  const addMentorRow = () => {
    setMentors((prev) => [
      ...prev,
      { name: "", roleTitle: "", organization: "", mentorType: "external" },
    ]);
  };

  const updateMentor = (index: number, patch: Partial<MentorDraft>) => {
    setMentors((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, ...patch } : m))
    );
  };

  const removeMentor = (index: number) => {
    setMentors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (summary.trim().length < 20) {
      setError("NAAC/NBA summary must be at least 20 characters.");
      return;
    }
    if (outcomes.trim().length < 10) {
      setError("Key outcomes must be at least 10 characters.");
      return;
    }

    const cleanedMentors = mentors
      .map((m) => ({
        name: m.name.trim(),
        roleTitle: m.roleTitle.trim(),
        organization: m.organization.trim(),
        mentorType: m.mentorType,
      }))
      .filter((m) => m.name || m.roleTitle || m.organization);

    for (const m of cleanedMentors) {
      if (m.name.length < 2 || m.roleTitle.length < 2 || m.organization.length < 2) {
        setError("Each confirmed mentor must include Name, Role/Designation, and Organization.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post<{ success: boolean; status: string }>(
        `/api/workspace/events/${event.id}/report`,
        {
          actualFundUsed: Number(actualFundUsed) || 0,
          fundingSource,
          fundNotes: fundNotes.trim() || null,
          studentCount: Math.max(0, Math.trunc(Number(studentCount) || 0)),
          facultyCount: Math.max(0, Math.trunc(Number(facultyCount) || 0)),
          externalCount: Math.max(0, Math.trunc(Number(externalCount) || 0)),
          summary: summary.trim(),
          outcomes: outcomes.trim(),
          evidenceUrl: evidenceUrl.trim() || null,
          confirmedMentors: cleanedMentors,
        }
      );
      onSuccess(res.status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit closure report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/50 backdrop-blur-xs">
      <div className="w-full sm:max-w-2xl max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3 bg-zinc-50/70">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Post-Event NAAC/NBA Closure Report</span>
            </div>
            <h2 className="text-base font-bold text-zinc-900 truncate mt-0.5">
              {event.title}
            </h2>
            {event.reference_number && (
              <p className="text-[11px] font-mono text-zinc-500">{event.reference_number}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Attendance */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Attendance Breakdown</span>
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold">
                Total: {totalParticipants}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Students</label>
                <input
                  type="number"
                  min={0}
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Faculty</label>
                <input
                  type="number"
                  min={0}
                  value={facultyCount}
                  onChange={(e) => setFacultyCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">External</label>
                <input
                  type="number"
                  min={0}
                  value={externalCount}
                  onChange={(e) => setExternalCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-zinc-500" />
              <span>Actual Funds Used (Estimated: ₹{Number(event.estimated_budget || 0).toLocaleString("en-IN")})</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Total Fund Used (INR)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={actualFundUsed}
                  onChange={(e) => setActualFundUsed(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Funding Source</label>
                <select
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {FUNDING_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <input
              type="text"
              value={fundNotes}
              onChange={(e) => setFundNotes(e.target.value)}
              placeholder="Optional spending notes (e.g. hospitality, speaker honorarium)"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Confirmed Mentors / Resource Persons */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800">
                Confirmed Mentors / Resource Persons
              </label>
              <button
                type="button"
                onClick={addMentorRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Mentor</span>
              </button>
            </div>
            {mentors.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">
                No confirmed mentors added. Click &quot;Add Mentor&quot; if external/internal speakers participated.
              </p>
            ) : (
              <div className="space-y-2">
                {mentors.map((mentor, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-zinc-200/90 bg-zinc-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={mentor.name}
                      onChange={(e) => updateMentor(idx, { name: e.target.value })}
                      placeholder="Full Name"
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={mentor.roleTitle}
                      onChange={(e) => updateMentor(idx, { roleTitle: e.target.value })}
                      placeholder="Designation / Role"
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={mentor.organization}
                      onChange={(e) => updateMentor(idx, { organization: e.target.value })}
                      placeholder="Organization / Dept"
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                    />
                    <select
                      value={mentor.mentorType}
                      onChange={(e) =>
                        updateMentor(idx, {
                          mentorType: e.target.value === "internal" ? "internal" : "external",
                        })
                      }
                      className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                    >
                      <option value="external">External</option>
                      <option value="internal">Internal</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMentor(idx)}
                      className="sm:col-span-1 p-1.5 text-zinc-400 hover:text-rose-600 cursor-pointer justify-self-end"
                      aria-label="Remove mentor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NAAC/NBA Summary & Outcomes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                NAAC / NBA Event Summary *
              </label>
              <textarea
                rows={3}
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summarize session flow, topics covered, and key highlights (min 20 chars)..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Key Outcomes & Learning Impact *
              </label>
              <textarea
                rows={2}
                required
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                placeholder="Describe measurable student/faculty outcomes (min 10 chars)..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Photos / Attendance Sheet Link (Optional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer active:scale-[0.98]"
            >
              {submitting ? "Submitting..." : existingReport ? "Update & Resubmit Report" : "Submit Closure Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
