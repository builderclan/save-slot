import * as React from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center">
            <Calendar className="h-3 w-3" />
          </div>
          <span className="font-semibold text-slate-800">Campus Calendar</span>
          <span className="text-slate-400">• Built for college campuses by BuilderClan</span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition">
            Public Calendar
          </Link>
          <Link href="/communities" className="hover:text-slate-900 transition">
            Communities
          </Link>
          <Link href="/organizer" className="hover:text-slate-900 transition">
            Organizer Hub
          </Link>
          <Link href="/admin" className="hover:text-slate-900 transition">
            Campus Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
