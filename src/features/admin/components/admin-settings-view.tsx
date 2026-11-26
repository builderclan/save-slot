"use client";

import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import type { CollegeSettings } from "@/types/database";
import { Select } from "@/components/ui/select";

interface AdminSettingsViewProps {
  settings: CollegeSettings | null;
  onSaveSettings: (data: {
    collegeName: string;
    shortCode: string;
    letterheadSubtitle: string;
    logoUrl: string;
    academicYearStartMonth: number;
    timezone: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

const MONTH_OPTIONS = [
  { value: "1", label: "January (Jan – Dec)" },
  { value: "4", label: "April (Apr – Mar)" },
  { value: "6", label: "June (Jun – May)" },
  { value: "7", label: "July (Jul – Jun • Standard)" },
  { value: "8", label: "August (Aug – Jul)" },
];

export function AdminSettingsView({
  settings,
  onSaveSettings,
  isSaving = false,
}: AdminSettingsViewProps) {
  const [collegeName, setCollegeName] = useState("");
  const [shortCode, setShortCode] = useState("AISAT");
  const [letterheadSubtitle, setLetterheadSubtitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [academicYearStartMonth, setAcademicYearStartMonth] = useState("7");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    if (settings) {
      setCollegeName(settings.college_name || "");
      setShortCode(settings.short_code || "AISAT");
      setLetterheadSubtitle(settings.letterhead_subtitle || "");
      setLogoUrl(settings.logo_url || "");
      setAcademicYearStartMonth(String(settings.academic_year_start_month || 7));
      setTimezone(settings.timezone || "Asia/Kolkata");
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      collegeName: collegeName.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      letterheadSubtitle: letterheadSubtitle.trim(),
      logoUrl: logoUrl.trim(),
      academicYearStartMonth: parseInt(academicYearStartMonth, 10) || 7,
      timezone: timezone.trim(),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-zinc-50/50 p-4 sm:p-6">
      <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              College Identity & Letterhead Settings
            </h3>
            <p className="text-xs text-zinc-500">
              Controls official A4 report headers, reference code prefix, and academic year rollover.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-900 mb-1">
                Official College Name *
              </label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1">
                Reference Prefix *
              </label>
              <input
                type="text"
                required
                value={shortCode}
                onChange={(e) =>
                  setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                }
                placeholder="AISAT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Letterhead Subtitle
            </label>
            <input
              type="text"
              value={letterheadSubtitle}
              onChange={(e) => setLetterheadSubtitle(e.target.value)}
              placeholder="e.g. Affiliated to APJ Abdul Kalam Technological University"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs sm:text-sm font-medium text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Academic Year Start Month"
              value={academicYearStartMonth}
              onChange={setAcademicYearStartMonth}
              options={MONTH_OPTIONS}
            />

            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1">Timezone *</label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs font-mono text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              College Logo URL (for A4 Dossiers)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-500">
              Preview Ref: {shortCode || "AISAT"}/2026-27/CSE/001
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
