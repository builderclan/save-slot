"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Shield,
  Sparkles,
  LogOut,
  LogIn,
  LayoutGrid,
  Building2,
} from "lucide-react";

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
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#090a0f]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Campus Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Campus Board
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-semibold">
                  Safe-Slot
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-zinc-500" />
                <span>Apex Institute of Tech</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              pathname === "/"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Notice Board</span>
          </Link>

          {user?.isLead && (
            <Link
              href="/lead"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                pathname.startsWith("/lead")
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lead Workspace</span>
            </Link>
          )}

          {user?.isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                pathname.startsWith("/admin")
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* Right side: Auth Action */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-white truncate max-w-[140px]">
                  {user.fullName}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 capitalize">
                  {user.role === "admin" ? "Campus Admin" : "Community Lead"}
                </div>
              </div>

              {/* Role badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  user.role === "admin"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                }`}
              >
                {user.fullName.charAt(0)}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff / Lead Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
