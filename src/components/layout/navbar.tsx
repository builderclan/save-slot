"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Shield,
  LogOut,
  LogIn,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useCalendar } from "@/context/calendar-context";

interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isLead: boolean;
  leadCommunities: Array<{ id: string; name: string; slug: string }>;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const calendar = useCalendar();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isCalendarHome = pathname === "/";

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand + Date Controls if on Calendar Home */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Brand & Campus Badge */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-indigo-700 transition-colors">
              A
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Apex Calendar
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 font-semibold">
                  Safe-Slot
                </span>
              </div>
            </div>
          </Link>

          {/* Date Controls (Active Month, < >, Today) when on Calendar Home */}
          {isCalendarHome && calendar && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 sm:pl-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight select-none">
                {format(calendar.activeDate, "MMMM yyyy")}
              </h2>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={calendar.handlePrev}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={calendar.handleNext}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={calendar.handleToday}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs ml-0.5"
              >
                Today
              </button>
            </div>
          )}
        </div>

        {/* Center: View Switcher (Month | Week | Board) when on Calendar Home, or Nav Links on other pages */}
        <div className="flex items-center gap-2">
          {isCalendarHome && calendar ? (
            <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 text-xs">
              <button
                type="button"
                onClick={() => calendar.setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  calendar.viewMode === "month"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => calendar.setViewMode("week")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  calendar.viewMode === "week"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => calendar.setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  calendar.viewMode === "cards"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Board
              </button>
            </div>
          ) : (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  pathname === "/"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </Link>

              {user?.isLead && (
                <Link
                  href="/lead"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    pathname.startsWith("/lead")
                      ? "bg-white text-slate-900 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lead Workspace</span>
                </Link>
              )}

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    pathname.startsWith("/admin")
                      ? "bg-white text-slate-900 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin Console</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right side: Global Search + Workspaces + Auth */}
        <div className="flex items-center gap-2.5">
          {/* Quick Find Events input on calendar home */}
          {isCalendarHome && calendar && (
            <div className="relative hidden xl:block w-56">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={calendar.search}
                onChange={(e) => calendar.setSearch(e.target.value)}
                placeholder="Find events..."
                className="w-full pl-8.5 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {calendar.search && (
                <button
                  type="button"
                  onClick={() => calendar.setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Quick link to workspaces when on calendar home */}
          {isCalendarHome && user?.isLead && (
            <Link
              href="/lead"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>Lead Workspace</span>
            </Link>
          )}

          {isCalendarHome && user?.isAdmin && (
            <Link
              href="/admin"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-xs font-semibold text-amber-900 transition-colors shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Console</span>
            </Link>
          )}

          {/* Auth session / logout / login */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {user.role === "admin" ? "Campus Admin" : "Community Lead"}
                </div>
              </div>

              {/* Role avatar badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shadow-xs ${
                  user.role === "admin"
                    ? "bg-amber-100 border-amber-200 text-amber-800"
                    : "bg-indigo-100 border-indigo-200 text-indigo-800"
                }`}
              >
                {user.fullName.charAt(0)}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
