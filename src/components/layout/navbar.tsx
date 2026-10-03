"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutGrid,
  Shield,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, isSameMonth, isSameYear } from "date-fns";
import { useCalendar } from "@/context/calendar-context";

interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
  isLead: boolean;
  leadCommunities: Array<{ id: string; name: string; slug: string }>;
}

function getDateHeading(
  date: Date,
  viewMode: "month" | "week" | "cards",
  isShort: boolean
): string {
  if (viewMode === "week") {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    if (isSameMonth(start, end)) {
      return `${format(start, "MMM d")} – ${format(end, isShort ? "d" : "d, yyyy")}`;
    }
    if (isSameYear(start, end)) {
      return `${format(start, "MMM d")} – ${format(end, isShort ? "MMM d" : "MMM d, yyyy")}`;
    }
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }
  return format(date, isShort ? "MMM yyyy" : "MMMM yyyy");
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const calendar = useCalendar();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCalendarHome = pathname === "/";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (isMounted) {
          if (data.authenticated && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Accessible h1 heading for document hierarchy */}
      <h1 className="sr-only">SaveSlot • Campus Events & Scheduling • Albertian Institute of Science & Technology (AISAT)</h1>

      <div className="w-full px-3 sm:px-6 h-full relative flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand + Date Controls if on Calendar Home */}
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 shrink">
          {/* Brand & Campus Badge */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-indigo-700 transition-colors">
              S
            </div>
            <div className="hidden xs:block sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs sm:text-sm tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  SaveSlot
                </span>
                <span
                  className="hidden xl:inline-block text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 font-semibold"
                  title="Albertian Institute of Science & Technology"
                >
                  AISAT
                </span>
              </div>
            </div>
          </Link>

          {/* Date Controls (Active Month/Week range, < >, Today) when on Calendar Home */}
          {isCalendarHome && calendar && (
            <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 pl-1.5 sm:pl-3 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight select-none truncate">
                <span className="md:hidden">
                  {getDateHeading(calendar.activeDate, calendar.viewMode, true)}
                </span>
                <span className="hidden md:inline">
                  {getDateHeading(calendar.activeDate, calendar.viewMode, false)}
                </span>
              </h2>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={calendar.handlePrev}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label={calendar.viewMode === "week" ? "Previous week" : "Previous month"}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={calendar.handleNext}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label={calendar.viewMode === "week" ? "Next week" : "Next month"}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={calendar.handleToday}
                className="px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                Today
              </button>
            </div>
          )}
        </div>

        {/* Center: View Switcher (Month | Week | Board) for md+ screens */}
        <div className="hidden md:flex items-center justify-center shrink-0">
          {isCalendarHome && calendar ? (
            <div
              role="tablist"
              aria-label="Calendar view switcher"
              className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 text-xs shadow-2xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={calendar.viewMode === "month"}
                onClick={() => calendar.setViewMode("month")}
                title="Month View"
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendar.viewMode === "month"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calendar.viewMode === "week"}
                onClick={() => calendar.setViewMode("week")}
                title="Week View"
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendar.viewMode === "week"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Week</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calendar.viewMode === "cards"}
                onClick={() => calendar.setViewMode("cards")}
                title="Board View"
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendar.viewMode === "cards"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
            </div>
          ) : (
            <nav
              aria-label="Main navigation"
              className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs"
            >
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

              {user?.isPrincipal && (
                <Link
                  href="/principal"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    pathname.startsWith("/principal")
                      ? "bg-white text-purple-950 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Principal Desk</span>
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

        {/* Right side: Desktop Workspaces + Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick link to workspaces on calendar home (Visible on lg+) */}
          {isCalendarHome && user?.isLead && (
            <Link
              href="/lead"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>Lead Workspace</span>
            </Link>
          )}

          {isCalendarHome && user?.isPrincipal && (
            <Link
              href="/principal"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-xs font-semibold text-purple-900 transition-colors shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              <span>Principal Desk</span>
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

          {/* Auth session / logout / login (Desktop) */}
          {loading ? (
            <div className="w-16 sm:w-24 h-8 rounded-xl bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right hidden xl:block">
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[220px]">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {user.role === "principal"
                    ? "College Principal"
                    : user.role === "admin"
                    ? "Campus Admin"
                    : "Community Lead"}
                </div>
              </div>

              {/* Role avatar badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shadow-xs ${
                  user.role === "principal"
                    ? "bg-purple-100 border-purple-200 text-purple-800"
                    : user.role === "admin"
                    ? "bg-amber-100 border-amber-200 text-amber-800"
                    : "bg-indigo-100 border-indigo-200 text-indigo-800"
                }`}
                title={user.fullName}
              >
                {user.fullName.charAt(0)}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign Out"
                aria-label="Sign out"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-600 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : pathname === "/login" ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span>Portal Sign In</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex px-3 sm:px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </Link>
          )}

          {/* Mobile & Tablet Hamburger Toggle (Visible on < lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs lg:hidden"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info banner if logged in */}
          {user ? (
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${
                    user.role === "admin"
                      ? "bg-amber-100 border-amber-200 text-amber-800"
                      : "bg-indigo-100 border-indigo-200 text-indigo-800"
                  }`}
                >
                  {user.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user.email} · <span className="capitalize font-medium">{user.role === "admin" ? "Campus Admin" : "Lead"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : pathname === "/login" ? null : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Campus Staff Login</span>
            </Link>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1 pt-1" aria-label="Mobile navigation">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === "/"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>Public Notice Board Calendar</span>
            </Link>

            {user?.isLead && (
              <Link
                href="/lead"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname.startsWith("/lead")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-slate-500" />
                <span>Lead Workspace</span>
                {user.leadCommunities?.[0] && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-normal ml-auto">
                    {user.leadCommunities[0].name}
                  </span>
                )}
              </Link>
            )}

            {user?.isPrincipal && (
              <Link
                href="/principal"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname.startsWith("/principal")
                    ? "bg-purple-50 text-purple-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Principal Approval Desk</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold ml-auto">
                  Executive
                </span>
              </Link>
            )}

            {user?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-50 text-amber-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Operations Console</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold ml-auto">
                  Staff
                </span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
