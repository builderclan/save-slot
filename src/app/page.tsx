export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="relative flex place-items-center mb-8">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl pointer-events-none" />
        <div className="relative px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-medium text-indigo-400">
          Branch: <span className="font-mono text-indigo-300">feat/rebuild</span>
        </div>
      </div>

      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
        Calendar BC
      </h1>

      <p className="max-w-xl text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed">
        Clean foundation initialized. Next.js 16, React 19, and Tailwind CSS v4 are set up and ready for building.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full text-left">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Status
          </div>
          <div className="text-sm font-medium text-zinc-200">
            Fresh Slate Ready
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Stack
          </div>
          <div className="text-sm font-medium text-zinc-200">
            Next.js 16 & React 19
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Styling
          </div>
          <div className="text-sm font-medium text-zinc-200">
            Tailwind CSS v4
          </div>
        </div>
      </div>
    </main>
  );
}
