export default function AdminLoading() {
  return (
    <div
      className="w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-white relative"
      aria-busy="true"
      aria-label="Loading administrative console"
    >
      {/* LEFT SIDEBAR SKELETON */}
      <aside className="w-full lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200/80 bg-white lg:bg-zinc-50/60 p-1.5 sm:p-3 lg:p-4 flex flex-col justify-between">
        <div className="space-y-1.5 lg:space-y-4">
          {/* Header & Persona */}
          <div className="hidden lg:flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 px-2">
            <div className="w-16 h-3 rounded bg-zinc-200/70 animate-pulse" />
            <div className="w-24 h-4 rounded-md bg-zinc-200/60 animate-pulse" />
          </div>

          {/* Nav Items Skeleton */}
          <nav className="flex overflow-x-auto lg:flex-col gap-1 p-0.5 lg:p-1 w-full scrollbar-none no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 lg:shrink px-2.5 py-1.5 sm:px-3 sm:py-2 lg:py-2.5 rounded-lg lg:rounded-xl flex items-center justify-between gap-2 border border-transparent"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-zinc-200/70 animate-pulse shrink-0" />
                  <div
                    className={`h-3.5 rounded bg-zinc-200/70 animate-pulse ${
                      i === 0
                        ? "w-24"
                        : i === 1
                        ? "w-28"
                        : i === 2
                        ? "w-20"
                        : i === 3
                        ? "w-22"
                        : i === 4
                        ? "w-26"
                        : "w-24"
                    }`}
                  />
                </div>
                <div className="w-5 h-4 rounded-full bg-zinc-200/60 animate-pulse shrink-0" />
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Info Skeleton */}
        <div className="hidden lg:block pt-4 border-t border-zinc-200/80">
          <div className="p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-zinc-200/70 animate-pulse" />
              <div className="w-24 h-3.5 rounded bg-zinc-200/70 animate-pulse" />
            </div>
            <div className="w-full h-2.5 rounded bg-zinc-100 animate-pulse" />
            <div className="w-4/5 h-2.5 rounded bg-zinc-100 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* WORKSPACE CONTENT AREA SKELETON */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-white">
        {/* Master List Column Skeleton */}
        <div className="w-full md:w-80 lg:w-96 border-r border-zinc-200/80 flex flex-col bg-white shrink-0">
          {/* Header toolbar */}
          <div className="p-3.5 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-24 h-4 rounded bg-zinc-200/80 animate-pulse" />
              <div className="w-6 h-4 rounded-full bg-zinc-200/60 animate-pulse" />
            </div>
            <div className="w-20 h-3 rounded bg-zinc-100 animate-pulse" />
          </div>

          {/* Search Strip */}
          <div className="p-2.5 border-b border-zinc-200/80 bg-white space-y-2 shrink-0">
            <div className="w-full h-8 rounded-xl bg-zinc-100 animate-pulse" />
          </div>

          {/* Queue Items Skeleton */}
          <div className="divide-y divide-zinc-100 overflow-y-auto flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3.5 flex items-start gap-3">
                <div className="w-11 h-12 rounded-xl bg-zinc-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-4 rounded-full bg-zinc-100 animate-pulse" />
                    <div className="w-32 h-4 rounded bg-zinc-200/70 animate-pulse" />
                  </div>
                  <div className="w-44 h-3 rounded bg-zinc-100 animate-pulse" />
                  <div className="w-28 h-3 rounded bg-zinc-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Pane Skeleton (md+) */}
        <div className="hidden md:flex flex-1 flex-col bg-zinc-50/40 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-16 h-5 rounded-full bg-zinc-200/70 animate-pulse" />
              <div className="w-28 h-4 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="w-3/4 max-w-lg h-7 rounded-lg bg-zinc-200/80 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="w-36 h-4 rounded bg-zinc-100 animate-pulse" />
              <div className="w-32 h-4 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>

          {/* Conflict Verification Box */}
          <div className="p-4 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-2">
            <div className="w-40 h-4 rounded bg-zinc-200/70 animate-pulse" />
            <div className="w-full h-3 rounded bg-zinc-100 animate-pulse" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="w-28 h-9 rounded-xl bg-indigo-200/60 animate-pulse" />
            <div className="w-24 h-9 rounded-xl bg-zinc-200/70 animate-pulse" />
          </div>

          {/* Description Section */}
          <div className="space-y-2 pt-4 border-t border-zinc-200/80">
            <div className="w-20 h-4 rounded bg-zinc-200/70 animate-pulse" />
            <div className="w-full h-3 rounded bg-zinc-100 animate-pulse" />
            <div className="w-5/6 h-3 rounded bg-zinc-100 animate-pulse" />
            <div className="w-2/3 h-3 rounded bg-zinc-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
