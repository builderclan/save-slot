"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Shield,
  LogOut,
  LogIn,
  Menu,
  X,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCalendar } from "@/context/calendar-context";
import { formatDisplayName } from "@/lib/utils";
import {
  CalendarDateControls,
  CalendarViewSwitcher,
} from "./calendar-nav-controls";
import { UserAvatar } from "@/components/ui";
import { campusConfig } from "@/lib/config/campus";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout, isLoggingOut } = useAuth();
  const calendar = useCalendar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCalendarHome = pathname === "/";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      {/* Accessible h1 heading for document hierarchy */}
      <h1 className="sr-only">
        SaveSlot • Campus Events & Scheduling • {campusConfig.name} ({campusConfig.shortName})
      </h1>

      <div className="w-full px-3 sm:px-6 h-full relative flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sidebar Toggle + Brand + Date Controls if on Calendar Home */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          {/* Desktop Sidebar Toggle Button (Only on Calendar Home) */}
          {isCalendarHome && calendar && (
            <button
              type="button"
              onClick={calendar.toggleSidebar}
              title={calendar.isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={calendar.isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer active:scale-95 shrink-0"
            >
              {calendar.isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Brand & Campus Badge */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-2xs ring-1 ring-zinc-900/10 transition-transform group-hover:scale-105 bg-white">
              <Image
                src="/icon.png"
                alt="SaveSlot"
                width={32}
                height={32}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden xs:block sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-900">
                  Save<span className="text-indigo-600">Slot</span>
                </span>
                <span
                  className="hidden xl:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 font-medium"
                  title={campusConfig.name}
                >
                  {campusConfig.shortName}
                </span>
              </div>
            </div>
          </Link>

          {/* Date Controls (Active Month/Week range, < >, Today) when on Calendar Home */}
          {isCalendarHome && <CalendarDateControls />}
        </div>

        {/* Center: Navigation / View Switcher */}
        <div className="hidden md:flex items-center justify-center shrink-0">
          {isCalendarHome ? (
            <CalendarViewSwitcher user={user} />
          ) : (
            <nav
              aria-label="Main navigation"
              className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/80 shadow-2xs text-xs"
            >
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                  pathname === "/"
                    ? "bg-white text-zinc-900 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                <span>Calendar</span>
              </Link>

              {user?.isPrincipal && (
                <Link
                  href="/principal"
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                    pathname.startsWith("/principal")
                      ? "bg-white text-purple-950 font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-purple-950 hover:bg-white/60"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>{user?.role === "vice_principal" ? "Vice Principal Desk" : "Principal Desk"}</span>
                </Link>
              )}

              {user?.isLead && (
                <Link
                  href="/lead"
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                    pathname.startsWith("/lead")
                      ? "bg-white text-indigo-950 font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-indigo-950 hover:bg-white/60"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Lead Workspace</span>
                </Link>
              )}

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                    pathname.startsWith("/admin")
                      ? "bg-white text-amber-950 font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-amber-950 hover:bg-white/60"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin Console</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right side: Desktop Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Auth session / logout / login (Desktop) */}
          {loading ? (
            <div className="w-16 sm:w-24 h-8 rounded-xl bg-zinc-100 animate-pulse" />
          ) : user ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right hidden xl:block">
                <div className="text-xs font-semibold text-zinc-900 truncate max-w-[220px]">
                  {formatDisplayName(user.fullName)}
                </div>
                <div className="text-[10px] text-zinc-500 capitalize">
                  {user.role === "principal"
                    ? "College Principal"
                    : user.role === "vice_principal"
                    ? "Vice Principal"
                    : user.role === "admin"
                    ? "Campus Admin"
                    : "Community Lead"}
                </div>
              </div>

              {/* Role avatar badge using Blobatar */}
              <UserAvatar
                name={formatDisplayName(user.fullName)}
                email={user.email}
                role={user.role}
                avatarUrl={user.avatarUrl}
                size={32}
              />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign Out"
                aria-label="Sign out"
                className="h-8 w-8 rounded-lg border border-zinc-200/90 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-400 disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : pathname === "/login" ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-500 text-xs font-medium">
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span>Portal Sign In</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer shrink-0 active:scale-[0.98]"
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
            className="p-1.5 sm:p-2 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors cursor-pointer shadow-2xs lg:hidden active:scale-95"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200/80 bg-white/98 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info banner if logged in */}
          {user ? (
            <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  name={formatDisplayName(user.fullName)}
                  email={user.email}
                  role={user.role}
                  avatarUrl={user.avatarUrl}
                  size={36}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 truncate">
                    {formatDisplayName(user.fullName)}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {user.email} · <span className="capitalize font-medium">{user.role === "principal" ? "College Principal" : user.role === "vice_principal" ? "Vice Principal" : user.role === "admin" ? "Campus Admin" : "Lead"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-600 text-xs font-medium transition-all flex items-center gap-1 shrink-0 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : pathname === "/login" ? null : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-2xs transition-colors active:scale-[0.98]"
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
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <span>Public Notice Board Calendar</span>
            </Link>

            {user?.isLead && (
              <Link
                href="/lead"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname.startsWith("/lead")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <span>Lead Workspace</span>
                {user.leadCommunities?.[0] && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100/70 text-indigo-700 font-normal ml-auto">
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
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>{user?.role === "vice_principal" ? "Vice Principal Approval Desk" : "Principal Approval Desk"}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100/70 text-purple-800 font-semibold ml-auto">
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
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Operations Console</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100/70 text-amber-800 font-semibold ml-auto">
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
