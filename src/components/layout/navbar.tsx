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
    <header className="sticky top-0 z-40 w-full bg-[#fcfbfa]/90 backdrop-blur-md border-b border-[#e8e5de]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Campus Selector */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-[#12161f] text-[#fcfbfa] flex items-center justify-center font-display font-black text-xs shadow-xs group-hover:bg-blue-700 transition">
              BC
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-black tracking-tight text-[#12161f] leading-none font-display">
                Campus Calendar
              </span>
              <span className="text-[10px] text-[#8c827a] font-semibold tracking-wider uppercase leading-tight mt-0.5">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#12161f] text-white hover:bg-black transition shadow-xs active:scale-[0.98]"
          >
            <PlusCircle className="h-3.5 w-3.5 text-white/80" />
            Post Event
          </Link>

          {/* Portal Switcher */}
          <div className="flex items-center bg-[#f4f2ec] p-0.5 rounded-xl border border-[#e8e5de] text-xs">
            <Link
              href="/"
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition",
                !isOrganizerArea && !isAdminArea
                  ? "bg-white text-[#12161f] shadow-xs font-bold"
                  : "text-[#6b7280] hover:text-[#12161f]"
              )}
            >
              Student
            </Link>
            <Link
              href="/organizer"
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition",
                isOrganizerArea
                  ? "bg-white text-[#12161f] shadow-xs font-bold"
                  : "text-[#6b7280] hover:text-[#12161f]"
              )}
            >
              Organizer
            </Link>
            <Link
              href="/admin"
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition",
                isAdminArea
                  ? "bg-white text-[#12161f] shadow-xs font-bold"
                  : "text-[#6b7280] hover:text-[#12161f]"
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
