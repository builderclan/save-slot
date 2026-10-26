export default function LeadLoading() {
  return (
    <div className="flex-1 w-full flex flex-col bg-zinc-50/50">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="w-32 h-4 rounded bg-zinc-200/70 animate-pulse" />
            <div className="w-56 h-8 rounded-xl bg-zinc-200/80 animate-pulse" />
            <div className="w-80 max-w-full h-4 rounded bg-zinc-100 animate-pulse" />
          </div>
          <div className="w-36 h-10 rounded-xl bg-zinc-200/70 animate-pulse shrink-0" />
        </div>

        {/* 4 Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-20 h-3.5 rounded bg-zinc-100 animate-pulse" />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 animate-pulse" />
              </div>
              <div className="w-12 h-6 rounded bg-zinc-200/80 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Policy Alert Banner Skeleton */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0 animate-pulse" />
          <div className="space-y-1.5 flex-1 pt-1">
            <div className="w-48 h-3.5 rounded bg-zinc-200/70 animate-pulse" />
            <div className="w-full max-w-xl h-3 rounded bg-zinc-100 animate-pulse" />
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="p-3 sm:p-4 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72 h-9 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="w-full sm:w-auto flex items-center gap-2">
            <div className="w-28 h-9 rounded-xl bg-zinc-100 animate-pulse" />
            <div className="w-32 h-9 rounded-xl bg-zinc-100 animate-pulse" />
          </div>
        </div>

        {/* Edge-to-Edge Events List Skeleton */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-2xs divide-y divide-zinc-100 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded-full bg-zinc-100 animate-pulse" />
                  <div className="w-48 sm:w-72 h-5 rounded bg-zinc-200/80 animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-3.5 rounded bg-zinc-100 animate-pulse" />
                  <div className="w-20 h-3.5 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-8 rounded-lg bg-zinc-100 animate-pulse" />
                <div className="w-16 h-8 rounded-lg bg-zinc-200/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
