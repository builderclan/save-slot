export default function PrincipalLoading() {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* Principal Desk Sidebar Skeleton */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-zinc-200/90 p-4 flex flex-col gap-5 shrink-0 bg-zinc-50/60">
        {/* Executive Profile Skeleton */}
        <div className="space-y-2 pb-4 border-b border-zinc-200/70">
          <div className="w-24 h-2.5 rounded bg-zinc-200/70 animate-pulse" />
          <div className="w-40 h-5 rounded-lg bg-zinc-200/90 animate-pulse" />
          <div className="w-32 h-3 rounded bg-zinc-200/60 animate-pulse" />
        </div>

        {/* Navigation Tabs Skeleton */}
        <div className="space-y-1.5 flex-1">
          <div className="w-full h-9 rounded-xl bg-white border border-zinc-200/90 shadow-2xs animate-pulse flex items-center px-3 gap-2.5">
            <div className="w-3.5 h-3.5 rounded bg-zinc-200/80" />
            <div className="w-24 h-3 rounded bg-zinc-200/80" />
            <div className="w-6 h-3.5 rounded-full bg-zinc-100 ml-auto" />
          </div>
          <div className="w-full h-9 rounded-xl bg-transparent animate-pulse flex items-center px-3 gap-2.5">
            <div className="w-3.5 h-3.5 rounded bg-zinc-200/60" />
            <div className="w-28 h-3 rounded bg-zinc-200/60" />
          </div>
          <div className="w-full h-9 rounded-xl bg-transparent animate-pulse flex items-center px-3 gap-2.5">
            <div className="w-3.5 h-3.5 rounded bg-zinc-200/60" />
            <div className="w-24 h-3 rounded bg-zinc-200/60" />
          </div>
        </div>

        {/* Quick Help / Guideline Skeleton */}
        <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 space-y-2">
          <div className="w-24 h-2.5 rounded bg-zinc-200/80 animate-pulse" />
          <div className="w-full h-2 rounded bg-zinc-200/60 animate-pulse" />
          <div className="w-3/4 h-2 rounded bg-zinc-200/60 animate-pulse" />
        </div>
      </aside>

      {/* Main Desk View (Split: List on Left, Detail on Right) */}
      <main className="flex-1 flex flex-col lg:flex-row min-w-0 bg-zinc-50/40 overflow-hidden">
        {/* Pending Queue List Skeleton */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-zinc-200/90 bg-white flex flex-col shrink-0">
          <div className="p-3.5 border-b border-zinc-200/80 flex items-center justify-between gap-3">
            <div className="w-28 h-3.5 rounded bg-zinc-200/80 animate-pulse" />
            <div className="w-14 h-4 rounded-full bg-zinc-100 animate-pulse" />
          </div>

          <div className="p-3 space-y-2 overflow-y-auto flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-16 h-3.5 rounded-full bg-zinc-100 animate-pulse" />
                  <div className="w-12 h-3 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="w-48 h-3.5 rounded bg-zinc-200/80 animate-pulse" />
                <div className="w-36 h-3 rounded bg-zinc-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Detail & Clash Review Pane Skeleton */}
        <div className="hidden lg:flex flex-1 flex-col p-6 overflow-y-auto space-y-5 bg-white">
          <div className="space-y-3 pb-5 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 rounded-full bg-zinc-100 animate-pulse" />
              <div className="w-24 h-4 rounded-full bg-zinc-100 animate-pulse" />
            </div>
            <div className="w-72 h-6 rounded-xl bg-zinc-200/80 animate-pulse" />
            <div className="w-96 max-w-full h-3.5 rounded bg-zinc-100 animate-pulse" />
          </div>

          {/* Conflict Engine Card Skeleton */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
            <div className="w-36 h-3.5 rounded bg-zinc-200/80 animate-pulse" />
            <div className="w-full max-w-md h-2.5 rounded bg-zinc-200/60 animate-pulse" />
          </div>

          {/* Action Buttons Skeleton */}
          <div className="pt-3 flex items-center gap-2.5">
            <div className="w-32 h-10 rounded-xl bg-zinc-900/80 animate-pulse" />
            <div className="w-28 h-10 rounded-xl bg-zinc-100 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
