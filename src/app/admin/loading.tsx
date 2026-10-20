export default function AdminLoading() {
  return (
    <div className="flex-1 w-full flex flex-col bg-slate-50/50">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-slate-200/70 animate-pulse" />
          <div className="w-64 h-8 rounded-xl bg-slate-200/80 animate-pulse" />
          <div className="w-96 max-w-full h-4 rounded bg-slate-100 animate-pulse" />
        </div>

        {/* 3 Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-24 h-3.5 rounded bg-slate-100 animate-pulse" />
                <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
              </div>
              <div className="w-16 h-7 rounded-lg bg-slate-200/80 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filter Bar & Tabs Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <div className="w-28 h-8 rounded-lg bg-slate-200/70 animate-pulse" />
            <div className="w-24 h-8 rounded-lg bg-slate-100 animate-pulse" />
            <div className="w-24 h-8 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80 h-10 rounded-xl bg-white border border-slate-200/80 animate-pulse" />
            <div className="w-full sm:w-44 h-10 rounded-xl bg-white border border-slate-200/80 animate-pulse" />
          </div>
        </div>

        {/* Events Table / List Skeleton */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded-full bg-slate-100 animate-pulse" />
                  <div className="w-48 sm:w-64 h-5 rounded bg-slate-200/80 animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-3.5 rounded bg-slate-100 animate-pulse" />
                  <div className="w-24 h-3.5 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-9 rounded-xl bg-slate-100 animate-pulse" />
                <div className="w-20 h-9 rounded-xl bg-slate-200/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
