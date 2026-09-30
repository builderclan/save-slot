"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Users,
  PlusCircle,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/auth/user-nav";
import { CampusSelector } from "@/components/layout/campus-selector";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isOrganizerArea = pathname.startsWith("/organizer");
  const isAdminArea = pathname.startsWith("/admin");

  const navLinks = [
    {
      href: "/",
      label: "What's Happening",
      icon: CalendarIcon,
      active: pathname === "/" || pathname.startsWith("/campus"),
    },
    {
      href: "/communities",
      label: "Communities",
      icon: Users,
      active: pathname.startsWith("/communities"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Campus Selector */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-600 transition">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                Campus Calendar
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                BuilderClan
              </span>
            </div>
          </Link>

          {/* Campus Selector Dropdown */}
          <CampusSelector />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition",
                    link.active
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Dashboard Switcher & Quick Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Quick Create Event button */}
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs active:scale-[0.98]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Post Event
          </Link>

          {/* Portal Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <Link
              href="/"
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition",
                !isOrganizerArea && !isAdminArea
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Student
            </Link>
            <Link
              href="/organizer"
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition",
                isOrganizerArea
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Organizer
            </Link>
            <Link
              href="/admin"
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition",
                isAdminArea
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Admin
            </Link>
          </div>

          {/* User Session & Switcher */}
          <UserNav />
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <Link
            href="/organizer/events/new"
            className="p-1.5 rounded-lg bg-blue-600 text-white"
            title="Post Event"
          >
            <PlusCircle className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                    link.active
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
              Switch Portal
            </p>
            <div className="grid grid-cols-3 gap-2 px-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 px-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-800"
              >
                Student
              </Link>
              <Link
                href="/organizer"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 px-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-800"
              >
                Organizer
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 px-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-800"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
