"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for client observability
    console.error("Application error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono font-semibold tracking-wider uppercase text-amber-600">
            System Notice
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            An unexpected error occurred while loading this view. You can reload the view or navigate back to the main notice board.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-slate-400 pt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 active:bg-slate-100/70 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Notice Board</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
