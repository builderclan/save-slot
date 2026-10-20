export default function NoticeBoardLoading() {
  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0 bg-white">
      {/* Sidebar Skeleton (hidden on mobile, visible on desktop) */}
      <aside className="hidden lg:flex w-72 h-full border-r border-slate-200 p-6 flex-col gap-6 shrink-0 bg-white">
        {/* Create button skeleton */}
        <div className="w-full h-10 rounded-xl bg-slate-100 animate-pulse" />

        {/* Mini Calendar Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="w-24 h-4 rounded bg-slate-100 animate-pulse" />
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />
              <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 pt-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-slate-50 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Category Filter Skeleton */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="w-20 h-3.5 rounded bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-100 animate-pulse" />
                  <div className="w-24 h-3.5 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="w-5 h-3.5 rounded bg-slate-50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Top Controls Bar Skeleton */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 h-8 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-20 h-7 rounded-lg bg-slate-100 animate-pulse hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 sm:w-48 h-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-24 h-9 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Calendar Grid / Cards Area Skeleton */}
        <div className="flex-1 p-4 sm:p-6 overflow-hidden">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="grid grid-cols-7 gap-2 pb-2 border-b border-slate-100">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 h-[calc(100%-2rem)]">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100/80 p-2 min-h-16 flex flex-col gap-1.5 bg-slate-50/30"
                >
                  <div className="w-4 h-3 rounded bg-slate-200/60 animate-pulse" />
                  {i % 3 === 0 && (
                    <div className="w-full h-4 rounded bg-indigo-50/70 border border-indigo-100/60 animate-pulse mt-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
