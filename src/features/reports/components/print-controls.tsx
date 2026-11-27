"use client";

export function PrintControls() {
  return (
    <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors shadow-lg cursor-pointer"
      >
        Print / Save PDF
      </button>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
      >
        ← Back
      </button>
    </div>
  );
}
